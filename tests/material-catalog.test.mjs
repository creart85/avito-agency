import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs';

test('the client document keeps its original responsibilities and identical published PDF addresses', () => {
  const folder = new URL('../dist/assets/materials/', import.meta.url);
  const manifest = JSON.parse(fs.readFileSync(new URL('presentation-manifest.json', folder), 'utf8'));
  const hash = value => createHash('sha256').update(value).digest('hex');
  assert.equal(manifest.documentType, 'client-responsibilities');
  assert.equal(manifest.sourceSha256, '0d41cfefe1e70cbf648ce1a002817ae16dedd7bb5ef7565b40686a8c0a75c0ef');
  assert.deepEqual(manifest.primarySections, ['start-work', 'ongoing-work', 'out-of-scope', 'client-inputs', 'getting-started']);
  assert.equal(manifest.workstreamCount, 8);
  assert.equal(manifest.exclusionCount, 3);
  assert.equal(manifest.clientRequirementCount, 5);
  for (const name of ['agency-presentation.pdf', 'agency-presentation-2025.pdf']) {
    assert.equal(hash(fs.readFileSync(new URL(name, folder))), manifest.pdfSha256, name);
  }
});
