import { initWebVitals } from './modules/web-vitals.js';
import { initUI } from './modules/ui.js';
import { initSkillRadar } from './modules/skill-radar.js';
import { initCareerTimeline } from './modules/timeline.js';
import { initProjectCards } from './modules/project-cards.js';
import { initProjectMore } from './modules/project-more.js';
import { initRecruiterEnhancements } from './modules/recruiter-enhancements.js';
import { initCoverLetterFold } from './modules/cover-letter-fold.js';

function restoreHashScrollTarget() {
  if (!window.location.hash) return;

  const targetId = window.location.hash.slice(1);
  if (!targetId) return;

  const target = document.getElementById(targetId);
  if (!target) return;

  target.scrollIntoView({ block: 'start' });
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  const scriptUrl = window.trustedTypes
    ? window.trustedTypes
        .createPolicy('resume-script-url', {
          createScriptURL: (/** @type {string} */ value) => {
            if (value !== '/sw.js') throw new TypeError('Unsupported service worker URL');
            return value;
          },
        })
        .createScriptURL('/sw.js')
    : '/sw.js';

  const register = () => {
    navigator.serviceWorker
      .register(scriptUrl)
      .then((registration) => {
        console.log('[ServiceWorker] registered:', registration.scope);

        setInterval(
          () => {
            registration.update();
          },
          60 * 60 * 1000
        );
      })
      .catch((error) => {
        console.log('[ServiceWorker] registration failed:', error);
      });
  };

  if (document.readyState === 'complete') {
    register();
  } else {
    window.addEventListener('load', register, { once: true });
  }

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    console.log('[ServiceWorker] updated - page will reload');
    window.location.reload();
  });
}

/**
 * Runs every feature initialiser, isolating failures so one broken feature cannot stop the rest.
 * The ready flag and the `js` class (which the early head script may already have lifted after its
 * fail-safe delay) are set only when all succeed, so nothing stays collapsed behind controls that
 * never bound.
 */
function bootstrapPortfolio() {
  registerServiceWorker();
  const initialisers = [
    initUI,
    initWebVitals,
    initProjectCards,
    initProjectMore,
    initRecruiterEnhancements,
    initCoverLetterFold,
    initSkillRadar,
    initCareerTimeline,
    restoreHashScrollTarget,
  ];
  const failed = initialisers.filter((initialise) => {
    try {
      initialise();
      return false;
    } catch (error) {
      console.error('[Portfolio] initialiser failed', initialise.name, error);
      return true;
    }
  });
  if (failed.length === 0) {
    const root = document.documentElement;
    root.setAttribute('data-js-ready', '');
    root.classList.add('js');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapPortfolio, { once: true });
} else {
  bootstrapPortfolio();
}
