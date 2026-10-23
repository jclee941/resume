import { initContactCopy } from './contact-copy.js';
import { initAnchorScroll } from './anchor-scroll.js';
import { onCoverLetterResize, overlapsCoverLetterText } from './cover-letter-overlap.js';
import { animateGeometry } from './disclosure.js';
import { preferredScrollBehavior } from './scroll-behavior.js';
import { onInitialScrollOffset } from './scroll-offset.js';

export function initUI() {
  initAnchorScroll();
  initScrollReveal();
  initSectionAnalytics();
  initBackToTop();
  initMobileNav();
  initContactCopy();
}

/**
 * Fire a one-time `section_view` analytics event per section as it enters view.
 * Reveal of .reveal elements is handled separately by initScrollReveal().
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

/**
 * @param {{ root?: Document | HTMLElement }} [options]
 */
export function initScrollReveal(options = {}) {
  const root = options.root || document;
  const revealElements = Array.from(root.querySelectorAll('.reveal'));
  if (revealElements.length === 0) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    // No animation: reveal everything immediately. We intentionally do NOT add
    // `reveal-ready`, so the hidden-state rule never applies and content shows.
    revealElements.forEach((el) => el.classList.add('revealed'));
    return;
  }

  // IntersectionObserver may be missing (old engines) or throw. If reveal can't
  // be driven, leave content visible by never adding `reveal-ready`. The hidden
  // state is gated on `.reveal-ready .reveal`, so this is fail-open: app-JS
  // failure/delay can no longer leave content stuck at opacity:0.
  if (typeof IntersectionObserver !== 'function') return;

  /** @type {IntersectionObserver} */
  let observer;
  /** @type {IntersectionObserver} */
  let initial;

  /** @param {Element} el */
  const reveal = (el) => {
    el.classList.add('revealed');
    observer.unobserve(el);
  };

  try {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) reveal(entry.target);
        });
      },
      {
        // threshold:0 (not 0.1) so a tall section reveals as soon as ANY part
        // intersects. In short landscape viewports a tall section can never reach
        // 10% visibility, which previously left it stuck at opacity 0.
        threshold: 0,
        rootMargin: '0px 0px -50px 0px',
      }
    );
    // FAIL-SAFE 1: reveal anything already in or above the viewport, so content
    // visible on first paint never waits for a scroll event (fixes the
    // "blank/잘림" impression on fast scroll or full-page capture). Positions come
    // from this observer's first delivery, measured in the browser's own layout,
    // so init never forces a reflow.
    initial = new IntersectionObserver((entries) => {
      // Only NOW, with positions from a working observer, opt into the hidden state.
      document.documentElement.classList.add('reveal-ready');
      entries.forEach((entry) => {
        initial.unobserve(entry.target);
        // top above the fold bottom => in view OR already scrolled past: reveal now.
        // Only elements still below the fold wait for the scroll observer (normal fade).
        const foldBottom = entry.rootBounds ? entry.rootBounds.bottom : Infinity;
        if (entry.boundingClientRect.top < foldBottom) reveal(entry.target);
        else observer.observe(entry.target);
      });
    });
  } catch {
    return;
  }

  revealElements.forEach((el) => initial.observe(el));

  // FAIL-SAFE 2: bounded safety timeout. If the IO callback never fires for a
  // pending element (throttled main thread, headless capture, fast scroll),
  // force-reveal everything so content is never permanently stuck hidden.
  window.setTimeout(() => {
    revealElements.forEach((el) => {
      if (!el.classList.contains('revealed')) reveal(el);
    });
  }, 3000);
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
