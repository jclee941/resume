export function convertParams(source, params) {
  const converted = {
    limit: params.limit || 20,
    offset: params.offset || 0,
  };

  if (params.experience !== undefined) {
    converted.years = params.experience;
    converted.experience = params.experience;
  }

  if (params.location) {
    converted.locations = params.location;
    converted.location = params.location;
  }

  if (source === 'wanted' && params.categories?.length > 0) {
    converted.tag_type_ids = params.categories;
  }

  return converted;
}

export function deduplicateJobs(jobs) {
  const seen = new Map();

  return jobs.filter((job) => {
    const key = `${job.company?.toLowerCase()?.trim()}_${job.position?.toLowerCase()?.trim()}`;

    if (seen.has(key)) {
      const existing = seen.get(key);
      if (job.source === 'wanted' && existing.source !== 'wanted') {
        seen.set(key, job);
        return true;
      }
      return false;
    }

    seen.set(key, job);
    return true;
  });
}
