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
let commandPalette = null;
let commandInput = null;
let suggestionsList = null;
let clockElement = null;
let clockInterval = null;
let activeSuggestionIndex = -1;

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
  injectCommandPalette();
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
    closeCommandPalette();
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

// ============================================
// COMMAND PALETTE
// ============================================

/**
 * Inject command palette into hero content
 */
function injectCommandPalette() {
  const heroContent = document.querySelector('.hero-content');
  if (!heroContent) return;

  const paletteContainer = document.createElement('div');
  paletteContainer.className = 'mc-command-palette';
  paletteContainer.setAttribute('role', 'application');
  paletteContainer.setAttribute('aria-label', 'Command palette');

  const suggestionsId = 'mc-command-suggestions';

  paletteContainer.innerHTML = `
    <div class="mc-command-palette__input-wrapper">
      <span class="mc-command-palette__prompt" aria-hidden="true">resume$</span>
<input
type="text"
class="mc-command-palette__input"
placeholder="Type a command or press / to search..."
aria-label="Command input"
role="combobox"
aria-autocomplete="list"
aria-controls="${suggestionsId}"
aria-expanded="false"
spellcheck="false"
autocomplete="off"
/>
      <span class="mc-command-palette__cursor" aria-hidden="true"></span>
    </div>
    <ul
      id="${suggestionsId}"
      class="mc-command-palette__suggestions"
      role="listbox"
      aria-label="Command suggestions"
    ></ul>
  `;

  heroContent.appendChild(paletteContainer);

  // Cache DOM references
  commandPalette = paletteContainer;
  commandInput = paletteContainer.querySelector('.mc-command-palette__input');
  suggestionsList = paletteContainer.querySelector('.mc-command-palette__suggestions');

  // Build suggestions list
  buildSuggestionsList();

  commandInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => handleCommandInput(e.target.value), 150);
  });

  // Attach keydown listener for keyboard navigation
  commandInput.addEventListener('keydown', handleCommandPaletteKeydown);
  let debounceTimer = null;
  commandInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => handleCommandInput(e.target.value), 150);
  });
}

/**
 * Build the suggestions list items
 */
function buildSuggestionsList() {
  if (!suggestionsList) return;

  suggestionsList.innerHTML = MISSION_CONTROL_CONFIG.commands
    .map(
      (cmd, index) => `
      <li
        id="mc-cmd-suggestion-${index}"
        class="mc-command-palette__suggestion"
        role="option"
        data-command-id="${cmd.id}"
      >
        <span class="mc-command-palette__suggestion-icon" aria-hidden="true">›</span>
        <span class="mc-command-palette__suggestion-label">${cmd.label}</span>
      </li>
    `
    )
    .join('');

  // Attach click listeners using delegation
  suggestionsList.addEventListener('click', handleSuggestionClick);
  suggestionsList.addEventListener('mouseover', handleSuggestionHover);
}

/**
 * Handle text input in command field
 * @param {string} value
 */
function handleCommandInput(value) {
  activeSuggestionIndex = -1;

  if (!value.trim()) {
    hideSuggestions();
    return;
  }

  // Filter commands by input
  const normalizedInput = value.toLowerCase().trim();

  // Also include partial matches on the command ID
  MISSION_CONTROL_CONFIG.commands.forEach((cmd, index) => {
    const item = suggestionsList.children[index];
    if (!item) return;

    const isMatch =
      cmd.label.toLowerCase().includes(normalizedInput) ||
      cmd.id.toLowerCase().includes(normalizedInput);
    item.classList.toggle('mc-command-palette__suggestion--hidden', !isMatch);
  });

  showSuggestions();
}

/**
 * Handle suggestion click
 * @param {MouseEvent} e
 */
function handleSuggestionClick(e) {
  const suggestion = e.target.closest('.mc-command-palette__suggestion');
  if (!suggestion) return;

  const commandId = suggestion.dataset.commandId;
  executeCommand(commandId);
}

/**
 * Handle suggestion hover
 * @param {MouseEvent} e
 */
function handleSuggestionHover(e) {
  const suggestion = e.target.closest('.mc-command-palette__suggestion');
  if (!suggestion) return;

  activeSuggestionIndex = getSuggestionIndex(suggestion);
  updateActiveDescendant();
}

/**
 * Get index of a suggestion element
 * @param {HTMLElement} suggestion
 * @returns {number}
 */
function getSuggestionIndex(suggestion) {
  return Array.from(suggestionsList.children).indexOf(suggestion);
}

/**
 * Show suggestions dropdown
 */
function showSuggestions() {
  if (!commandPalette) return;
  commandPalette.classList.add(MISSION_CONTROL_CONFIG.suggestionsVisibleClass);
  commandInput.setAttribute('aria-expanded', 'true');
}

/**
 * Hide suggestions dropdown
 */
function hideSuggestions() {
  if (!commandPalette) return;
  commandPalette.classList.remove(MISSION_CONTROL_CONFIG.suggestionsVisibleClass);
  commandInput.setAttribute('aria-expanded', 'false');
  activeSuggestionIndex = -1;
  updateActiveDescendant();
}

