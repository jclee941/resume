/**
 * @file Unit tests for file-reader.js
 * @description Tests for getFilesToRead, bundleMainScript, bundleCss, readBuildInputs
 */

const path = require('path');

// Mock esbuild
jest.mock('esbuild', () => ({
  build: jest.fn(),
}));

// Mock utils (readAllFiles is from ./utils in the source)
jest.mock('../../../../typescript/portfolio-worker/lib/utils', () => ({
  readAllFiles: jest.fn(),
}));

const esbuild = require('esbuild');
const { readAllFiles } = require('../../../../typescript/portfolio-worker/lib/utils');
const {
  getFilesToRead,
  bundleMainScript,
  bundleCss,
  readBuildInputs,
} = require('../../../../typescript/portfolio-worker/lib/file-reader');

describe('file-reader', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFilesToRead', () => {
    it('returns an array of 10 file specs', () => {
      const files = getFilesToRead('/base');
      expect(Array.isArray(files)).toBe(true);
      expect(files).toHaveLength(10);
    });

    it('each file spec has path, encoding, and name', () => {
      const files = getFilesToRead('/base');
      for (const f of files) {
        expect(f).toHaveProperty('path');
        expect(f).toHaveProperty('encoding');
        expect(f).toHaveProperty('name');
      }
    });

    it('includes indexHtmlRaw file', () => {
      const files = getFilesToRead('/base');
      const names = files.map((f) => f.name);
      expect(names).toContain('indexHtmlRaw');
    });

    it('includes indexEnHtmlRaw file', () => {
      const files = getFilesToRead('/base');
      const names = files.map((f) => f.name);
      expect(names).toContain('indexEnHtmlRaw');
    });

    it('includes projectDataRaw file', () => {
      const files = getFilesToRead('/base');
      const names = files.map((f) => f.name);
      expect(names).toContain('projectDataRaw');
    });

    it('includes binary files with null encoding', () => {
      const files = getFilesToRead('/base');
      const binaryFiles = files.filter((f) => f.encoding === null);
      expect(binaryFiles.length).toBeGreaterThanOrEqual(3);
    });

    it('includes text files with utf-8 encoding', () => {
      const files = getFilesToRead('/base');
      const textFiles = files.filter((f) => f.encoding === 'utf-8');
      expect(textFiles.length).toBeGreaterThanOrEqual(7);
    });

    it('all paths are absolute strings', () => {
      const files = getFilesToRead('/base');
      for (const f of files) {
        expect(typeof f.path).toBe('string');
        expect(f.path.startsWith('/')).toBe(true);
      }
    });
  });

  describe('bundleMainScript', () => {
    it('calls esbuild.build with correct options', async () => {
      esbuild.build.mockResolvedValue({
        outputFiles: [{ text: 'console.log("hello")' }],
      });
      await bundleMainScript('/base');
      expect(esbuild.build).toHaveBeenCalledTimes(1);
      const callArgs = esbuild.build.mock.calls[0][0];
      expect(callArgs.bundle).toBe(true);
      expect(callArgs.minify).toBe(true);
      expect(callArgs.write).toBe(false);
      expect(callArgs.format).toBe('iife');
    });

    it('escapes backticks in output (produces escaped backtick)', async () => {
      esbuild.build.mockResolvedValue({
        outputFiles: [{ text: 'let x = `template`' }],
      });
      const result = await bundleMainScript('/base');
      // Backtick escaping produces \` not removing backtick
      expect(result).toContain('\\`');
    });

    it('escapes dollar-brace patterns', async () => {
      esbuild.build.mockResolvedValue({
        outputFiles: [{ text: 'let x = ${y}' }],
      });
      const result = await bundleMainScript('/base');
      expect(result).toContain('\\$');
    });

    it('returns a string', async () => {
      esbuild.build.mockResolvedValue({
        outputFiles: [{ text: 'hello()' }],
      });
      const result = await bundleMainScript('/base');
      expect(typeof result).toBe('string');
    });

    it('uses entryPoints with src/scripts/main.js', async () => {
      esbuild.build.mockResolvedValue({
        outputFiles: [{ text: '' }],
      });
      await bundleMainScript('/base');
      const callArgs = esbuild.build.mock.calls[0][0];
      expect(callArgs.entryPoints[0]).toContain('main.js');
    });
  });

  describe('bundleCss', () => {
    it('calls esbuild.build with CSS options', async () => {
      esbuild.build.mockResolvedValue({
        outputFiles: [{ text: 'body{margin:0}' }],
      });
      await bundleCss('/base');
      expect(esbuild.build).toHaveBeenCalledTimes(1);
      const callArgs = esbuild.build.mock.calls[0][0];
      expect(callArgs.bundle).toBe(true);
      expect(callArgs.minify).toBe(true);
      expect(callArgs.write).toBe(false);
    });

    it('returns CSS text from output', async () => {
      esbuild.build.mockResolvedValue({
        outputFiles: [{ text: 'body{color:red}' }],
      });
      const result = await bundleCss('/base');
      expect(result).toBe('body{color:red}');
    });

    it('uses entryPoints with styles/main.css', async () => {
      esbuild.build.mockResolvedValue({
        outputFiles: [{ text: '' }],
      });
      await bundleCss('/base');
      const callArgs = esbuild.build.mock.calls[0][0];
      expect(callArgs.entryPoints[0]).toContain('main.css');
    });
  });

  describe('readBuildInputs', () => {
    const mockLogger = { log: jest.fn() };

    it('calls readAllFiles with file specs', async () => {
      readAllFiles.mockReturnValue({
        indexHtmlRaw: '<html></html>',
        indexEnHtmlRaw: '<html lang="en"></html>',
        projectDataRaw: '{}',
      });
      esbuild.build
        .mockResolvedValueOnce({ outputFiles: [{ text: 'main()' }] })
        .mockResolvedValueOnce({ outputFiles: [{ text: 'body{}' }] });

      await readBuildInputs({ baseDir: '/base', logger: mockLogger });
      expect(readAllFiles).toHaveBeenCalledTimes(1);
    });

    it('returns merged fileContents with mainJs and cssContent', async () => {
      readAllFiles.mockReturnValue({
        indexHtmlRaw: '<html></html>',
        projectDataRaw: '{}',
      });
      esbuild.build
        .mockResolvedValueOnce({ outputFiles: [{ text: 'bundled()' }] })
        .mockResolvedValueOnce({ outputFiles: [{ text: 'h1{color:blue}' }] });

      const result = await readBuildInputs({ baseDir: '/base', logger: mockLogger });
      expect(result).toHaveProperty('mainJs');
      expect(result).toHaveProperty('cssContent');
      expect(result).toHaveProperty('indexHtmlRaw');
      expect(result).toHaveProperty('projectDataRaw');
    });

    it('logs build step', async () => {
      readAllFiles.mockReturnValue({});
      esbuild.build
        .mockResolvedValueOnce({ outputFiles: [{ text: '' }] })
        .mockResolvedValueOnce({ outputFiles: [{ text: '' }] });

      await readBuildInputs({ baseDir: '/base', logger: mockLogger });
      expect(mockLogger.log).toHaveBeenCalled();
    });
  });
});
