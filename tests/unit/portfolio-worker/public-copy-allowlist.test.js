const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const {
  auditSource,
  diffJsonPointers,
  flattenJsonPointers,
  isAllowedPublicCopyPath,
  validateSourceMapBootstrap,
} = require('../../e2e/fixtures/public-copy-source-audit');
const {
  normalizePublicValue,
  occurrenceAddress,
} = require('../../e2e/fixtures/public-copy-ledger-extractor');
const {
  canonicalBaselineCommand,
  serializeBaseline,
  serializeCompactSorted,
  sha256,
  validateBaseline,
  validateBaselineReceipt,
} = require('../../e2e/fixtures/public-copy-ledger-serializer');

function baselineFixture() {
  const document = {
    version: 1,
    capturedAt: '2026-07-21T00:00:00.000Z',
    baseSha: 'a'.repeat(40),
    expectedHealthSha: 'a'.repeat(40),
    sourceUrl: 'https://resume.jclee.me',
    occurrences: [
      {
        locale: 'ko',
        route: '/ko/',
        state: 'initial',
        viewport: { key: 'desktop-1280x900', width: 1280, height: 900, dpr: 1 },
        kind: 'dom-text',
        selector: '#main-content',
        attribute: null,
        accessiblePath: null,
        occurrenceIndex: 0,
        value: '본문',
      },
    ],
  };
  const bytes = serializeBaseline(document);
  const command = canonicalBaselineCommand({
    baseSha: document.baseSha,
    sourceUrl: document.sourceUrl,
    output: '.omo/evidence/portfolio-copy-cleanup/ledger-baseline.json',
  });
  return {
    document,
    bytes,
    receipt: JSON.parse(
      serializeCompactSorted({
        version: 1,
        mode: 'baseline',
        baseSha: document.baseSha,
        liveHealthSha: document.expectedHealthSha,
        ledgerSha256: sha256(bytes),
        routes: ['/', '/ko/', '/en/', '/ja/'],
        occurrenceCount: document.occurrences.length,
        capturedAt: document.capturedAt,
        command,
      })
    ),
  };
}

function playwrightBaseUrl(overrides) {
  const script = "process.stdout.write(require('./playwright.config').use.baseURL)";
  const env = { ...process.env, SKIP_WEBSERVER: '1', PORTFOLIO_LEDGER_MODE: 'baseline' };
  delete env.PLAYWRIGHT_BASE_URL;
  delete env.PORTFOLIO_LEDGER_URL;
  const result = require('child_process').spawnSync(process.execPath, ['-e', script], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...env, ...overrides },
  });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout;
}

function hasForcedServerIsolation(config) {
  return (
    config.includes("process.env.PORTFOLIO_FORCE_NEW_SERVER === '1'") &&
    /reuseExistingServer:\s*forceNewServer\s*\?\s*false/.test(config)
  );
}

describe('public-copy ledger harness', () => {
  test('normalizes public values and includes accessiblePath in the address', () => {
    const occurrence = {
      locale: 'ko',
      route: '/ko/',
      state: 'initial',
      viewport: { key: 'desktop-1280x900', width: 1280, height: 900, dpr: 1 },
      kind: 'accessible-tree',
      selector: '#projects',
      attribute: null,
      accessiblePath: '/0/region~1name',
      occurrenceIndex: 0,
    };
    expect(normalizePublicValue('  A\u00a0 B\r\n C  ')).toBe('A B\nC');
    expect(occurrenceAddress(occurrence)).toContain('/0/region~1name');
  });

  test('serializes a canonical, validated baseline', () => {
    const { document } = baselineFixture();
    expect(validateBaseline(document)).toBe(document);
    expect(serializeBaseline(document)).toBe(`${JSON.stringify(document, null, 2)}\n`);
    expect(() => validateBaseline({ ...document, expectedHealthSha: 'b'.repeat(40) })).toThrow(
      'health SHA'
    );
  });

  test('rejects malformed or forged baseline receipts', () => {
    const { bytes, receipt } = baselineFixture();
    expect(validateBaselineReceipt(receipt, bytes)).toBe(receipt);
    expect(() => validateBaselineReceipt({ ...receipt, extra: true }, bytes)).toThrow(
      'receipt keys'
    );
    for (const mutation of [
      { baseSha: 'b'.repeat(40), liveHealthSha: 'b'.repeat(40) },
      { liveHealthSha: 'b'.repeat(40) },
      { capturedAt: '2026-07-21T00:00:01.000Z' },
      { occurrenceCount: 2 },
      { command: `${receipt.command} --grep baseline` },
    ])
      expect(() => validateBaselineReceipt({ ...receipt, ...mutation }, bytes)).toThrow();
    expect(() => validateBaselineReceipt(receipt, bytes.replace('본문', '위조'))).toThrow(
      'receipt ledger digest'
    );
    expect(() => validateBaselineReceipt(receipt, '{"version":2}\n')).toThrow();
  });

  test('ledger URL owns baseline navigation and conflicts fail explicitly', () => {
    expect(playwrightBaseUrl({ PORTFOLIO_LEDGER_URL: 'http://127.0.0.1:9' })).toBe(
      'http://127.0.0.1:9'
    );
    expect(() =>
      playwrightBaseUrl({
        PORTFOLIO_LEDGER_URL: 'http://127.0.0.1:9',
        PLAYWRIGHT_BASE_URL: 'https://resume.jclee.me',
      })
    ).toThrow(/conflict/i);
  });
});

