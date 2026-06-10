import { normalizeError } from '@resume/shared/errors';
import { appendDecisionTrace } from './decision-trace.js';

export async function primeWantedSession({ env, clients, getWantedSession }) {
  const wantedCookies = await getWantedSession(env);
  if (wantedCookies) {
    clients.wanted.setCookies(wantedCookies);
  }
}

export async function searchPlatformJobs({
  clients,
  activePlatforms,
  searchKeywords,
  searchResults,
}) {
  const allJobs = [];
  const seen = new Set();

  for (const platform of activePlatforms) {
    const client = clients[platform];
    searchResults.byPlatform[platform] = {
      searched: 0,
      matched: 0,
      applied: 0,
    };

    for (const keyword of searchKeywords.slice(0, 5)) {
      try {
        const result = await client.searchJobs(keyword, { limit: 20 });
        const jobs = result.jobs || result || [];

        for (const job of jobs) {
          const uniqueId = `${job.source || platform}_${job.sourceId || job.id}`;
          if (!seen.has(uniqueId)) {
            seen.add(uniqueId);
            allJobs.push(
              appendDecisionTrace(
                {
                  ...job,
                  source: platform,
                  keyword,
                },
                {
                  stage: 'discovered',
                  outcome: 'included',
                  reason: 'search_result',
                  platform,
                  keyword,
                }
              )
            );
            searchResults.byPlatform[platform].searched++;
          }
        }
      } catch (err) {
        const normalized = normalizeError(err, {
          handler: 'AutoApply',
          action: 'search',
          platform,
          keyword,
        });
        console.error(
          `[AutoApply] ${platform} search failed for "${keyword}":`,
          normalized.message
        );
        searchResults.errors++;
      }
    }
  }

  return allJobs;
}
