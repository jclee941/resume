import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { ApplicationRepository } from '../applications/application-repository.js';

class MemoryD1 {
  constructor() {
    this.rows = [];
  }

  prepare() {
    return new MemoryStatement(this);
  }
}

class MemoryStatement {
  constructor(db) {
    this.db = db;
    this.params = [];
  }

  bind(...params) {
    this.params = params;
    return this;
  }

  async first() {
    if (this.params.length === 1) {
      return this.db.rows.find((row) => row.id === this.params[0]) || null;
    }
    const [source, externalJobId, , payloadMarker, payloadHash, approvalMarker, approvalId] =
      this.params;
    return (
      this.db.rows.find(
        (row) =>
          row.source === source &&
          ((externalJobId && row.job_id === externalJobId) ||
            (payloadHash && row.notes?.includes(payloadMarker)) ||
            (approvalId && row.notes?.includes(approvalMarker)))
      ) || null
    );
  }

  async run() {
    assert.equal(this.params.length, 15);
    const [
      id,
      job_id,
      source,
      source_url,
      position,
      company,
      location,
      match_score,
      status,
      priority,
      resume_id,
      cover_letter,
      notes,
      created_at,
      updated_at,
    ] = this.params;
    this.db.rows.push({
      id,
      job_id,
      source,
      source_url,
      position,
      company,
      location,
      match_score,
      status,
      priority,
      resume_id,
      cover_letter,
      notes,
      created_at,
      updated_at,
    });
    return { meta: { changes: 1 } };
  }
}

const payload = { company: 'Acme Security', position: 'Cloud Security Engineer' };
const now = '2026-06-12T00:00:00.000Z';
const baseRecord = {
  id: 'app_t13_first',
  source: 'greenhouse',
  externalJobId: 'gh_123',
  sourceUrl: 'https://boards.greenhouse.io/acme/jobs/gh_123',
  position: payload.position,
  company: payload.company,
  location: 'Remote',
  matchScore: 88,
  status: 'applied',
  priority: 'high',
  notes: 'ATS submitted after approval',
  payloadHash: createHash('sha256').update(JSON.stringify(payload)).digest('hex'),
  approvalId: 'approval_t13',
  createdAt: now,
  updatedAt: now,
};

const repository = new ApplicationRepository(new MemoryD1());
const first = await repository.recordAtsApplication(baseRecord);
assert.equal(first.status, 'recorded');

const duplicate = await repository.recordAtsApplication({
  ...baseRecord,
  id: 'app_t13_duplicate',
});
assert.equal(duplicate.status, 'already-applied');
assert.equal(duplicate.application.id, 'app_t13_first');

const otherSource = await repository.recordAtsApplication({
  ...baseRecord,
  id: 'app_t13_other_source',
  source: 'lever',
});
assert.equal(otherSource.status, 'recorded');

await assert.rejects(
  repository.recordAtsApplication({ ...baseRecord, id: 'app_t13_invalid', source: '' }),
  /source and dedupe key/
);

console.log('T13-PASS already-applied');
