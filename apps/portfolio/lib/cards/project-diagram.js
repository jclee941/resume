const crypto = require('crypto');

/**
 * @typedef {{ id: string, label: string, sub?: string, kind: string }} DiagramNode
 * @typedef {{ from: string, to: string, label?: string }} DiagramEdge
 * @typedef {{ nodes: DiagramNode[], edges: DiagramEdge[] }} DiagramSpec
 * @typedef {DiagramNode & {
 *   w: number, h: number, layer: number, inDegree: number,
 *   out: string[], in: string[], x: number, y: number
 * }} PlacedNode
 */

const COL = 240;
const ROW = 96;
const LAYER_Y = 72;
const GAP = 16;
const PAD = 24;
const KINDS = new Set(['source', 'process', 'store', 'sink', 'actor']);

/** @param {unknown} value */
function escapeHtml(value) {
  if (!value) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** @param {string | undefined} text */
function estWidth(text) {
  if (!text) return 0;
  return 32 + Array.from(text).reduce((s, c) => s + (c.charCodeAt(0) > 255 ? 14 : 8), 0);
}

/** @param {DiagramSpec} spec */
function validateDiagramSpec(spec) {
  if (!spec || !Array.isArray(spec.nodes) || !Array.isArray(spec.edges))
    throw new Error('Invalid spec format');
  if (spec.nodes.length < 2 || spec.nodes.length > 8)
    throw new Error('Nodes count must be between 2 and 8');
  if (spec.edges.length > 12) throw new Error('Edges count cannot exceed 12');
  const nodeIds = new Set();
  spec.nodes.forEach((n) => {
    if (!n.id || !n.label) throw new Error('Node missing id or label');
    if (nodeIds.has(n.id)) throw new Error(`Duplicate node id: ${n.id}`);
    if (!KINDS.has(n.kind)) throw new Error(`Unknown kind: ${n.kind}`);
    nodeIds.add(n.id);
  });
  /** @type {Map<string, number>} */
  const inDegree = new Map(spec.nodes.map((n) => [n.id, 0]));
  /** @type {Map<string, string[]>} */
  const adj = new Map(spec.nodes.map((n) => [n.id, []]));
  spec.edges.forEach((e) => {
    if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) throw new Error('Edge references missing node');
    adj.get(e.from)?.push(e.to);
    inDegree.set(e.to, (inDegree.get(e.to) ?? 0) + 1);
  });
  let visited = 0;
  /** @type {string[]} */
  const queue = [];
  for (const [id, deg] of inDegree.entries()) if (deg === 0) queue.push(id);
  while (queue.length > 0) {
    visited++;
    (adj.get(/** @type {string} */ (queue.shift())) ?? []).forEach((v) => {
      const d = (inDegree.get(v) ?? 0) - 1;
      inDegree.set(v, d);
      if (d === 0) queue.push(v);
    });
  }
  if (visited !== spec.nodes.length) throw new Error('Diagram contains a cycle');
}

/**
 * Orders each layer by the mean position of its neighbours in the previous layer
 * (one forward and one backward sweep) so edges between layers do not cross.
 * @param {PlacedNode[][]} layers
 * @param {Map<string, number>} order
 */
function sortLayers(layers, order) {
  /** @param {string[]} ids @param {PlacedNode[]} ref */
  const barycenter = (ids, ref) => {
    const positions = ids.map((id) => ref.findIndex((x) => x.id === id)).filter((i) => i >= 0);
    return positions.length > 0 ? positions.reduce((s, i) => s + i, 0) / positions.length : -1;
  };
  /** @param {number} L @param {1 | -1} dir */
  const sortLayer = (L, dir) => {
    layers[L].sort((a, b) => {
      const ba = barycenter(dir === 1 ? a.in : a.out, layers[L - dir]);
      const bb = barycenter(dir === 1 ? b.in : b.out, layers[L - dir]);
      if (ba === bb) return (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0);
      if (ba === -1) return 1;
      if (bb === -1) return -1;
      return ba - bb;
    });
  };
  for (let L = 1; L < layers.length; L++) sortLayer(L, 1);
  for (let L = layers.length - 2; L >= 0; L--) sortLayer(L, -1);
}

/**
 * @param {DiagramSpec} spec
 * @param {boolean} isWide
 * @returns {{ nodes: Map<string, PlacedNode>, W: number, H: number }}
 */
