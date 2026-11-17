import test from 'node:test';
import assert from 'node:assert/strict';

let navigation = {};
try { navigation = await import('../dist/navigation.js'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('desktop case pages end with three real cards instead of empty space', () => {
  assert.equal(typeof navigation.getCasePageStarts, 'function', 'Переключение кейсов ещё не реализовано');
  assert.deepEqual(navigation.getCasePageStarts(8, 3), [0, 3, 5]);
  assert.deepEqual(navigation.getCasePageStarts(10, 3), [0, 3, 6, 7]);
  assert.deepEqual(navigation.getCasePageStarts(17, 3), [0, 3, 6, 9, 12, 14]);
  assert.deepEqual(navigation.getCasePageStarts(17, 2), [0, 2, 4, 6, 8, 10, 12, 14, 15]);
  assert.deepEqual(navigation.getCasePageStarts(2, 3), [0]);
});

test('phone case pages can reach each individual case', () => {
  assert.equal(typeof navigation.getCasePageStarts, 'function');
  assert.deepEqual(navigation.getCasePageStarts(8, 1), [0, 1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(navigation.getCasePageStarts(10, 1), [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(navigation.getCasePageStarts(17, 1), Array.from({ length: 17 }, (_, index) => index));
});

test('case arrows respect both ends and a position between pages', () => {
  assert.equal(typeof navigation.getAdjacentCaseStart, 'function');
  const starts = [0, 3, 5];
  assert.equal(navigation.getAdjacentCaseStart(starts, 0, -1), 0);
  assert.equal(navigation.getAdjacentCaseStart(starts, 0, 1), 3);
  assert.equal(navigation.getAdjacentCaseStart(starts, 1, -1), 0);
  assert.equal(navigation.getAdjacentCaseStart(starts, 3, 1), 5);
  assert.equal(navigation.getAdjacentCaseStart(starts, 5, 1), 5);
});
