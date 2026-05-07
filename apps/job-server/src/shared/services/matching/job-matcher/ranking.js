import { loadResume, extractSkills, extractExperience } from './resume-analysis.js';
import { calculateMatchScore } from './scoring.js';

export function filterAndRankJobs(jobs, options = {}) {
  const { resumePath, minScore = 50, maxResults = 20, excludeCompanies = [] } = options;

  const resumeText = loadResume(resumePath);
  const resumeSkills = extractSkills(resumeText);
  const resumeExperience = extractExperience(resumeText);

  const scoredJobs = jobs
    .filter(
      (job) =>
        !excludeCompanies.some((company) =>
          (job.company || '').toLowerCase().includes(company.toLowerCase())
        )
    )
    .map((job) => {
      const match = calculateMatchScore(job, resumeSkills, resumeExperience);
      return {
        ...job,
        matchScore: match.score,
        matchPercentage: match.percentage,
        matchDetails: match.details,
      };
    })
    .filter((job) => job.matchPercentage >= minScore)
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, maxResults);

  return {
    jobs: scoredJobs,
    resumeAnalysis: {
      experience: resumeExperience,
      skillCategories: Array.from(resumeSkills.keys()),
      totalSkills: Array.from(resumeSkills.values()).reduce((sum, skill) => sum + skill.count, 0),
    },
  };
}

export function prioritizeApplications(scoredJobs) {
  return scoredJobs.map((job, index) => {
    let priority = 'low';
    const reason = [];

    if (job.matchPercentage >= 85) {
      priority = 'high';
      reason.push('높은 매칭률');
    } else if (job.matchPercentage >= 70) {
      priority = 'medium';
      reason.push('적정 매칭률');
    }

    if (job.due_date) {
      const dueDate = new Date(job.due_date);
      const daysLeft = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
      if (daysLeft <= 7 && daysLeft > 0) {
        priority = 'high';
        reason.push(`마감 ${daysLeft}일 남음`);
      }
    }

    if (job.matchDetails?.bonusPoints?.includes('주요 기업')) {
      if (priority !== 'high') priority = 'medium';
      reason.push('주요 기업');
    }

    return {
      ...job,
      applicationPriority: priority,
      priorityReason: reason,
      rank: index + 1,
    };
  });
}
