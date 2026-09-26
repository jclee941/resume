import { getTimelineLabels } from './timeline-rendering.js';

const EXPANDED_CLASS = 'is-expanded';

/**
 * @param {HTMLElement} timelineContainer
 */
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

/**
 * @typedef {HTMLElement & { setAttribute(name: string, value: string | boolean): void }} DomElement
 */

/**
 * @type {(event: MouseEvent, timelineContainer?: HTMLElement) => void}
 */
function handleTimelineClick(event) {
  const expandBtn = /** @type {DomElement | null} */ (
    /** @type {Element} */ (event.target).closest('.timeline-expand-btn')
  );
  if (!expandBtn) return;

  const card = /** @type {HTMLElement} */ (expandBtn.closest('.timeline-card'));
  const details = /** @type {DomElement} */ (card.querySelector('.timeline-details'));
  const node = /** @type {HTMLElement} */ (card.closest('.timeline-node'));
  const isExpanded = node.classList.contains(EXPANDED_CLASS);

  node.classList.toggle(EXPANDED_CLASS);
  expandBtn.setAttribute('aria-expanded', !isExpanded);
  details.setAttribute('aria-hidden', isExpanded);

  const expandText = /** @type {HTMLElement} */ (expandBtn.querySelector('.expand-text'));
  const labels = getTimelineLabels();
  const nextLabel = isExpanded ? labels.expand : labels.collapse;
  expandText.textContent = nextLabel;
  expandBtn.setAttribute(
    'aria-label',
    `${nextLabel} ${labels.detail} ${/** @type {HTMLElement | null} */ (card.querySelector('.timeline-company'))?.innerText || ''}`.trim()
  );

  const icon = /** @type {HTMLElement} */ (expandBtn.querySelector('.expand-icon'));
  icon.style.transform = isExpanded ? '' : 'rotate(180deg)';
}

/**
 * @param {KeyboardEvent} event
 * @param {HTMLElement} timelineContainer
 */
function handleKeyboardNav(event, timelineContainer) {
  const node = /** @type {HTMLElement | null} */ (
    /** @type {Element} */ (event.target).closest('.timeline-node')
  );
  if (!node) return;

  switch (event.key) {
    case 'Enter':
    case ' ':
      if (/** @type {Element} */ (event.target).closest('.timeline-card')) {
        event.preventDefault();
        /** @type {HTMLElement | null} */ (node.querySelector('.timeline-expand-btn'))?.click();
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
      /** @type {HTMLElement | null} */ (
        timelineContainer.querySelector('.timeline-node')
      )?.focus();
      break;
    case 'End':
      event.preventDefault();
      /** @type {HTMLElement | null} */ (
        timelineContainer.querySelector('.timeline-node:last-child')
      )?.focus();
      break;
  }
}

/**
 * @param {HTMLElement} timelineContainer
 * @param {HTMLElement} currentNode
 * @param {number} direction
 */
function navigateToNode(timelineContainer, currentNode, direction) {
  const nodes = /** @type {HTMLElement[]} */ (
    Array.from(timelineContainer.querySelectorAll('.timeline-node'))
  );
  const nextIndex = nodes.indexOf(currentNode) + direction;
  if (nextIndex >= 0 && nextIndex < nodes.length) nodes[nextIndex].focus();
}

/**
 * @param {Event} event
 */
function handleNodeHover(event) {
  /** @type {HTMLElement} */ (event.currentTarget).classList.add('is-hovered');
}

/**
 * @param {Event} event
 */
function handleNodeLeave(event) {
  /** @type {HTMLElement} */ (event.currentTarget).classList.remove('is-hovered');
}
