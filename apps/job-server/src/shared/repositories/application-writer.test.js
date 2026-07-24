import assert from 'node:assert/strict';
import test from 'node:test';

import { ApplicationRepository } from './application-repository.js';

const sourceUrl = 'https://jobs.example/opening?role=platform&utm_source=mail';
const canonicalUrl = 'https://jobs.example/opening?role=platform';

function createRecordingD1Client() {
  const queries = [];
  return {
    queries,
    async query(sql, params = []) {
      queries.push({ params, sql });
      if (sql.trim().startsWith('SELECT')) {
        return [{ id: 'application-1', status: 'discovered' }];
      }
      return [];
    },
  };
}

test('persists a canonical URL when creating an application', async () => {
  const d1Client = createRecordingD1Client();
  const repository = new ApplicationRepository(d1Client);

  await repository.create({
    id: 'application-1',
    job_id: 'job-1',
    source: 'wanted',
    source_url: sourceUrl,
    position: 'Platform Engineer',
    company: 'Example',
  });

  const insert = d1Client.queries.find(({ sql }) => sql.includes('INSERT INTO applications'));
  assert.match(insert.sql, /source_url,\s+canonical_url/);
  assert.equal(insert.params[4], canonicalUrl);
});

test('updates the canonical URL when an application source URL changes', async () => {
  const d1Client = createRecordingD1Client();
  const repository = new ApplicationRepository(d1Client);

  await repository.update('application-1', { source_url: sourceUrl });

  const update = d1Client.queries.find(({ sql }) => sql.trim().startsWith('UPDATE applications'));
  assert.match(update.sql, /source_url = \?, canonical_url = \?/);
  assert.deepEqual(update.params.slice(0, 2), [sourceUrl, canonicalUrl]);
});
