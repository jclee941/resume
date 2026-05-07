import { readFileSync, existsSync } from 'fs';
import { getResumeMasterMarkdownPath } from '../../../utils/paths.js';
import { SKILL_CATEGORIES } from './skill-categories.js';

export function loadResume(resumePath) {
  const defaultPath = getResumeMasterMarkdownPath();
  const path = resumePath || defaultPath;

  if (!existsSync(path)) {
    throw new Error(`Resume not found: ${path}`);
  }

  return readFileSync(path, 'utf-8');
}

export function extractSkills(resumeText) {
  const skills = new Map();
  const lowerText = resumeText.toLowerCase();

  for (const [category, config] of Object.entries(SKILL_CATEGORIES)) {
    const found = [];
    for (const keyword of config.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        found.push(keyword);
      }
    }
    if (found.length > 0) {
      skills.set(category, {
        keywords: found,
        weight: config.weight,
        count: found.length,
      });
    }
  }

  return skills;
}

export function extractExperience(resumeText) {
  const match = resumeText.match(/총\s*경력[:\s]*(\d+)년\s*(\d+)?개월?/);
  if (match) {
    const years = parseInt(match[1], 10);
    const months = parseInt(match[2] || '0', 10);
    return years + months / 12;
  }

  const engMatch = resumeText.match(/(\d+)\+?\s*years?\s*(of\s*)?experience/i);
  if (engMatch) {
    return parseInt(engMatch[1], 10);
  }

  return 8;
}
