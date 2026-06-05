/**
 * Cover Letter Collapse Module
 *
 * The cover letter is 5 long paragraphs that dominate the page and largely
 * restate the career timeline. To cut clutter without losing information, keep
 * the headline + first paragraph + closing visible and collapse the remaining
 * paragraphs behind an accessible "전체 보기 / read full" toggle. Full text
 * stays in the DOM (SEO-safe, screen-reader accessible).
 */

function collapseLang() {
  const l = (document.documentElement.lang || 'ko').toLowerCase();
  if (l.startsWith('en')) return { more: 'Read full cover letter', less: 'Collapse' };
  if (l.startsWith('ja')) return { more: 'カバーレター全文', less: '閉じる' };
  return { more: '커버레터 전체 보기', less: '접기' };
}

export function initCoverLetterCollapse() {
  const list = document.querySelector('.cover-letter__paragraphs');
  if (!list) return;

  const paras = Array.from(list.querySelectorAll('.cover-letter__para'));
  // Only collapse when there is meaningful overflow (keep first paragraph).
  if (paras.length <= 2) return;

  const labels = collapseLang();
  const hidden = paras.slice(1); // keep paragraph 1, collapse the rest
  hidden.forEach((p) => {
    p.hidden = true;
  });

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'desc-toggle cover-letter__toggle';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.textContent = labels.more;

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const next = !expanded;
    hidden.forEach((p) => {
      p.hidden = !next;
    });
    toggle.setAttribute('aria-expanded', String(next));
    toggle.textContent = next ? labels.less : labels.more;
  });

  list.insertAdjacentElement('afterend', toggle);
}
