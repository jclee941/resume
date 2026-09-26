import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { evaluateAuditReport } from '../audit-production-dependencies.mjs';

function vulnerability(name, severity) {
  return {
    name,
    severity,
    isDirect: true,
    via: [
      {
        name,
        dependency: name,
        url: `https://github.com/advisories/GHSA-${name}`,
        severity,
      },
    ],
    effects: [],
    nodes: [`node_modules/${name}`],
  };
}

describe('production dependency audit policy', () => {
  it('passes when no high or critical advisories remain', () => {
    const result = evaluateAuditReport({
      auditReportVersion: 2,
      vulnerabilities: { 'minor-package': vulnerability('minor-package', 'moderate') },
    });

    assert.deepEqual(result, { violations: [] });
  });

  it('rejects every high or critical advisory', () => {
    const result = evaluateAuditReport({
      auditReportVersion: 2,
      vulnerabilities: {
        'high-package': vulnerability('high-package', 'high'),
        'critical-package': vulnerability('critical-package', 'critical'),
      },
    });

    assert.deepEqual(result.violations, [
      'high-package: high vulnerability',
      'critical-package: critical vulnerability',
    ]);
  });

  it('surfaces npm audit errors instead of a generic shape error', () => {
    assert.throws(
      () => evaluateAuditReport({ error: { code: 'EALLOWSCRIPTS', summary: 'not allowed' } }),
      /npm audit failed: EALLOWSCRIPTS not allowed/u
    );
  });

  it('rejects malformed audit output', () => {
    assert.throws(() => evaluateAuditReport({ auditReportVersion: 2 }), /vulnerabilities object/u);
    assert.throws(
      () => evaluateAuditReport({ vulnerabilities: { broken: { severity: 'high' } } }),
      /broken is malformed/u
    );
  });
});
