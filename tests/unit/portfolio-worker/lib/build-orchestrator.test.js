/**
 * @file Unit tests for build-orchestrator.js
 * @description Tests for runWorkerBuild orchestration function
 */

// Mock all dependencies using the CORRECT module paths
jest.mock('../../../../apps/portfolio/lib/file-reader', () => ({
  readBuildInputs: jest.fn(),
}));
jest.mock('../../../../apps/portfolio/lib/data-processor', () => ({
  processProjectData: jest.fn(),
  encodeBinaryAssets: jest.fn(),
}));
jest.mock('../../../../apps/portfolio/lib/html-transformer', () => ({
  buildLocalizedHtml: jest.fn(),
  escapeForTemplateLiteral: jest.fn(),
}));
jest.mock('../../../../apps/portfolio/lib/csp-hash-generator', () => ({
  extractStyleHashes: jest.fn(),
  mergeHashes: jest.fn(),
}));
jest.mock('../../../../apps/portfolio/lib/security-headers', () => ({
  generateSecurityHeaders: jest.fn(),
  CSP_NONCE_PLACEHOLDER: '__CSP_NONCE__',
}));
jest.mock('../../../../apps/portfolio/lib/templates', () => ({
  injectScriptNoncePlaceholder: jest.fn((html) => html),
}));
jest.mock('../../../../apps/portfolio/lib/worker-writer', () => ({
  buildAndWriteWorker: jest.fn(),
}));

const { readBuildInputs } = require('../../../../apps/portfolio/lib/file-reader');
const {
  processProjectData,
  encodeBinaryAssets,
} = require('../../../../apps/portfolio/lib/data-processor');
const {
  buildLocalizedHtml,
  escapeForTemplateLiteral,
} = require('../../../../apps/portfolio/lib/html-transformer');
const {
  extractStyleHashes,
  mergeHashes,
} = require('../../../../apps/portfolio/lib/csp-hash-generator');
const {
  generateSecurityHeaders,
} = require('../../../../apps/portfolio/lib/security-headers');
const {
  injectScriptNoncePlaceholder,
} = require('../../../../apps/portfolio/lib/templates');
const {
  buildAndWriteWorker,
} = require('../../../../apps/portfolio/lib/worker-writer');
const {
  runWorkerBuild,
} = require('../../../../apps/portfolio/lib/build-orchestrator');

