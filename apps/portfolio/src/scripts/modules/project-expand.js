/**
 * Project Expand Module
 *
 * Progressively enhances the server-rendered #projects cards (from data.json)
 * so a recruiter can CLICK a card to expand it and see its functionality
 * visually — feature bullets + a tech-stack chip grid — instead of only a
 * GitHub link. The cards are server-rendered (lib/cards/projects.js); this
 * module reads the existing .project-description / .project-tech content and
 * restructures it into an accessible expand/collapse panel. No data is
 * duplicated client-side: the source of truth stays in the rendered DOM.
 */

function expandLang() {
  const l = (document.documentElement.lang || 'ko').toLowerCase();
  if (l.startsWith('en')) return 'en';
  if (l.startsWith('ja')) return 'ja';
  return 'ko';
}

const EXPAND_LABELS = {
  ko: { features: '주요 기능', stack: '기술 스택', expand: '기능 보기', collapse: '접기' },
  en: {
    features: 'Key Features',
    stack: 'Tech Stack',
    expand: 'View Features',
    collapse: 'Collapse',
  },
  ja: { features: '主な機能', stack: '技術スタック', expand: '機能を見る', collapse: '閉じる' },
};

function el() {
  return EXPAND_LABELS[expandLang()] || EXPAND_LABELS.ko;
}

// Split a problem→action→result narrative into discrete feature bullets.
// Sentences are separated on Korean/Latin terminators while keeping the
// terminator attached, then trimmed and de-noised.
function splitFeatures(text) {
  if (!text) return [];
  return String(text)
    .split(/(?<=[.。!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function initProjectExpand() {
  const list = document.querySelector('#projects .project-list, #projects ul');
  if (!list) {
    return;
  }

  const cards = list.querySelectorAll('.project-item');
  if (cards.length === 0) {
    return;
  }

  const L = el();
  cards.forEach((card, index) => enhanceCard(card, index, L));

  console.log(`[ProjectExpand] Enhanced ${cards.length} project cards`);
}

function enhanceCard(card, index, L) {
  const descEl = card.querySelector('.project-description');
  const techEl = card.querySelector('.project-tech');
  if (!descEl) {
    return;
  }

  const description = descEl.textContent.trim();
  const features = splitFeatures(description);
  const techs = techEl
    ? techEl.textContent
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    : [];

  // Nothing meaningful to expand — leave the card as-is.
  if (features.length === 0 && techs.length === 0) {
    return;
  }

  const panelId = `project-details-${index}`;

  const panel = document.createElement('div');
  panel.className = 'project-details';
  panel.id = panelId;
  panel.setAttribute('aria-hidden', 'true');
  panel.innerHTML = `
    <div class="project-details__inner">
      ${
        features.length > 0
          ? `<div class="project-details__block">
              <span class="project-details__label">${L.features}</span>
              <ul class="project-details__features">
                ${features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}
              </ul>
            </div>`
          : ''
      }
      ${
        techs.length > 0
          ? `<div class="project-details__block">
              <span class="project-details__label">${L.stack}</span>
              <div class="project-details__stack">
                ${techs.map((t) => `<span class="project-chip">${escapeHtml(t)}</span>`).join('')}
              </div>
            </div>`
          : ''
      }
    </div>
  `;

  // The collapsed view shows a one-line preview; the full narrative moves into
  // the expandable panel so the closed card stays scannable.
  descEl.classList.add('project-description--clamped');

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'project-expand-btn';
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-controls', panelId);
  toggle.innerHTML = `
    <span class="project-expand-btn__text">${L.expand}</span>
    <svg class="project-expand-btn__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M6 9l6 6 6-6"/>
    </svg>
  `;

  // Insert the toggle + panel right after the tech line (or description).
  const anchor = techEl || descEl;
  anchor.insertAdjacentElement('afterend', panel);
  anchor.insertAdjacentElement('afterend', toggle);

  const setExpanded = (expanded) => {
    card.classList.toggle('is-expanded', expanded);
    toggle.setAttribute('aria-expanded', String(expanded));
    panel.setAttribute('aria-hidden', String(!expanded));
    descEl.classList.toggle('project-description--clamped', !expanded);
    toggle.querySelector('.project-expand-btn__text').textContent = expanded
      ? L.collapse
      : L.expand;
  };

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpanded(toggle.getAttribute('aria-expanded') !== 'true');
  });
}

function escapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
