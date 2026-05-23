/**
 * Unit tests for shared portfolio validation.
 *
 * Asserts behaviour of the canonical Zod-based validator exported from
 * @resume/shared/validation. Error messages are produced by Zod, so the tests
 * assert on the failing field path rather than legacy hand-rolled messages.
 */

let validatePortfolioData;

describe('Validators Module', () => {
  beforeAll(async () => {
    ({ validatePortfolioData } = await import('@resume/shared/validation'));
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterAll(() => {
    console.log.mockRestore();
  });

  describe('validatePortfolioData', () => {
    const validData = {
      resumeDownload: {
        pdfUrl: 'https://example.com/resume.pdf',
        docxUrl: 'https://example.com/resume.docx',
        mdUrl: 'https://example.com/resume.md',
      },
      resume: [
        {
          title: 'Test Resume',
          description: 'Test description',
          stats: ['Stat1', 'Stat2'],
          pdfUrl: 'https://example.com/test.pdf',
          docxUrl: 'https://example.com/test.docx',
        },
      ],
      projects: [
        {
          title: 'Test Project',
          tech: 'Node.js',
          description: 'Test project description',
        },
      ],
      certifications: [],
      skills: {
        security: [],
        cloud: [],
      },
    };

    test('passes with valid data', () => {
      expect(() => validatePortfolioData(validData)).not.toThrow();
    });

    test('throws when resumeDownload is missing', () => {
      const data = { ...validData, resumeDownload: undefined };
      expect(() => validatePortfolioData(data)).toThrow(/resumeDownload/);
    });

    test('throws when resumeDownload.pdfUrl is missing', () => {
      const data = {
        ...validData,
        resumeDownload: { docxUrl: 'x', mdUrl: 'x' },
      };
      expect(() => validatePortfolioData(data)).toThrow(/resumeDownload\.pdfUrl/);
    });

    test('throws when resumeDownload.docxUrl is missing', () => {
      const data = {
        ...validData,
        resumeDownload: { pdfUrl: 'x', mdUrl: 'x' },
      };
      expect(() => validatePortfolioData(data)).toThrow(/resumeDownload\.docxUrl/);
    });

    test('throws when resumeDownload.mdUrl is missing', () => {
      const data = {
        ...validData,
        resumeDownload: { pdfUrl: 'x', docxUrl: 'x' },
      };
      expect(() => validatePortfolioData(data)).toThrow(/resumeDownload\.mdUrl/);
    });

    test('throws when resume is not an array', () => {
      const data = { ...validData, resume: 'not an array' };
      expect(() => validatePortfolioData(data)).toThrow(/resume/);
    });

    test('throws when resume item is missing title', () => {
      const data = {
        ...validData,
        resume: [{ description: 'Test', stats: [] }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/resume\.0\.title/);
    });

    test('throws when resume item is missing description', () => {
      const data = {
        ...validData,
        resume: [{ title: 'Test', stats: [] }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/resume\.0\.description/);
    });

    test('throws when resume stats is not an array', () => {
      const data = {
        ...validData,
        resume: [{ title: 'T', description: 'D', stats: 'not array' }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/resume\.0\.stats/);
    });

    test('passes with optional completePdfUrl on highlighted card', () => {
      const data = {
        ...validData,
        resume: [
          {
            title: 'T',
            description: 'D',
            stats: [],
            highlight: true,
            completePdfUrl: 'https://example.com/complete.pdf',
          },
        ],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes when non-highlighted card has no document URLs (optional)', () => {
      const data = {
        ...validData,
        resume: [{ title: 'T', description: 'D', stats: [] }],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes when non-highlighted card has only pdfUrl', () => {
      const data = {
        ...validData,
        resume: [
          {
            title: 'T',
            description: 'D',
            stats: [],
            pdfUrl: 'x',
          },
        ],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('throws when projects is not an array', () => {
      const data = { ...validData, projects: 'not an array' };
      expect(() => validatePortfolioData(data)).toThrow(/projects/);
    });

    test('throws when project is missing title', () => {
      const data = {
        ...validData,
        projects: [{ tech: 'Node', description: 'Test' }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/projects\.0\.title/);
    });

    test('throws when project is missing tech', () => {
      const data = {
        ...validData,
        projects: [{ title: 'T', description: 'D' }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/projects\.0\.tech/);
    });

    test('throws when project is missing description', () => {
      const data = {
        ...validData,
        projects: [{ title: 'T', tech: 'Node' }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/projects\.0\.description/);
    });

    test('passes when project has optional liveUrl', () => {
      const data = {
        ...validData,
        projects: [{ title: 'T', tech: 'Node', description: 'D', liveUrl: 'https://example.com' }],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes when project has optional repoUrl', () => {
      const data = {
        ...validData,
        projects: [{ title: 'T', tech: 'Node', description: 'D', repoUrl: 'https://github.com' }],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes when project has optional documentationUrl', () => {
      const data = {
        ...validData,
        projects: [
          { title: 'T', tech: 'Node', description: 'D', documentationUrl: 'https://docs.com' },
        ],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes when project has optional dashboards', () => {
      const data = {
        ...validData,
        projects: [
          {
            title: 'T',
            tech: 'Node',
            description: 'D',
            dashboards: [{ name: 'D', url: 'https://grafana.com' }],
          },
        ],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('reports multiple errors at once', () => {
      const data = {
        resumeDownload: {},
        resume: 'invalid',
        projects: 'invalid',
        certifications: [],
        skills: {},
      };
      const error = (() => {
        try {
          validatePortfolioData(data);
          return null;
        } catch (e) {
          return e;
        }
      })();
      expect(error).not.toBeNull();
      expect(error.message).toMatch(/resumeDownload/);
      expect(error.message).toMatch(/resume/);
      expect(error.message).toMatch(/projects/);
    });

    test('throws when certifications is not an array', () => {
      const data = { ...validData, certifications: 'not array' };
      expect(() => validatePortfolioData(data)).toThrow(/certifications/);
    });

    test('throws when certification is missing name', () => {
      const data = {
        ...validData,
        certifications: [{ issuer: 'AWS', date: '2025-01' }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/certifications\.0\.name/);
    });

    test('throws when certification is missing issuer', () => {
      const data = {
        ...validData,
        certifications: [{ name: 'CKA', date: '2025-01' }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/certifications\.0\.issuer/);
    });

    test('throws when certification is missing both date and status', () => {
      const data = {
        ...validData,
        certifications: [{ name: 'CKA', issuer: 'CNCF' }],
      };
      expect(() => validatePortfolioData(data)).toThrow(/certifications/);
    });

    test('passes when certification has date but no status', () => {
      const data = {
        ...validData,
        certifications: [{ name: 'CKA', issuer: 'CNCF', date: '2025-01' }],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes when certification has status but no date', () => {
      const data = {
        ...validData,
        certifications: [{ name: 'CKA', issuer: 'CNCF', status: 'active' }],
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('throws when skills is not an object', () => {
      const data = { ...validData, skills: 'not object' };
      expect(() => validatePortfolioData(data)).toThrow(/skills/);
    });

    test('throws when skills is null', () => {
      const data = { ...validData, skills: null };
      expect(() => validatePortfolioData(data)).toThrow(/skills/);
    });

    test('passes with simple array format skills (strings)', () => {
      const data = {
        ...validData,
        skills: { security: ['IAM', 'OAuth'], cloud: ['AWS', 'GCP'] },
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes with simple array format skills ({name, level} objects)', () => {
      const data = {
        ...validData,
        skills: {
          security: [
            { name: 'IAM', level: '90' },
            { name: 'OAuth', level: '80' },
          ],
        },
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes with object format skills having items array', () => {
      const data = {
        ...validData,
        skills: {
          security: { items: ['IAM', 'OAuth'] },
        },
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes with empty skills array', () => {
      const data = {
        ...validData,
        skills: { security: [] },
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes with object format having empty items array', () => {
      const data = {
        ...validData,
        skills: { security: { items: [] } },
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });

    test('passes with mixed string and object items in array format', () => {
      const data = {
        ...validData,
        skills: {
          security: ['IAM', { name: 'OAuth', level: '80' }],
        },
      };
      expect(() => validatePortfolioData(data)).not.toThrow();
    });
  });
});
