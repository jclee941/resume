/**
 * Scroll behaviour for JS-initiated scrolling. Evaluated at call time so a
 * change of the reduced-motion preference applies to the next scroll.
 * @returns {ScrollBehavior}
 */
export function preferredScrollBehavior() {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  return reduced ? 'auto' : 'smooth';
}
