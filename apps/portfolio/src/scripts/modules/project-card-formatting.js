export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function getTechClass(tech) {
  const map = {
    Splunk: 'splunk',
    'Webhook Workflow': 'webhook',
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

const ICON_PATHS = {
  antenna:
    '<path d="M12 18v4"/><path d="M8.5 14.5a5 5 0 0 1 7 0"/><path d="M5 11a10 10 0 0 1 14 0"/><circle cx="12" cy="12" r="1.5"/>',
  automation:
    '<path d="M12 3v3"/><path d="M12 18v3"/><path d="M3 12h3"/><path d="M18 12h3"/><circle cx="12" cy="12" r="4"/><path d="m15 9 3-3"/><path d="m6 18 3-3"/>',
  bot: '<rect x="6" y="8" width="12" height="10" rx="2"/><path d="M12 4v4"/><path d="M9 13h.01"/><path d="M15 13h.01"/><path d="M10 18v2"/><path d="M14 18v2"/>',
  brick: '<path d="M4 8h16v10H4z"/><path d="M4 13h16"/><path d="M9 8v5"/><path d="M15 13v5"/>',
  chart: '<path d="M4 19h16"/><path d="M7 16V9"/><path d="M12 16V5"/><path d="M17 16v-4"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  cloud: '<path d="M7 18h10a4 4 0 0 0 .6-7.96A6 6 0 0 0 6.3 9.1 4.5 4.5 0 0 0 7 18z"/>',
  code: '<path d="m9 18-6-6 6-6"/><path d="m15 6 6 6-6 6"/><path d="m13 4-2 16"/>',
  container: '<path d="M4 7h16v10H4z"/><path d="M8 7v10"/><path d="M12 7v10"/><path d="M16 7v10"/>',
  database:
    '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 1.7 3.1 3 7 3s7-1.3 7-3V5"/><path d="M5 12c0 1.7 3.1 3 7 3s7-1.3 7-3"/>',
  eye: '<path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6z"/><circle cx="12" cy="12" r="2.5"/>',
  graduation:
    '<path d="m3 8 9-4 9 4-9 4z"/><path d="M7 10v5c0 1.7 2.2 3 5 3s5-1.3 5-3v-5"/><path d="M21 8v6"/>',
  git: '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="6" cy="18" r="2"/><path d="M8 6h4a4 4 0 0 1 4 4v6"/><path d="M8 18h8"/>',
  grid: '<path d="M4 4h6v6H4z"/><path d="M14 4h6v6h-6z"/><path d="M4 14h6v6H4z"/><path d="M14 14h6v6h-6z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>',
  network:
    '<circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="12" cy="18" r="2"/><path d="m8 7 8 0"/><path d="m7 8 4 8"/><path d="m17 8-4 8"/>',
  rocket:
    '<path d="M5 19c2-5 6-10 14-14 0 8-9 12-14 14z"/><path d="M14 6h4v4"/><path d="M5 19l-2 2"/><path d="m8 16 2 2"/>',
  route:
    '<circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h5a3 3 0 0 1 0 6H9a3 3 0 0 0 0 6h7"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  server:
    '<path d="M4 5h16v6H4z"/><path d="M4 13h16v6H4z"/><path d="M8 8h.01"/><path d="M8 16h.01"/>',
  shield: '<path d="M12 3 20 6v6c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6z"/><path d="m9 12 2 2 4-5"/>',
  sync: '<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M18 12a6 6 0 0 0-10-4.5L4 11"/><path d="M6 12a6 6 0 0 0 10 4.5l4-3.5"/>',
  x: '<path d="M6 6 18 18"/><path d="M18 6 6 18"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 10-13h-7z"/>',
};

export function renderIcon(name, className = 'portfolio-icon') {
  const path = ICON_PATHS[name] || ICON_PATHS.layers;
  return `<svg class="${className}" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}
