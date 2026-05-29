import { initWebVitals } from './modules/web-vitals.js';
import { initializeABTesting } from './modules/ab-test.js';
import { initUI } from './modules/ui.js';
import { initMissionControl } from './modules/mission-control.js';
import { initSkillRadar } from './modules/skill-radar.js';
import { initCareerTimeline } from './modules/timeline.js';
import { initProjectCards } from './modules/project-cards.js';
import { initGuestbook } from './modules/guestbook.js';

// Initialize all modules
document.addEventListener('DOMContentLoaded', () => {
  initUI();
  initMissionControl();
  initializeABTesting();
  initWebVitals();
  initSkillRadar();
  initCareerTimeline();
  initProjectCards();
  initGuestbook();

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
});
