const COMMON_STOPWORDS = new Set([
  'and',
  'the',
  'for',
  'with',
  'from',
  'that',
  'this',
  'have',
  'will',
  'your',
  'you',
  'our',
  'job',
  'role',
  'team',
  'work',
  'years',
  'year',
  '경력',
  '경험',
  '업무',
  '및',
  '에서',
]);

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function toTokens(value) {
  return normalize(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !COMMON_STOPWORDS.has(token));
}

export function unique(list) {
  return [...new Set(list)];
}

export function parseYears(totalExperience) {
  const value = String(totalExperience || '');
  const match = value.match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

export function collectResumeSkills(resumeData) {
  return Object.values(resumeData.skills || {}).flatMap((group) =>
    (group.items || []).map((item) => item.name)
  );
}

export function buildJobText(jobPosting) {
  const requirements = Array.isArray(jobPosting.requirements)
    ? jobPosting.requirements.join(' ')
    : String(jobPosting.requirements || '');

  return [
    jobPosting.position || jobPosting.title || '',
    requirements,
    jobPosting.description || '',
    jobPosting.detail || '',
    jobPosting.preferred || '',
    jobPosting.benefits || '',
  ].join(' ');
}

export function getMatchedSkills(resumeData, jobPosting) {
  const resumeSkills = collectResumeSkills(resumeData);
  const jobTokenSet = new Set(toTokens(buildJobText(jobPosting)));

  const scored = resumeSkills
    .map((skill) => {
      const skillTokens = toTokens(skill);
      const overlapCount = skillTokens.filter((token) => jobTokenSet.has(token)).length;
      return { skill, overlapCount };
    })
    .filter((item) => item.overlapCount > 0)
    .sort((a, b) => b.overlapCount - a.overlapCount)
    .map((item) => item.skill);

  return unique(scored).slice(0, 6);
}

export function inferDomain(resumeData) {
  const expertise = Array.isArray(resumeData.summary?.expertise)
    ? resumeData.summary.expertise
    : [];
  if (expertise.length > 0) {
    return expertise.join(', ');
  }

  const resumeSkills = collectResumeSkills(resumeData).slice(0, 3);
  if (resumeSkills.length > 0) {
    return resumeSkills.join(', ');
  }

  return 'infrastructure and automation';
}

export function getRelevantAchievements(resumeData, jobPosting) {
  const achievements = [];
  for (const career of resumeData.careers || []) {
    for (const project of career.projects || []) {
      for (const achievement of project.achievements || []) {
        achievements.push(achievement);
      }
    }
  }

  const jobTokens = new Set(toTokens(buildJobText(jobPosting)));
  return achievements
    .map((achievement) => ({
      text: achievement,
      score: toTokens(achievement).filter((token) => jobTokens.has(token)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((achievement) => achievement.text);
}
