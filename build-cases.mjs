import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { caseStudies } from './dist/cases-data.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const paragraphs = text => text.split(/\n\n+/).map(part => `<p>${escapeHtml(part)}</p>`).join('');
const imageCountLabel = count => `${count} ${count === 1 ? 'снимок' : count < 5 ? 'снимка' : 'снимков'}`;

export function renderCaseStudy(study) {
  if (!/^[a-z0-9-]+$/.test(study.id)) throw new Error(`Invalid case ID: ${study.id}`);
  const coverIndex = study.coverIndex ?? 0;
  const cover = study.images[coverIndex];
  if (!cover) throw new Error(`Missing cover for ${study.id}`);
  const detailSections = [['Задача клиента', study.task], ['Что я сделал', study.work], ['Результат в цифрах', study.result], ['Что получил клиент', study.benefit]];
  if (detailSections.some(([, value]) => !value)) throw new Error(`Incomplete story: ${study.id}`);
  return `        <article class="case" data-case-id="${study.id}" aria-labelledby="case-${study.id}-category case-${study.id}-label">
          <p class="case-category" id="case-${study.id}-category">${escapeHtml(study.category)}</p>
          <div class="case-number${study.kind === 'wide' ? ' case-number-wide' : ''}">${escapeHtml(study.value)}${study.suffix ? `<small>${escapeHtml(study.suffix)}</small>` : ''}</div>
          <h3 id="case-${study.id}-label">${escapeHtml(study.label)}</h3>
          <p class="case-summary">${escapeHtml(study.summary)}</p>
          <div class="case-evidence"><a class="case-preview" href="${escapeHtml(cover.src)}" data-gallery="${escapeHtml(study.galleryId)}" data-gallery-index="${coverIndex}" aria-haspopup="dialog" aria-label="${escapeHtml(`Открыть статистику Авито: ${study.category}, ${imageCountLabel(study.images.length)}`)}"><img src="${escapeHtml(cover.src)}" width="${cover.width}" height="${cover.height}" loading="lazy" decoding="async" alt="${escapeHtml(cover.alt)}"><span>Статистика Авито <span>${imageCountLabel(study.images.length)} ↗</span></span></a></div>
          <details class="case-story"><summary>Подробнее о кейсе</summary><div class="case-story-body">${detailSections.map(([label, value]) => `<h4>${label}</h4>${paragraphs(value)}`).join('')}</div></details>
          <span class="case-foot">${escapeHtml(study.note)}</span>
        </article>`;
}

export function renderCasesSection(studies = caseStudies) {
  if (new Set(studies.map(study => study.id)).size !== studies.length) throw new Error('Duplicate case IDs');
  return `    <section class="cases-section cases-section--detailed" id="cases" aria-labelledby="cases-title"><div class="container">
      <div class="section-heading"><div><p class="section-label">02 / РЕЗУЛЬТАТЫ КЛИЕНТОВ</p><h2 id="cases-title">Обращения, продажи<br>и закрытые позиции.</h2></div><p>${studies.length} проектов в товарах, услугах и найме. Показываю задачу клиента, свою работу и результат, а цифры дополняю снимками статистики.</p></div>
      <p class="cases-help">Листайте кейсы стрелками или свайпом. Откройте «Подробнее о кейсе», чтобы прочитать историю проекта.</p>
      <div class="cases-track" id="cases-track" role="group" aria-roledescription="карусель" aria-label="Результаты клиентских проектов" tabindex="0">
${studies.map(renderCaseStudy).join('\n')}
      </div>
      <div class="case-controls" id="case-controls" hidden><span class="case-counter" id="case-counter" aria-hidden="true"></span><div class="case-dots" id="case-dots" role="group" aria-label="Страницы кейсов"></div><div class="case-arrows"><button type="button" id="cases-previous" aria-label="Предыдущие кейсы" aria-controls="cases-track">←</button><button type="button" id="cases-next" aria-label="Следующие кейсы" aria-controls="cases-track">→</button></div></div>
      <p class="sr-only" id="cases-announcement" role="status" aria-live="polite" aria-atomic="true"></p>
      <p class="case-note">Это результаты отдельных проектов за указанные периоды. Продажи, договоры, доход и закрытие позиций приведены по данным клиентов. Показатели вашего бизнеса зависят от спроса, предложения, бюджета и обработки обращений.</p>
      <div class="cases-contact"><div><h3>Обсудим вашу задачу</h3><p>Расскажите, что нужно бизнесу: обращения, продажи, загрузка специалистов или сотрудники. Я предложу подход к продвижению и буду лично контролировать работу над проектом.</p></div><a class="button button-primary" data-contact="vk" href="https://vk.ru/creart85" target="_blank" rel="noopener noreferrer">Обсудить мой проект <span aria-hidden="true">↗</span></a></div>
    </div></section>`;
}

export function buildCasesPage() {
  const page = new URL('./dist/index.html', import.meta.url);
  const original = fs.readFileSync(page, 'utf8');
  const marker = /<!-- CASES:START -->[\s\S]*?<!-- CASES:END -->/;
  if (!marker.test(original)) throw new Error('Cases section markers are missing');
  const replacement = `<!-- CASES:START -->\n${renderCasesSection()}\n    <!-- CASES:END -->`;
  fs.writeFileSync(page, original.replace(marker, replacement), 'utf8');
  console.log(`Built ${caseStudies.length} cases and ${caseStudies.reduce((sum, study) => sum + study.images.length, 0)} screenshots.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) buildCasesPage();
