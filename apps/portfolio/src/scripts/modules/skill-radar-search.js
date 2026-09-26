import { skillCountText } from './skill-radar-data.js';

/**
 * @param {NodeListOf<HTMLElement>} cards
 * @param {string} searchTerm
 * @returns {number}
 */
function filterSkills(cards, searchTerm) {
  let matchCount = 0;

  cards.forEach((card) => {
    const matchesDomain = /** @type {string} */ (
      /** @type {HTMLElement} */ (card.querySelector('.skill-domain-card__title')).textContent
    )
      .toLowerCase()
      .includes(searchTerm);
    let domainCount = 0;

    /** @type {NodeListOf<HTMLElement>} */ (card.querySelectorAll('.skill-item')).forEach(
      (item) => {
        const matches =
          matchesDomain ||
          /** @type {string} */ (item.dataset.skill).toLowerCase().includes(searchTerm);
        item.style.display = matches ? '' : 'none';
        if (matches) domainCount++;
      }
    );
    /** @type {NodeListOf<HTMLElement>} */ (card.querySelectorAll('.skill-evidence-item')).forEach(
      (item) => {
        const matches =
          matchesDomain ||
          /** @type {string} */ (item.dataset.skill).toLowerCase().includes(searchTerm);
        item.style.display = matches ? '' : 'none';
      }
    );

    card.style.display = domainCount > 0 ? '' : 'none';
    matchCount += domainCount;
  });

  return matchCount;
}

export function initSkillSearch() {
  const searchInput = /** @type {HTMLInputElement | null} */ (
    document.getElementById('skill-search-input')
  );
  const grid = document.getElementById('skill-radar-grid');
  if (!searchInput || !grid) return;

  const cards = /** @type {NodeListOf<HTMLElement>} */ (
    grid.querySelectorAll('.skill-domain-card')
  );
  const counter = document.getElementById('skill-search-count');
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  const noResults = document.createElement('p');
  noResults.className = 'skill-radar__no-results';
  noResults.hidden = true;
  noResults.textContent = lang.startsWith('en')
    ? 'No matching skills. Try another keyword.'
    : lang.startsWith('ja')
      ? '一致するスキルがありません。別のキーワードをお試しください。'
      : '검색 결과가 없습니다. 다른 기술명으로 검색해 보세요.';
  grid.appendChild(noResults);

  const search = () => {
    const query = searchInput.value.toLowerCase().trim();
    const count = filterSkills(cards, query);
    noResults.hidden = !query || count > 0;
    if (counter) {
      const result = lang.startsWith('en')
        ? `${skillCountText(count)} found`
        : lang.startsWith('ja')
          ? `${skillCountText(count)}が見つかりました`
          : `${skillCountText(count)} 검색됨`;
      counter.textContent = query ? result : '';
    }
  };

  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let debounceTimer;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(search, 150);
  });
  searchInput.addEventListener('clear', () => {
    clearTimeout(debounceTimer);
    search();
  });
}
