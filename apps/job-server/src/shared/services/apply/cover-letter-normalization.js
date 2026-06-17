const KOREAN_CHAR_PATTERN = /[가-힣]/g;
const ENGLISH_CHAR_PATTERN = /[a-zA-Z]/g;

export const DEFAULT_COVER_LETTER_OPTIONS = {
  language: 'auto',
  style: 'professional',
  useAI: true,
  cacheEnabled: true,
};

export function toSafeString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

export function normalizeJobId(job) {
  return job?.id ?? job?.job_id ?? job?.jobId ?? job?.sourceId ?? null;
}

export function detectJobLanguage(job) {
  const text = buildJobText(job);
  const koreanCount = (text.match(KOREAN_CHAR_PATTERN) || []).length;
  const englishCount = (text.match(ENGLISH_CHAR_PATTERN) || []).length;

  if (koreanCount === 0 && englishCount === 0) {
    return 'en';
  }

  return koreanCount >= englishCount ? 'ko' : 'en';
}

function buildJobText(job = {}) {
  const parts = [
    job.position,
    job.title,
    job.description,
    job.detail,
    job.preferred,
    job.benefits,
    job.intro,
    job.requirements,
    job.company?.name,
    job.company,
  ];

  return parts
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => toSafeString(value).trim())
    .filter(Boolean)
    .join(' ');
}
