/**
 * The phone action bar names its region in the page language, from the recruiter labels.
 */
function makeNode() {
  const attributes = new Map();
  const node = {
    children: [],
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    setAttribute: (name, value) => attributes.set(name, String(value)),
    getAttribute: (name) => (attributes.has(name) ? attributes.get(name) : null),
    append: (...nodes) => node.children.push(...nodes),
    appendChild: (child) => node.children.push(child),
    addEventListener() {},
  };
  return node;
}

function installFakeDom(lang) {
  const body = makeNode();
  global.document = {
    documentElement: { lang },
    body,
    querySelector: () => null,
    createElement: () => makeNode(),
    createElementNS: () => makeNode(),
  };
  global.window = { scrollY: 0, addEventListener() {} };
  return body;
}

describe('phone action bar label', () => {
  let renderMobileActionBar;
  let getRecruiterLabels;
  beforeAll(async () => {
    ({ renderMobileActionBar } =
      await import('../../../apps/portfolio/src/scripts/modules/recruiter-mobile-actions.js'));
    ({ getRecruiterLabels } =
      await import('../../../apps/portfolio/src/scripts/modules/recruiter-enhancements-data.js'));
  });
  afterEach(() => {
    delete global.document;
    delete global.window;
  });

  test.each(['ko', 'en', 'ja'])('names the bar in the %s page language', (lang) => {
    const body = installFakeDom(lang);
    const labels = getRecruiterLabels();
    renderMobileActionBar(labels);
    expect(labels.actionBar).toBeTruthy();
    expect(body.children[0].getAttribute('aria-label')).toBe(labels.actionBar);
    if (lang !== 'en') expect(labels.actionBar).not.toBe('Recruiter actions');
  });
});
