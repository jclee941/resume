export async function load(url, context, nextLoad) {
  if (url.endsWith('/src/shared/services/matching/ai-matcher.js')) {
    return {
      format: 'module',
      shortCircuit: true,
      source:
        'export async function matchJobsWithAI(...args) { return globalThis.__jobFilterMatchJobsWithAI(...args); }',
    };
  }

  return nextLoad(url, context);
}
