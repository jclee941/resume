/**
 * Cover letter fold: the headline, first paragraph and closing stay visible, and the remaining
 * paragraphs fold behind a button that states how many paragraphs it reveals, so the folded card
 * never reads as missing text. Without JavaScript every paragraph renders.
 */

/**
 * @param {number} count
 * @returns {{ more: string, less: string }}
 */
function foldLabels(count) {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) {
    return { more: `Read the remaining ${count} paragraphs`, less: 'Fold the cover letter' };
  }
  if (lang.startsWith('ja')) {
    return { more: `残り${count}段落を読む`, less: 'カバーレターを閉じる' };
  }
  return { more: `나머지 ${count}개 문단 읽기`, less: '커버레터 접기' };
}

/** @returns {void} */
export function initCoverLetterFold() {
  const list = document.querySelector('.cover-letter__paragraphs');
  if (!list) return;
  const folded = /** @type {HTMLLIElement[]} */ (
    Array.from(list.querySelectorAll('.cover-letter__para'))
  ).slice(1);
  if (folded.length < 2) return;

  if (!list.id) list.id = 'cover-letter-paragraphs';
  folded.forEach((paragraph) => {
    paragraph.hidden = true;
  });
  const labels = foldLabels(folded.length);

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'cover-letter__toggle';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-controls', list.id);
  button.textContent = labels.more;
  button.addEventListener('click', () => {
    const expanded = button.getAttribute('aria-expanded') !== 'true';
    folded.forEach((paragraph) => {
      paragraph.hidden = !expanded;
    });
    button.setAttribute('aria-expanded', String(expanded));
    button.textContent = expanded ? labels.less : labels.more;
  });
  list.insertAdjacentElement('afterend', button);
}
