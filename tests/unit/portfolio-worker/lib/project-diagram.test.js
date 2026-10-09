const {
  renderProjectDiagram,
  validateDiagramSpec,
} = require('../../../../apps/portfolio/lib/cards/project-diagram');

describe('project-diagram', () => {
  const validSpec = {
    nodes: [
      { id: 'collector', label: 'Collector', kind: 'source' },
      { id: 'siem', label: 'SIEM', kind: 'store' },
      { id: 'alert', label: 'Alerting', sub: 'Chat', kind: 'sink' },
    ],
    edges: [
      { from: 'collector', to: 'siem' },
      { from: 'siem', to: 'alert', label: 'Trigger' },
    ],
  };

  const meta = { title: 'Test Diagram', desc: 'A test diagram' };

  test('validates spec constraints', () => {
    expect(() =>
      validateDiagramSpec({
        nodes: [{ id: 'n1', label: 'N', kind: 'source' }],
        edges: [],
      })
    ).toThrow(/Nodes count must be between 2 and 8/);

    const manyNodes = Array.from({ length: 9 }).map((_, i) => ({
      id: `n${i}`,
      label: `N${i}`,
      kind: 'source',
    }));
    expect(() => validateDiagramSpec({ nodes: manyNodes, edges: [] })).toThrow(
      /Nodes count must be between 2 and 8/
    );

    expect(() =>
      validateDiagramSpec({
        nodes: [
          { id: 'n1', label: '1', kind: 'source' },
          { id: 'n2', label: '2', kind: 'invalid_kind' },
        ],
        edges: [],
      })
    ).toThrow(/Unknown kind: invalid_kind/);

    expect(() =>
      validateDiagramSpec({
        nodes: [
          { id: 'n1', label: '1', kind: 'source' },
          { id: 'n1', label: '2', kind: 'sink' },
        ],
        edges: [],
      })
    ).toThrow(/Duplicate node id: n1/);

    expect(() =>
      validateDiagramSpec({
        nodes: [
          { id: 'n1', label: '1', kind: 'source' },
          { id: 'n2', label: '2', kind: 'sink' },
        ],
        edges: [{ from: 'n1', to: 'missing' }],
      })
    ).toThrow(/Edge references missing node/);

    expect(() =>
      validateDiagramSpec({
        nodes: [
          { id: 'n1', label: '1', kind: 'source' },
          { id: 'n2', label: '2', kind: 'sink' },
        ],
        edges: [
          { from: 'n1', to: 'n2' },
          { from: 'n2', to: 'n1' },
        ],
      })
    ).toThrow(/Diagram contains a cycle/);
  });

  test('barycenter algorithm prevents crossings in specific layout', () => {
    const spec = {
      nodes: [
        { id: 'A', label: 'A', kind: 'source' },
        { id: 'B', label: 'B', kind: 'process' },
        { id: 'C', label: 'C', kind: 'process' },
        { id: 'D', label: 'D', kind: 'sink' },
        { id: 'E', label: 'E', kind: 'sink' },
        { id: 'F', label: 'F', kind: 'sink' },
      ],
      edges: [
        { from: 'A', to: 'B' },
        { from: 'A', to: 'C' },
        { from: 'B', to: 'D' },
        { from: 'C', to: 'E' },
        { from: 'D', to: 'F' },
        { from: 'E', to: 'F' },
      ],
    };
    const html = renderProjectDiagram(spec, meta);
    const wideMatch = html.match(/class="project-diagram__svg--wide".*?<\/svg>/s)[0];

    const getCoords = (svgStr, label) => {
      const regex = new RegExp(
        `transform="translate\\(([0-9.]+),\\s*([0-9.]+)\\)"(?:(?!<g).)*?>${label}<`,
        's'
      );
      const m = svgStr.match(regex);
      return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
    };

    const b = getCoords(wideMatch, 'B');
    const c = getCoords(wideMatch, 'C');
    const d = getCoords(wideMatch, 'D');
    const e = getCoords(wideMatch, 'E');

    if (b.y < c.y) {
      expect(d.y).toBeLessThan(e.y);
    } else {
      expect(e.y).toBeLessThan(d.y);
    }
  });

  test('generates accessible markup and escapes text', () => {
    const maliciousSpec = {
      nodes: [
        { id: 'n1', label: '<script>', sub: 'a & b', kind: 'source' },
        { id: 'n2', label: '"quote"', kind: 'sink' },
      ],
      edges: [{ from: 'n1', to: 'n2', label: "l'edge" }],
    };
    const html = renderProjectDiagram(maliciousSpec, { title: 'T & T', desc: '<desc>' });

    expect(html).toContain('class="project-diagram__svg--wide"');
    expect(html).toContain('class="project-diagram__svg--narrow"');

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b');
    expect(html).toContain('&quot;quote&quot;');
    expect(html).toContain('l&#39;edge');
    expect(html).toContain('T &amp; T');
    expect(html).toContain('&lt;desc&gt;');

    const matchId = html.match(/aria-labelledby="([^"]+)"/);
    expect(matchId).toBeTruthy();
    const ids = matchId[1].split(' ');
    expect(ids.length).toBe(2);
    expect(html).toContain(`id="${ids[0]}"`);
    expect(html).toContain(`id="${ids[1]}"`);
    expect(html).toContain('role="img"');
  });

  test('identical input yields identical output', () => {
    const out1 = renderProjectDiagram(validSpec, meta);
    const out2 = renderProjectDiagram(validSpec, meta);
    expect(out1).toBe(out2);
  });

  test('different titles yield distinct ids', () => {
    const out1 = renderProjectDiagram(validSpec, { title: 'A', desc: '' });
    const out2 = renderProjectDiagram(validSpec, { title: 'B', desc: '' });

    const getIdPrefix = (html) => {
      const match = html.match(/id="(diag-[a-z0-9-]+)-t-/);
      return match ? match[1] : null;
    };

    const id1 = getIdPrefix(out1);
    const id2 = getIdPrefix(out2);
    expect(id1).not.toBe(id2);
  });

  test('coordinate rules: wide increases x, narrow increases y', () => {
    const html = renderProjectDiagram(validSpec, meta);

    const wideMatch = html.match(/class="project-diagram__svg--wide".*?<\/svg>/s)[0];
    const narrowMatch = html.match(/class="project-diagram__svg--narrow".*?<\/svg>/s)[0];

    const getCoords = (svgStr, label) => {
      const regex = new RegExp(
        `transform="translate\\(([0-9.]+),\\s*([0-9.]+)\\)"(?:(?!<g).)*?>${label}<`,
        's'
      );
      const m = svgStr.match(regex);
      if (!m) throw new Error(`Could not find ${label}`);
      return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
    };

    const cW = getCoords(wideMatch, 'Collector');
    const sW = getCoords(wideMatch, 'SIEM');
    const aW = getCoords(wideMatch, 'Alerting');

    expect(cW.x).toBeLessThan(sW.x);
    expect(sW.x).toBeLessThan(aW.x);

    const cN = getCoords(narrowMatch, 'Collector');
    const sN = getCoords(narrowMatch, 'SIEM');
    const aN = getCoords(narrowMatch, 'Alerting');

    expect(cN.y).toBeLessThan(sN.y);
    expect(sN.y).toBeLessThan(aN.y);
  });
});
