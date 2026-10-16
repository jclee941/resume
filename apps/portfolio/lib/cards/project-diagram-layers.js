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

module.exports = { PHONE_SVG_MAX_WIDTH, renderDiagramLayers };
