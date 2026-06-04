import { pushField } from './validators.js';

const INTRO_CONTENT_LIMIT = 2000;

function buildIntroContent(coverLetter) {
  const paragraphs = Array.isArray(coverLetter?.paragraphs) ? coverLetter.paragraphs : [];
  if (paragraphs.length === 0) return '';
  return [...paragraphs, coverLetter?.closing || ''].filter(Boolean).join('\n\n').slice(0, INTRO_CONTENT_LIMIT);
}

export function mapIntroToFormFields(ssot, indices) {
  const coverLetter = ssot?.coverLetter?.ko;
  const paragraphs = Array.isArray(coverLetter?.paragraphs) ? coverLetter.paragraphs : [];
  if (paragraphs.length === 0) return [];

  const key = indices?.[0] || 'c1';
  const fields = [];
  pushField(fields, 'ResumeProfile.Index', key);
  pushField(fields, `ResumeProfile[${key}].Header`, String(coverLetter?.headline || '').slice(0, 50));
  pushField(fields, `ResumeProfile[${key}].Contents`, buildIntroContent(coverLetter));
  pushField(fields, 'InputStat.UserIntroduceInputStat', 'True');
  return fields;
}
