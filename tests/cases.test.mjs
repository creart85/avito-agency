import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { caseStudies } from '../dist/cases-data.js';
import { caseGalleries } from '../dist/gallery.js';
import { renderCasesSection, renderCaseStudy } from '../build-cases.mjs';

test('all seventeen supplied projects have complete stories and their own available evidence', () => {
  assert.equal(caseStudies.length, 17);
  assert.equal(new Set(caseStudies.map(study => study.id)).size, 17);
  assert.equal(new Set(caseStudies.map(study => study.galleryId)).size, 17);
  const frames = caseStudies.flatMap(study => {
    for (const field of ['task', 'work', 'result', 'benefit', 'category', 'summary', 'note']) {
      assert.ok(study[field]?.trim(), `${study.id}: missing ${field}`);
    }
    assert.ok(study.images[study.coverIndex ?? 0]);
    assert.deepEqual(caseGalleries[study.galleryId].items, study.images);
    return study.images;
  });
  assert.equal(frames.length, 40);
  assert.equal(new Set(frames.map(frame => frame.src)).size, 40);
  for (const frame of frames) {
    assert.match(frame.src, /^\.\/assets\/case-studies\/[a-z0-9-]+\.(png|jpg)$/);
    assert.ok(fs.existsSync(new URL(`../dist/${frame.src}`, import.meta.url)), frame.src);
    assert.ok(frame.caption && frame.alt && frame.width > 0 && frame.height > 0);
  }
});

test('published static stories and screenshot links stay synchronized with the catalog', () => {
  const html = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  const section = html.match(/<!-- CASES:START -->\n([\s\S]*?)\n    <!-- CASES:END -->/)?.[1];
  assert.equal(section, renderCasesSection(), 'Run node build-cases.mjs after editing the case catalog');
});

test('private source references and editorial notes do not enter public case content', () => {
  const publicCopy = JSON.stringify(caseStudies) + renderCasesSection();
  assert.doesNotMatch(publicCopy, /drive\.google|docs\.google|source-\d+|внутренн[а-я]*\s+заметк/iu);
});

test('case prose is escaped before it becomes HTML', () => {
  const input = { ...caseStudies[0], summary: '<script>alert("unsafe")</script> & текст' };
  const rendered = renderCaseStudy(input);
  assert.doesNotMatch(rendered, /<script>/);
  assert.match(rendered, /&lt;script&gt;alert\(&quot;unsafe&quot;\)&lt;\/script&gt; &amp; текст/);
});
