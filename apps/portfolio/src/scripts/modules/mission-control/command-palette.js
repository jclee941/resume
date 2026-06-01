/**
 * Mission Control — Command Palette submodule.
 *
 * Extracted verbatim (behavior-preserving) from mission-control.js to keep that
 * orchestrator under the 500 LOC hard rule. State is encapsulated per instance
 * via a factory; the orchestrator wires it up and owns the global keyboard
 * shortcut + clock + status widgets.
 *
 * createCommandPalette(config) -> { inject, focus, close, isFocused }
 *   config.commands: [{ id, label, action }]
 *   config.suggestionsVisibleClass: string
 *   config.activeDescendantAttr: string
 */

export function createCommandPalette(config) {
  let commandPalette = null;
  let commandInput = null;
  let suggestionsList = null;
  let activeSuggestionIndex = -1;
  let debounceTimer = null;

  function inject() {
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
  }

  function buildSuggestionsList() {
    if (!suggestionsList) return;

    suggestionsList.innerHTML = config.commands
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

  function handleCommandInput(value) {
    activeSuggestionIndex = -1;

    if (!value.trim()) {
      hideSuggestions();
      return;
    }

    const normalizedInput = value.toLowerCase().trim();

    config.commands.forEach((cmd, index) => {
      const item = suggestionsList.children[index];
      if (!item) return;

      const isMatch =
        cmd.label.toLowerCase().includes(normalizedInput) ||
        cmd.id.toLowerCase().includes(normalizedInput);
      item.classList.toggle('mc-command-palette__suggestion--hidden', !isMatch);
    });

    showSuggestions();
  }

  function handleSuggestionClick(e) {
    const suggestion = e.target.closest('.mc-command-palette__suggestion');
    if (!suggestion) return;

    const commandId = suggestion.dataset.commandId;
    executeCommand(commandId);
  }

  function handleSuggestionHover(e) {
    const suggestion = e.target.closest('.mc-command-palette__suggestion');
    if (!suggestion) return;

    activeSuggestionIndex = getSuggestionIndex(suggestion);
    updateActiveDescendant();
  }

  function getSuggestionIndex(suggestion) {
    return Array.from(suggestionsList.children).indexOf(suggestion);
  }

  function showSuggestions() {
    if (!commandPalette) return;
    commandPalette.classList.add(config.suggestionsVisibleClass);
    commandInput.setAttribute('aria-expanded', 'true');
  }

  function hideSuggestions() {
    if (!commandPalette) return;
    commandPalette.classList.remove(config.suggestionsVisibleClass);
    commandInput.setAttribute('aria-expanded', 'false');
    activeSuggestionIndex = -1;
    updateActiveDescendant();
  }

  function updateActiveDescendant() {
    if (!commandInput || !suggestionsList) return;

    if (activeSuggestionIndex >= 0) {
      const activeItem = suggestionsList.children[activeSuggestionIndex];
      if (activeItem) {
        commandInput.setAttribute(config.activeDescendantAttr, activeItem.id);
        activeItem.classList.add('mc-command-palette__suggestion--active');
      }
      // Remove active class from all other items
      Array.from(suggestionsList.children).forEach((item, idx) => {
        if (idx !== activeSuggestionIndex) {
          item.classList.remove('mc-command-palette__suggestion--active');
        }
      });
    } else {
      commandInput.removeAttribute(config.activeDescendantAttr);
    }
  }

  function executeCommand(commandId) {
    const command = config.commands.find((cmd) => cmd.id === commandId);
    if (command && typeof command.action === 'function') {
      command.action();
    }
  }

  function close() {
    if (!commandInput) return;
    commandInput.value = '';
    hideSuggestions();
    commandInput.blur();
  }

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
    const visibleIndex = config.commands.findIndex(
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

  function selectActiveSuggestion() {
    if (activeSuggestionIndex < 0) {
      // If no suggestion is active, try to match current input
      const inputValue = commandInput.value.toLowerCase().trim();
      if (inputValue) {
        const match = config.commands.find(
          (cmd) =>
            cmd.label.toLowerCase().includes(inputValue) ||
            cmd.id.toLowerCase().includes(inputValue)
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
        close();
        break;
    }
  }

  function focus() {
    if (commandInput) {
      commandInput.focus();
      showSuggestions();
    }
  }

  function isFocused() {
    return commandInput && commandInput === document.activeElement;
  }

  return { inject, focus, close, isFocused };
}
