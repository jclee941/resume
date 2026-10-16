const { escapeHtml } = require('../template-sanitizer');

/**
 * @typedef {'ko' | 'en' | 'ja'} Locale
 * @typedef {{ more: string, less: string }} DisclosureLabels
 */

const COVER_FOLD_MIN_HIDDEN = 2;

/**
 * Server-rendered disclosure button; the client binds behaviour to it and never creates it.
 * @param {{ className: string, controls: string, labels: DisclosureLabels, inner?: string, names?: DisclosureLabels }} options
 * @returns {string}
 */
function renderDisclosureButton({ className, controls, labels, inner, names }) {
  const label = inner || escapeHtml(labels.more);
  const name = names
    ? ` aria-label="${escapeHtml(names.more)}" data-name-closed="${escapeHtml(names.more)}" data-name-open="${escapeHtml(names.less)}"`
    : '';
  return (
    `<button type="button" class="${className}" aria-expanded="false" aria-controls="${controls}"${name} ` +
    `data-label-closed="${escapeHtml(labels.more)}" data-label-open="${escapeHtml(labels.less)}">${label}</button>`
  );
}

/**
 * @param {number} extra
 * @param {boolean} withCaseStudies
 * @param {Locale} locale
 * @returns {DisclosureLabels}
 */
function projectMoreLabels(extra, withCaseStudies, locale) {
  if (locale === 'en') {
    return {
      more: withCaseStudies
        ? `Show ${extra} more projects and case studies`
        : `Show ${extra} more projects`,
      less: 'Show fewer',
    };
  }
  if (locale === 'ja') {
    return {
      more: withCaseStudies
        ? `他${extra}件のプロジェクトと詳細事例を表示`
        : `他${extra}件のプロジェクトを表示`,
      less: '閉じる',
    };
  }
  return {
    more: withCaseStudies ? `프로젝트 ${extra}개·심층 사례 더 보기` : `프로젝트 ${extra}개 더 보기`,
    less: '접기',
  };
}

/**
 * The "show more projects" disclosure that follows the project list. Korean pages also reveal
 * the case-study deep dives the client mounts there.
 * @param {string} projectCardsHtml
 * @param {Locale} locale
 * @returns {string}
 */
function generateProjectMore(projectCardsHtml = '', locale) {
  const extra = (projectCardsHtml.match(/data-project-extra="true"/g) || []).length;
  if (extra === 0) return '';
  const button = renderDisclosureButton({
    className: 'project-more-btn',
    controls: 'project-list',
    labels: projectMoreLabels(extra, locale === 'ko', locale),
  });
  return `<div class="project-more">${button}</div>`;
}

/**
 * @param {number} count
 * @param {Locale} locale
 * @returns {DisclosureLabels}
 */
function coverFoldLabels(count, locale) {
  if (locale === 'en') {
    return { more: `Read the remaining ${count} paragraphs`, less: 'Fold the cover letter' };
  }
  if (locale === 'ja') return { more: `残り${count}段落を読む`, less: 'カバーレターを閉じる' };
  return { more: `나머지 ${count}개 문단 읽기`, less: '커버레터 접기' };
}

/**
 * Folds every cover-letter paragraph after the first behind a server-rendered toggle.
 * @param {string} coverLetterHtml
 * @param {Locale} locale
 * @returns {string}
 */
function withCoverLetterFold(coverLetterHtml = '', locale) {
  const hidden = (coverLetterHtml.match(/class="cover-letter__para"/g) || []).length - 1;
  if (hidden < COVER_FOLD_MIN_HIDDEN || !coverLetterHtml.includes('</ol>')) return coverLetterHtml;
  const id = 'cover-letter-paragraphs';
  const button = renderDisclosureButton({
    className: 'cover-letter__toggle',
    controls: id,
    labels: coverFoldLabels(hidden, locale),
  });
  return coverLetterHtml
    .replace(
      '<ol class="cover-letter__paragraphs">',
      `<ol class="cover-letter__paragraphs" id="${id}" data-fold>`
    )
    .replace('</ol>', `</ol>${button}`);
}

module.exports = {
  renderDisclosureButton,
  generateProjectMore,
  withCoverLetterFold,
};
