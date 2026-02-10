/**
 * Unit tests for web/lib/validators.js
 */

const { validateData } = require('../../../../typescript/portfolio-worker/lib/validators');

describe('Validators Module', () => {
  // Suppress console.log during tests
  beforeAll(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
  });

  describe('validateData', () => {
    const validData = {
      resumeDownload: {
        pdfUrl: 'https://example.com/resume.pdf',
        docxUrl: 'https://example.com/resume.docx',
        mdUrl: 'https://example.com/resume.md',
      },
      resume: [
        {
          icon: '📄',
          title: 'Test Resume',
          description: 'Test description',
          stats: ['Stat1', 'Stat2'],
          pdfUrl: 'https://example.com/test.pdf',
          docxUrl: 'https://example.com/test.docx',
        },
      ],
      projects: [
        {
          icon: '🚀',
          title: 'Test Project',
          tech: 'Node.js',
          description: 'Test project description',
          liveUrl: 'https://example.com',
        },
      ],
      certifications: [],
      skills: {
        security: [],
        cloud: [],
        automation: [],
        monitoring: [],
        devops: [],
      },
    };

    test('should pass with valid data', () => {
      expect(() => validateData(validData)).not.toThrow();
    });

    test('should throw if resumeDownload is missing', () => {
      const data = { ...validData, resumeDownload: undefined };
      expect(() => validateData(data)).toThrow('Missing resumeDownload object');
    });

    test('should throw if resumeDownload.pdfUrl is missing', () => {
      const data = {
        ...validData,
        resumeDownload: { docxUrl: 'test', mdUrl: 'test' },
      };
      expect(() => validateData(data)).toThrow('Missing resumeDownload.pdfUrl');
    });

    test('should throw if resumeDownload.docxUrl is missing', () => {
      const data = {
        ...validData,
        resumeDownload: { pdfUrl: 'test', mdUrl: 'test' },
      };
      expect(() => validateData(data)).toThrow('Missing resumeDownload.docxUrl');
    });

    test('should throw if resumeDownload.mdUrl is missing', () => {
      const data = {
        ...validData,
        resumeDownload: { pdfUrl: 'test', docxUrl: 'test' },
      };
      expect(() => validateData(data)).toThrow('Missing resumeDownload.mdUrl');
    });

    test('should throw if resume is not an array', () => {
      const data = { ...validData, resume: 'not an array' };
      expect(() => validateData(data)).toThrow('resume must be an array');
    });

    test('should throw if resume item missing title', () => {
      const data = {
        ...validData,
        resume: [
          {
            icon: '📄',
            description: 'Test',
            stats: [],
            pdfUrl: 'x',
            docxUrl: 'x',
          },
        ],
      };
      expect(() => validateData(data)).toThrow('resume[0]: missing title');
    });

    test('should throw if resume item missing description', () => {
      const data = {
        ...validData,
        resume: [{ icon: '📄', title: 'Test', stats: [], pdfUrl: 'x', docxUrl: 'x' }],
      };
      expect(() => validateData(data)).toThrow('resume[0]: missing description');
    });

    test('should throw if resume stats is not an array', () => {
      const data = {
        ...validData,
        resume: [
          {
            icon: '📄',
            title: 'Test',
            description: 'Test',
            stats: 'not array',
            pdfUrl: 'x',
            docxUrl: 'x',
          },
        ],
      };
      expect(() => validateData(data)).toThrow('resume[0]: stats must be an array');
    });

    test('should throw if highlighted card missing completePdfUrl', () => {
      const data = {
        ...validData,
        resume: [
          {
            icon: '📄',
            title: 'Test',
            description: 'Test',
            stats: [],
            highlight: true,
          },
        ],
      };
      expect(() => validateData(data)).toThrow(
        'resume[0]: highlighted card missing completePdfUrl'
      );
    });

    test('should pass if highlighted card has completePdfUrl', () => {
      const data = {
        ...validData,
        resume: [
          {
            icon: '📄',
            title: 'Test',
            description: 'Test',
            stats: [],
            highlight: true,
            completePdfUrl: 'https://example.com/complete.pdf',
          },
        ],
      };
      expect(() => validateData(data)).not.toThrow();
    });

    test('should pass if non-highlighted card has no document URLs (optional)', () => {
      const data = {
        ...validData,
        resume: [{ icon: '📄', title: 'Test', description: 'Test', stats: [] }],
      };
      expect(() => validateData(data)).not.toThrow();
    });

    test('should pass if non-highlighted card has only pdfUrl', () => {
      const data = {
        ...validData,
        resume: [
          {
            icon: '📄',
            title: 'Test',
            description: 'Test',
            stats: [],
            pdfUrl: 'x',
          },
        ],
      };
      expect(() => validateData(data)).not.toThrow();
    });

    test('should throw if projects is not an array', () => {
      const data = { ...validData, projects: 'not an array' };
      expect(() => validateData(data)).toThrow('projects must be an array');
    });

    test('should throw if project missing title', () => {
      const data = {
        ...validData,
        projects: [{ icon: '🚀', tech: 'Node', description: 'Test', liveUrl: 'x' }],
      };
      expect(() => validateData(data)).toThrow('projects[0]: missing title');
    });

    test('should throw if project missing tech', () => {
      const data = {
        ...validData,
        projects: [{ icon: '🚀', title: 'Test', description: 'Test', liveUrl: 'x' }],
      };
      expect(() => validateData(data)).toThrow('projects[0]: missing tech');
    });

    test('should throw if project missing description', () => {
      const data = {
        ...validData,
        projects: [{ icon: '🚀', title: 'Test', tech: 'Node', liveUrl: 'x' }],
      };
      expect(() => validateData(data)).toThrow('projects[0]: missing description');
    });

    test('should pass if project has liveUrl', () => {
      const data = {
        ...validData,
        projects: [
          {
            icon: '🚀',
            title: 'Test',
            tech: 'Node',
            description: 'Test',
            liveUrl: 'https://example.com',
          },
        ],
      };
      expect(() => validateData(data)).not.toThrow();
    });

    test('should pass if project has repoUrl', () => {
      const data = {
        ...validData,
        projects: [
          {
            icon: '🚀',
            title: 'Test',
            tech: 'Node',
            description: 'Test',
            repoUrl: 'https://github.com',
          },
        ],
      };
      expect(() => validateData(data)).not.toThrow();
    });

    test('should pass if project has documentationUrl', () => {
      const data = {
        ...validData,
        projects: [
          {
            icon: '🚀',
            title: 'Test',
            tech: 'Node',
            description: 'Test',
            documentationUrl: 'https://docs.com',
          },
        ],
      };
      expect(() => validateData(data)).not.toThrow();
    });

    test('should pass if project has dashboards', () => {
      const data = {
        ...validData,
        projects: [
          {
            icon: '🚀',
            title: 'Test',
            tech: 'Node',
            description: 'Test',
            dashboards: [{ name: 'Dashboard', url: 'https://grafana.com' }],
          },
        ],
      };
      expect(() => validateData(data)).not.toThrow();
    });

    test('should collect multiple errors', () => {
      const data = {
        resumeDownload: {},
        resume: 'invalid',
        projects: 'invalid',
      };
      expect(() => validateData(data)).toThrow(/Missing resumeDownload\.pdfUrl/);
      expect(() => validateData(data)).toThrow(/resume must be an array/);
    });
  });
});