function layout(spec, isWide) {
  /** @type {PlacedNode[]} */
  const nodes = spec.nodes.map((n) => ({
    ...n,
    w: Math.max(estWidth(n.label), estWidth(n.sub)),
    h: n.sub ? 56 : 44,
    layer: 0,
    inDegree: 0,
    out: [],
    in: [],
    x: 0,
    y: 0,
  }));
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  /** @param {string} id */
  const node = (id) => /** @type {PlacedNode} */ (nodeMap.get(id));
  spec.edges.forEach((e) => {
    node(e.from).out.push(e.to);
    node(e.to).in.push(e.from);
    node(e.to).inDegree++;
  });
  const queue = nodes.filter((n) => n.inDegree === 0);
  while (queue.length) {
    const u = /** @type {PlacedNode} */ (queue.shift());
    u.out.forEach((vid) => {
      const v = node(vid);
      v.layer = Math.max(v.layer, u.layer + 1);
      if (--v.inDegree === 0) queue.push(v);
    });
  }
  /** @type {PlacedNode[][]} */
  const layers = [];
  nodes.forEach((n) => {
    (layers[n.layer] = layers[n.layer] || []).push(n);
  });
  const order = new Map(spec.nodes.map((n, i) => [n.id, i]));
  layers.forEach((l) => l.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
  sortLayers(layers, order);

  const maxL = layers.length - 1;
  const maxS = Math.max(...layers.map((l) => l.length));
  /** @param {PlacedNode[]} layer */
  const layerWidth = (layer) => layer.reduce((sum, n) => sum + n.w, 0) + GAP * (layer.length - 1);
  const W = isWide ? 160 + maxL * COL : Math.max(...layers.map(layerWidth)) + PAD * 2;
  const H = isWide ? maxS * ROW + 16 : 56 + maxL * LAYER_Y;
  layers.forEach((layer, L) => {
    let cursor = (W - layerWidth(layer)) / 2;
    layer.forEach((n, i) => {
      if (isWide) {
        n.x = 80 + L * COL;
        n.y = H / 2 + (i - (layer.length - 1) / 2) * ROW;
      } else {
        n.x = cursor + n.w / 2;
        cursor += n.w + GAP;
        n.y = 28 + L * LAYER_Y;
      }
    });
  });
  return { nodes: nodeMap, W, H };
}

/**
 * @param {PlacedNode} from
 * @param {PlacedNode} to
 * @param {boolean} isWide
 * @param {string} markerId
 * @param {string | undefined} label
 */
function renderEdge(from, to, isWide, markerId, label) {
  const x1 = isWide ? from.x + from.w / 2 : from.x;
  const y1 = isWide ? from.y : from.y + from.h / 2;
  const x2 = isWide ? to.x - to.w / 2 : to.x;
  const y2 = isWide ? to.y : to.y - to.h / 2;
  const cp = Math.max(20, ((isWide ? x2 - x1 : y2 - y1) || 0) / 2);
  const d = isWide
    ? `M ${x1},${y1} C ${x1 + cp},${y1} ${x2 - cp},${y2} ${x2},${y2}`
    : `M ${x1},${y1} C ${x1},${y1 + cp} ${x2},${y2 - cp} ${x2},${y2}`;
  let svg = `<path d="${d}" class="edge__path" marker-end="url(#${markerId})" />`;
  if (label) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    svg += isWide
      ? `<text x="${mx}" y="${my - 4}" class="edge__label" text-anchor="middle">${escapeHtml(label)}</text>`
      : `<text x="${mx + 6}" y="${my + 4}" class="edge__label" text-anchor="start">${escapeHtml(label)}</text>`;
  }
  return svg;
}

/** @param {PlacedNode} n */
function renderNode(n) {
  const text = n.sub
    ? `<text y="-2" class="node__label" text-anchor="middle">${escapeHtml(n.label)}</text><text y="14" class="node__sub" text-anchor="middle">${escapeHtml(n.sub)}</text>`
    : `<text y="4" class="node__label" text-anchor="middle">${escapeHtml(n.label)}</text>`;
  return `<g class="node node--${n.kind}" transform="translate(${n.x}, ${n.y})"><rect x="${-n.w / 2}" y="${-n.h / 2}" width="${n.w}" height="${n.h}" rx="6" class="node__bg" />${text}</g>`;
}

/**
 * @param {DiagramSpec} spec
 * @param {string} idPrefix
 * @param {boolean} isWide
 * @param {string} title
 * @param {string} desc
 */
function renderSvg(spec, idPrefix, isWide, title, desc) {
  const { nodes, W, H } = layout(spec, isWide);
  const suffix = isWide ? 'w' : 'n';
  const [tId, dId, mId] = ['t', 'd', 'm'].map((kind) => `${idPrefix}-${kind}-${suffix}`);
  /** @param {string} id */
  const node = (id) => /** @type {PlacedNode} */ (nodes.get(id));
  let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" class="project-diagram__svg--${isWide ? 'wide' : 'narrow'}" role="img" aria-labelledby="${tId} ${dId}">`;
  svg += `<title id="${tId}">${escapeHtml(title)}</title><desc id="${dId}">${escapeHtml(desc)}</desc><defs><marker id="${mId}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" class="edge__arrow" /></marker></defs>`;
  spec.edges.forEach((e) => {
    svg += renderEdge(node(e.from), node(e.to), isWide, mId, e.label);
  });
  nodes.forEach((n) => {
    svg += renderNode(n);
  });
  return `${svg}</svg>`;
}

/**
 * @param {DiagramSpec} spec
 * @param {{ title: string, desc: string }} options
 * @returns {string}
 */
function renderProjectDiagram(spec, { title, desc }) {
  validateDiagramSpec(spec);
  const hash = crypto
    .createHash('sha256')
    .update(title + JSON.stringify(spec))
    .digest('hex')
    .slice(0, 6);
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const idPrefix = `diag-${slug}-${hash}`;
  const wide = renderSvg(spec, idPrefix, true, title, desc);
  const narrow = renderSvg(spec, idPrefix, false, title, desc);
  return `<figure class="project-diagram">\n${wide}\n${narrow}\n</figure>`;
}

module.exports = { renderProjectDiagram, validateDiagramSpec };
