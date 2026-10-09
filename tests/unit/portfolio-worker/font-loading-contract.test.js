const fs = require('fs');
const path = require('path');

/**
 * With `font-display: optional`, first visits that missed the ~100ms font block period kept the
 * platform fallback for the whole page. Visual tests force `font-display: block` before
 * screenshots, so this contract guards the shipped declarations.
 */
describe('portfolio web fonts load on first visits', () => {
  const workerPath = path.join(__dirname, '../../../apps/portfolio/worker.js');
  const PRELOADED_FACES = [
    'inter-v13-latin-regular',
    'inter-v13-latin-700',
    'ibm-plex-mono-v19-latin-regular',
    'ibm-plex-mono-v19-latin-500',
    'ibm-plex-mono-v19-latin-700',
  ];
  let worker;
  beforeAll(() => {
    worker = fs.readFileSync(workerPath, 'utf8');
  });

  test('every @font-face uses font-display: swap', () => {
    const values = [...worker.matchAll(/font-display:\s*([a-z-]+)/g)].map((match) => match[1]);
    expect(values.length).toBeGreaterThan(0);
    expect([...new Set(values)]).toEqual(['swap']);
  });

  test.each(PRELOADED_FACES)('%s is preloaded in every locale', (face) => {
    const link = `<link rel="preload" href="/assets/fonts/${face}.woff2" as="font" type="font/woff2" crossorigin>`;
    expect(worker.split(link).length - 1).toBe(3);
  });
});
