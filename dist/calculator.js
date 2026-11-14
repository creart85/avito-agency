const moneyFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
export const formatMoney = (amount, from = false) => `${from && amount > 0 ? 'от ' : ''}${moneyFormatter.format(amount)} ₽`;

export function parseQuantity(input) {
  const text = String(input ?? '').trim();
  const value = text === '' ? 0 : Number(text);
  if ((text !== '' && !/^\d+$/.test(text)) || !Number.isSafeInteger(value) || value < 0) {
    return { valid: false, value: null, error: 'Введите целое число от 0.' };
  }
  return { valid: true, value, error: '' };
}

export function calculateEstimate(state = {}, { services, packages }) {
  const mode = state.mode ?? 'packages';
  const errors = {};
  const lines = [];
  const addLine = (item, quantity, from = false) => {
    const amount = item.price * quantity;
    if (!Number.isSafeInteger(amount)) {
      errors[item.id] = 'Количество слишком велико для точного расчёта.';
      return;
    }
    lines.push({ ...item, quantity, amount, from });
  };

  if (mode === 'packages') {
    for (const [key, type] of [['launchId', 'launch'], ['monthlyId', 'monthly']]) {
      const id = state[key];
      if (!id) continue;
      const item = packages.find(item => item.id === id && item.type === type);
      if (!item) { errors[key] = 'Выберите пакет из списка.'; continue; }
      addLine({ ...item, name: `${type === 'launch' ? 'Запуск' : 'Ведение'}: ${item.name}`, unit: type === 'launch' ? 'пакет' : 'месяц', period: type === 'launch' ? 'разово' : 'ежемесячно' }, 1, true);
    }
  } else if (mode === 'services') {
    for (const [id, input] of Object.entries(state.quantities ?? {})) {
      const quantity = parseQuantity(input);
      if (!quantity.valid) { errors[id] = quantity.error; continue; }
      if (quantity.value === 0) continue;
      const item = services.find(item => item.id === id);
      if (!item) { errors[id] = 'Этой услуги нет в прайсе.'; continue; }
      addLine(item, quantity.value);
    }
  } else {
    errors.mode = 'Выберите способ расчёта.';
  }

  let oneTime = 0;
  let monthly = 0;
  for (const line of lines) {
    if (line.period === 'ежемесячно') monthly += line.amount;
    else oneTime += line.amount;
  }
  const firstMonth = oneTime + monthly;
  if (![oneTime, monthly, firstMonth].every(Number.isSafeInteger)) errors.total = 'Сумма слишком велика для точного расчёта.';
  const valid = Object.keys(errors).length === 0;
  return { mode, valid, errors, lines, oneTime: valid ? oneTime : null, monthly: valid ? monthly : null, firstMonth: valid ? firstMonth : null, from: mode === 'packages' && lines.length > 0, hasSelection: lines.length > 0 };
}

export function buildEstimateText(result) {
  if (!result.valid || !result.hasSelection) return '';
  return [
    'Предварительный расчёт · Артур Гатин',
    result.mode === 'packages' ? 'Готовые пакеты' : 'Отдельные услуги',
    '',
    ...result.lines.map(line => `${line.name}\n${line.quantity} × ${formatMoney(line.price, line.from)} / ${line.unit} = ${formatMoney(line.amount, line.from)} (${line.period})`),
    '',
    `Разово: ${formatMoney(result.oneTime, result.from)}`,
    `Ежемесячно: ${formatMoney(result.monthly, result.from)}`,
    `Первый месяц: ${formatMoney(result.firstMonth, result.from)}`,
    '',
    'Рекламный бюджет Авито, платные опции и подписки сторонних сервисов оплачиваются отдельно.',
    'Итоговая стоимость и объём работ согласуются после обсуждения задачи.'
  ].join('\n');
}
