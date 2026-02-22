/**
 * Theme module - dark mode only
 * Portfolio is permanently dark-themed (neon/cyberpunk aesthetic).
 */
(function () {
  // Force dark theme immediately to prevent flash
  document.documentElement.setAttribute('data-theme', 'dark');

  // Hide theme toggle button if present (legacy UI element)
  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
      toggle.style.display = 'none';
    }
  });
})();
