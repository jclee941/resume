'use strict';

jest.mock('../../../../typescript/portfolio-worker/lib/validators', () => ({
  validateData: jest.fn(),
}));

jest.mock('../../../../typescript/portfolio-worker/lib/utils', () => ({
  calculateDataHash: jest.fn(() => 'mock-hash-abc123'),
}));

jest.mock('../../../../typescript/portfolio-worker/lib/cards', () => ({
  generateResumeCards: jest.fn(() => '<div class="resume">cards</div>'),
  generateProjectCards: jest.fn(() => '<div class="projects">cards</div>'),
  generateCertificationCards: jest.fn(() => '<div class="certs">cards</div>'),
  generateSkillsList: jest.fn(() => '<div class="skills">list</div>'),
  generateHeroContent: jest.fn(() => '<div class="hero">content</div>'),
  generateResumeDescription: jest.fn(() => ''),
  generateInfrastructureCards: jest.fn(() => '<div class="infra">cards</div>'),
  generateContactGrid: jest.fn(() => '<div class="contact">grid</div>'),
}));

const { TEMPLATE_CACHE } = require('../../../../typescript/portfolio-worker/lib/config');
const { validateData } = require('../../../../typescript/portfolio-worker/lib/validators');
const { calculateDataHash } = require('../../../../typescript/portfolio-worker/lib/utils');
const cards = require('../../../../typescript/portfolio-worker/lib/cards');
const {
  processProjectData,
  encodeBinaryAssets,
} = require('../../../../typescript/portfolio-worker/lib/data-processor');

