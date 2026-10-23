import { initContactCopy } from './contact-copy.js';
import { initAnchorScroll } from './anchor-scroll.js';
import { onCoverLetterResize, overlapsCoverLetterText } from './cover-letter-overlap.js';
import { animateGeometry } from './disclosure.js';
import { preferredScrollBehavior } from './scroll-behavior.js';
import { onInitialScrollOffset } from './scroll-offset.js';

export function initUI() {
  initAnchorScroll();
  initSectionAnalytics();
  initBackToTop();
  initMobileNav();
  initContactCopy();
}

/**
 * Fire a one-time `section_view` analytics event per `.reveal` section as it enters view.
 *
 * gtag is defined by a LATER inline script, and this module loads via a deferred
 * dynamic loader — so gtag may not exist yet at init time. We therefore install
 * the observer unconditionally and check window.gtag INSIDE the callback, only
 * marking a section tracked once the event actually fires (no permanent no-op).
 */
function initSectionAnalytics() {
  const sections = document.querySelectorAll('.reveal');
  if (sections.length === 0) return;
  const tracked = Object.create(null);
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        if (typeof window.gtag !== 'function') return;
        const id = e.target.id || e.target.getAttribute('data-section');
        if (id && !tracked[id]) {
          tracked[id] = true;
          window.gtag('event', 'section_view', { section: id, event_category: 'engagement' });
        }
      });
    },
    { threshold: 0.1 }
  );
  sections.forEach((el) => obs.observe(el));
}

function initBackToTop() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  const backToTopLabel = lang.startsWith('en')
    ? 'Scroll to top'
    : lang.startsWith('ja')
      ? 'ページ上部へ'
      : '맨 위로';
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', backToTopLabel);
  btn.setAttribute('data-tooltip', 'above');
  btn.setAttribute('aria-hidden', 'true');
  btn.tabIndex = -1;
  btn.textContent = '↑';
  document.body.appendChild(btn);

  let scrollTop = 0;
  function toggleVisibility() {
    const visible = scrollTop > 400 && !overlapsCoverLetterText(btn);
    btn.classList.toggle('visible', visible);
    btn.setAttribute('aria-hidden', String(!visible));
    btn.tabIndex = visible ? 0 : -1;
  }
  /** @param {number} offset */
  function setScrollTop(offset) {
    scrollTop = offset;
    toggleVisibility();
  }
  const readScrollTop = () => setScrollTop(window.scrollY);

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
  });

  window.addEventListener('scroll', readScrollTop, { passive: true });
  window.addEventListener('resize', readScrollTop, { passive: true });
  onCoverLetterResize(toggleVisibility);
  // The first state follows the browser's own layout instead of forcing one at init.
  onInitialScrollOffset(setScrollTop);
}

export function initMobileNav() {
  const toggle = /** @type {HTMLButtonElement | null} */ (document.querySelector('.nav-toggle'));
  if (!toggle) return;
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  // The page's inline binding marks the toggle 'early' and stops acting once this marks it 'true'.
  if (toggle.dataset.mobileNavBound === 'true') return;

  toggle.dataset.mobileNavBound = 'true';
  const openLabel = toggle.getAttribute('data-nav-label-open');
  const closeLabel = toggle.getAttribute('data-nav-label-close');

  /** @param {boolean} expanded */
  const setToggleLabel = (expanded) => {
    if (!openLabel || !closeLabel) return;
    toggle.setAttribute('aria-label', expanded ? closeLabel : openLabel);
  };

  /**
   * The menu's real height animates open and closed through the shared geometry animation;
   * while closing it stays laid out (is-collapsing) until that animation ends. A link closes
   * it at once, so the anchor scroll measures the page without the menu.
   * @param {boolean} open
   * @param {boolean} [animate]
   */
  const setMenuOpen = (open, animate = true) => {
    toggle.setAttribute('aria-expanded', String(open));
    setToggleLabel(open);
    const mutate = () => {
      navLinks.classList.toggle('open', open);
      navLinks.classList.toggle('is-collapsing', !open && animate);
    };
    if (!animate) {
      mutate();
      return;
    }
    const [closing] = animateGeometry([navLinks], mutate);
    if (open) return;
    if (!closing) {
      navLinks.classList.remove('is-collapsing');
      return;
    }
    closing.addEventListener('finish', () => {
      if (!navLinks.classList.contains('open')) navLinks.classList.remove('is-collapsing');
    });
  };

  toggle.addEventListener('click', () => {
    setMenuOpen(toggle.getAttribute('aria-expanded') !== 'true');
  });

  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setMenuOpen(false, false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      setMenuOpen(false);
      toggle.focus();
    }
  });
}
