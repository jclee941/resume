/**
 * Unit tests for web/lib/cards.js
 *
 * Updated to match current cards.js HTML output structure:
 * - Resume cards: resume-item card, resume-title, resume-period, resume-tags, tag spans
 * - Project cards: project-item card, project-title, project-link-title with ↗ arrow, project-tech
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
        title: 'Test Resume',
        period: '2024-01 ~ Present',
        description: 'Test description',
        stats: ['Stat1', 'Stat2'],
      },
    ];

    test('should generate HTML for resume card', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('resume-item card');
      expect(html).toContain('resume-title');
      expect(html).toContain('Test Resume');
      expect(html).toContain('Test description');
    });

    test('should include period in header', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('resume-period');
      expect(html).toContain('2024-01 ~ Present');
    });

    test('should include stats as tags', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('Stat1');
      expect(html).toContain('Stat2');
      expect(html).toContain('resume-tags');
      expect(html).toContain('class="tag"');
    });

    test('should not render tags section when stats are empty', () => {
      const noStatsData = [
        {
          title: 'No Stats Resume',
          period: '2024',
          description: 'No stats here',
          stats: [],
        },
      ];

      const html = generateResumeCards(noStatsData, 'no-stats-hash');

      expect(html).not.toContain('resume-tags');
    });

    test('should render correct list item structure', () => {
      const html = generateResumeCards(validResumeData, 'testhash');

      expect(html).toContain('<li class="resume-item card">');
      expect(html).toContain('<div class="resume-header">');
      expect(html).toContain('<h3 class="resume-title">');
      expect(html).toContain('<p class="resume-description">');
    });

    test('should convert newlines to br tags in description', () => {
      const dataWithNewlines = [
        {
          title: 'Newline Test',
          period: '2024',
          description: 'Line 1\nLine 2',
          stats: [],
        },
      ];

      const html = generateResumeCards(dataWithNewlines, 'newline-hash');

      expect(html).toContain('Line 1<br>Line 2');
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
          title: 'Resume 1',
          period: '2024',
          description: 'Desc 1',
          stats: [],
        },
        {
          title: 'Resume 2',
          period: '2023',
          description: 'Desc 2',
          stats: [],
        },
      ];

      const html = generateResumeCards(multipleData, 'multi-hash');

      expect(html).toContain('Resume 1');
      expect(html).toContain('Resume 2');
      expect((html.match(/resume-item card/g) || []).length).toBeGreaterThanOrEqual(2);
    });

    test('should escape HTML in title and description', () => {
      const xssData = [
        {
          title: '<script>alert("xss")</script>',
          period: '2024',
          description: 'Safe <b>content</b>',
          stats: ['<img onerror=alert(1)>'],
        },
      ];

      const html = generateResumeCards(xssData, 'xss-hash');

      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });
  });

  describe('generateProjectCards', () => {
    const validProjectData = [
      {
        title: 'Test Project',
        tech: 'Node.js, React',
        description: 'A test project',
        liveUrl: 'https://example.com',
        repoUrl: 'https://github.com/test',
      },
    ];

    test('should generate HTML for project card', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('project-item card');
      expect(html).toContain('project-title');
      expect(html).toContain('Test Project');
      expect(html).toContain('Node.js, React');
      expect(html).toContain('A test project');
    });

    test('should include link with arrow when liveUrl exists', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('project-link-title');
      expect(html).toContain('<span class="arrow">↗</span>');
    });

    test('should set external link attributes', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');
    });

    test('should use repoUrl when liveUrl is not available', () => {
      const repoOnlyProject = [
        {
          title: 'Repo Only',
          tech: 'Python',
          description: 'Repo only project',
          repoUrl: 'https://github.com/test/repo',
        },
      ];

      const html = generateProjectCards(repoOnlyProject, 'repo-only-hash');

      expect(html).toContain('href="https://github.com/test/repo"');
      expect(html).toContain('project-link-title');
    });

    test('should render as div when no link exists', () => {
      const noLinkProject = [
        {
          title: 'No Link Project',
          tech: 'Bash',
          description: 'No URLs',
        },
      ];

      const html = generateProjectCards(noLinkProject, 'no-link-hash');

      expect(html).toContain('<div class="project-link-title">');
      expect(html).not.toContain('<a ');
    });

    test('should include aria-label for accessibility', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('aria-label="View Test Project project (opens in new tab)"');
    });

    test('should render project-tech section', () => {
      const html = generateProjectCards(validProjectData, 'testhash');

      expect(html).toContain('<div class="project-tech">');
      expect(html).toContain('Node.js, React');
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
          title: 'Project 1',
          tech: 'Tech 1',
          description: 'Desc 1',
          liveUrl: 'a',
          repoUrl: 'b',
        },
        {
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
      expect((html.match(/project-item card/g) || []).length).toBeGreaterThanOrEqual(2);
    });

    test('should not render optional sections when not provided', () => {
      const minimalProject = [
        {
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

    test('should escape HTML in project data', () => {
      const xssProject = [
        {
          title: '<img src=x onerror=alert(1)>',
          tech: '<script>evil</script>',
          description: 'Normal description',
          liveUrl: 'https://example.com',
        },
      ];

      const html = generateProjectCards(xssProject, 'xss-project-hash');

      expect(html).not.toContain('<img src=x');
      expect(html).not.toContain('<script>evil');
      expect(html).toContain('&lt;img');
      expect(html).toContain('&lt;script&gt;');
    });
  });
});
