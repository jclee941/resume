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

  const response = await fetch(RESUME_DATA_PATHS[currentLocale()], {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  });
  if (!response.ok) throw new Error(`resume data request failed: ${response.status}`);
  window.__RESUME_CHAT_DATA__ = await response.json();
}

function showBootstrapError(error) {
  const root = document.documentElement;
  root.setAttribute('data-portfolio-ready', 'error');

  const status = document.createElement('p');
  status.dataset.portfolioBootstrapStatus = 'error';
  status.style.background = 'var(--bg-card)';
  status.style.border = '1px solid var(--border-primary)';
  status.style.borderRadius = 'var(--radius-lg)';
  status.style.boxShadow = 'var(--shadow-sm)';
  status.style.color = 'var(--text-primary)';
  status.style.margin = '0 0 var(--space-4)';
  status.style.padding = 'var(--space-4)';
  status.role = 'status';
  status.setAttribute('aria-live', 'assertive');
  const copy = {
    ko: ['포트폴리오를 불러오지 못했습니다. ', ['잠시 후'], ' 다시 시도해 주세요.'],
    en: ['The portfolio could not be loaded. Please try again shortly.'],
    ja: [
      'ポートフォリオを',
      ['読み込めませんでした'],
      '。',
      ['しばらくしてから'],
      ['再試行してください'],
      '。',
    ],
  }[currentLocale()];
  for (const part of copy) {
    if (typeof part === 'string') {
      status.append(part);
      continue;
    }
    const unit = document.createElement('span');
    unit.style.whiteSpace = 'nowrap';
    unit.textContent = part[0];
    status.append(unit);
  }
  const pageBody = document.querySelector('.page-body');
  (pageBody || document.body).prepend(status);

  console.error('[PortfolioBootstrap]', {
    event: 'portfolio_bootstrap_failed',
    message: error instanceof Error ? error.message : String(error),
  });
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
  try {
    registerServiceWorker();
    initUI();
    initWebVitals();
    initProjectMore();
    initRecruiterEnhancements();
    await loadResumeData();
    initSkillRadar();
    initCareerTimeline();
    restoreHashScrollTarget();
    document.documentElement.setAttribute('data-portfolio-ready', 'true');
  } catch (error) {
    showBootstrapError(error);
  }
}

document.documentElement.removeAttribute('data-portfolio-ready');

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapPortfolio, { once: true });
} else {
  bootstrapPortfolio();
}
