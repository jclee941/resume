/**
 * Earlier-roles disclosure for the career timeline: the most recent roles stay visible and
 * older roles carry `.timeline-node--older`, hidden until the button reveals them. Every role
 * stays in the DOM, and the button names how many roles it reveals.
 */

const VISIBLE_ROLES = 4;
const SHOW_OLDER_CLASS = 'is-older-visible';

/**
 * @param {number} count
 * @returns {{ more: string, less: string }}
 */
function olderRoleLabels(count) {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) {
    return { more: `Show ${count} earlier roles`, less: 'Hide earlier roles' };
  }
  if (lang.startsWith('ja')) {
    return { more: `以前の経歴${count}件を表示`, less: '以前の経歴を閉じる' };
  }
  return { more: `이전 경력 ${count}개 더 보기`, less: '이전 경력 접기' };
}

/**
 * @param {HTMLUListElement} timeline
 * @returns {void}
 */
export function initTimelineMore(timeline) {
  const older = Array.from(timeline.querySelectorAll('.timeline-node')).slice(VISIBLE_ROLES);
  if (older.length === 0) return;

  older.forEach((node) => node.classList.add('timeline-node--older'));
  if (!timeline.id) timeline.id = 'career-timeline';
  const labels = olderRoleLabels(older.length);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'timeline-more-btn';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', timeline.id);
  button.textContent = labels.more;
  button.addEventListener('click', () => {
    const expanded = timeline.classList.toggle(SHOW_OLDER_CLASS);
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? labels.less : labels.more;
  });

  const wrap = document.createElement('div');
  wrap.className = 'timeline-more';
  wrap.appendChild(button);
  timeline.insertAdjacentElement('afterend', wrap);
}
