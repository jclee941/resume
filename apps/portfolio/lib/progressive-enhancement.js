/**
 * Early inline script: marks the document as script-enabled before first paint so collapsed
 * disclosures can be styled from the first frame, and lifts that mark again as soon as the main
 * module fails to load or throws, or when it has not reported ready within the bounded fail-safe,
 * so no content stays hidden behind controls that cannot work.
 * @module progressive-enhancement
 */

const READY_ATTRIBUTE = 'data-js-ready';
const FAIL_SAFE_MS = 10000;

const EARLY_SCRIPT =
  "(function(){var r=document.documentElement;r.classList.add('js');" +
  `function off(){if(!r.hasAttribute('${READY_ATTRIBUTE}'))r.classList.remove('js')}` +
  "addEventListener('error',function(e){var t=e.target;" +
  "if(/\\/main\\.js/.test((t&&t.src)||e.filename||''))off()},true);" +
  `setTimeout(off,${FAIL_SAFE_MS})})();`;

/**
 * @param {string} html
 * @returns {string} html with the early script as the last element of <head>
 */
function injectEarlyScript(html) {
  if (!html.includes('</head>')) return html;
  return html.replace('</head>', () => `<script>${EARLY_SCRIPT}</script></head>`);
}

module.exports = { injectEarlyScript, READY_ATTRIBUTE, FAIL_SAFE_MS };
