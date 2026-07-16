const MOBILE_ACTIONS = [
  { label: 'Projects', href: '#projects' },
  { label: 'Resume PDF', href: '/resume.pdf' },
  { label: 'Contact', href: '#contact' },
];

function observeContact(setInView) {
  const contact = document.querySelector('#contact');
  if (!contact || typeof IntersectionObserver !== 'function') return;
  const observer = new IntersectionObserver(
    (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
    { rootMargin: '0px 0px -10% 0px', threshold: 0 }
  );
  observer.observe(contact);
}

export function renderMobileActions() {
  const existing = document.querySelector('.mobile-actions');
  if (existing) return existing;

  const bar = document.createElement('aside');
  bar.className = 'mobile-actions';
  bar.setAttribute('aria-label', 'Portfolio actions');
  bar.hidden = true;
  for (const action of MOBILE_ACTIONS) {
    const link = document.createElement('a');
    link.className = 'mobile-actions__link';
    link.href = action.href;
    link.textContent = action.label;
    bar.appendChild(link);
  }
  document.body.appendChild(bar);

  let contactInView = false;
  const updateVisibility = () => {
    const mobile = window.matchMedia('(max-width: 767px)').matches;
    bar.hidden = !(mobile && window.scrollY > 120 && !contactInView);
    bar.classList.toggle('is-visible', !bar.hidden);
  };
  observeContact((isInView) => {
    contactInView = isInView;
    updateVisibility();
  });
  window.addEventListener('scroll', updateVisibility, { passive: true });
  window.addEventListener('resize', updateVisibility, { passive: true });
  updateVisibility();
  return bar;
}
