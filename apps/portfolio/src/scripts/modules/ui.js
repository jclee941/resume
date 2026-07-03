import { initContactCopy } from './contact-copy.js';

export function initUI() {
  initSmoothScroll();
  initNavScrollEffect();
  initScrollReveal();
  initSectionAnalytics();
  initScrollProgress();
  initBackToTop();
  initMobileNav();
  initContactCopy();
}

/**
 * Fire a one-time `section_view` analytics event per section as it enters view.
 * Reveal of .reveal elements is handled separately by initScrollReveal(); this
 * is the analytics concern that used to live inline in index.html.
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

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        const offset = 80;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      }
    });
  });
}

function initNavScrollEffect() {
  const nav = document.querySelector('.nav');
  if (!nav) return;

  window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    // Add 'scrolled' class when scrolled > 100px
    if (currentScroll > 100) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  });
}

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

  let observer;
  try {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
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
  } catch {
    return;
  }

  // Only NOW, with a working observer wired up, opt into the hidden state.
  document.documentElement.classList.add('reveal-ready');

  const reveal = (el) => {
    el.classList.add('revealed');
    try {
      observer.unobserve(el);
    } catch {
      /* unobserve is best-effort */
    }
  };

  // FAIL-SAFE 1: reveal anything already in or above the viewport at init, so
  // content visible on first paint never waits for a scroll event (fixes the
  // "blank/잘림" impression on fast scroll or full-page capture).
  const vh = window.innerHeight || 0;
  revealElements.forEach((el) => {
    const r = el.getBoundingClientRect();
    // top above the fold bottom => in view OR already scrolled past: reveal now.
    // Only elements still below the fold wait for the observer (normal fade).
    if (r.top < vh) reveal(el);
    else observer.observe(el);
  });

  // FAIL-SAFE 2: bounded safety timeout. If the IO callback never fires for a
  // pending element (throttled main thread, headless capture, fast scroll),
  // force-reveal everything so content is never permanently stuck hidden.
  window.setTimeout(() => {
    revealElements.forEach((el) => {
      if (!el.classList.contains('revealed')) reveal(el);
    });
  }, 3000);
}

function initScrollProgress() {
  const progressBar = document.createElement('div');
  progressBar.className = 'scroll-progress';
  progressBar.setAttribute('aria-hidden', 'true');
  document.body.prepend(progressBar);

  function updateProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    // Set CSS custom property on root for CSP compliance
    document.documentElement.style.setProperty('--scroll-progress', `${progress}%`);
  }

  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();
}

function initBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Scroll to top');
  btn.setAttribute('aria-hidden', 'true');
  btn.innerHTML = '↑';
  document.body.appendChild(btn);

  function toggleVisibility() {
    btn.classList.toggle('visible', window.scrollY > 400);
  }

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  window.addEventListener('scroll', toggleVisibility, { passive: true });
  toggleVisibility();
}

function initMobileNav() {
  const toggle = document.querySelector('.nav-toggle');
  if (!toggle) return;
  const navLinks = document.querySelector('.nav-links');
  if (!navLinks) return;
  if (toggle.dataset.mobileNavBound === 'true') return;

  toggle.dataset.mobileNavBound = 'true';
  const openLabel = toggle.getAttribute('data-nav-label-open');
  const closeLabel = toggle.getAttribute('data-nav-label-close');

  function setToggleLabel(expanded) {
    if (!openLabel || !closeLabel) return;
    toggle.setAttribute('aria-label', expanded ? closeLabel : openLabel);
  }

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !expanded;
    toggle.setAttribute('aria-expanded', String(nextExpanded));
    setToggleLabel(nextExpanded);
    navLinks.classList.toggle('open');
  });

  // Close menu when a nav link is clicked
  navLinks.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      toggle.setAttribute('aria-expanded', 'false');
      setToggleLabel(false);
      navLinks.classList.remove('open');
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navLinks.classList.contains('open')) {
      toggle.setAttribute('aria-expanded', 'false');
      setToggleLabel(false);
      navLinks.classList.remove('open');
      toggle.focus();
    }
  });
}
