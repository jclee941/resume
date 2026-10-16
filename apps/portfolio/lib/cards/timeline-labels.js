/**
 * @typedef {'ko' | 'en' | 'ja'} Locale
 */

const TIMELINE_LABELS = {
  ko: {
    timeline: '경력 타임라인',
    phase: '단계',
    detail: '상세 내용',
    expand: '상세 보기',
    collapse: '접기',
    inProgress: '진행 중',
    inProgressAria: '현재 진행 중',
    phases: { 운영: '운영', 구축: '구축', 자동화: '자동화', 안정화: '안정화', 기초: '기초' },
  },
  en: {
    timeline: 'Career timeline',
    phase: 'Phase',
    detail: 'Details',
    expand: 'View details',
    collapse: 'Collapse',
    inProgress: 'In progress',
    inProgressAria: 'Currently in progress',
    phases: {
      운영: 'Operate',
      구축: 'Build',
      자동화: 'Automate',
      안정화: 'Stabilize',
      기초: 'Foundation',
    },
  },
  ja: {
    timeline: '経歴タイムライン',
    phase: 'フェーズ',
    detail: '詳細',
    expand: '詳細を見る',
    collapse: '閉じる',
    inProgress: '進行中',
    inProgressAria: '現在進行中',
    phases: { 운영: '運用', 구축: '構築', 자동화: '自動化', 안정화: '安定化', 기초: '基礎' },
  },
};

/** @type {Record<string, string>} */
const PHASE_ICONS = {
  운영: 'search',
  구축: 'layers',
  자동화: 'shield',
  안정화: 'sync',
  기초: 'automation',
};

/**
 * @param {number} count
 * @param {Locale} locale
 * @returns {{ more: string, less: string }}
 */
function olderRoleLabels(count, locale) {
  if (locale === 'en') return { more: `Show ${count} earlier roles`, less: 'Hide earlier roles' };
  if (locale === 'ja') return { more: `以前の経歴${count}件を表示`, less: '以前の経歴を閉じる' };
  return { more: `이전 경력 ${count}개 더 보기`, less: '이전 경력 접기' };
}

module.exports = { TIMELINE_LABELS, PHASE_ICONS, olderRoleLabels };
