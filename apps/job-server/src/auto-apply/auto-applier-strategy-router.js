export async function applyToJob(job) {
  const source = job.source;

  switch (source) {
    case 'wanted':
      return this.applyToWanted(job);
    case 'jobkorea':
      return this.applyToJobKorea(job);
    case 'saramin':
      return this.applyToSaramin(job);
    case 'linkedin':
      return this.applyToLinkedIn(job);
    default:
      return { success: false, error: `Unsupported source: ${source}` };
  }
}
