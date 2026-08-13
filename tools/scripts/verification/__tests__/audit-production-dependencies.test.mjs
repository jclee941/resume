import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateAuditReport } from '../audit-production-dependencies.mjs';

const acceptedReport = {
  auditReportVersion: 2,
  vulnerabilities: {
    '@cloudflare/puppeteer': {
      name: '@cloudflare/puppeteer',
      severity: 'high',
      isDirect: true,
      via: ['@puppeteer/browsers'],
      effects: [],
      nodes: ['node_modules/@cloudflare/puppeteer'],
    },
    '@puppeteer/browsers': {
      name: '@puppeteer/browsers',
      severity: 'high',
      isDirect: false,
      via: ['extract-zip'],
      effects: ['@cloudflare/puppeteer'],
      nodes: ['node_modules/@puppeteer/browsers'],
    },
    'extract-zip': {
      name: 'extract-zip',
      severity: 'high',
      isDirect: false,
      via: [
        {
          name: 'extract-zip',
          dependency: 'extract-zip',
          url: 'https://github.com/advisories/GHSA-jmr9-qjv8-65gv',
          severity: 'high',
        },
      ],
      effects: ['@puppeteer/browsers'],
      nodes: ['node_modules/extract-zip'],
    },
  },
};

describe('production dependency audit policy', () => {
  it('accepts only the documented Cloudflare Puppeteer advisory graph', () => {
    const result = evaluateAuditReport(structuredClone(acceptedReport));

    assert.deepEqual(result, {
      acceptedAdvisories: ['GHSA-jmr9-qjv8-65gv'],
      violations: [],
    });
  });

  it('rejects an additional high-severity advisory', () => {
    const report = structuredClone(acceptedReport);
    report.vulnerabilities['unexpected-package'] = {
      name: 'unexpected-package',
      severity: 'high',
      isDirect: true,
      via: [],
      effects: [],
      nodes: ['node_modules/unexpected-package'],
    };

    const result = evaluateAuditReport(report);

    assert.match(result.violations.join('\n'), /unexpected-package/u);
  });

  it('rejects changes to the accepted dependency path', () => {
    const report = structuredClone(acceptedReport);
    report.vulnerabilities['@puppeteer/browsers'].effects = ['different-parent'];

    const result = evaluateAuditReport(report);

    assert.match(result.violations.join('\n'), /@puppeteer\/browsers.*graph/u);
  });

  it('rejects malformed audit output', () => {
    assert.throws(
      () => evaluateAuditReport({ auditReportVersion: 2 }),
      /vulnerabilities object/u
    );
  });
});
