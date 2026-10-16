import { ICON_PATHS, ICON_SVG_ATTRS } from '../../../lib/icons.js';

/**
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * @param {string} tech
 * @returns {string}
 */
export function getTechClass(tech) {
  /** @type {Record<string, string>} */
  const map = {
    Splunk: 'splunk',
    'Webhook Flow': 'webhook',
    FortiManager: 'fortimanager',
    Python: 'python',
    Docker: 'docker',
    FortiGate: 'fortigate',
    Ansible: 'ansible',
    VMware: 'vmware',
    PostgreSQL: 'postgresql',
    AWS: 'aws',
    'NSX-T': 'nsx',
    Wazuh: 'wazuh',
  };
  return map[tech] || '';
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/**
 * @param {Element} element
 * @param {string} attrs
 * @returns {void}
 */
function applySvgAttributes(element, attrs) {
  const matches = attrs.matchAll(/([a-zA-Z0-9:-]+)="([^"]*)"/g);
  for (const match of matches) {
    element.setAttribute(match[1], match[2]);
  }
}

/**
 * @param {string} name
 * @param {string} [className='portfolio-icon']
 * @returns {SVGSVGElement}
 */
export function createIconElement(name, className = 'portfolio-icon') {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('class', className);
  for (const [attr, value] of Object.entries(ICON_SVG_ATTRS)) svg.setAttribute(attr, value);

  const path = ICON_PATHS[name] || ICON_PATHS.layers;
  const nodeMatches = path.matchAll(/<([a-z]+)\s+([^/>]+)\/>/g);
  for (const match of nodeMatches) {
    const node = document.createElementNS(SVG_NS, match[1]);
    applySvgAttributes(node, match[2]);
    svg.appendChild(node);
  }
  return svg;
}