const mockLogger = {
  log: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const createValidData = (overrides = {}) => ({
  resume: [{ title: 'Test Resume', description: 'A resume', stats: [] }],
  projects: [{ title: 'Project', tech: 'JS', description: 'A project' }],
  certifications: [{ name: 'Cert', issuer: 'Org', date: '2024-01' }],
  skills: { Backend: ['Node.js'] },
  hero: { name: 'Test', subtitle: 'Dev' },
  sectionDescriptions: { resume: 'Resume section' },
  achievements: [],
  infrastructure: [],
  contact: { email: 'test@test.com' },
  resumeDownload: { pdfUrl: '/a.pdf', docxUrl: '/a.docx', mdUrl: '/a.md' },
  ...overrides,
});

describe('data-processor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    TEMPLATE_CACHE.dataHash = null;
    TEMPLATE_CACHE.resumeCardsHtml = '';
    TEMPLATE_CACHE.projectCardsHtml = '';
    TEMPLATE_CACHE.certCardsHtml = '';
    TEMPLATE_CACHE.skillsHtml = '';
  });

  describe('processProjectData', () => {
    it('should parse JSON and return processed data', () => {
      const data = createValidData();
      const result = processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      expect(result).toHaveProperty('projectData');
      expect(result).toHaveProperty('dataHash', 'mock-hash-abc123');
      expect(result).toHaveProperty('templates');
    });

    it('should call validateData with parsed data', () => {
      const data = createValidData();
      processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      expect(validateData).toHaveBeenCalledWith(
        expect.objectContaining({
          resume: data.resume,
          projects: data.projects,
        })
      );
    });

    it('should calculate data hash', () => {
      const data = createValidData();
      processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      expect(calculateDataHash).toHaveBeenCalledWith(
        expect.objectContaining({ resume: data.resume })
      );
    });

    it('should generate all template types', () => {
      const data = createValidData();
      const result = processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      expect(result.templates).toHaveProperty('resumeCardsHtml');
      expect(result.templates).toHaveProperty('projectCardsHtml');
      expect(result.templates).toHaveProperty('certCardsHtml');
      expect(result.templates).toHaveProperty('skillsHtml');
      expect(result.templates).toHaveProperty('heroContentHtml');
      expect(result.templates).toHaveProperty('resumeDescriptionHtml');
      expect(result.templates).toHaveProperty('infrastructureCardsHtml');
      expect(result.templates).toHaveProperty('contactGridHtml');
    });

    it('should call card generators with correct arguments', () => {
      const data = createValidData();
      processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      expect(cards.generateResumeCards).toHaveBeenCalledWith(data.resume, 'mock-hash-abc123');
      expect(cards.generateProjectCards).toHaveBeenCalledWith(data.projects, 'mock-hash-abc123');
      expect(cards.generateCertificationCards).toHaveBeenCalledWith(
        data.certifications,
        'mock-hash-abc123'
      );
      expect(cards.generateSkillsList).toHaveBeenCalledWith(data.skills, 'mock-hash-abc123');
      expect(cards.generateHeroContent).toHaveBeenCalledWith(data.hero);
      expect(cards.generateInfrastructureCards).toHaveBeenCalledWith(data.infrastructure);
      expect(cards.generateContactGrid).toHaveBeenCalledWith(data.contact);
    });

    it('should generate EN variants using EN data when available', () => {
      const data = createValidData({
        resumeEn: [{ title: 'EN Resume' }],
        projectsEn: [{ title: 'EN Project' }],
      });
      const result = processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      expect(result.templates).toHaveProperty('resumeCardsEnHtml');
      expect(result.templates).toHaveProperty('projectCardsEnHtml');
      expect(cards.generateResumeCards).toHaveBeenCalledWith(
        data.resumeEn,
        'mock-hash-abc123:en-resume'
      );
      expect(cards.generateProjectCards).toHaveBeenCalledWith(
        data.projectsEn,
        'mock-hash-abc123:en-projects'
      );
    });

    it('should fallback to KO data for EN when EN not present', () => {
      const data = createValidData();
      const result = processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      expect(result.templates).toHaveProperty('resumeCardsEnHtml');
      expect(cards.generateResumeCards).toHaveBeenCalledWith(
        data.resume,
        'mock-hash-abc123:en-resume'
      );
    });

    it('should update TEMPLATE_CACHE with new hash', () => {
      const data = createValidData();
      processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      expect(TEMPLATE_CACHE.dataHash).toBe('mock-hash-abc123');
    });

    it('should detect when cache hash matches', () => {
      TEMPLATE_CACHE.dataHash = 'mock-hash-abc123';

      const data = createValidData();
      const result = processProjectData({
        projectDataRaw: JSON.stringify(data),
        logger: mockLogger,
      });

      // Cache hash is still set correctly even on re-process
      expect(TEMPLATE_CACHE.dataHash).toBe('mock-hash-abc123');
      expect(result).toHaveProperty('templates');
    });

    it('should throw on invalid JSON input', () => {
      expect(() =>
        processProjectData({
          projectDataRaw: 'not-valid-json{{{',
          logger: mockLogger,
        })
      ).toThrow();
    });
  });

  describe('encodeBinaryAssets', () => {
    it('should encode buffers to base64 strings', () => {
      const result = encodeBinaryAssets({
        ogImageBuffer: Buffer.from('og-image-data'),
        ogImageEnBuffer: Buffer.from('og-image-en-data'),
        resumePdfBuffer: Buffer.from('pdf-data'),
      });

      expect(result).toHaveProperty('ogImageBase64');
      expect(result).toHaveProperty('ogImageEnBase64');
      expect(result).toHaveProperty('resumePdfBase64');
    });

    it('should produce valid base64 output', () => {
      const result = encodeBinaryAssets({
        ogImageBuffer: Buffer.from('test'),
        ogImageEnBuffer: Buffer.from('test-en'),
        resumePdfBuffer: Buffer.from('pdf'),
      });

      expect(result.ogImageBase64).toBe(Buffer.from('test').toString('base64'));
      expect(result.ogImageEnBase64).toBe(Buffer.from('test-en').toString('base64'));
      expect(result.resumePdfBase64).toBe(Buffer.from('pdf').toString('base64'));
    });

    it('should handle empty buffers', () => {
      const result = encodeBinaryAssets({
        ogImageBuffer: Buffer.alloc(0),
        ogImageEnBuffer: Buffer.alloc(0),
        resumePdfBuffer: Buffer.alloc(0),
      });

      expect(result.ogImageBase64).toBe('');
      expect(result.ogImageEnBase64).toBe('');
      expect(result.resumePdfBase64).toBe('');
    });

    it('should handle binary content correctly', () => {
      const binaryData = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
      const result = encodeBinaryAssets({
        ogImageBuffer: binaryData,
        ogImageEnBuffer: binaryData,
        resumePdfBuffer: binaryData,
      });

      expect(Buffer.from(result.ogImageBase64, 'base64')).toEqual(binaryData);
    });
  });
});
