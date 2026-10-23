import assert from 'node:assert/strict';
import { test } from 'node:test';

import { fakeHtml } from '../fixtures/html-faker.mjs';

const pageScript = `<script>
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') toggle.dataset.mobileNavBound = 'true';
  });
</script>`;

test('keeps inline page scripts byte for byte', () => {
  const html = `<html><body><p>Operated the security platform</p>${pageScript}</body></html>`;
  const fake = fakeHtml(html);
  assert.ok(fake.includes(pageScript));
  assert.ok(!fake.includes('Operated the security platform'));
});

test('still fakes JSON-LD values', () => {
  const jsonLd =
    '<script type="application/ld+json">{"@type":"Person","name":"Kim Minsu"}</script>';
  const fake = fakeHtml(`<html><head>${jsonLd}</head></html>`);
  assert.ok(fake.includes('"@type"'));
  assert.ok(!fake.includes('Kim Minsu'));
});
