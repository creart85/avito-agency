import test from 'node:test';
import assert from 'node:assert/strict';

let gallery = {};
try { gallery = await import('../dist/gallery.js'); }
catch (error) { if (error.code !== 'ERR_MODULE_NOT_FOUND') throw error; }

test('the original screenshots keep their supplied case groups', () => {
  assert.equal(typeof gallery.getGalleryFrame, 'function', 'Галереи ещё не реализованы');
  assert.equal(gallery.getGalleryFrame('accounting').total, 1);
  for (const id of ['cosmetology', 'furniture', 'motorcycles']) {
    assert.equal(gallery.getGalleryFrame(id).total, 3);
  }
  assert.match(gallery.getGalleryFrame('furniture', 0).item.caption, /608/);
  assert.match(gallery.getGalleryFrame('furniture', 1).item.caption, /357/);
  assert.match(gallery.getGalleryFrame('cosmetology', 2).item.caption, /63/);
});

test('gallery bounds cannot move into another case or past the last screenshot', () => {
  assert.equal(typeof gallery.getGalleryFrame, 'function');
  const first = gallery.getGalleryFrame('motorcycles', -1);
  assert.equal(first.index, 0);
  assert.equal(first.hasPrevious, false);
  const last = gallery.getGalleryFrame('motorcycles', 3);
  assert.equal(last.index, 2);
  assert.equal(last.hasNext, false);
  assert.match(last.item.src, /motorcycles-03/);
  assert.equal(gallery.getGalleryFrame('accounting', 2).index, 0);
  assert.equal(gallery.getGalleryFrame('unknown'), null);
});
