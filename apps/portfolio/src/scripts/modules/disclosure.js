/**
 * Shared disclosure behaviour for server-rendered controls: a button that carries both of its
 * labels in data attributes, toggles an open class, and animates the real geometry change.
 */

/** @type {WeakMap<Element, Animation>} */
const running = new WeakMap();

/** @param {string} value */
function parseTime(value) {
  const text = value.trim();
  const amount = Number.parseFloat(text);
  if (Number.isNaN(amount)) return 0;
  return text.endsWith('ms') ? amount : amount * 1000;
}

export function prefersReducedMotion() {
  return typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;
}

/** Duration and easing come from the design tokens, read when the animation starts. */
export function readMotionTokens() {
  const styles = getComputedStyle(document.documentElement);
  return {
    duration: parseTime(styles.getPropertyValue('--duration-base')),
    easing: styles.getPropertyValue('--ease-out').trim() || 'ease-out',
  };
}

/**
 * Runs `mutate` and animates each element from its current rendered height to its new one.
 * An animation still in flight is cancelled first, so a second toggle continues from where the
 * first one currently is. Entry and exit use the same duration and easing. Under reduced motion
 * the layout changes instantly.
 * @param {Element[]} elements
 * @param {() => void} mutate
 * @returns {Animation[]} the animations started (none under reduced motion)
 */
export function animateGeometry(elements, mutate) {
  const before = elements.map((element) => element.getBoundingClientRect().height);
  elements.forEach((element) => running.get(element)?.cancel());
  mutate();
  /** @type {Animation[]} */
  const started = [];
  if (prefersReducedMotion() || typeof elements[0]?.animate !== 'function') return started;
  const { duration, easing } = readMotionTokens();
  elements.forEach((element, index) => {
    const to = element.getBoundingClientRect().height;
    if (Math.abs(before[index] - to) < 1) return;
    const animation = element.animate(
      [
        { height: `${before[index]}px`, overflow: 'clip' },
        { height: `${to}px`, overflow: 'clip' },
      ],
      { duration, easing }
    );
    running.set(element, animation);
    started.push(animation);
    animation.onfinish = () => {
      if (running.get(element) === animation) running.delete(element);
    };
  });
  return started;
}

/**
 * @typedef {Object} DisclosureOptions
 * @property {Element} owner Element that receives the open class.
 * @property {string} openClass
 * @property {Element[]} [animate] Elements whose height animates (defaults to the owner).
 * @property {(open: boolean) => void} [onChange] Extra state changes made inside the animation.
 */

/**
 * @param {HTMLElement} button
 * @param {DisclosureOptions} options
 */
export function bindDisclosure(button, { owner, openClass, animate = [owner], onChange }) {
  const label = button.querySelector('[data-disclosure-label]') || button;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    animateGeometry(animate, () => {
      owner.classList.toggle(openClass, open);
      button.setAttribute('aria-expanded', String(open));
      label.textContent = (open ? button.dataset.labelOpen : button.dataset.labelClosed) ?? '';
      const name = open ? button.dataset.nameOpen : button.dataset.nameClosed;
      if (name) button.setAttribute('aria-label', name);
      if (onChange) onChange(open);
    });
  });
}
