/**
 * Report the page's scroll offset once, from the first IntersectionObserver delivery for the root
 * element, whose top edge sits at minus the offset. The delivery follows the browser's own layout,
 * so a control can set its first state without reading `window.scrollY` right after a DOM write,
 * which forces a synchronous reflow while the page initialises.
 * @param {(offset: number) => void} callback
 */
export function onInitialScrollOffset(callback) {
  if (typeof IntersectionObserver !== 'function') {
    callback(window.scrollY);
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    observer.disconnect();
    callback(Math.max(0, -entries[0].boundingClientRect.top));
  });
  observer.observe(document.documentElement);
}
