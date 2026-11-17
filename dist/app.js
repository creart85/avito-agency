import { profile, services, packages } from './data.js';
import { calculateEstimate, buildEstimateText, parseQuantity, formatMoney } from './calculator.js';
import { initializePageNavigation } from './navigation.js';
import { initializeCaseGalleries } from './gallery.js?v=20261117-cases';

const catalog = { services, packages };
const state = { mode: 'packages', launchId: '', monthlyId: '', quantities: {} };
const byId = id => document.getElementById(id);
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
let currentResult;
let previousGroupOpen = new Map();

document.querySelectorAll('[data-contact]').forEach(link => {
  const type = link.dataset.contact;
  link.href = type === 'telegram' ? profile.telegram : type === 'phone' ? `tel:${profile.phone}` : `mailto:${profile.email}`;
  if (type === 'phone') link.textContent = profile.phoneLabel || profile.phone;
  if (type === 'email') link.textContent = profile.email;
});

const packageShort = {
  'launch-basic': '1 аккаунт · 1 направление · 1 город',
  'launch-expanded': '1 аккаунт · до 2 городов · файл до 50 строк',
  'monthly-base': 'До 50 объявлений · 1 город',
  'monthly-growth': 'До 150 объявлений · до 3 городов',
  'monthly-scale': 'До 400 объявлений · до 5 городов'
};

byId('package-options').innerHTML = [['launch', 'Запуск проекта', 'Подготовка аккаунта и первых объявлений. Разовая работа.', 'Запуск пока не нужен'], ['monthly', 'Ежемесячное ведение', 'Сопровождение уже подготовленного аккаунта.', 'Ведение пока не нужно']].map(([type, title, description, none]) => `
  <fieldset class="package-fieldset"><legend>${title}</legend><p>${description}</p>
    <label class="none-choice"><input type="radio" name="${type}" value="" checked>${none}</label>
    <div class="package-grid ${type === 'monthly' ? 'monthly' : ''}">${packages.filter(item => item.type === type).map(item => `
      <div class="package-card"><label class="package-choice"><input type="radio" name="${type}" value="${item.id}" aria-label="${type === 'launch' ? 'Запуск' : 'Ведение'}: ${escapeHtml(item.name)}"><span class="package-name">${escapeHtml(item.name)}</span><span class="package-price">${formatMoney(item.price, true)}<small>${type === 'launch' ? 'разово' : 'в месяц'}</small></span><span class="package-short">${packageShort[item.id]}</span></label>
        <details class="package-details"><summary>Что входит</summary><dl><dt>Задача</dt><dd>${escapeHtml(item.description)}</dd><dt>Состав работ</dt><dd>${escapeHtml(item.included)}</dd><dt>Лимиты</dt><dd>${escapeHtml(item.limits)}</dd><dt>Не включено</dt><dd>${escapeHtml(item.excluded)}</dd><dt>Условия</dt><dd>${escapeHtml(item.note)}</dd></dl></details>
      </div>`).join('')}</div>
  </fieldset>`).join('');

const categories = [...new Set(services.map(item => item.category))];
byId('service-options').innerHTML = categories.map((category, index) => `
  <details class="service-group" data-group="${escapeHtml(category)}" ${index === 0 ? 'open' : ''}>
    <summary><span class="group-number">0${index + 1}</span>${escapeHtml(category)}<span class="group-count" aria-label="Количество выбранных услуг" hidden></span></summary>
    <div>${services.filter(item => item.category === category).map(item => `
      <article class="service-row" data-service-id="${item.id}"><div class="service-row-main"><div class="service-row-title"><h4>${escapeHtml(item.name)}</h4><span class="service-row-price">${formatMoney(item.price)}<small>/ ${escapeHtml(item.unit)}</small></span>${item.period === 'ежемесячно' ? '<span class="monthly-label">ЕЖЕМЕСЯЧНО</span>' : ''}</div>
        <div class="quantity-control"><button type="button" data-step="-1" data-id="${item.id}" aria-label="Уменьшить: ${escapeHtml(item.name)}" disabled>−</button><label class="sr-only" for="quantity-${item.id}">Количество: ${escapeHtml(item.name)}</label><input id="quantity-${item.id}" type="text" inputmode="numeric" pattern="[0-9]*" value="0" autocomplete="off" data-quantity="${item.id}" aria-describedby="unit-${item.id} error-${item.id}"><button type="button" data-step="1" data-id="${item.id}" aria-label="Добавить: ${escapeHtml(item.name)}">+</button></div>
      </div><span class="sr-only" id="unit-${item.id}">Единица: ${escapeHtml(item.unit)}. ${item.period === 'ежемесячно' ? 'Количество расчётных единиц за один месяц.' : 'Разовая работа.'}</span>
      <p>${escapeHtml(item.description)}</p><p class="service-error" id="error-${item.id}" hidden></p>
      <details><summary>Результат и ограничения</summary><dl><dt>Что получите</dt><dd>${escapeHtml(item.result)}</dd><dt>Ограничения и доплаты</dt><dd>${escapeHtml(item.limits)}</dd></dl></details></article>`).join('')}
    </div></details>`).join('');

