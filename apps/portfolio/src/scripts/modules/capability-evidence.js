import {
  CAPABILITY_DEFINITIONS,
  CAPABILITY_LABELS,
  getCapabilities,
  resolveCapabilityLocale,
  validateCapabilityContract,
} from './capability-evidence-data.js';
import { bindCapabilityEvidence } from './capability-evidence-interactions.js';
import { collectCapabilityProjectCards, tagCapabilityProjectCards } from './capability-projects.js';
import { renderCapabilityEvidence } from './capability-evidence-rendering.js';
import { renderMobileActions } from './mobile-actions.js';

export function initCapabilityEvidence() {
  const locale = resolveCapabilityLocale();
  const capabilities = getCapabilities(locale);
  const cards = collectCapabilityProjectCards();
  const projectIds = cards.map((card) => card.id.replace(/^project-/, ''));
  validateCapabilityContract({
    definitions: CAPABILITY_DEFINITIONS,
    labels: CAPABILITY_LABELS,
    locale,
    availableProjectIds: projectIds,
  });
  tagCapabilityProjectCards(cards, capabilities);
  const region = renderCapabilityEvidence(capabilities, locale);
  bindCapabilityEvidence({ capabilities, cards, locale, region });
  renderMobileActions();
}
