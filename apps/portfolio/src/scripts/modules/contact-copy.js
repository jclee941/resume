/**
 * Progressive-enhancement copy-to-clipboard for the contact email.
 *
 * The email stays a working `mailto:` anchor in the markup, so no-JS /
 * failed-JS visitors keep a functional link. When JS runs, clicking the
 * link instead copies the address to the clipboard and shows brief
 * "Copied!" feedback (announced via an aria-live status region). All
 * clipboard failures fail open — the worst case is the browser following
 * the original mailto link.
 */

const COPIED_CLASS = 'is-copied';
const RESET_MS = 2000;

function announce(root, message) {
  const status = root.querySelector('.contact-copy-status');
  if (status) status.textContent = message;
}

async function copyEmail(link, root, navigate) {
  const email = link.dataset && link.dataset.contactEmail;
  if (!email) return;
  const clip = typeof navigator !== 'undefined' ? navigator.clipboard : null;
  if (!clip || typeof clip.writeText !== 'function') {
    // Clipboard API disappeared between init and click (very rare). The click
    // was already prevented, so fail open to the mailto target.
    const href = link.getAttribute && link.getAttribute('href');
    if (href) navigate(href);
    return;
  }
  try {
    await clip.writeText(email);
    link.classList.add(COPIED_CLASS);
    announce(root, `${email} 복사됨`);
    if (link._copyTimer) clearTimeout(link._copyTimer);
    link._copyTimer = setTimeout(() => {
      link.classList.remove(COPIED_CLASS);
      announce(root, '');
    }, RESET_MS);
  } catch {
    // Copy failed (permission denied / policy / transient). preventDefault()
    // already ran, so the browser will NOT follow the mailto on its own.
    // Fail open by navigating to the mailto target ourselves.
    const href = link.getAttribute && link.getAttribute('href');
    if (href) navigate(href);
  }
}

function defaultNavigate(href) {
  if (typeof window !== 'undefined' && window.location) {
    window.location.href = href;
  }
}

export function initContactCopy(root = document, options = {}) {
  const navigate = options.navigate || defaultNavigate;
  const links = root.querySelectorAll('[data-contact-email]');
  if (!links || links.length === 0) return;
  const hasClipboard =
    typeof navigator !== 'undefined' &&
    navigator.clipboard &&
    typeof navigator.clipboard.writeText === 'function';
  links.forEach((link) => {
    link.addEventListener('click', (event) => {
      // Only hijack the click when we can actually copy; otherwise let the
      // mailto link proceed untouched (true progressive enhancement).
      if (!hasClipboard) return;
      if (event && typeof event.preventDefault === 'function') event.preventDefault();
      copyEmail(link, root, navigate);
    });
  });
}
