'use strict';

/** Narrow SVGs up to this width still fit a 320px phone column at full size. */
const PHONE_SVG_MAX_WIDTH = 200;
const CJK_PATTERN = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

/**
 * @typedef {{ id: string, label: string, sub?: string, kind: string, layer: number, x: number }} LayerNode
 * @typedef {{ from: string, to: string, label?: string }} LayerEdge
 */

/**
 * @param {string} base
 * @param {string} text
 */
function textClass(base, text) {
  return CJK_PATTERN.test(text) ? `${base} ${base}--cjk` : base;
}

const LAYER_GAP = 28;
const EDGE_PAD = 6;

/**
 * Stacks narrow layers by their tallest node, so subtitle nodes keep the same edge gap.
 * Sets each node's narrow y and returns the SVG height.
 * @param {{ h: number, y: number }[][]} layers
 * @returns {number}
 */
function stackLayers(layers) {
  const hs = layers.map((l) => Math.max(...l.map((n) => n.h)));
  /** @type {number[]} */
  const ys = [];
  hs.forEach((h, L) =>
    ys.push(L ? ys[L - 1] + hs[L - 1] / 2 + LAYER_GAP + h / 2 : EDGE_PAD + h / 2)
  );
  layers.forEach((l, L) => l.forEach((n) => (n.y = ys[L])));
  const last = hs.length - 1;
  return ys[last] + hs[last] / 2 + EDGE_PAD;
}

/**
 * @param {Map<string, LayerNode>} nodes - narrow layout: every node carries its layer and x
 * @param {LayerEdge[]} edges
 * @param {string} title - accessible name of the list
 * @param {(value: unknown) => string} escapeHtml
 * @returns {string}
 */
function renderDiagramLayers(nodes, edges, title, escapeHtml) {
  /** @type {LayerNode[][]} */
  const layers = [];
  nodes.forEach((n) => (layers[n.layer] = layers[n.layer] || []).push(n));
  const items = layers.map((layer, index) => {
    const via = [
      ...new Set(
        edges
          .filter((e) => e.label && layer.some((n) => n.id === e.to))
          .map((e) => /** @type {string} */ (e.label))
      ),
    ].join(' · ');
    const chips = [...layer]
      .sort((a, b) => a.x - b.x)
      .map((n) => {
        const sub = n.sub ? `<small>${escapeHtml(n.sub)}</small>` : '';
        const cls = textClass(`project-diagram__node project-diagram__node--${n.kind}`, n.label);
        return `<li class="${cls}">${escapeHtml(n.label)}${sub}</li>`;
      })
      .join('');
    const viaHtml =
      index > 0 && via
        ? `<span class="${textClass('project-diagram__via', via)}">${escapeHtml(via)}</span>`
        : '';
    return `<li class="project-diagram__layer">${viaHtml}<ul class="project-diagram__nodes">${chips}</ul></li>`;
  });
  return `<ol class="project-diagram__layers" aria-label="${escapeHtml(title)}">${items.join('')}</ol>`;
}

module.exports = { PHONE_SVG_MAX_WIDTH, renderDiagramLayers, stackLayers, textClass };
