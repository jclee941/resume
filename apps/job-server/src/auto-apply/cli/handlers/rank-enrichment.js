function recordStat(stats, source, status) {
  const key = source || 'unknown';
  if (!stats[key]) stats[key] = { success: 0, empty: 0, failed: 0, skipped: 0 };
  stats[key][status] += 1;
}

export function mergeDetailIntoJob(job, detail) {
  if (!detail || detail.success === false) return job;
  const d = detail.job || detail;
  const longest = (a, b) => ((b || '').length > (a || '').length ? b : a);
  return {
    ...job,
    description: job.description && job.description.length ? job.description : d.description || '',
    requirements:
      job.requirements && job.requirements.length ? job.requirements : d.requirements || '',
    techStack:
      Array.isArray(job.techStack) && job.techStack.length
        ? job.techStack
        : Array.isArray(d.techStack)
          ? d.techStack
          : [],
    benefits: longest(job.benefits, d.benefits),
    preferredPoints: longest(job.preferredPoints, d.preferredPoints),
  };
}

export async function enrichTopJobs(crawler, jobs) {
  const enriched = [];
  const stats = {};
  for (const job of jobs) {
    const hasText = (job.description || '').length > 0 || (job.requirements || '').length > 0;
    if (hasText || !job.id) {
      recordStat(stats, job.source, 'skipped');
      enriched.push({ ...job, enrichmentStatus: 'skipped' });
      continue;
    }
    try {
      const detail = await crawler.getJobDetail(job.id);
      const merged = mergeDetailIntoJob(job, detail);
      const ok = (merged.description || '').length || (merged.requirements || '').length;
      const status = ok ? 'success' : 'empty';
      recordStat(stats, job.source, status);
      enriched.push({ ...merged, enrichmentStatus: status });
    } catch (error) {
      recordStat(stats, job.source, 'failed');
      enriched.push({ ...job, enrichmentStatus: 'failed', enrichmentError: error.message });
    }
  }
  return { jobs: enriched, stats };
}
