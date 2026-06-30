import { getTimelineLabels } from './timeline-rendering.js';

const EXPANDED_CLASS = 'is-expanded';

export function bindTimelineInteractions(timelineContainer) {
  timelineContainer.addEventListener('click', (event) =>
    handleTimelineClick(event, timelineContainer)
  );
  timelineContainer.addEventListener('keydown', (event) =>
    handleKeyboardNav(event, timelineContainer)
  );

  timelineContainer.querySelectorAll('.timeline-node').forEach((node) => {
    node.addEventListener('mouseenter', handleNodeHover);
    node.addEventListener('mouseleave', handleNodeLeave);
  });
}

function handleTimelineClick(event) {
  const expandBtn = event.target.closest('.timeline-expand-btn');
  if (!expandBtn) return;

  const card = expandBtn.closest('.timeline-card');
  const details = card.querySelector('.timeline-details');
  const node = card.closest('.timeline-node');
  const isExpanded = node.classList.contains(EXPANDED_CLASS);

  node.classList.toggle(EXPANDED_CLASS);
  expandBtn.setAttribute('aria-expanded', !isExpanded);
  details.setAttribute('aria-hidden', isExpanded);

  const expandText = expandBtn.querySelector('.expand-text');
  const labels = getTimelineLabels();
  const nextLabel = isExpanded ? labels.expand : labels.collapse;
  expandText.textContent = nextLabel;
  expandBtn.setAttribute(
    'aria-label',
    `${nextLabel} ${labels.detail} ${card.querySelector('.timeline-company')?.innerText || ''}`.trim()
  );

  const icon = expandBtn.querySelector('.expand-icon');
  icon.style.transform = isExpanded ? '' : 'rotate(180deg)';
}

function handleKeyboardNav(event, timelineContainer) {
  const node = event.target.closest('.timeline-node');
  if (!node) return;

  switch (event.key) {
    case 'Enter':
    case ' ':
      if (event.target.closest('.timeline-card')) {
        event.preventDefault();
        node.querySelector('.timeline-expand-btn')?.click();
      }
      break;
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      navigateToNode(timelineContainer, node, 1);
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault();
      navigateToNode(timelineContainer, node, -1);
      break;
    case 'Home':
      event.preventDefault();
      timelineContainer.querySelector('.timeline-node')?.focus();
      break;
    case 'End':
      event.preventDefault();
      timelineContainer.querySelector('.timeline-node:last-child')?.focus();
      break;
  }
}

function navigateToNode(timelineContainer, currentNode, direction) {
  const nodes = Array.from(timelineContainer.querySelectorAll('.timeline-node'));
  const nextIndex = nodes.indexOf(currentNode) + direction;
  if (nextIndex >= 0 && nextIndex < nodes.length) nodes[nextIndex].focus();
}

function handleNodeHover(event) {
  event.currentTarget.classList.add('is-hovered');
}

function handleNodeLeave(event) {
  event.currentTarget.classList.remove('is-hovered');
}
