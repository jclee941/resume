const { generateProjectCards } = require('../../../../apps/portfolio/lib/cards');
const { TEMPLATE_CACHE } = require('../../../../apps/portfolio/lib/config');

const GRAFANA_DEMO_URL = 'https://grafana.example.com/public-dashboards/example-dashboard';
const KIBANA_DEMO_URL =
  'https://kibana.example.com/s/demo/app/dashboards?auth_provider_hint=demo&mode=view#/view/example-dashboard';

describe('project dashboard links', () => {
  beforeEach(() => {
    TEMPLATE_CACHE.dataHash = null;
    TEMPLATE_CACHE.projectCardsHtml = null;
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  test('renders named dashboard links when project has Grafana and ELK demos', () => {
    const projectData = [
      {
        title: 'Example Platform',
        tech: 'Grafana, Prometheus, Loki, ELK',
        description: 'Live observability demo surfaces',
        dashboards: [
          {
            name: 'Grafana',
            url: GRAFANA_DEMO_URL,
          },
          {
            name: 'ELK',
            url: KIBANA_DEMO_URL,
          },
        ],
      },
    ];

    const html = generateProjectCards(projectData, 'named-dashboard-links-hash');

    expect(html).toContain('>Grafana<span class="arrow" aria-hidden="true">↗</span></a>');
    expect(html).toContain('>ELK<span class="arrow" aria-hidden="true">↗</span></a>');
    expect(html).not.toMatch(/>\[[^\]]+\]</);
    expect(html).toContain(`href="${GRAFANA_DEMO_URL}"`);
    expect(html).toContain(`href="${KIBANA_DEMO_URL.replace(/&/g, '&amp;')}"`);
    expect(html).toContain('project-meta-badge--live');
    expect(html).not.toContain('>Demo<');
  });
});
