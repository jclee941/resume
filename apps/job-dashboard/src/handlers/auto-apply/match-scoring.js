export function calculateMatchScore(job, config) {
  const keywords = Array.isArray(config) ? config : config?.keywords || [];
  let score = 50;

  const titleLower = (job.position || job.title || '').toLowerCase();
  const descLower = (job.description || '').toLowerCase();
  const techStack = job.techStack || job.skills || [];
  const skillsLower = techStack.map((s) =>
    (typeof s === 'string' ? s : s?.name || '').toLowerCase()
  );

  for (const keyword of keywords) {
    const kw = keyword.toLowerCase();
    if (titleLower.includes(kw)) {
      score += 15;
    }
    if (skillsLower.some((s) => s.includes(kw))) {
      score += 10;
    }
    if (descLower.includes(kw)) {
      score += 5;
    }
  }

  const preferredSkills = [
    'kubernetes',
    'docker',
    'terraform',
    'aws',
    'devops',
    'security',
    'ci/cd',
    'linux',
  ];
  for (const skill of preferredSkills) {
    if (titleLower.includes(skill) || skillsLower.some((s) => s.includes(skill))) {
      score += 5;
    }
  }

  return Math.min(100, score);
}
