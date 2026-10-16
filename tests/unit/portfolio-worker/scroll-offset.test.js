/**
 * The first scroll offset comes from an IntersectionObserver delivery for the root element, so
 * floating controls set their initial state without reading window.scrollY (a forced reflow).
 */
describe('initial scroll offset', () => {
  let onInitialScrollOffset;
  beforeAll(async () => {
    ({ onInitialScrollOffset } =
      await import('../../../apps/portfolio/src/scripts/modules/scroll-offset.js'));
  });
  afterEach(() => {
    delete global.window;
    delete global.document;
    delete global.IntersectionObserver;
  });

  test('reports minus the root element top from the first delivery, then disconnects', () => {
    const scrollReads = { count: 0 };
    global.window = {
      get scrollY() {
        scrollReads.count += 1;
        return 0;
      },
    };
    global.document = { documentElement: {} };
    const observers = [];
    global.IntersectionObserver = class {
      constructor(cb) {
        this.cb = cb;
        this.targets = [];
        this.disconnected = false;
        observers.push(this);
      }
      observe(target) {
        this.targets.push(target);
      }
      disconnect() {
        this.disconnected = true;
      }
    };
    const offsets = [];
    onInitialScrollOffset((offset) => offsets.push(offset));
    expect(observers).toHaveLength(1);
    expect(observers[0].targets).toEqual([global.document.documentElement]);
    expect(offsets).toEqual([]);

    observers[0].cb([
      { target: global.document.documentElement, boundingClientRect: { top: -480 } },
    ]);
    expect(offsets).toEqual([480]);
    expect(observers[0].disconnected).toBe(true);
    expect(scrollReads.count).toBe(0);
  });

  test('falls back to window.scrollY where IntersectionObserver is missing', () => {
    global.window = { scrollY: 120 };
    global.document = { documentElement: {} };
    const offsets = [];
    onInitialScrollOffset((offset) => offsets.push(offset));
    expect(offsets).toEqual([120]);
  });
});
