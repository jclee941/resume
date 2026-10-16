const {
  ICON_PATHS,
  ICON_SVG_ATTRS,
  renderIconSvg,
} = require('../../../../apps/portfolio/lib/icons');
const { createFakeDocument } = require('../../../helpers/fake-dom');

describe('shared icon source', () => {
  test('renderIconSvg emits the shared attributes and path data', () => {
    const svg = renderIconSvg('check', 'x');
    expect(svg.startsWith('<svg class="x"')).toBe(true);
    for (const [name, value] of Object.entries(ICON_SVG_ATTRS)) {
      expect(svg).toContain(` ${name}="${value}"`);
    }
    expect(svg).toContain(ICON_PATHS.check);
    expect(renderIconSvg('does-not-exist')).toContain(ICON_PATHS.layers);
  });

  test.each(Object.keys(ICON_PATHS))(
    'client factory builds the same nodes for %s',
    async (name) => {
      global.document = createFakeDocument();
      const { createIconElement } =
        await import('../../../../apps/portfolio/src/scripts/modules/project-card-formatting.js');
      const svg = createIconElement(name, 'x');
      expect(svg.getAttribute('class')).toBe('x');
      for (const [attr, value] of Object.entries(ICON_SVG_ATTRS)) {
        expect(svg.getAttribute(attr)).toBe(value);
      }
      expect(svg.children).toHaveLength(ICON_PATHS[name].match(/<[a-z]+\s[^>]*\/>/g).length);
      delete global.document;
    }
  );
});
