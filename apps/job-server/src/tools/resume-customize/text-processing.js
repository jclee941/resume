/**
 * Text processing utilities for resume customization.
 */

export const STOPWORDS = new Set([
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
  'are',
  'is',
  'was',
  'been',
  'can',
  'about',
  'job',
  'role',
  'team',
  'work',
  'years',
  'year',
  'able',
  'must',
  'also',
  'including',
  'such',
  'using',
  'within',
  'across',
  'related',
  'based',
  'experience',
  'preferred',
  'required',
  'minimum',
  'plus',
  'strong',
  '경력',
  '경험',
  '업무',
  '및',
  '에서',
  '우대',
  '필수',
  '이상',
  '등',
  '담당',
  '관련',
  '보유',
  '가능',
  '지원',
  '채용',
  '모집',
]);

export const KR_STOPWORDS = new Set([
  '합니다',
  '입니다',
  '있는',
  '하는',
  '되는',
  '위한',
  '통한',
  '대한',
  '기반',
  '환경',
  '시스템',
  '서비스',
  '프로젝트',
  '개발',
  '운영',
]);

/**
 * Normalize text for keyword extraction.
 * @param {string} value
 * @returns {string}
 */
export function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣+#./\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenize text into filterable keyword array.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  return normalize(text)
    .split(/\s+/)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t) && !KR_STOPWORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * Deduplicate array preserving order.
 * @param {string[]} arr
 * @returns {string[]}
 */
export function unique(arr) {
  return [...new Set(arr)];
}

/**
 * Extract keywords from raw job description text.
 * @param {string} jobDescription
 * @param {number} [topN]
 * @returns {{ keywords: string[], sections: { requirements: string[], preferred: string[], responsibilities: string[] } }}
 */
export function extractKeywords(jobDescription, topN) {
  const text = String(jobDescription || '');

  const requirementsMatch = text.match(
    /(?:자격\s*요건|requirements?|필수\s*조건|qualifications?)[\s:：\n]*([\s\S]*?)(?=(?:우대|preferred|responsibilities|담당|$))/i
  );
  const preferredMatch = text.match(
    /(?:우대\s*사항|우대\s*조건|preferred|nice\s*to\s*have|bonus)[\s:：\n]*([\s\S]*?)(?=(?:담당|responsibilities|복리|benefits|$))/i
  );
  const responsibilitiesMatch = text.match(
    /(?:담당\s*업무|responsibilities|주요\s*업무|what\s*you.ll\s*do)[\s:：\n]*([\s\S]*?)(?=(?:자격|requirements|필수|qualifications|$))/i
  );

  const sections = {
    requirements: requirementsMatch ? tokenize(requirementsMatch[1]) : [],
    preferred: preferredMatch ? tokenize(preferredMatch[1]) : [],
    responsibilities: responsibilitiesMatch ? tokenize(responsibilitiesMatch[1]) : [],
  };

  const allKeywords = unique([
    ...tokenize(text),
    ...sections.requirements,
    ...sections.preferred,
    ...sections.responsibilities,
  ]);

  return {
    keywords: typeof topN === 'number' && topN > 0 ? allKeywords.slice(0, topN) : allKeywords,
    sections,
  };
}
