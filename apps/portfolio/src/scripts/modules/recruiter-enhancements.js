import {
  getRecruiterLabels,
} from './recruiter-enhancements-data.js';
import {
  countRoleProofs,
  tagProjectCards,
} from './recruiter-role-proofs.js';
import {
  renderEvidenceMatrix,
  renderRoleQuickPaths,
} from './recruiter-rendering.js';
import {
  bindEvidenceLinks,
  bindRoleControls,
} from './recruiter-role-interactions.js';
import { renderMobileActionBar } from './recruiter-mobile-actions.js';

export function initRecruiterEnhancements() {
  const labels = getRecruiterLabels();
  const cards = tagProjectCards();
  const proofCounts = countRoleProofs(cards);
  renderRoleQuickPaths(labels, proofCounts);
  renderEvidenceMatrix(labels);
  bindRoleControls(cards, proofCounts);
  bindEvidenceLinks();
  renderMobileActionBar(labels);
}
