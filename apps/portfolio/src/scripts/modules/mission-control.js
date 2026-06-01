/**
 * Mission Control Hero Module
 * SRE-style dashboard for resume.jclee.me
 *
 * Features:
 * - Status widgets bar (system status, last deploy, uptime, security)
 * - Command palette with keyboard navigation
 * - Real-time UTC clock
 * - Enhanced blinking cursors
 */

import { createCommandPalette } from './mission-control/command-palette.js';

const MISSION_CONTROL_CONFIG = {
  // Command palette configuration
  commands: [
    { id: 'experience', label: 'cat experience.md', action: () => scrollToSection('resume') },
    { id: 'skills', label: 'ls skills/', action: () => scrollToSection('skills') },
    { id: 'projects', label: 'inspect projects', action: () => scrollToSection('projects') },
    { id: 'contact', label: 'open contact', action: () => scrollToSection('contact') },
  ],
  scrollOffset: 80,
  clockUpdateInterval: 1000,
  suggestionsVisibleClass: 'visible',
  activeDescendantAttr: 'aria-activedescendant',
};

// Module state (private)
let palette = null;
let clockElement = null;
let clockInterval = null;

/**
 * Initialize Mission Control module
 * @returns {void}
 */
export function initMissionControl() {
  if (!isHeroSectionPresent()) {
    console.warn('[MissionControl] Hero section not found, skipping initialization.');
    return;
  }

  injectStatusWidgets();
  palette = createCommandPalette({
    commands: MISSION_CONTROL_CONFIG.commands,
    suggestionsVisibleClass: MISSION_CONTROL_CONFIG.suggestionsVisibleClass,
    activeDescendantAttr: MISSION_CONTROL_CONFIG.activeDescendantAttr,
  });
  palette.inject();
  injectUtcClock();
  attachKeyboardListeners();
  startClock();

  console.log('[MissionControl] Initialized successfully.');
}

/**
 * Check if hero section exists
 * @returns {boolean}
 */
function isHeroSectionPresent() {
  return document.querySelector('.section-hero') !== null;
}

/**
 * Scroll to a section with smooth behavior
 * @param {string} sectionId - Target section ID
 */
function scrollToSection(sectionId) {
  const target = document.getElementById(sectionId);
  if (target) {
    const offset = MISSION_CONTROL_CONFIG.scrollOffset;
    const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth',
    });
    if (palette) palette.close();
  }
}

// ============================================
// STATUS WIDGETS BAR
// ============================================

/**
 * Inject status widgets bar into hero content
 */
function injectStatusWidgets() {
  const heroContent = document.querySelector('.hero-content');
  if (!heroContent) return;

  const statusBar = document.createElement('div');
  statusBar.className = 'mc-status-bar';
  statusBar.setAttribute('role', 'status');
  statusBar.setAttribute('aria-label', 'System status widgets');

  const lastDeployDate = formatDeployDate(new Date());

  statusBar.innerHTML = `
    <div class="mc-status-widget mc-status-widget--system" data-widget="system">
      <span class="mc-status-widget__indicator mc-status-widget__indicator--online" aria-hidden="true"></span>
      <span class="mc-status-widget__label">SYSTEM STATUS:</span>
      <span class="mc-status-widget__value">ONLINE</span>
    </div>
    <div class="mc-status-widget mc-status-widget--deploy" data-widget="deploy">
      <span class="mc-status-widget__icon" aria-hidden="true">⏱</span>
      <span class="mc-status-widget__label">LAST DEPLOY:</span>
      <span class="mc-status-widget__value">${lastDeployDate}</span>
    </div>
    <div class="mc-status-widget mc-status-widget--uptime" data-widget="uptime">
      <span class="mc-status-widget__icon" aria-hidden="true">📊</span>
      <span class="mc-status-widget__label">STATUS:</span>
      <span class="mc-status-widget__value">OPERATIONAL</span>
    </div>
    <div class="mc-status-widget mc-status-widget--security" data-widget="security">
      <span class="mc-status-widget__icon" aria-hidden="true">🔒</span>
      <span class="mc-status-widget__label">SECURITY:</span>
      <span class="mc-status-widget__value">SECURE</span>
    </div>
  `;

  heroContent.appendChild(statusBar);

  // Trigger entrance animation after a frame
  requestAnimationFrame(() => {
    statusBar.classList.add('mc-status-bar--loaded');
  });
}

/**
 * Format deploy date for display
 * @param {Date} date
 * @returns {string}
 */
function formatDeployDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// (Command palette logic lives in ./mission-control/command-palette.js)
// ============================================
// UTC CLOCK
// ============================================

/**
 * Inject UTC clock into status bar
 */
function injectUtcClock() {
  const statusBar = document.querySelector('.mc-status-bar');
  if (!statusBar) return;

  const clockWrapper = document.createElement('div');
  clockWrapper.className = 'mc-utc-clock';
  clockWrapper.setAttribute('aria-label', 'Current UTC time');
  clockWrapper.setAttribute('role', 'timer');

  clockWrapper.innerHTML = `
    <span class="mc-utc-clock__label" aria-hidden="true">UTC:</span>
    <span class="mc-utc-clock__time">${formatUtcTime(new Date())}</span>
  `;

  statusBar.appendChild(clockWrapper);
  clockElement = clockWrapper.querySelector('.mc-utc-clock__time');
}

/**
 * Format UTC time for display
 * @param {Date} date
 * @returns {string}
 */
function formatUtcTime(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Start the UTC clock update interval
 */
function startClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
  }

  clockInterval = setInterval(() => {
    if (clockElement) {
      clockElement.textContent = formatUtcTime(new Date());
    }
  }, MISSION_CONTROL_CONFIG.clockUpdateInterval);
}

/**
 * Stop the UTC clock update interval
 */
function stopClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}

// ============================================
// KEYBOARD HANDLING
// ============================================

/**
 * Attach global keyboard listeners
 */
function attachKeyboardListeners() {
  document.addEventListener('keydown', handleGlobalKeydown);
}

/**
 * Handle global keydown events
 * @param {KeyboardEvent} e
 */
function handleGlobalKeydown(e) {
  if (!palette) return;
  // Focus command palette on '/'
  if (e.key === '/' && !palette.isFocused()) {
    e.preventDefault();
    palette.focus();
    return;
  }

  // Handle Escape to close command palette
  if (e.key === 'Escape' && palette.isFocused()) {
    e.preventDefault();
    palette.close();
    return;
  }
}

// ============================================
// CLEANUP
// ============================================

/**
 * Cleanup function (can be called on module unload)
 * @returns {void}
 */
export function destroyMissionControl() {
  stopClock();
  document.removeEventListener('keydown', handleGlobalKeydown);

  // Remove injected elements
  const statusBar = document.querySelector('.mc-status-bar');
  const paletteEl = document.querySelector('.mc-command-palette');

  if (statusBar) statusBar.remove();
  if (paletteEl) paletteEl.remove();

  // Reset state
  palette = null;
  clockElement = null;

  console.log('[MissionControl] Destroyed.');
}
