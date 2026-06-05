import { initWebVitals } from './modules/web-vitals.js';
import { initUI } from './modules/ui.js';
import { initSkillRadar } from './modules/skill-radar.js';
import { initCareerTimeline } from './modules/timeline.js';
import { initProjectCards } from './modules/project-cards.js';
import { initCoverLetterCollapse } from './modules/cover-letter-collapse.js';
import { initProjectMore } from './modules/project-more.js';

// Initialize all modules. main.js is injected dynamically (a nonce'd loader
// does document.body.appendChild(script src=/main.js, defer)). A dynamically
// appended script can finish executing AFTER DOMContentLoaded has already
// fired, in which case a fresh addEventListener('DOMContentLoaded') callback
// would NEVER run. Guard on readyState: run immediately if the DOM is ready,
// otherwise wait for the event.
function bootstrapPortfolio() {
  initUI();
  initWebVitals();
  initSkillRadar();
  initCareerTimeline();
  initProjectCards();
  initCoverLetterCollapse();
  initProjectMore();

  // Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);

          // Check for updates periodically
          setInterval(
            () => {
              registration.update();
            },
            60 * 60 * 1000
          ); // Check every hour
        })
        .catch((error) => {
          console.log('❌ Service Worker registration failed:', error);
        });
    });

    // Handle service worker updates
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('🔄 Service Worker updated - page will reload');
      window.location.reload();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrapPortfolio, { once: true });
} else {
  bootstrapPortfolio();
}
