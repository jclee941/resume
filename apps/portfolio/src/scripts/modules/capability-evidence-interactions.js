import {
  buildCapabilityAnnouncement,
  buildCapabilityClearedAnnouncement,
} from './capability-evidence-data.js';
import {
  applyCapabilityProjectState,
  capabilityProjectName,
  clearCapabilityProjectState,
  indexCapabilityProjectCards,
} from './capability-projects.js';
import { ensureProjectIsExpanded } from './project-more.js';

let historyListenerBound = false;

function setCapabilityHistory(capabilityId) {
  if (!window.history?.pushState) return;
  const state =
    window.history.state && typeof window.history.state === 'object' ? window.history.state : {};
  const url = new URL(window.location.href);
  url.hash = 'projects';
  window.history.pushState(
    { ...state, selectedCapability: capabilityId || null, projectAnchor: 'projects' },
    '',
    url
  );
}

function focusProjectCard(card) {
  card.tabIndex = -1;
  card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  card.focus({ preventScroll: true });
}

export function bindCapabilityEvidence({ capabilities, cards, locale, region }) {
  const controls = Array.from(region.querySelectorAll('[data-capability-control]'));
  const status = region.querySelector('[data-capability-status]');
  const projects = document.querySelector('#projects');
  const cardIndex = indexCapabilityProjectCards(cards);
  let selectedCapability = null;

  const applySelection = (capabilityId, { focusTarget = true, recordHistory = true } = {}) => {
    const capability = capabilities.find((candidate) => candidate.id === capabilityId);
    const nextSelection = selectedCapability === capabilityId ? null : capability;
    selectedCapability = nextSelection?.id || null;
    for (const control of controls) {
      control.setAttribute(
        'aria-pressed',
        String(control.dataset.capabilityControl === selectedCapability)
      );
    }

    if (!nextSelection) {
      clearCapabilityProjectState(cards);
      projects?.removeAttribute('data-capability-selected');
      status.textContent = buildCapabilityClearedAnnouncement(locale);
      if (recordHistory) setCapabilityHistory(null);
      return;
    }

    const matchingCards = nextSelection.projectIds.map((projectId) => cardIndex.get(projectId));
    if (matchingCards.some((card) => !card)) {
      throw new Error(`capability target missing from DOM: ${nextSelection.id}`);
    }
    applyCapabilityProjectState(cards, matchingCards);
    projects?.setAttribute('data-capability-selected', nextSelection.id);
    status.textContent = buildCapabilityAnnouncement({
      locale,
      label: nextSelection.label,
      projectNames: matchingCards.map(capabilityProjectName),
    });
    if (recordHistory) setCapabilityHistory(nextSelection.id);
    const firstTarget = matchingCards[0];
    ensureProjectIsExpanded(firstTarget);
    if (focusTarget) focusProjectCard(firstTarget);
  };

  for (const control of controls) {
    if (control.dataset.capabilityBound === 'true') continue;
    control.dataset.capabilityBound = 'true';
    control.addEventListener('click', () => applySelection(control.dataset.capabilityControl));
  }

  if (!historyListenerBound) {
    window.addEventListener('popstate', (event) => {
      const restored = event.state?.selectedCapability || null;
      selectedCapability = restored ? null : selectedCapability;
      applySelection(restored, { focusTarget: false, recordHistory: false });
    });
    historyListenerBound = true;
  }

  const restored = window.history.state?.selectedCapability;
  if (restored) applySelection(restored, { focusTarget: false, recordHistory: false });
}
