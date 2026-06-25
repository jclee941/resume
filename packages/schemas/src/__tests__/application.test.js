import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  applicationStatusSchema,
  applicationStatusWideSchema,
  VALID_APPLICATION_STATUSES,
  VALID_APPLICATION_STATUSES_WIDE,
  applicationCreateSchema,
  dashboardApplicationCreateSchema,
  dashboardApplicationUpdateSchema,
  dashboardStatusUpdateSchema,
} from '../application.js';

describe('canonical application schemas', () => {
  it('applicationStatusSchema covers the 10 dashboard statuses', () => {
    const allowed = [
      'pending',
      'saved',
      'applied',
      'viewed',
      'in_progress',
      'interview',
      'offer',
      'rejected',
      'withdrawn',
      'expired',
    ];
    assert.deepEqual(VALID_APPLICATION_STATUSES, allowed);
    for (const s of allowed) {
      assert.equal(applicationStatusSchema.parse(s), s);
    }
    assert.throws(() => applicationStatusSchema.parse('archived'));
  });

  it('applicationStatusWideSchema covers the 10 dashboard statuses', () => {
    const allowed = [
      'pending',
      'saved',
      'applied',
      'viewed',
      'in_progress',
      'interview',
      'offer',
      'rejected',
      'withdrawn',
      'expired',
    ];
    assert.deepEqual(VALID_APPLICATION_STATUSES_WIDE, allowed);
    for (const s of allowed) {
      assert.equal(applicationStatusWideSchema.parse(s), s);
    }
    assert.throws(() => applicationStatusWideSchema.parse('archived'));
  });

  it('applicationCreateSchema (canonical) requires jobId/platform/company/position', () => {
    const valid = applicationCreateSchema.safeParse({
      jobId: 1,
      platform: 'wanted',
      company: 'Acme',
      position: 'Engineer',
    });
    assert.equal(valid.success, true);

    const missing = applicationCreateSchema.safeParse({ company: 'Acme' });
    assert.equal(missing.success, false);
  });
});

describe('dashboardApplicationCreateSchema', () => {
  it('accepts inline shape', () => {
    const r = dashboardApplicationCreateSchema.safeParse({
      position: 'Engineer',
      company: 'Acme',
    });
    assert.equal(r.success, true, r.error?.message);
  });

  it('accepts { job: {...} } nested shape', () => {
    const r = dashboardApplicationCreateSchema.safeParse({
      job: { position: 'Engineer', company: 'Acme' },
      options: { priority: 'high' },
    });
    assert.equal(r.success, true, r.error?.message);
  });

  it('rejects missing position/title', () => {
    const r = dashboardApplicationCreateSchema.safeParse({ company: 'Acme' });
    assert.equal(r.success, false);
    assert.ok(r.error.issues.some((i) => /position\/title/.test(i.message)));
  });

  it('rejects missing company', () => {
    const r = dashboardApplicationCreateSchema.safeParse({ position: 'Engineer' });
    assert.equal(r.success, false);
    assert.ok(r.error.issues.some((i) => /company is required/.test(i.message)));
  });

  it('rejects position over 500 chars', () => {
    const r = dashboardApplicationCreateSchema.safeParse({
      position: 'x'.repeat(501),
      company: 'Acme',
    });
    assert.equal(r.success, false);
  });

  it('accepts the wide status enum', () => {
    const r = dashboardApplicationCreateSchema.safeParse({
      position: 'E',
      company: 'A',
      status: 'in_progress',
    });
    assert.equal(r.success, true);
  });

  it('validates sourceUrl format when nested in `job`', () => {
    const r = dashboardApplicationCreateSchema.safeParse({
      job: { position: 'E', company: 'A', sourceUrl: 'not-a-url' },
    });
    assert.equal(r.success, false);
  });
});

describe('dashboardApplicationUpdateSchema', () => {
  it('accepts empty body (passthrough)', () => {
    assert.equal(dashboardApplicationUpdateSchema.safeParse({}).success, true);
  });

  it('rejects priority outside enum', () => {
    const r = dashboardApplicationUpdateSchema.safeParse({ priority: 'urgent' });
    assert.equal(r.success, false);
  });

  it('rejects notes over 5000 chars', () => {
    const r = dashboardApplicationUpdateSchema.safeParse({ notes: 'x'.repeat(5001) });
    assert.equal(r.success, false);
  });
});

describe('dashboardStatusUpdateSchema', () => {
  it('requires status', () => {
    assert.equal(dashboardStatusUpdateSchema.safeParse({}).success, false);
  });

  it('accepts status from the wide enum', () => {
    assert.equal(dashboardStatusUpdateSchema.safeParse({ status: 'expired' }).success, true);
  });

  it('rejects status outside the wide enum', () => {
    assert.equal(dashboardStatusUpdateSchema.safeParse({ status: 'archived' }).success, false);
  });
});
