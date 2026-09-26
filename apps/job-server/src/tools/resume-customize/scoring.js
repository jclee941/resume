/**
 * Scoring utilities for resume customization.
 */

import { normalize, unique } from './text-processing.js';

/**
 * @typedef {Object} ScorableCareer
 * @property {string} [project]
 * @property {string} [role]
 * @property {string} [description]
 * @property {string} [company]
 */

/**
 * @typedef {Object} ScorableProject
 * @property {string} [name]
 * @property {string} [role]
 * @property {string} [description]
 * @property {string[]} [technologies]
 * @property {string} [os]
 */

/**
 * @typedef {Object} SkillItem
 * @property {string} name
 * @property {string} [level]
 * @property {string} [category]
 * @property {number} [score]
 */

/**
 * @typedef {Object} SkillCategory
 * @property {string} [title]
 * @property {SkillItem[]} [items]
 */

/**
 * @typedef {Object} CategorySummary
 * @property {string | undefined} title
 * @property {number} matchedCount
 * @property {number} totalCount
 * @property {number} relevance
 */

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
 * @template {ScorableCareer} T
 * @param {T} career
 * @param {string[]} keywords
 * @returns {{ career: T, score: number, matched: string[] }}
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
 * @template {ScorableProject} T
 * @param {T} project
 * @param {string[]} keywords
 * @returns {{ project: T, score: number, matched: string[] }}
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
 * @param {Record<string, SkillCategory>} skills
 * @param {string[]} keywords
 * @returns {{ matched: Array<SkillItem & { score: number, category: string }>, unmatched: Array<SkillItem & { category: string }>, categories: Record<string, CategorySummary> }}
 */
export function scoreSkills(skills, keywords) {
  /** @type {Array<SkillItem & { score: number, category: string }>} */
  const matched = [];
  /** @type {Array<SkillItem & { category: string }>} */
  const unmatched = [];
  /** @type {Record<string, CategorySummary>} */
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
