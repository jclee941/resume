/**
 * Unit tests for typescript/portfolio-worker/lib/cards.js
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

  describe('generateCertificationCards', () => {
    const {
      generateCertificationCards,
    } = require('../../../../typescript/portfolio-worker/lib/cards');

    test('should return empty string for null certData', () => {
      expect(generateCertificationCards(null, 'hash')).toBe('');
    });

    test('should return empty string for empty array', () => {
      expect(generateCertificationCards([], 'hash')).toBe('');
    });

    test('should generate card with active status', () => {
      const certData = [
        {
          name: 'AWS Solutions Architect',
          issuer: 'Amazon',
          date: '2024-01',
          status: 'active',
          expirationDate: '2027-01',
        },
      ];
      const html = generateCertificationCards(certData, 'cert-hash');

      expect(html).toContain('cert-status--active');
      expect(html).toContain('ACTIVE');
      expect(html).toContain('AWS Solutions Architect');
      expect(html).toContain('Amazon');
      expect(html).toContain('2024-01');
      expect(html).toContain('2027-01');
    });

    test('should generate card with expired status', () => {
      const certData = [{ name: 'Old Cert', issuer: 'Vendor', date: '2020-01', status: 'expired' }];
      const html = generateCertificationCards(certData, 'expired-hash');

      expect(html).toContain('cert-status--expired');
      expect(html).toContain('EXPIRED');
    });

    test('should generate card with pending/unknown status', () => {
      const certData = [
        { name: 'Pending Cert', issuer: 'Vendor', date: '2025-01', status: 'pending' },
      ];
      const html = generateCertificationCards(certData, 'pending-hash');

      expect(html).toContain('cert-status--pending');
      expect(html).toContain('PENDING');
    });

    test('should handle missing status (defaults to UNKNOWN)', () => {
      const certData = [{ name: 'No Status Cert', issuer: 'Vendor', date: '2025-01' }];
      const html = generateCertificationCards(certData, 'unknown-hash');

      expect(html).toContain('cert-status--pending');
      expect(html).toContain('UNKNOWN');
    });

    test('should use TBD for missing date and N/A for missing expirationDate', () => {
      const certData = [{ name: 'No Date Cert', issuer: 'Vendor', status: 'active' }];
      const html = generateCertificationCards(certData, 'no-date-hash');

      expect(html).toContain('TBD');
      expect(html).toContain('N/A');
    });

    test('should use Unknown Issuer for missing issuer', () => {
      const certData = [{ name: 'Cert', date: '2024', status: 'active' }];
      const html = generateCertificationCards(certData, 'no-issuer-hash');

      expect(html).toContain('Unknown Issuer');
    });

    test('should escape HTML in cert name and issuer', () => {
      const certData = [
        { name: '<script>xss</script>', issuer: '<b>bad</b>', date: '2024', status: 'active' },
      ];
      const html = generateCertificationCards(certData, 'xss-cert-hash');

      expect(html).toContain('&lt;script&gt;');
      expect(html).toContain('&lt;b&gt;');
    });

    test('should generate multiple certification cards', () => {
      const certData = [
        { name: 'Cert A', issuer: 'Org A', date: '2024', status: 'active' },
        { name: 'Cert B', issuer: 'Org B', date: '2023', status: 'expired' },
      ];
      const html = generateCertificationCards(certData, 'multi-cert-hash');

      expect(html).toContain('Cert A');
      expect(html).toContain('Cert B');
    });
  });

  describe('generateSkillsList', () => {
    const { generateSkillsList } = require('../../../../typescript/portfolio-worker/lib/cards');

    beforeEach(() => {
      TEMPLATE_CACHE.skillsHtml = null;
      TEMPLATE_CACHE.dataHash = null;
    });

    test('should generate skills for array format', () => {
      const skillsData = {
        programming: ['JavaScript', 'Python', 'Go', 'Rust', 'TypeScript'],
      };
      const html = generateSkillsList(skillsData, 'skills-hash');

      expect(html).toContain('JavaScript');
      expect(html).toContain('Python');
      expect(html).toContain('Go');
      expect(html).toContain('Rust');
    });

    test('should generate skills for object format with items', () => {
      const skillsData = {
        cloud: {
          title: 'Cloud Services',
          items: [
            { name: 'AWS', proficiency: 90 },
            { name: 'GCP', proficiency: 80 },
          ],
        },
      };
      const html = generateSkillsList(skillsData, 'obj-skills-hash');

      expect(html).toContain('Cloud Services');
      expect(html).toContain('AWS');
      expect(html).toContain('GCP');
      expect(html).toContain('90');
    });

    test('should skip categories not in categoryOrder', () => {
      const skillsData = {
        unknowncategory: ['Tool1', 'Tool2'],
      };
      const html = generateSkillsList(skillsData, 'unknown-cat-hash');

      expect(html).not.toContain('Tool1');
    });

    test('should skip missing categories gracefully', () => {
      const skillsData = {
        observability: ['Prometheus', 'Grafana'],
      };
      const html = generateSkillsList(skillsData, 'sparse-hash');

      expect(html).toContain('Prometheus');
      expect(html).toContain('Grafana');
    });

    test('should calculate proficiency bar', () => {
      const skillsData = {
        devops: {
          items: [{ name: 'Docker', proficiency: 100 }],
        },
      };
      const html = generateSkillsList(skillsData, 'bar-hash');

      expect(html).toContain('\u2588');
    });

    test('should use cache on repeated calls with same hash', () => {
      const skillsData = { database: ['PostgreSQL'] };
      const hash = 'skills-cache-hash';
      const html1 = generateSkillsList(skillsData, hash);
      TEMPLATE_CACHE.dataHash = hash;
      const html2 = generateSkillsList(skillsData, hash);

      expect(html1).toBe(html2);
    });

    test('should slice items to max 4', () => {
      const skillsData = {
        automation: ['A', 'B', 'C', 'D', 'E', 'F'],
      };
      const html = generateSkillsList(skillsData, 'slice-hash');

      expect(html).toContain('A');
      expect(html).toContain('D');
      expect(html).not.toContain('>E<');
    });

    test('should handle mixed string and object items', () => {
      const skillsData = {
        security: {
          items: ['Vault', { name: 'mTLS', proficiency: 85 }],
        },
      };
      const html = generateSkillsList(skillsData, 'mixed-hash');

      expect(html).toContain('Vault');
      expect(html).toContain('mTLS');
    });

    test('should use key as label when title not provided', () => {
      const skillsData = {
        compliance: ['SOC2', 'ISO27001'],
      };
      const html = generateSkillsList(skillsData, 'no-title-hash');

      expect(html).toContain('compliance');
    });
  });

  describe('generateHeroContent', () => {
    const { generateHeroContent } = require('../../../../typescript/portfolio-worker/lib/cards');

    test('should generate hero with titleEn and subtitle', () => {
      const heroData = {
        titleEn: 'John Doe',
        subtitle: 'Full Stack Developer',
      };
      const html = generateHeroContent(heroData);

      expect(html).toContain('hero-name');
      expect(html).toContain('John Doe');
      expect(html).toContain('hero-subtitle');
      expect(html).toContain('Full Stack Developer');
    });

    test('should include hardcoded email', () => {
      const heroData = { titleEn: 'Test', subtitle: 'Dev' };
      const html = generateHeroContent(heroData);

      expect(html).toContain('qws941@kakao.com');
      expect(html).toContain('mailto:qws941@kakao.com');
    });

    test('should include aria-label for email', () => {
      const heroData = { titleEn: 'Test', subtitle: 'Dev' };
      const html = generateHeroContent(heroData);

      expect(html).toContain('aria-label');
    });
  });

  describe('generateResumeDescription', () => {
    const {
      generateResumeDescription,
    } = require('../../../../typescript/portfolio-worker/lib/cards');

    test('should return empty string', () => {
      expect(generateResumeDescription()).toBe('');
    });
  });

  describe('generateInfrastructureCards', () => {
    const {
      generateInfrastructureCards,
    } = require('../../../../typescript/portfolio-worker/lib/cards');

    test('should return empty string for null infraData', () => {
      expect(generateInfrastructureCards(null, 'hash')).toBe('');
    });

    test('should return empty string for empty array', () => {
      expect(generateInfrastructureCards([], 'hash')).toBe('');
    });

    test('should generate card with running status', () => {
      const infraData = [
        { title: 'API Server', icon: '🖥', status: 'running', url: 'https://api.example.com' },
      ];
      const html = generateInfrastructureCards(infraData, 'infra-hash');

      expect(html).toContain('infra-status--running');
      expect(html).toContain('RUNNING');
      expect(html).toContain('API Server');
      expect(html).toContain('https://api.example.com');
    });

    test('should generate card with stopped status', () => {
      const infraData = [{ title: 'Old Service', icon: '⚡', status: 'stopped' }];
      const html = generateInfrastructureCards(infraData, 'stopped-hash');

      expect(html).toContain('infra-status--stopped');
      expect(html).toContain('STOPPED');
    });

    test('should render link when URL provided', () => {
      const infraData = [
        { title: 'Service', icon: '🔧', status: 'running', url: 'https://example.com' },
      ];
      const html = generateInfrastructureCards(infraData, 'url-hash');

      expect(html).toContain('<a');
      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('aria-label');
    });

    test('should render span when no URL', () => {
      const infraData = [{ title: 'Local Service', icon: '📦', status: 'running' }];
      const html = generateInfrastructureCards(infraData, 'no-url-hash');

      expect(html).toContain('<span');
    });

    test('should generate multiple infrastructure cards', () => {
      const infraData = [
        { title: 'Service A', icon: '🅰', status: 'running' },
        { title: 'Service B', icon: '🅱', status: 'stopped' },
      ];
      const html = generateInfrastructureCards(infraData, 'multi-infra-hash');

      expect(html).toContain('Service A');
      expect(html).toContain('Service B');
    });
  });

  describe('generateContactGrid', () => {
    const { generateContactGrid } = require('../../../../typescript/portfolio-worker/lib/cards');

    test('should generate github link', () => {
      const contactData = { github: 'https://github.com/testuser' };
      const html = generateContactGrid(contactData);

      expect(html).toContain('href="https://github.com/testuser"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('aria-label');
    });

    test('should generate linkedin link', () => {
      const contactData = { linkedin: 'https://linkedin.com/in/testuser' };
      const html = generateContactGrid(contactData);

      expect(html).toContain('href="https://linkedin.com/in/testuser"');
      expect(html).toContain('target="_blank"');
    });

    test('should generate email link with mailto', () => {
      const contactData = { email: 'test@example.com' };
      const html = generateContactGrid(contactData);

      expect(html).toContain('href="mailto:test@example.com"');
    });

    test('should generate website link', () => {
      const contactData = { website: 'https://example.com' };
      const html = generateContactGrid(contactData);

      expect(html).toContain('href="https://example.com"');
      expect(html).toContain('target="_blank"');
    });

    test('should not include role listitem (a elements use implicit link role)', () => {
      const contactData = { github: 'https://github.com/test' };
      const html = generateContactGrid(contactData);
      expect(html).not.toContain('role="listitem"');
    });

    test('should generate all contact links when all provided', () => {
      const contactData = {
        github: 'https://github.com/test',
        linkedin: 'https://linkedin.com/in/test',
        email: 'test@example.com',
        website: 'https://example.com',
      };
      const html = generateContactGrid(contactData);

      expect(html).toContain('github.com/test');
      expect(html).toContain('linkedin.com/in/test');
      expect(html).toContain('mailto:test@example.com');
      expect(html).toContain('https://example.com');
    });
  });

  describe('generateProjectCards - stars/forks/language branches', () => {
    test('should render stars, forks, and language in meta line', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.projectCardsHtml = null;
      const projectData = [
        {
          title: 'Popular Project',
          tech: 'TypeScript',
          description: 'A popular project',
          liveUrl: 'https://example.com',
          stars: 42,
          forks: 7,
          language: 'JavaScript',
        },
      ];
      const html = generateProjectCards(projectData, 'stars-forks-lang-hash');
      expect(html).toContain('42');
      expect(html).toContain('7');
      expect(html).toContain('JavaScript');
      expect(html).toContain('project-meta');
    });

    test('should render only stars when forks and language are absent', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.projectCardsHtml = null;
      const projectData = [
        {
          title: 'Stars Only',
          tech: 'Go',
          description: 'Stars only project',
          stars: 100,
        },
      ];
      const html = generateProjectCards(projectData, 'stars-only-hash');
      expect(html).toContain('100');
      expect(html).toContain('project-meta');
    });

    test('should not render meta line for NaN/Infinity stars and forks', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.projectCardsHtml = null;
      const projectData = [
        {
          title: 'Bad Numbers',
          tech: 'Rust',
          description: 'Invalid numbers',
          stars: NaN,
          forks: Infinity,
        },
      ];
      const html = generateProjectCards(projectData, 'nan-infinity-hash');
      expect(html).not.toContain('project-meta');
    });

    test('should render only language when stars and forks are absent', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.projectCardsHtml = null;
      const projectData = [
        {
          title: 'Lang Only',
          tech: 'Python',
          description: 'Language only project',
          language: 'Python',
        },
      ];
      const html = generateProjectCards(projectData, 'lang-only-hash');
      expect(html).toContain('Python');
      expect(html).toContain('project-meta');
    });

    test('should render githubUrl link without demoUrl', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.projectCardsHtml = null;
      const projectData = [
        {
          title: 'GitHub Only',
          tech: 'Node.js',
          description: 'Only GitHub link',
          githubUrl: 'https://github.com/test/repo',
        },
      ];
      const html = generateProjectCards(projectData, 'github-only-hash');
      expect(html).toContain('href="https://github.com/test/repo"');
      expect(html).toContain('GitHub');
    });

    test('should render demoUrl link without githubUrl', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.projectCardsHtml = null;
      const projectData = [
        {
          title: 'Demo Only',
          tech: 'React',
          description: 'Only demo link',
          demoUrl: 'https://demo.example.com',
        },
      ];
      const html = generateProjectCards(projectData, 'demo-only-hash');
      expect(html).toContain('href="https://demo.example.com"');
      expect(html).toContain('Demo');
    });

    test('should render both githubUrl and demoUrl links', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.projectCardsHtml = null;
      const projectData = [
        {
          title: 'Both Links',
          tech: 'Vue',
          description: 'Both links project',
          githubUrl: 'https://github.com/test/both',
          demoUrl: 'https://demo.example.com/both',
        },
      ];
      const html = generateProjectCards(projectData, 'both-links-hash');
      expect(html).toContain('GitHub');
      expect(html).toContain('Demo');
    });
  });

  describe('generateSkillsList - edge cases', () => {
    const { generateSkillsList } = require('../../../../typescript/portfolio-worker/lib/cards');

    beforeEach(() => {
      TEMPLATE_CACHE.skillsHtml = null;
      TEMPLATE_CACHE.dataHash = null;
    });

    test('should handle skill item with no name property', () => {
      const skillsData = {
        devops: {
          items: [{ proficiency: 80 }],
        },
      };
      const html = generateSkillsList(skillsData, 'no-name-hash');
      expect(html).toContain('Unknown');
    });

    test('should handle NaN proficiency', () => {
      const skillsData = {
        devops: {
          items: [{ name: 'Docker', proficiency: NaN }],
        },
      };
      const html = generateSkillsList(skillsData, 'nan-prof-hash');
      expect(html).toContain('Docker');
    });

    test('should return empty string for empty items array in object format', () => {
      const skillsData = {
        devops: {
          items: [],
        },
      };
      const html = generateSkillsList(skillsData, 'empty-items-hash');
      // Empty items means skills.length === 0, returns ''
      expect(html).not.toContain('devops');
    });
  });

  describe('generateResumeCards - metrics', () => {
    test('should render metrics line with valid key-value pairs', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.resumeCardsHtml = null;
      const resumeData = [
        {
          title: 'Engineer',
          period: '2020-2024',
          description: 'Test',
          metrics: { uptime: '99.9%', latency: '50ms' },
        },
      ];
      const html = generateResumeCards(resumeData);
      expect(html).toContain('[METRICS]');
      expect(html).toContain('uptime=99.9%');
      expect(html).toContain('latency=50ms');
      expect(html).toContain(' | ');
    });

    test('should filter out null, undefined, and empty string values from metrics', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.resumeCardsHtml = null;
      const resumeData = [
        {
          title: 'Engineer',
          period: '2020-2024',
          description: 'Test',
          metrics: { valid: 'yes', empty: '', nullVal: null, undefVal: undefined },
        },
      ];
      const html = generateResumeCards(resumeData);
      expect(html).toContain('valid=yes');
      expect(html).not.toContain('empty=');
      expect(html).not.toContain('nullVal');
      expect(html).not.toContain('undefVal');
    });

    test('should filter out metrics entries with empty string key', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.resumeCardsHtml = null;
      const resumeData = [
        {
          title: 'Engineer',
          period: '2020-2024',
          description: 'Test',
          metrics: { '': 'should-be-hidden', validKey: '100%' },
        },
      ];
      const html = generateResumeCards(resumeData);
      expect(html).toContain('validKey=100%');
      expect(html).not.toContain('should-be-hidden');
    });

    test('should not render metrics div when metrics is not an object', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.resumeCardsHtml = null;
      const resumeData = [
        {
          title: 'Engineer',
          period: '2020-2024',
          description: 'Test',
          metrics: 'not-object',
        },
      ];
      const html = generateResumeCards(resumeData);
      expect(html).not.toContain('[METRICS]');
    });

    test('should not render metrics div when all metrics values are empty', () => {
      TEMPLATE_CACHE.dataHash = null;
      TEMPLATE_CACHE.resumeCardsHtml = null;
      const resumeData = [
        {
          title: 'Engineer',
          period: '2020-2024',
          description: 'Test',
          metrics: { a: null, b: '', c: undefined },
        },
      ];
      const html = generateResumeCards(resumeData);
      expect(html).not.toContain('[METRICS]');
    });
  });
});
