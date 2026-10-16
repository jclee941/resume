import { animateGeometry, prefersReducedMotion, readMotionTokens } from './disclosure.js';

/** @type {WeakMap<Element, Animation>} */
const running = new WeakMap();

/** @returns {'auto' | 'smooth'} evaluated at call time so a changed preference applies at once */
export function scrollBehavior() {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}

/**
 * Runs `mutate` (which reorders, reveals or hides cards) and animates every card that stays
 * visible from its old position to its new one (FLIP), plus the list height. In-flight animations
 * are cancelled first, so the motion restarts from where each card currently is. Under reduced
 * motion the layout simply changes.
 * @param {Element} list
 * @param {Element[]} cards
 * @param {() => void} mutate
 */
export function flipReorder(list, cards, mutate) {
  const first = new Map(cards.map((card) => [card, card.getBoundingClientRect()]));
  cards.forEach((card) => running.get(card)?.cancel());
  animateGeometry([list], () => {
    mutate();
    if (prefersReducedMotion() || typeof cards[0]?.animate !== 'function') return;
    const { duration, easing } = readMotionTokens();
    cards.forEach((card) => {
      const from = /** @type {DOMRect} */ (first.get(card));
      const to = card.getBoundingClientRect();
      if (!from.width || !to.width) return;
      const dx = from.left - to.left;
      const dy = from.top - to.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const animation = card.animate(
        [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }],
        { duration, easing }
      );
      running.set(card, animation);
      animation.onfinish = () => {
        if (running.get(card) === animation) running.delete(card);
      };
    });
  });
}
