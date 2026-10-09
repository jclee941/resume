const { generateProjectCards } = require('../../../../apps/portfolio/lib/cards');
const { TEMPLATE_CACHE } = require('../../../../apps/portfolio/lib/config');
const koPortfolioData = require('../../../../apps/portfolio/data.json');
const enPortfolioData = require('../../../../apps/portfolio/data_en.json');
const jaPortfolioData = require('../../../../apps/portfolio/data_ja.json');

const GRAFANA_DEMO_URL = 'https://grafana.example.com/public-dashboards/example-dashboard';
const KIBANA_DEMO_URL =
  'https://kibana.example.com/s/demo/app/dashboards?auth_provider_hint=demo&mode=view#/view/example-dashboard';

function elkDashboardProjects(data) {
  return data.projects.filter((project) =>
    (project.dashboards || []).some((dashboard) => dashboard.name === 'ELK')
  );
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

  test.each([
    ['ko', koPortfolioData],
    ['en', enPortfolioData],
    ['ja', jaPortfolioData],
  ])('renders every ELK dashboard in %s data as a named link', (locale, data) => {
    const projects = elkDashboardProjects(data);

    expect(projects.length).toBeGreaterThan(0);
    projects.forEach((project, index) => {
      const html = generateProjectCards([project], `elk-dashboard-${locale}-${index}`);
      const elk = project.dashboards.find((dashboard) => dashboard.name === 'ELK');

      expect(html).toContain('>ELK<span class="arrow" aria-hidden="true">↗</span></a>');
      expect(html).toContain(`href="${elk.url.replace(/&/g, '&amp;')}"`);
      expect(html).not.toContain('>Demo<');
    });
  });
});
