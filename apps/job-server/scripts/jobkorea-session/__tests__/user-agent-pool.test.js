import assert from 'node:assert/strict';
import test from 'node:test';

import {
  JOBKOREA_BROWSER_PROFILES,
  pickJobKoreaBrowserProfile,
} from '../user-agent-pool.js';

test('JobKorea browser profile pool has multiple entries', () => {
  assert.ok(JOBKOREA_BROWSER_PROFILES.length >= 6);
});

test('picked browser profile belongs to the pool', () => {
  const selectedProfile = pickJobKoreaBrowserProfile();

  assert.ok(JOBKOREA_BROWSER_PROFILES.includes(selectedProfile));
});

test('injected random function selects profiles deterministically', () => {
  assert.equal(
    pickJobKoreaBrowserProfile({ randomFn: () => 0 }),
    JOBKOREA_BROWSER_PROFILES[0]
  );
  assert.equal(
    pickJobKoreaBrowserProfile({ randomFn: () => 0.5 }),
    JOBKOREA_BROWSER_PROFILES[Math.floor(JOBKOREA_BROWSER_PROFILES.length * 0.5)]
  );
  assert.equal(
    pickJobKoreaBrowserProfile({ randomFn: () => 0.999999 }),
    JOBKOREA_BROWSER_PROFILES[JOBKOREA_BROWSER_PROFILES.length - 1]
  );
});

test('empty browser profile pool fails loudly', () => {
  assert.throws(
    () => pickJobKoreaBrowserProfile({ profiles: [] }),
    /JobKorea browser profile pool is empty/
  );
});
