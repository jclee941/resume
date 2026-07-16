const { EventEmitter } = require('node:events');
const { mkdtemp, readFile, readdir, rm, writeFile } = require('node:fs/promises');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { before, describe, test } = require('node:test');

const ASSERTIONS = {
  'categories:performance': ['error', { minScore: 0.9 }],
  'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
  'max-potential-fid': ['error', { maxNumericValue: 100 }],
};

function lhr({ performance = 0.95, lcp = 1900, mpfid = 50 } = {}) {
  return {
    categories: { performance: { score: performance } },
    audits: {
      'largest-contentful-paint': { numericValue: lcp },
      'max-potential-fid': { numericValue: mpfid },
    },
  };
}

describe('Lighthouse fail-closed evidence contract', () => {
  let contract;

  before(async () => {
    contract = await import('../../verification/lighthouse-contract.mjs');
  });

  test('fails when any error-level metric is missing while preserving null run indexes', () => {
    const summary = contract.summarizeProfile(
      'mobile',
      [lhr({ lcp: null }), lhr({ lcp: null }), lhr({ lcp: 1800 })],
      ASSERTIONS
    );
    assert.equal(summary.medians['largest-contentful-paint'], 1800);
    assert.deepEqual(
      summary.runMetrics.map((run) => run.metrics['largest-contentful-paint']),
      [null, null, 1800]
    );
    assert.equal(summary.failures.length, 2);
    assert.match(summary.failures[0], /run 1.*metric unavailable/);
  });

  test('keeps numeric run outliers non-gating under the three-run median policy', () => {
    const summary = contract.summarizeProfile(
      'mobile',
      [50, 150, 50].map((mpfid) => lhr({ mpfid })),
      ASSERTIONS
    );
    assert.equal(summary.medians['max-potential-fid'], 50);
    assert.deepEqual(summary.failures, []);
    assert.deepEqual(
      summary.runOutliers.filter((item) => item.key === 'max-potential-fid'),
      [
        {
          run: 2,
          key: 'max-potential-fid',
          value: 150,
          level: 'error',
          message: '[mobile run 2] max-potential-fid: 150.00 > maxNumericValue 100',
        },
      ]
    );
  });

  test('binds desktop and mobile audits to explicit form-factor identities', () => {
    const desktop = contract.profileAuditSettings('desktop', {
      screenEmulation: { mobile: false },
    });
    const mobile = contract.profileAuditSettings('mobile', { screenEmulation: { mobile: true } });
    assert.equal(desktop.formFactor, 'desktop');
    assert.match(desktop.emulatedUserAgent, /X11; Linux x86_64/);
    assert.equal(mobile.formFactor, 'mobile');
    assert.match(mobile.emulatedUserAgent, /Mobile/);
    assert.doesNotThrow(() => contract.assertLhrIdentity('desktop', { configSettings: desktop }));
    assert.throws(
      () => contract.assertLhrIdentity('desktop', { configSettings: mobile }),
      /identity/
    );
    const summary = contract.summarizeProfile(
      'desktop',
      [{ ...lhr(), configSettings: desktop }],
      ASSERTIONS
    );
    assert.deepEqual(summary.auditIdentities, [
      {
        formFactor: 'desktop',
        mobile: false,
        emulatedUserAgent: desktop.emulatedUserAgent,
      },
    ]);
  });

  test('defaults both profiles to local targets and rejects remote URLs without opt-in', async () => {
    const config = JSON.parse(await readFile('tools/lighthouserc.json', 'utf8'));
    assert.deepEqual(config.ci.collect.url, ['http://127.0.0.1:18825']);
    assert.deepEqual(config.ci.collectMobile.url, ['http://127.0.0.1:18825']);
    assert.deepEqual(contract.validateAuditUrls(['http://127.0.0.1:18825'], false), [
      'http://127.0.0.1:18825',
    ]);
    assert.throws(() => contract.validateAuditUrls(['https://resume.jclee.me'], false), /local/);
    assert.doesNotThrow(() => contract.validateAuditUrls(['https://resume.jclee.me'], true));
  });

  test('validates report formats before writing and rejects incomplete inventory', async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), 'lighthouse-report-'));
    try {
      await assert.rejects(
        contract.writeReportPair(output, 'mobile', 0, ['{bad', '<html></html>']),
        /JSON/
      );
      await assert.rejects(
        contract.writeReportPair(output, 'mobile', 0, ['{}', 'not html']),
        /HTML/
      );
      await contract.writeReportPair(output, 'mobile', 0, [
        '{}',
        '<!-- @license Apache-2.0 --><!doctype html><html></html>',
      ]);
      await assert.rejects(
        contract.assertReportInventory(output, [
          'mobile-run-1.report.json',
          'mobile-run-1.report.html',
          'summary.json',
        ]),
        /inventory/
      );
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });

  test('removes every stale artifact before a run and accepts only exact inventory', async () => {
    const output = await mkdtemp(path.join(os.tmpdir(), 'lighthouse-stale-'));
    try {
      await writeFile(path.join(output, 'desktop-run-4.report.json'), '{}');
      await writeFile(path.join(output, 'unrelated.txt'), 'stale');
      await contract.prepareOutputDir(output);
      assert.deepEqual(await readdir(output), []);
      for (const file of [
        'desktop-run-1.report.json',
        'desktop-run-1.report.html',
        'summary.json',
      ]) {
        await writeFile(path.join(output, file), file.endsWith('.html') ? '<html></html>' : '{}');
      }
      await contract.assertReportInventory(output, [
        'desktop-run-1.report.json',
        'desktop-run-1.report.html',
        'summary.json',
      ]);
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  });

  test('bounds hung work and cleans once on SIGINT or SIGTERM', async () => {
    await assert.rejects(
      contract.withTimeout(new Promise(() => {}), 5, 'audit'),
      /audit timed out/
    );
    const target = new EventEmitter();
    const controller = new AbortController();
    let cleanups = 0;
    const lifecycle = contract.installSignalHandlers(target, controller, async () => {
      cleanups += 1;
    });
    target.emit('SIGTERM');
    await lifecycle.done;
    target.emit('SIGINT');
    assert.equal(controller.signal.aborted, true);
    assert.equal(cleanups, 1);
    lifecycle.dispose();
  });
});
