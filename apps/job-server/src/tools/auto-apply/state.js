let sessionState = null;

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
  if (!sessionState) {
    sessionState = createDefaultState();
  }

  return sessionState;
}