describe('public-copy source audit allowlist', () => {
  test('flattens arrays to exact JSON pointers and compares scalar leaves', () => {
    expect([...flattenJsonPointers({ a: ['x', 'y'] }).entries()]).toEqual([
      ['/a/0', 'x'],
      ['/a/1', 'y'],
    ]);
    expect(diffJsonPointers({ a: 1 }, { a: 2 })).toEqual([{ pointer: '/a', before: 1, after: 2 }]);
    expect(diffJsonPointers({}, { a: null })).toEqual([
      { pointer: '/', before: {}, after: undefined },
      { pointer: '/a', before: undefined, after: null },
    ]);
    expect(diffJsonPointers({ a: [] }, { a: {} })).toEqual([
      { pointer: '/a', before: [], after: {} },
    ]);
  });

  test.each([
    ['/careers/0/role', true],
    ['/careers/0/projects/0/achievements/2', true],
    ['/personalProjects/4/fullStackEvidence/architectureSteps/3', true],
    ['/coverLetter/ko/paragraphs/4', true],
    ['/languages/0/name', true],
    ['/languages/0/level', true],
    ['/personalProjects/4/name', false],
    ['/careers/0/company', false],
    ['/education/school', false],
  ])('%s allowlist=%s', (pointer, expected) => {
    expect(isAllowedPublicCopyPath(pointer, 'ko')).toBe(expected);
  });

  test('English language names are immutable', () =>
    expect(isAllowedPublicCopyPath('/languages/0/name', 'en')).toBe(false));

  test('KO duplicate cover blocks require byte-equal native owners', () => {
    const before = { coverLetter: { en: { headline: 'old' }, ja: { headline: '旧' } } };
    const after = { coverLetter: { en: { headline: 'new' }, ja: { headline: '新' } } };
    expect(
      auditSource(before, after, 'ko', { en: after, ja: after }).every(({ allowed }) => allowed)
    ).toBe(true);
    expect(
      auditSource(before, after, 'ko', {
        en: { coverLetter: { en: { headline: 'different' } } },
        ja: { coverLetter: { ja: { headline: '異なる' } } },
      }).every(({ allowed }) => allowed)
    ).toBe(false);
    expect(isAllowedPublicCopyPath('/coverLetter/en/headline', 'ko')).toBe(false);
  });

  test('source-map bootstrap is exact and fail-closed', () => {
    const sourceMap = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'tests/e2e/fixtures/public-copy-source-map.json'), 'utf8')
    );
    expect(validateSourceMapBootstrap(sourceMap)).toBe(sourceMap);
    const ref = {
      sourceOwner: 'apps/portfolio/index.html',
      jsonPath: '$.title',
      sourceSpan: null,
      decisionId: 'shell.test',
      bindings: { title: { sourceOwner: 'x.json', jsonPath: '$.title', value: 'x' } },
      matchMode: 'whole',
      fragmentPath: null,
    };
    const entry = {
      locale: 'ko',
      route: '/ko/',
      state: 'initial',
      viewport: { key: 'desktop-1280x900', width: 1280, height: 900, dpr: 1 },
      kind: 'dom-text',
      selector: '#title',
      attribute: null,
      accessiblePath: null,
      occurrenceIndex: 0,
      beforeFragments: {},
      afterFragments: {},
      beforeSourceRefs: [ref],
      afterSourceRefs: [],
    };
    expect(validateSourceMapBootstrap({ version: 1, entries: [entry] })).toBeTruthy();
    for (const badRef of [
      { ...ref, decisionId: 42 },
      { ...ref, decisionId: '  ' },
      { ...ref, matchMode: 'fragment', fragmentPath: '' },
      { ...ref, bindings: { title: { ...ref.bindings.title, jsonPath: '/title' } } },
      { ...ref, sourceOwner: '/tmp/source.json' },
      { ...ref, sourceOwner: '../source.json' },
      { ...ref, jsonPath: "$.['" },
      { ...ref, matchMode: 'fragment', fragmentPath: '/missing' },
      { ...ref, bindings: { title: { ...ref.bindings.title, sourceOwner: '/tmp/x.json' } } },
      { ...ref, bindings: { title: { ...ref.bindings.title, sourceOwner: '../x.json' } } },
      { ...ref, bindings: { title: { ...ref.bindings.title, jsonPath: "$.['" } } },
      { ...ref, sourceOwner: 'C:/source.json' },
      { ...ref, sourceOwner: 'a\0b.json' },
      { ...ref, sourceOwner: 'a\nb.json' },
      { ...ref, sourceOwner: 'a\rb.json' },
    ]) {
      expect(() =>
        validateSourceMapBootstrap({
          version: 1,
          entries: [{ ...entry, beforeSourceRefs: [badRef] }],
        })
      ).toThrow();
    }
    const fragments = { f: { startUtf16: 0, endUtf16: 1, template: 'x' } };
    for (const fragmentPath of ['/f/template', '/f/startUtf16'])
      expect(() =>
        validateSourceMapBootstrap({
          version: 1,
          entries: [
            {
              ...entry,
              beforeFragments: fragments,
              beforeSourceRefs: [{ ...ref, matchMode: 'fragment', fragmentPath }],
            },
          ],
        })
      ).toThrow();
    for (const mutation of [
      { locale: 'en' },
      { state: 'future' },
      { kind: 'metadata', selector: 'meta:title' },
      { kind: 'jsonld', selector: 'jsonld:0:/~2' },
      { kind: 'manifest', selector: 'manifest:/manifest.json:/name~' },
      { kind: 'accessible-tree', accessiblePath: '/name~' },
      { kind: 'dom-attribute' },
    ])
      expect(() =>
        validateSourceMapBootstrap({ version: 1, entries: [{ ...entry, ...mutation }] })
      ).toThrow();
    expect(() => validateSourceMapBootstrap({ version: 1, entries: [entry, entry] })).toThrow();
    for (const invalid of [
      { version: 1, entries: [], extra: true },
      { version: 2, entries: [] },
      { version: 1, entries: [{}] },
    ])
      expect(() => validateSourceMapBootstrap(invalid)).toThrow();
  });

  // Base-diff audit only runs in the copy-review workflow, which supplies
  // PORTFOLIO_COPY_BASE_SHA. Skip it in the default suite instead of failing.
  const baseDiffTest = /^[0-9a-f]{40}$/.test(process.env.PORTFOLIO_COPY_BASE_SHA || '')
    ? test
    : test.skip;
  baseDiffTest('the repository remains unchanged relative to the supplied base', () => {
    const baseSha = process.env.PORTFOLIO_COPY_BASE_SHA;
    expect(baseSha).toMatch(/^[0-9a-f]{40}$/);
    const files = [
      'packages/data/resumes/master/resume_data.json',
      'packages/data/resumes/master/resume_data_en.json',
      'packages/data/resumes/master/resume_data_ja.json',
    ];
    const afterDocuments = Object.fromEntries(
      files.map((file) => [
        file.endsWith('_en.json') ? 'en' : file.endsWith('_ja.json') ? 'ja' : 'ko',
        JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8')),
      ])
    );
    for (const file of files) {
      const before = JSON.parse(
        require('child_process').execFileSync('git', ['show', `${baseSha}:${file}`], {
          cwd: ROOT,
          encoding: 'utf8',
        })
      );
      const after = JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8'));
      const locale = file.endsWith('_en.json') ? 'en' : file.endsWith('_ja.json') ? 'ja' : 'ko';
      const rejected = auditSource(before, after, locale, afterDocuments).filter(
        ({ allowed }) => !allowed
      );
      expect(rejected).toEqual([]);
    }
  });
});

describe('ledger prerequisites', () => {
  test('yaml is a pinned direct dev dependency', () => {
    const packageJson = require('../../../package.json');
    expect(packageJson.devDependencies.yaml).toBe('2.9.0');
  });

  test('force-new-server disables Playwright server reuse explicitly', () => {
    const config = fs.readFileSync(path.join(ROOT, 'playwright.config.js'), 'utf8');
    expect(hasForcedServerIsolation(config)).toBe(true);
    expect(
      hasForcedServerIsolation(
        config.replace(
          /reuseExistingServer:\s*forceNewServer\s*\?\s*false\s*:\s*!process\.env\.CI/,
          'reuseExistingServer: !process.env.CI'
        )
      )
    ).toBe(false);
    expect(
      hasForcedServerIsolation(
        config.replace("process.env.PORTFOLIO_FORCE_NEW_SERVER === '1'", 'false')
      )
    ).toBe(false);
  });
});