function updateEstimate() {
  currentResult = calculateEstimate(state, catalog);
  const result = currentResult;
  document.querySelectorAll('[data-quantity]').forEach(input => {
    const id = input.dataset.quantity;
    const error = state.mode === 'services' ? result.errors[id] : '';
    input.setAttribute('aria-invalid', String(Boolean(error)));
    byId(`error-${id}`).hidden = !error;
    byId(`error-${id}`).textContent = error || '';
    const quantity = parseQuantity(state.quantities[id]);
    const row = input.closest('[data-service-id]');
    row.classList.toggle('is-selected', quantity.valid && quantity.value > 0);
    row.querySelector('[data-step="-1"]').disabled = !quantity.valid || quantity.value === 0;
  });
  document.querySelectorAll('.service-group').forEach(group => {
    const selected = services.filter(item => item.category === group.dataset.group && parseQuantity(state.quantities[item.id]).value > 0).length;
    const badge = group.querySelector('.group-count');
    badge.hidden = selected === 0;
    badge.textContent = `выбрано ${selected}`;
  });
  byId('estimate-selection').innerHTML = result.lines.length ? result.lines.map(line => `
    <div class="estimate-line"><div><strong>${escapeHtml(line.name)}</strong><small>${line.quantity} × ${formatMoney(line.price, line.from)}${line.period === 'ежемесячно' ? ' / мес.' : ''}</small></div><button type="button" class="remove-line" data-remove="${line.id}" aria-label="Убрать: ${escapeHtml(line.name)}">×</button></div>`).join('') : '<p class="estimate-empty">Выберите пакет или услуги — здесь появится ваш расчёт.</p>';
  for (const [id, value] of [['total-onetime', result.oneTime], ['total-monthly', result.monthly], ['total-first', result.firstMonth]]) byId(id).textContent = result.valid ? formatMoney(value, result.from) : '—';
  byId('estimate-announcement').textContent = !result.valid ? 'Расчёт недоступен. Проверьте количество услуг.' : !result.hasSelection ? 'Смета пуста. Выберите пакет или услуги.' : `Смета обновлена. Разово: ${formatMoney(result.oneTime, result.from)}. Ежемесячно: ${formatMoney(result.monthly, result.from)}. Первый месяц: ${formatMoney(result.firstMonth, result.from)}.`;
  byId('estimate-status').textContent = result.valid ? 'Расчёт предварительный. Итоговую стоимость согласуем после обсуждения задачи.' : 'Проверьте количество услуг: нужно целое число от 0. При слишком большом количестве уменьшите его.';
  byId('estimate-status').classList.toggle('is-error', !result.valid);
  byId('copy-estimate').disabled = !result.valid || !result.hasSelection;
  byId('reset-estimate').disabled = !result.hasSelection && result.valid;
  byId('manual-copy').hidden = !result.valid || !result.hasSelection;
  byId('estimate-text').value = buildEstimateText(result);
  byId('copy-status').textContent = '';
}

