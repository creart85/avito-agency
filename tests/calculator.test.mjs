import test from 'node:test';
import assert from 'node:assert/strict';
import { services, packages } from '../dist/data.js';

// A missing implementation must fail an assertion, not hide behind a mock.
let api = {};
try { api = await import('../dist/calculator.js'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }
const catalog = { services, packages };
function calculate(state) {
  assert.equal(typeof api.calculateEstimate, 'function', 'Расчёт ещё не реализован');
  return api.calculateEstimate(state, catalog);
}

test('empty selections do not charge a default package', () => {
  const result = calculate({ mode: 'packages' });
  assert.equal(result.valid, true);
  assert.equal(result.firstMonth, 0);
  assert.equal(result.hasSelection, false);
});

test('launch plus monthly package separates both periods', () => {
  const result = calculate({ mode: 'packages', launchId: 'launch-basic', monthlyId: 'monthly-growth' });
  assert.deepEqual([result.oneTime, result.monthly, result.firstMonth], [25000, 55000, 80000]);
  assert.equal(result.from, true);
  assert.equal(result.lines.length, 2);
});

test('individual work totals use rate times quantity and one month', () => {
  const result = calculate({ mode: 'services', quantities: { '01': 1, '10': 2, '25': 1 } });
  assert.deepEqual([result.oneTime, result.monthly, result.firstMonth], [9000, 15000, 24000]);
  assert.equal(result.from, false);
  assert.equal(result.lines.find(line => line.id === '10').amount, 4000);
});

test('catalog preparation charges per bundle of 100 cards', () => {
  const result = calculate({ mode: 'services', quantities: { '13': 2 } });
  assert.equal(result.oneTime, 17000);
  assert.equal(result.lines[0].unit, '100 карточек из готовых данных');
});

test('monthly service quantity counts account units in one month', () => {
  const result = calculate({ mode: 'services', quantities: { '25': 2 } });
  assert.deepEqual([result.oneTime, result.monthly, result.firstMonth], [0, 30000, 30000]);
});

test('switching modes cannot double-charge saved inactive selections', () => {
  const state = { launchId: 'launch-basic', monthlyId: 'monthly-growth', quantities: { '01': 1 } };
  assert.equal(calculate({ ...state, mode: 'packages' }).firstMonth, 80000);
  assert.equal(calculate({ ...state, mode: 'services' }).firstMonth, 5000);
});

test('negative fractional nonnumeric and unsafe quantities cannot produce a quote', () => {
  for (const input of ['-1', '1.5', 'hello', 'Infinity', Infinity, Number.MAX_SAFE_INTEGER + 1, '1e3']) {
    const result = calculate({ mode: 'services', quantities: { '01': input } });
    assert.equal(result.valid, false, String(input));
    assert.equal(result.firstMonth, null);
    assert.ok(result.errors['01']);
  }
});

test('empty edited quantity is zero and numeric strings are accepted', () => {
  assert.equal(calculate({ mode: 'services', quantities: { '01': '' } }).firstMonth, 0);
  assert.equal(calculate({ mode: 'services', quantities: { '01': ' 2 ' } }).firstMonth, 10000);
});

test('safe quantity whose monetary product overflows cannot show a rounded total', () => {
  const result = calculate({ mode: 'services', quantities: { '01': Number.MAX_SAFE_INTEGER } });
  assert.equal(result.valid, false);
  assert.equal(result.firstMonth, null);
});

test('unknown package or service cannot silently disappear from the quote', () => {
  assert.equal(calculate({ mode: 'packages', launchId: 'missing' }).valid, false);
  assert.equal(calculate({ mode: 'packages', launchId: 'monthly-base' }).valid, false);
  assert.equal(calculate({ mode: 'services', quantities: { missing: 1 } }).valid, false);
});

test('copied quote includes selected work periods totals and excluded budget', () => {
  const result = calculate({ mode: 'services', quantities: { '01': 1, '10': 2, '25': 1 } });
  assert.equal(typeof api.buildEstimateText, 'function');
  const text = api.buildEstimateText(result).replaceAll('\u00a0', ' ').replaceAll('\u202f', ' ');
  assert.match(text, /Консультация авитолога/);
  assert.match(text, /Уникальное объявление/);
  assert.match(text, /2 × 2 000/);
  assert.match(text, /Разово: 9 000 ₽/);
  assert.match(text, /Ежемесячно: 15 000 ₽/);
  assert.match(text, /Первый месяц: 24 000 ₽/);
  assert.match(text, /Рекламный бюджет.*отдельно/);
});
