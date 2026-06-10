import {
  EVIDENCE_ITEMS,
  HIRING_MAIL,
  ROLE_PROFILES,
  getRecruiterLabels,
} from './recruiter-enhancements-data.js';

function escapeHtml(value) {
  return String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[character]
  );
}

function roleIdsForText(text) {
  return ROLE_PROFILES.filter((role) =>
    role.keywords.some((keyword) => text.includes(keyword))
  ).map((role) => role.id);
}

function tagProjectCards() {
  const cards = Array.from(document.querySelectorAll('#projects li.project-item'));
  cards.forEach((card) => {
    const text = card.textContent || '';
    const roles = roleIdsForText(text);
    if (roles.length > 0) card.setAttribute('data-role', roles.join(' '));
  });
  return cards;
}

function renderRoleQuickPaths(labels) {
  if (document.querySelector('.role-quick-paths')) return;
  const hero = document.querySelector('#hero .hero-content');
  if (!hero) return;
  const section = document.createElement('section');
  section.className = 'role-quick-paths';
  section.setAttribute('aria-label', labels.quickTitle);
  section.innerHTML = `
    <div class="role-quick-paths__header">
      <h2 class="role-quick-paths__title">${escapeHtml(labels.quickTitle)}</h2>
      <p class="role-quick-paths__desc">${escapeHtml(labels.quickDesc)}</p>
    </div>
    <div class="role-quick-paths__controls" role="group" aria-label="${escapeHtml(labels.quickTitle)}">
      ${ROLE_PROFILES.map(
        (
          role
        ) => `<button type="button" class="role-chip" data-role-filter="${role.id}" aria-pressed="false">
          <span class="role-chip__label">${escapeHtml(role.label)}</span>
          <span class="role-chip__proof">${escapeHtml(role.proof)}</span>
        </button>`
      ).join('')}
    </div>
  `;
  hero.appendChild(section);
}

function renderEvidenceMatrix(labels) {
  if (document.querySelector('.project-evidence-matrix')) return;
  const list = document.querySelector('#project-list');
  if (!list) return;
  const matrix = document.createElement('section');
  matrix.className = 'project-evidence-matrix';
  matrix.setAttribute('aria-label', labels.matrixTitle);
  matrix.innerHTML = `
    <div class="project-evidence-matrix__header">
      <h3 class="project-evidence-matrix__title">${escapeHtml(labels.matrixTitle)}</h3>
      <p class="project-evidence-matrix__desc">${escapeHtml(labels.matrixDesc)}</p>
    </div>
    <div class="project-evidence-matrix__grid">
      ${EVIDENCE_ITEMS.map((item) => {
        const role = ROLE_PROFILES.find((candidate) => candidate.id === item.roleId);
        return `<article class="project-evidence-card" data-role="${item.roleId}">
          <span class="project-evidence-card__label">${escapeHtml(labels.role)}</span>
          <strong class="project-evidence-card__role">${escapeHtml(role ? role.label : item.roleId)}</strong>
          <span class="project-evidence-card__label">${escapeHtml(labels.evidence)}</span>
          <p class="project-evidence-card__proof">${escapeHtml(item.proof)}</p>
          <a class="project-evidence-card__link" href="#projects" data-evidence-project="${escapeHtml(item.title)}">${escapeHtml(labels.open)}</a>
        </article>`;
      }).join('')}
    </div>
  `;
  list.insertAdjacentElement('beforebegin', matrix);
}

function clearRoleFocus(cards) {
  cards.forEach((card) => card.classList.remove('is-role-match', 'is-role-dimmed'));
}

function bindRoleControls() {
  const buttons = Array.from(document.querySelectorAll('.role-chip'));
  const cards = tagProjectCards();
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const role = button.getAttribute('data-role-filter') || '';
      buttons.forEach((candidate) =>
        candidate.setAttribute('aria-pressed', String(candidate === button))
      );
      clearRoleFocus(cards);
      cards.forEach((card) => {
        const roles = (card.getAttribute('data-role') || '').split(/\s+/);
        card.classList.add(roles.includes(role) ? 'is-role-match' : 'is-role-dimmed');
      });
      document.querySelector('#projects')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function bindEvidenceLinks() {
  document.querySelectorAll('[data-evidence-project]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const title = link.getAttribute('data-evidence-project') || '';
      const card = Array.from(document.querySelectorAll('#projects li.project-item')).find((item) =>
        (item.textContent || '').includes(title)
      );
      if (card) {
        const list = document.querySelector('#project-list');
        const moreButton = document.querySelector('.project-more-btn');
        if (
          card.classList.contains('project-item--collapsed') &&
          !list?.classList.contains('is-expanded')
        ) {
          moreButton?.click();
        }
        clearRoleFocus(Array.from(document.querySelectorAll('#projects li.project-item')));
        card.classList.add('is-role-match');
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
}

function renderMobileActionBar(labels) {
  if (document.querySelector('.recruiter-action-bar')) return;
  const bar = document.createElement('aside');
  bar.className = 'recruiter-action-bar';
  bar.setAttribute('aria-label', 'Recruiter actions');
  bar.innerHTML = `
    <a class="recruiter-action-bar__link" href="${HIRING_MAIL}">${escapeHtml(labels.contact)}</a>
    <a class="recruiter-action-bar__link" href="#projects">${escapeHtml(labels.projects)}</a>
    <a class="recruiter-action-bar__link" href="/resume.pdf" download="이재철_이력서.pdf">${escapeHtml(labels.pdf)}</a>
    <button type="button" class="recruiter-action-bar__dismiss" aria-label="${escapeHtml(labels.dismiss)}">×</button>
  `;
  bar.querySelector('button')?.addEventListener('click', () => {
    bar.hidden = true;
    bar.classList.remove('is-visible');
  });
  document.body.appendChild(bar);

  const updateVisibility = () => {
    if (bar.hidden) return;
    bar.classList.toggle('is-visible', window.scrollY > 320);
  };
  window.addEventListener('scroll', updateVisibility, { passive: true });
  updateVisibility();
}

export function initRecruiterEnhancements() {
  const labels = getRecruiterLabels();
  renderRoleQuickPaths(labels);
  renderEvidenceMatrix(labels);
  tagProjectCards();
  bindRoleControls();
  bindEvidenceLinks();
  renderMobileActionBar(labels);
}
