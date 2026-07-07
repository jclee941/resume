/**
 * Career Incident Timeline Module
 * Incident Response Timeline visualization for resume.jclee.me
 *
 * Features:
 * - Vertical timeline with incident response metaphor
 * - One compact phase badge per role
 * - Active/Completed status indicators
 * - Expandable role cards with impact metrics
 * - Keyboard navigation & accessibility
 *
 */

import { CAREER_UI_META, DEFAULT_CAREER_UI_META } from './timeline-career-meta.js';
import { bindTimelineInteractions } from './timeline-interactions.js';
import { createTimelineNode } from './timeline-rendering.js';

let timelineContainer = null;

/**
 * Initialize Timeline module
 * @returns {void}
 */
export function initCareerTimeline() {
  if (!isTimelineSectionPresent()) {
    console.warn('[CareerTimeline] Timeline section not found, skipping initialization.');
    return;
  }

  injectTimeline();
  bindTimelineInteractions(timelineContainer);

  console.log('[CareerTimeline] Initialized successfully.');
}

/**
 * Check if timeline section exists
 * @returns {boolean}
 */
function isTimelineSectionPresent() {
  return document.querySelector('.section-resume') !== null;
}

/**
 * Merge build-injected SSoT career DATA with UI-only presentation metadata.
 * Pure function (no globals) so it can be unit-tested in isolation.
 * @param {Array<Object>} careers - SSoT career entries from generated portfolio data.
 * @returns {Array<Object>} Render-ready career nodes with phase/status attached.
 */
export function mergeCareerUiMeta(careers) {
  if (!Array.isArray(careers)) return [];
  return careers.map((career) => {
    const meta = CAREER_UI_META[career.period] || DEFAULT_CAREER_UI_META;
    return { ...career, phase: career.phase || meta.phase, status: career.status || meta.status };
  });
}

/**
 * Get career data from the client-loaded SSoT snapshot.
 *
 * The build pipeline exposes locale-specific portfolio data at
 * /resume-data.json and main.js loads it into window.__RESUME_CHAT_DATA__.
 * Its `careers[]` is derived from the SSoT
 * (packages/data/resumes/master/resume_data.json) by
 * tools/scripts/utils/resume-web-data-generator.js, so there is no hardcoded
 * career content here to drift out of sync. UI-only phase/status are merged on.
 * @returns {Array<Object>}
 */
function getCareerData() {
  const injected = (typeof window !== 'undefined' && window.__RESUME_CHAT_DATA__) || {};
  const careers = Array.isArray(injected.careers) ? injected.careers : [];

  if (careers.length === 0) {
    console.warn(
      '[CareerTimeline] No careers found in __RESUME_CHAT_DATA__; rendering empty timeline.'
    );
    return [];
  }

  return mergeCareerUiMeta(careers);
}

/**
 * Inject timeline HTML into the DOM
 * @returns {void}
 */
function injectTimeline() {
  const resumeSection = document.querySelector('.section-resume');
  if (!resumeSection) return;

  const existingList = resumeSection.querySelector('.resume-list');
  if (!existingList) return;

  const careers = getCareerData();

  const timeline = document.createElement('ul');
  timeline.className = 'incident-timeline resume-list';
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  const timelineLabel = lang.startsWith('en')
    ? 'Career timeline'
    : lang.startsWith('ja')
      ? '経歴タイムライン'
      : '경력 타임라인';
  timeline.setAttribute('aria-label', timelineLabel);
  timeline.innerHTML = careers.map((career, index) => createTimelineNode(career, index)).join('');

  // Swap the <ul> placeholder for the semantic timeline container.
  existingList.replaceWith(timeline);

  // Store reference to container
  timelineContainer = timeline;
  requestAnimationFrame(() => {
    const nodes = timelineContainer.querySelectorAll('.timeline-node');
    nodes.forEach((node, i) => {
      node.style.animationDelay = `${i * 100}ms`;
      node.classList.add('timeline-node--animate');
    });
  });
}
