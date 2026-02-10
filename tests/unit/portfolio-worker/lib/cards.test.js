/**
 * Unit tests for web/lib/cards.js
 */

const {
  generateResumeCards,
  generateProjectCards,
} = require('../../../../typescript/portfolio-worker/lib/cards');
const { TEMPLATE_CACHE } = require('../../../../typescript/portfolio-worker/lib/config');

describe('Cards Module', () => {
  // Reset cache before each test
  beforeEach(() => {
    TEMPLATE_CACHE.dataHash = null;
    TEMPLATE_CACHE.resumeCardsHtml = null;
    TEMPLATE_CACHE.projectCardsHtml = null;
    // Suppress console.log during tests
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
  });

  describe('generateResumeCards', () => {
    const validResumeData = [
      {
        icon: '📄',
        title: 'Test Resume',
        description: 'Test description',
        stats: ['Stat1', 'Stat2'],
        pdfUrl: 'https://example.com/test.pdf',
        docxUrl: 'https://example.com/test.docx',
      },
    ];

    test('should generate HTML for resume card', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('doc-card');
      expect(html).toContain('📄');
      expect(html).toContain('Test Resume');
      expect(html).toContain('Test description');
    });

    test('should include stats', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('Stat1');
      expect(html).toContain('Stat2');
      expect(html).toContain('doc-stat');
    });

    test('should include PDF and DOCX links for non-highlighted card', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('href="https://example.com/test.pdf"');
      expect(html).toContain('href="https://example.com/test.docx"');
      expect(html).toContain('PDF');
      expect(html).toContain('DOCX');
    });

    test('should generate highlighted card with Complete PDF link', () => {
      const highlightedData = [
        {
          icon: '⭐',
          title: 'Highlighted Resume',
          description: 'Important resume',
          stats: ['Key', 'Skills'],
          highlight: true,
          completePdfUrl: 'https://example.com/complete.pdf',
        },
      ];

      const html = generateResumeCards(highlightedData, 'highlight-hash');

      expect(html).toContain('doc-card-highlight');
      expect(html).toContain('href="https://example.com/complete.pdf"');
      expect(html).toContain('Complete PDF');
    });

    test('should include accessibility attributes', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('role="list"');
      expect(html).toContain('role="listitem"');
      expect(html).toContain('aria-label');
    });

    test('should generate HTML comment with project title', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('<!-- Project: Test Resume -->');
    });

    test('should use cache on repeated calls with same hash', () => {
      const hash = 'cache-test-hash';

      // First call - generates HTML
      const html1 = generateResumeCards(validResumeData, hash);

      // Manually set cache (simulating the caching behavior)
      TEMPLATE_CACHE.dataHash = hash;

      // Second call - should use cache
      const html2 = generateResumeCards(validResumeData, hash);

      expect(html1).toBe(html2);
    });

    test('should generate multiple cards', () => {
      const multipleData = [
        {
          icon: '📄',
          title: 'Resume 1',
          description: 'Desc 1',
          stats: [],
          pdfUrl: 'a',
          docxUrl: 'b',
        },
        {
          icon: '📋',
          title: 'Resume 2',
          description: 'Desc 2',
          stats: [],
          pdfUrl: 'c',
          docxUrl: 'd',
        },
      ];

      const html = generateResumeCards(multipleData, 'multi-hash');

      expect(html).toContain('Resume 1');
      expect(html).toContain('Resume 2');
      expect((html.match(/doc-card/g) || []).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('generateProjectCards', () => {
    const validProjectData = [
      {
        icon: '🚀',
        title: 'Test Project',
        tech: 'Node.js, React',
        description: 'A test project',
        liveUrl: 'https://example.com',
        repoUrl: 'https://github.com/test',
      },
    ];

    test('should generate HTML for project card', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('project-card');
      expect(html).toContain('🚀');
      expect(html).toContain('Test Project');
      expect(html).toContain('Node.js, React');
      expect(html).toContain('A test project');
    });

    test('should include Live Demo and GitHub links', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('href="https://github.com/test"');
      expect(html).toContain('Live Demo');
      expect(html).toContain('GitHub');
    });

    test('should set external link attributes', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    test('should generate Grafana project with dashboards', () => {
      const grafanaProject = [
        {
          icon: '📊',
          title: 'Grafana Dashboards',
          tech: 'Prometheus, Grafana',
          description: 'Monitoring dashboards',
          dashboards: [
            {
              name: 'Main Dashboard',
              url: 'https://grafana.example.com/d/main',
            },
            { name: 'Grafana Home', url: 'https://grafana.example.com' },
          ],
          documentationUrl: 'https://docs.example.com',
        },
      ];

      const html = generateProjectCards(grafanaProject, 'grafana-hash');

      expect(html).toContain('href="https://grafana.example.com/d/main"');
      expect(html).toContain('Main Dashboard');
      expect(html).toContain('href="https://docs.example.com"');
      expect(html).toContain('Documentation');
    });

    test('should include accessibility attributes', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('role="group"');
      expect(html).toContain('aria-label');
    });

    test('should generate HTML comment with project title', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('<!-- Project: Test Project -->');
    });

    test('should use cache on repeated calls with same hash', () => {
      const hash = 'project-cache-hash';

      // First call
      const html1 = generateProjectCards(validProjectData, hash);

      // Set cache
      TEMPLATE_CACHE.dataHash = hash;

      // Second call
      const html2 = generateProjectCards(validProjectData, hash);

      expect(html1).toBe(html2);
    });

    test('should generate multiple project cards', () => {
      const multipleProjects = [
        {
          icon: '🚀',
          title: 'Project 1',
          tech: 'Tech 1',
          description: 'Desc 1',
          liveUrl: 'a',
          repoUrl: 'b',
        },
        {
          icon: '💻',
          title: 'Project 2',
          tech: 'Tech 2',
          description: 'Desc 2',
          liveUrl: 'c',
          repoUrl: 'd',
        },
      ];

      const html = generateProjectCards(multipleProjects, 'multi-project-hash');

      expect(html).toContain('Project 1');
      expect(html).toContain('Project 2');
      expect((html.match(/project-card/g) || []).length).toBeGreaterThanOrEqual(2);
    });

    test('should handle project with only documentation URL', () => {
      const docOnlyProject = [
        {
          icon: '📖',
          title: 'Doc Project',
          tech: 'Markdown',
          description: 'Documentation only',
          dashboards: [{ name: 'Home', url: 'https://example.com' }],
          documentationUrl: 'https://docs.example.com',
        },
      ];

      const html = generateProjectCards(docOnlyProject, 'doc-only-hash');

      expect(html).toContain('Documentation');
      expect(html).toContain('href="https://docs.example.com"');
    });

    test('should not render optional sections when not provided', () => {
      const minimalProject = [
        {
          icon: '📦',
          title: 'Minimal Project',
          tech: 'Node.js',
          description: 'A minimal project',
          liveUrl: 'https://example.com',
          repoUrl: 'https://github.com/test',
        },
      ];

      const html = generateProjectCards(minimalProject, 'minimal-hash');

      expect(html).not.toContain('project-tagline');
      expect(html).not.toContain('project-metrics');
      expect(html).not.toContain('project-skills');
      expect(html).not.toContain('project-impact');
    });

    test('should handle empty metrics object', () => {
      const projectWithEmptyMetrics = [
        {
          icon: '📦',
          title: 'Empty Metrics Project',
          tech: 'Node.js',
          description: 'A project with empty metrics',
          metrics: {},
          liveUrl: 'https://example.com',
          repoUrl: 'https://github.com/test',
        },
      ];

      const html = generateProjectCards(projectWithEmptyMetrics, 'empty-metrics-hash');

      expect(html).not.toContain('project-metrics');
    });

    test('should handle empty skills array', () => {
      const projectWithEmptySkills = [
        {
          icon: '📦',
          title: 'Empty Skills Project',
          tech: 'Node.js',
          description: 'A project with empty skills',
          related_skills: [],
          liveUrl: 'https://example.com',
          repoUrl: 'https://github.com/test',
        },
      ];

      const html = generateProjectCards(projectWithEmptySkills, 'empty-skills-hash');

      expect(html).not.toContain('project-skills');
    });
  });
});
