import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { services, packages } from '../dist/data.js';

test('the public presentation matches the current calculator and both published PDF addresses', () => {
  const folder = new URL('../dist/assets/materials/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('presentation-manifest.json', folder), 'utf8'));
  const hash = value => createHash('sha256').update(value).digest('hex');
  assert.equal(manifest.catalogSha256, hash(JSON.stringify({ services, packages })), 'Refresh the presentation when calculator content changes');
  for (const name of ['agency-presentation.pdf', 'agency-presentation-2025.pdf']) {
    assert.equal(hash(fs.readFileSync(new URL(name, folder))), manifest.pdfSha256, name);
  }
});
