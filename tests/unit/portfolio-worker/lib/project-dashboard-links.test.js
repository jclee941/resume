const { generateProjectCards } = require('../../../../apps/portfolio/lib/cards');
const { TEMPLATE_CACHE } = require('../../../../apps/portfolio/lib/config');
const koPortfolioData = require('../../../../apps/portfolio/data.json');
const enPortfolioData = require('../../../../apps/portfolio/data_en.json');
const jaPortfolioData = require('../../../../apps/portfolio/data_ja.json');

const KIBANA_DEMO_URL =
  'https://kibana.jclee.me/s/portfolio-demo/app/dashboards?auth_provider_hint=portfolio_demo#/view/portfolio-demo-dashboard';

function projectById(data, id) {
  return data.projects.find((project) => project.id === id);
}

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
        title: 'Observability Platform',
        tech: 'Grafana, Prometheus, Loki, ELK',
        description: 'Live observability demo surfaces',
        dashboards: [
          {
            name: 'Grafana',
            url: 'https://grafana.jclee.me/public-dashboards/d179bed28cb64b87877464527550396e',
          },
          {
            name: 'ELK',
            url: KIBANA_DEMO_URL,
          },
        ],
      },
    ];

    const html = generateProjectCards(projectData, 'named-dashboard-links-hash');

    expect(html).toContain('[Grafana]');
    expect(html).toContain('[ELK]');
    expect(html).toContain(
      'href="https://grafana.jclee.me/public-dashboards/d179bed28cb64b87877464527550396e"'
    );
    expect(html).toContain(`href="${KIBANA_DEMO_URL.replace(/&/g, '&amp;')}"`);
    expect(html).toContain('project-meta-badge--live');
    expect(html).not.toContain('[Demo]');
  });

  test.each([
    ['ko', koPortfolioData],
    ['en', enPortfolioData],
    ['ja', jaPortfolioData],
  ])('renders Security Alert System as a named ELK dashboard link in %s data', (_locale, data) => {
    const project = projectById(data, 'security-alert-system');

    expect(project).toBeDefined();
    expect(project.dashboards).toContainEqual({
      name: 'ELK',
      url: KIBANA_DEMO_URL,
    });

    const html = generateProjectCards([project], `security-alert-elk-${_locale}`);

    expect(html).toContain('[ELK]');
    expect(html).toContain(`href="${KIBANA_DEMO_URL.replace(/&/g, '&amp;')}"`);
    expect(html).not.toContain('[Demo]');
  });
});
