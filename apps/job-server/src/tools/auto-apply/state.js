// P0-5 audit residual fix: replace module-level mutable singleton with closure-bound holder.
// Pattern matches commit cb37858 (docs/architecture/MONOREPO_REVIEW_2026-04-29.md P0-5).
const _sessionStateHolder = (() => {
  let v = null;
  return { get: () => v, set: (x) => { v = x; }, clear: () => { v = null; } };
})();

function createDefaultState() {
  return {
    jobsSearched: 0,
    jobsMatched: 0,
    jobsApplied: 0,
    jobsFailed: 0,
    applications: [],
    lastRunAt: null,
    preferences: {
      matchScoreThreshold: 75,
      dailyApplicationLimit: 20,
      preferredPlatforms: ['wanted'],
    },
  };
}

export function getSessionState() {
  if (!_sessionStateHolder.get()) {
    _sessionStateHolder.set(createDefaultState());
  }

  return _sessionStateHolder.get();
}