function setMode(mode) {
  state.mode = mode;
  document.querySelectorAll('[data-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.mode === mode)));
  byId('packages-panel').hidden = mode !== 'packages';
  byId('services-panel').hidden = mode !== 'services';
  byId('manual-copy').open = false;
  updateEstimate();
}

function searchServices() {
  const query = byId('service-search').value.trim().toLocaleLowerCase('ru');
  if (query && previousGroupOpen.size === 0) document.querySelectorAll('.service-group').forEach(group => previousGroupOpen.set(group.dataset.group, group.open));
  let count = 0;
  document.querySelectorAll('[data-service-id]').forEach(row => {
    const item = services.find(item => item.id === row.dataset.serviceId);
    const matches = `${item.name} ${item.category}`.toLocaleLowerCase('ru').includes(query);
    row.hidden = !matches;
    if (matches) count++;
  });
  document.querySelectorAll('.service-group').forEach(group => {
    group.hidden = ![...group.querySelectorAll('[data-service-id]')].some(row => !row.hidden);
    if (query && !group.hidden) group.open = true;
    else if (!query && previousGroupOpen.has(group.dataset.group)) group.open = previousGroupOpen.get(group.dataset.group);
  });
  if (!query) previousGroupOpen.clear();
  byId('clear-search').hidden = !query;
  byId('no-results').hidden = count > 0;
  byId('search-status').textContent = query ? `Найдено услуг: ${count}. Выбранные скрытые услуги остаются в смете.` : 'Показаны все 34 услуги.';
}

document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', () => setMode(button.dataset.mode)));
byId('package-options').addEventListener('change', event => {
  if (event.target.matches('input[type="radio"]')) {
    state[event.target.name === 'launch' ? 'launchId' : 'monthlyId'] = event.target.value;
    updateEstimate();
  }
});
byId('service-options').addEventListener('input', event => {
  if (!event.target.matches('[data-quantity]')) return;
  state.quantities[event.target.dataset.quantity] = event.target.value;
  updateEstimate();
});
byId('service-options').addEventListener('focusout', event => {
  if (event.target.matches('[data-quantity]') && event.target.value.trim() === '') event.target.value = '0';
});
byId('service-options').addEventListener('click', event => {
  const button = event.target.closest('[data-step]');
  if (!button) return;
  const id = button.dataset.id;
  const quantity = parseQuantity(state.quantities[id]);
  if (!quantity.valid) { byId(`quantity-${id}`).focus(); return; }
  state.quantities[id] = Math.max(0, quantity.value + Number(button.dataset.step));
  byId(`quantity-${id}`).value = state.quantities[id];
  updateEstimate();
});
byId('estimate-selection').addEventListener('click', event => {
  const button = event.target.closest('[data-remove]');
  if (!button) return;
  const id = button.dataset.remove;
  if (state.mode === 'packages') {
    const type = packages.find(item => item.id === id).type;
    state[type === 'launch' ? 'launchId' : 'monthlyId'] = '';
    document.querySelector(`input[name="${type}"][value=""]`).checked = true;
  } else { delete state.quantities[id]; byId(`quantity-${id}`).value = '0'; }
  updateEstimate();
});
byId('reset-estimate').addEventListener('click', () => {
  if (state.mode === 'packages') {
    state.launchId = ''; state.monthlyId = '';
    document.querySelectorAll('#package-options input[value=""]').forEach(input => input.checked = true);
  } else {
    state.quantities = {};
    document.querySelectorAll('[data-quantity]').forEach(input => input.value = '0');
  }
  updateEstimate();
});
byId('service-search').addEventListener('input', searchServices);
byId('clear-search').addEventListener('click', () => { byId('service-search').value = ''; searchServices(); byId('service-search').focus(); });
document.querySelectorAll('[data-category]').forEach(link => link.addEventListener('click', () => {
  setMode('services');
  byId('service-search').value = link.dataset.category;
  searchServices();
}));
byId('copy-estimate').addEventListener('click', async () => {
  const text = buildEstimateText(currentResult);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    byId('copy-status').textContent = 'Расчёт скопирован. Можно вставить его в сообщение.';
  } catch {
    byId('manual-copy').open = true;
    byId('estimate-text').focus();
    byId('estimate-text').select();
    byId('copy-status').textContent = 'Браузер не разрешил копирование. Скопируйте выделенный текст ниже.';
  }
});
updateEstimate();
initializePageNavigation();
initializeCaseGalleries();
