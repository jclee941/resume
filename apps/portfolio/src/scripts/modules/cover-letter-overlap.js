const SECTION = '#cover-letter';
const TEXT = ['.cover-letter__headline', '.cover-letter__text', '.cover-letter__closing'].join(
  ', '
);
const CLEARANCE = 8;

/**
 * @param {DOMRect} a
 * @param {DOMRect} b
 * @returns {boolean}
 */
function intersects(a, b) {
  return (
    a.left < b.right + CLEARANCE &&
    a.right > b.left - CLEARANCE &&
    a.top < b.bottom + CLEARANCE &&
    a.bottom > b.top - CLEARANCE
  );
}

/**
 * True while a floating control sits over the cover-letter reading text.
 * Measured from the real boxes, so it holds at every width and fold state.
 * @param {Element} control
 * @returns {boolean}
 */
export function overlapsCoverLetterText(control) {
  const section = document.querySelector(SECTION);
  if (!section) return false;
  const box = control.getBoundingClientRect();
  const sectionBox = section.getBoundingClientRect();
  if (sectionBox.bottom < box.top || sectionBox.top > box.bottom) return false;
  return Array.from(section.querySelectorAll(TEXT)).some((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && intersects(box, rect);
  });
}

/**
 * Re-evaluate when the cover letter changes size without a scroll (fold, resize).
 * @param {() => void} callback
 */
export function onCoverLetterResize(callback) {
  const section = document.querySelector(SECTION);
  if (!section || typeof ResizeObserver !== 'function') return;
  new ResizeObserver(callback).observe(section);
}