describe('build-orchestrator', () => {
  const mockLogger = { log: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() };
  const buildOpts = {
    baseDir: '/base',
    version: '1.0.0',
    allowedEmails: ['test@test.com'],
    logger: mockLogger,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    readBuildInputs.mockResolvedValue({
      indexHtmlRaw: '<html></html>',
      indexEnHtmlRaw: '<html lang="en"></html>',
      indexJaHtmlRaw: '<html lang="ja"></html>',
      projectDataRaw: '{"resume":[],"projects":[]}',
      projectDataJaRaw: '{"resume":[],"projects":[]}',
      mainJs: 'main()',
      cssContent: 'body{}',
      manifestJson: '{}',
      manifestEnJson: '{}',
      serviceWorker: 'self.addEventListener("fetch",()=>{})',
      ogImageBuffer: Buffer.from('image'),
      ogImageEnBuffer: Buffer.from('image-en'),
      resumePdfBuffer: Buffer.from('pdf'),
    });

    processProjectData.mockReturnValue({
      projectData: {
        resume: [{ title: 'Test' }],
        projects: [{ title: 'Proj' }],
        resumeDownload: { pdfUrl: '/a.pdf', docxUrl: '/a.docx', mdUrl: '/a.md' },
      },
      templates: {
        heroContentHtml: '<h1>Hero</h1>',
        resumeDescriptionHtml: '',
        resumeCardsHtml: '<div>cards</div>',
        resumeCardsEnHtml: '<div>cards-en</div>',
        resumeCardsJaHtml: '<div>cards-ja</div>',
        projectCardsHtml: '<div>projects</div>',
        projectCardsEnHtml: '<div>projects-en</div>',
        projectCardsJaHtml: '<div>projects-ja</div>',
        infrastructureCardsHtml: '<div>infra</div>',
        certCardsHtml: '<div>certs</div>',
        skillsHtml: '<div>skills</div>',
        contactGridHtml: '<div>contact</div>',
      },
    });

    encodeBinaryAssets.mockReturnValue({
      ogImageBase64: 'base64img',
      ogImageEnBase64: 'base64img-en',
      resumePdfBase64: 'base64pdf',
    });

    buildLocalizedHtml.mockReturnValue('<html>built</html>');
    extractStyleHashes.mockReturnValue(["'sha256-style'"]);
    mergeHashes.mockReturnValue(["'sha256-style'"]);
    injectScriptNoncePlaceholder.mockImplementation((html) => html);
    escapeForTemplateLiteral.mockReturnValue('<html>escaped</html>');
    generateSecurityHeaders.mockReturnValue('const SECURITY_HEADERS = {};');
    buildAndWriteWorker.mockReturnValue({ workerSizeKB: '100.00' });
  });

  describe('runWorkerBuild', () => {
    it('calls readBuildInputs with baseDir and logger', async () => {
      await runWorkerBuild(buildOpts);
      expect(readBuildInputs).toHaveBeenCalledWith(
        expect.objectContaining({ baseDir: '/base', logger: mockLogger })
      );
    });

    it('calls processProjectData with raw data', async () => {
      await runWorkerBuild(buildOpts);
      expect(processProjectData).toHaveBeenCalled();
    });

    it('calls encodeBinaryAssets', async () => {
      await runWorkerBuild(buildOpts);
      expect(encodeBinaryAssets).toHaveBeenCalled();
    });

    it('calls buildLocalizedHtml for all locales (ko, en, ja)', async () => {
      await runWorkerBuild(buildOpts);
      expect(buildLocalizedHtml).toHaveBeenCalledTimes(3);
    });

    it('calls injectScriptNoncePlaceholder for all locales', async () => {
      await runWorkerBuild(buildOpts);
      expect(injectScriptNoncePlaceholder).toHaveBeenCalledTimes(3);
    });

    it('calls extractStyleHashes for all locales', async () => {
      await runWorkerBuild(buildOpts);
      expect(extractStyleHashes).toHaveBeenCalledTimes(3);
    });

    it('calls mergeHashes', async () => {
      await runWorkerBuild(buildOpts);
      expect(mergeHashes).toHaveBeenCalled();
    });

    it('calls escapeForTemplateLiteral for all locale HTML', async () => {
      await runWorkerBuild(buildOpts);
      expect(escapeForTemplateLiteral).toHaveBeenCalledTimes(3);
    });

    it('calls generateSecurityHeaders', async () => {
      await runWorkerBuild(buildOpts);
      expect(generateSecurityHeaders).toHaveBeenCalled();
    });

    it('calls buildAndWriteWorker', async () => {
      await runWorkerBuild(buildOpts);
      expect(buildAndWriteWorker).toHaveBeenCalled();
    });

    it('logs build stats', async () => {
      await runWorkerBuild(buildOpts);
      expect(mockLogger.log).toHaveBeenCalled();
    });

    it('passes version to buildAndWriteWorker', async () => {
      await runWorkerBuild(buildOpts);
      const writerCall = buildAndWriteWorker.mock.calls[0][0];
      expect(writerCall.version).toBe('1.0.0');
    });

    it('passes allowedEmails to buildAndWriteWorker', async () => {
      await runWorkerBuild(buildOpts);
      const writerCall = buildAndWriteWorker.mock.calls[0][0];
      expect(writerCall.allowedEmails).toEqual(['test@test.com']);
    });

    it('exits if worker size exceeds 900KB', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      buildAndWriteWorker.mockReturnValue({ workerSizeKB: '950.00' });

      await runWorkerBuild(buildOpts);
      expect(mockExit).toHaveBeenCalledWith(1);
      mockExit.mockRestore();
    });

    it('does not exit if worker size is under 900KB', async () => {
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
      buildAndWriteWorker.mockReturnValue({ workerSizeKB: '100.00' });

      await runWorkerBuild(buildOpts);
      expect(mockExit).not.toHaveBeenCalled();
      mockExit.mockRestore();
    });

    it('logs template cache as Empty when dataHash is null', async () => {
      const { TEMPLATE_CACHE } = require('../../../../apps/portfolio/lib/config');
      TEMPLATE_CACHE.dataHash = null;

      await runWorkerBuild(buildOpts);
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Template cache: Empty'));
    });

    it('logs template cache as Active when dataHash is set', async () => {
      const { TEMPLATE_CACHE } = require('../../../../apps/portfolio/lib/config');
      TEMPLATE_CACHE.dataHash = 'abc123';

      await runWorkerBuild(buildOpts);
      expect(mockLogger.log).toHaveBeenCalledWith(
        expect.stringContaining('Template cache: Active')
      );
      TEMPLATE_CACHE.dataHash = null;
    });
  });
});
