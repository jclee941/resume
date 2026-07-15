import { initWebVitals } from './modules/web-vitals.js';
import { initUI } from './modules/ui.js';
import { initSkillRadar } from './modules/skill-radar.js';
import { initCareerTimeline } from './modules/timeline.js';
import { initProjectMore } from './modules/project-more.js';
import { initRecruiterEnhancements } from './modules/recruiter-enhancements.js';

const RESUME_DATA_PATHS = {
  ko: '/resume-data.json',
  en: '/en/resume-data.json',
  ja: '/ja/resume-data.json',
};

function currentLocale() {
  const lang = document.documentElement.lang || 'ko';
  return Object.prototype.hasOwnProperty.call(RESUME_DATA_PATHS, lang) ? lang : 'ko';
}

async function loadResumeData() {
  const existing = window.__RESUME_CHAT_DATA__;
  if (existing && Object.keys(existing).length > 0) return;

  try {
    const response = await fetch(RESUME_DATA_PATHS[currentLocale()], {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    });
    if (!response.ok) throw new Error(`resume data request failed: ${response.status}`);
    window.__RESUME_CHAT_DATA__ = await response.json();
  } catch (error) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[ResumeData] Failed to load resume data', error);
    }
    window.__RESUME_CHAT_DATA__ = {};
  }
}

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

  const register = () => {
    navigator.serviceWorker
      .register('/sw.js')
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

// Initialize all modules. main.js is injected dynamically (a nonce'd loader
// does document.body.appendChild(script src=/main.js, defer)). A dynamically
// appended script can finish executing AFTER DOMContentLoaded has already
// fired, in which case a fresh addEventListener('DOMContentLoaded') callback
// would NEVER run. Guard on readyState: run immediately if the DOM is ready,
// otherwise wait for the event.
async function bootstrapPortfolio() {
  registerServiceWorker();
  initUI();
  initWebVitals();
  initProjectMore();
  initRecruiterEnhancements();
  await loadResumeData();
  initSkillRadar();
  initCareerTimeline();
  restoreHashScrollTarget();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapPortfolio, { once: true });
} else {
  bootstrapPortfolio();
}