/**
 * Update active descendant for accessibility
 */
function updateActiveDescendant() {
  if (!commandInput || !suggestionsList) return;

  if (activeSuggestionIndex >= 0) {
    const activeItem = suggestionsList.children[activeSuggestionIndex];
    if (activeItem) {
      commandInput.setAttribute(MISSION_CONTROL_CONFIG.activeDescendantAttr, activeItem.id);
      activeItem.classList.add('mc-command-palette__suggestion--active');
    }
    // Remove active class from all other items
    Array.from(suggestionsList.children).forEach((item, idx) => {
      if (idx !== activeSuggestionIndex) {
        item.classList.remove('mc-command-palette__suggestion--active');
      }
    });
  } else {
    commandInput.removeAttribute(MISSION_CONTROL_CONFIG.activeDescendantAttr);
  }
}

/**
 * Execute a command by ID
 * @param {string} commandId
 */
function executeCommand(commandId) {
  const command = MISSION_CONTROL_CONFIG.commands.find((cmd) => cmd.id === commandId);
  if (command && typeof command.action === 'function') {
    command.action();
  }
}

/**
 * Close command palette and reset state
 */
function closeCommandPalette() {
  if (!commandInput) return;
  commandInput.value = '';
  hideSuggestions();
  commandInput.blur();
}

/**
 * Navigate suggestion selection
 * @param {number} direction - +1 for down, -1 for up
 */
function navigateSuggestions(direction) {
  const visibleItems = Array.from(suggestionsList.children).filter(
    (item) => !item.classList.contains('mc-command-palette__suggestion--hidden')
  );

  if (visibleItems.length === 0) return;

  // Update active index with wrapping
  activeSuggestionIndex += direction;
  if (activeSuggestionIndex >= visibleItems.length) {
    activeSuggestionIndex = 0;
  } else if (activeSuggestionIndex < 0) {
    activeSuggestionIndex = visibleItems.length - 1;
  }

  // Map visible index back to actual index
  const visibleIndex = MISSION_CONTROL_CONFIG.commands.findIndex(
    (cmd) => cmd.id === visibleItems[activeSuggestionIndex].dataset.commandId
  );

  // Update all items' active states
  Array.from(suggestionsList.children).forEach((item, idx) => {
    item.classList.toggle('mc-command-palette__suggestion--active', idx === visibleIndex);
  });

  updateActiveDescendant();

  // Scroll active item into view
  const activeItem = suggestionsList.children[visibleIndex];
  if (activeItem) {
    activeItem.scrollIntoView({ block: 'nearest' });
  }
}

/**
 * Select currently active suggestion
 */
function selectActiveSuggestion() {
  if (activeSuggestionIndex < 0) {
    // If no suggestion is active, try to match current input
    const inputValue = commandInput.value.toLowerCase().trim();
    if (inputValue) {
      const match = MISSION_CONTROL_CONFIG.commands.find(
        (cmd) =>
          cmd.label.toLowerCase().includes(inputValue) || cmd.id.toLowerCase().includes(inputValue)
      );
      if (match) {
        executeCommand(match.id);
        return;
      }
    }
    return;
  }

  const visibleItems = Array.from(suggestionsList.children).filter(
    (item) => !item.classList.contains('mc-command-palette__suggestion--hidden')
  );

  if (visibleItems.length > 0 && activeSuggestionIndex < visibleItems.length) {
    const activeItem = visibleItems[activeSuggestionIndex];
    const commandId = activeItem.dataset.commandId;
    executeCommand(commandId);
  }
}

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
  // Focus command palette on '/'
  if (e.key === '/' && !isCommandPaletteFocused()) {
    e.preventDefault();
    focusCommandPalette();
    return;
  }

  // Handle Escape to close command palette
  if (e.key === 'Escape' && isCommandPaletteFocused()) {
    e.preventDefault();
    closeCommandPalette();
    return;
  }
}

/**
 * Check if command palette input is focused
 * @returns {boolean}
 */
function isCommandPaletteFocused() {
  return commandInput && commandInput === document.activeElement;
}

/**
 * Focus the command palette input
 */
function focusCommandPalette() {
  if (commandInput) {
    commandInput.focus();
    showSuggestions();
  }
}

/**
 * Handle keydown within command palette
 * @param {KeyboardEvent} e
 */
function handleCommandPaletteKeydown(e) {
  switch (e.key) {
    case 'ArrowDown':
      e.preventDefault();
      navigateSuggestions(1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      navigateSuggestions(-1);
      break;
    case 'Enter':
      e.preventDefault();
      selectActiveSuggestion();
      break;
    case 'Tab':
      e.preventDefault();
      // Tab cycles through visible suggestions
      navigateSuggestions(1);
      break;
    case 'Escape':
      e.preventDefault();
      closeCommandPalette();
      break;
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
  const palette = document.querySelector('.mc-command-palette');

  if (statusBar) statusBar.remove();
  if (palette) palette.remove();

  // Reset state
  commandPalette = null;
  commandInput = null;
  suggestionsList = null;
  clockElement = null;
  activeSuggestionIndex = -1;

  console.log('[MissionControl] Destroyed.');
}
