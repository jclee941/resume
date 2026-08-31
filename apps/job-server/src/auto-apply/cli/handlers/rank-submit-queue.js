export function buildSubmitQueue(candidates, options = {}) {
  const tiers = options.tiers || ['auto'];
  return candidates
    .filter((job) => tiers.includes(job.tier))
    .map((job) => ({
      id: job.id,
      company: job.company,
      position: job.position,
      source: job.source,
      location: job.location || '',
      url: job.sourceUrl || '',
      loginPlatform: job.source,
      needsHumanLogin: true,
      status: 'ready-pending-review',
      matchScore: job.matchPercentage,
      matchPercentage: job.matchPercentage,
      tier: job.tier,
    }));
}
