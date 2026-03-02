/**
 * Scoring utilities for resume customization.
 */

import { normalize, unique } from './text-processing.js';

/**
 * Score a text block against keywords.
 * @param {string} text
 * @param {string[]} keywords
 * @returns {{ score: number, matched: string[] }}
 */
export function scoreText(text, keywords) {
  const normalized = normalize(text);
  const matched = keywords.filter((kw) => normalized.includes(kw));
  return { score: matched.length, matched: unique(matched) };
}

/**
 * Score a career entry against keywords.
 * @param {object} career
 * @param {string[]} keywords
 * @returns {{ career: object, score: number, matched: string[] }}
 */
export function scoreCareer(career, keywords) {
  const text = [
    career.project || '',
    career.role || '',
    career.description || '',
    career.company || '',
  ].join(' ');
  const { score, matched } = scoreText(text, keywords);
  return { career, score, matched };
}

/**
 * Score a project entry against keywords.
 * @param {object} project
 * @param {string[]} keywords
 * @returns {{ project: object, score: number, matched: string[] }}
 */
export function scoreProject(project, keywords) {
  const text = [
    project.name || '',
    project.description || '',
    project.role || '',
    ...(project.technologies || []),
    project.os || '',
  ].join(' ');
  const { score, matched } = scoreText(text, keywords);
  return { project, score, matched };
}

/**
 * Score and sort skills by relevance.
 * @param {object} skills
 * @param {string[]} keywords
 * @returns {{ matched: Array<{name: string, level: string, score: number}>, unmatched: Array<{name: string, level: string}>, categories: object }}
 */
export function scoreSkills(skills, keywords) {
  const matched = [];
  const unmatched = [];
  const categories = {};

  for (const [catKey, category] of Object.entries(skills || {})) {
    const catMatched = [];

    for (const item of category.items || []) {
      const { score } = scoreText(item.name, keywords);
      if (score > 0) {
        matched.push({ ...item, score, category: catKey });
        catMatched.push(item);
      } else {
        unmatched.push({ ...item, category: catKey });
      }
    }

    categories[catKey] = {
      title: category.title,
      matchedCount: catMatched.length,
      totalCount: (category.items || []).length,
      relevance: catMatched.length / Math.max((category.items || []).length, 1),
    };
  }

  matched.sort((a, b) => b.score - a.score);
  return { matched, unmatched, categories };
}
