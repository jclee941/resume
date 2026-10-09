import { getRecruiterLabels } from './recruiter-enhancements-data.js';
import { countRoleProofs, tagProjectCards } from './recruiter-role-proofs.js';
import { renderRoleQuickPaths } from './recruiter-rendering.js';
import { bindRoleControls } from './recruiter-role-interactions.js';
import { renderMobileActionBar } from './recruiter-mobile-actions.js';

export function initRecruiterEnhancements() {
  const labels = getRecruiterLabels();
  const cards = tagProjectCards();
  const proofCounts = countRoleProofs(cards);
  renderRoleQuickPaths(labels, proofCounts);
  bindRoleControls(cards, proofCounts);
  renderMobileActionBar(labels);
}
