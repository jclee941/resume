const { generateProjectCards } = require('../../../../apps/portfolio/lib/cards');
const { TEMPLATE_CACHE } = require('../../../../apps/portfolio/lib/config');

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
    const kibanaUrl =
      'https://kibana.jclee.me/s/portfolio-demo/app/dashboards?auth_provider_hint=portfolio_demo#/view/portfolio-demo-dashboard';
    const projectData = [
      {
        title: 'Observability Platform',
        tech: 'Grafana, Prometheus, Loki, ELK',
        description: 'Live observability demo surfaces',
        dashboards: [
          {
            name: 'Grafana',
            url: 'https://grafana.jclee.me/public-dashboards/2e98809632c841439635ffe2f8dc249b',
          },
          {
            name: 'ELK',
            url: kibanaUrl,
          },
        ],
      },
    ];

    const html = generateProjectCards(projectData, 'named-dashboard-links-hash');

    expect(html).toContain('[Grafana]');
    expect(html).toContain('[ELK]');
    expect(html).toContain(
      'href="https://grafana.jclee.me/public-dashboards/2e98809632c841439635ffe2f8dc249b"'
    );
    expect(html).toContain(`href="${kibanaUrl.replace(/&/g, '&amp;')}"`);
    expect(html).toContain('project-meta-badge--live');
    expect(html).not.toContain('[Demo]');
  });
});
