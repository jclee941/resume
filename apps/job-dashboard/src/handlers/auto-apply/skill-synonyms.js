/**
 * Korean and English names of the same skill. Korean postings write 자동화, 클라우드 or 리눅스
 * where the scoring profile lists automation, cloud or linux, so each group matches as one skill.
 */
const SKILL_SYNONYM_GROUPS = [
  ['security', '보안'],
  ['devops', '데브옵스'],
  ['cloud', '클라우드'],
  ['linux', '리눅스'],
  ['automation', '자동화'],
  ['siem', '관제'],
];

/**
 * The configured skills as groups of terms that mean the same skill. A skill listed twice under
 * different names (보안 and security) is one group, so it is counted once.
 * @param {readonly string[]} skills normalized skill names
 * @returns {string[][]}
 */
export function skillTermGroups(skills) {
  /** @type {Map<string, string[]>} */
  const groups = new Map();
  for (const skill of skills) {
    const group = SKILL_SYNONYM_GROUPS.find((terms) => terms.includes(skill)) ?? [skill];
    groups.set(group[0], group);
  }
  return [...groups.values()];
}
