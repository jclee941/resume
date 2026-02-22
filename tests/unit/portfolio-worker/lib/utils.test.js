/**
 * Unit tests for typescript/portfolio-worker/lib/utils.js
 */

const path = require('path');
const {
  safeReadFile,
  generateHash,
  calculateDataHash,
  readAllFiles,
  safeParseJSON,
  sanitizeForTemplate,
  FileOperationError,
} = require('../../../../typescript/portfolio-worker/lib/utils');

describe('Utils Module', () => {
  describe('safeReadFile', () => {
    test('should read existing file', () => {
      const filePath = path.join(__dirname, '../../../../package.json');
      const content = safeReadFile(filePath, 'utf-8');
      expect(content).toContain('"name"');
      expect(content).toContain('resume');
    });

    test('should throw error for non-existent file', () => {
      const filePath = '/non/existent/file.txt';
      expect(() => safeReadFile(filePath)).toThrow(/File not found/);
    });

    test('should include filename in error message', () => {
      const filePath = '/non/existent/test-file.txt';
      expect(() => safeReadFile(filePath)).toThrow(/test-file\.txt/);
    });

    test('should read binary file with null encoding', () => {
      // Use a small known file
      const filePath = path.join(__dirname, '../../../../package.json');
      const content = safeReadFile(filePath, null);
      expect(Buffer.isBuffer(content)).toBe(true);
    });
  });

  describe('generateHash', () => {
    test('should generate SHA-256 hash', () => {
      const content = 'test content';
      const hash = generateHash(content);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    test('should generate base64 encoded hash', () => {
      const content = 'test content';
      const hash = generateHash(content);
      // Base64 characters only
      expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/);
    });

    test('should generate consistent hash for same content', () => {
      const content = 'consistent content';
      const hash1 = generateHash(content);
      const hash2 = generateHash(content);
      expect(hash1).toBe(hash2);
    });

    test('should generate different hash for different content', () => {
      const hash1 = generateHash('content1');
      const hash2 = generateHash('content2');
      expect(hash1).not.toBe(hash2);
    });

    test('should handle empty string', () => {
      const hash = generateHash('');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    test('should handle unicode content', () => {
      const hash = generateHash('한글 테스트 🎉');
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('calculateDataHash', () => {
    test('should generate MD5 hash for object', () => {
      const data = { key: 'value' };
      const hash = calculateDataHash(data);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });

    test('should generate hex encoded hash', () => {
      const data = { key: 'value' };
      const hash = calculateDataHash(data);
      // MD5 hex is 32 characters
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should generate consistent hash for same object', () => {
      const data = { key: 'value', nested: { a: 1 } };
      const hash1 = calculateDataHash(data);
      const hash2 = calculateDataHash(data);
      expect(hash1).toBe(hash2);
    });

    test('should generate different hash for different objects', () => {
      const hash1 = calculateDataHash({ key: 'value1' });
      const hash2 = calculateDataHash({ key: 'value2' });
      expect(hash1).not.toBe(hash2);
    });

    test('should handle array data', () => {
      const data = [1, 2, 3, { nested: 'value' }];
      const hash = calculateDataHash(data);
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should handle empty object', () => {
      const hash = calculateDataHash({});
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    test('should handle complex nested structures', () => {
      const data = {
        resume: [{ icon: '📄', title: 'Test', stats: ['A', 'B'] }],
        projects: [{ icon: '🚀', title: 'Project', dashboards: [{ name: 'D1' }] }],
      };
      const hash = calculateDataHash(data);
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('readAllFiles', () => {
    test('should read multiple files', () => {
      const files = [
        {
          path: path.join(__dirname, '../../../../package.json'),
          encoding: 'utf-8',
          name: 'pkg',
        },
        {
          path: path.join(__dirname, '../../../../README.md'),
          encoding: 'utf-8',
          name: 'readme',
        },
      ];
      const contents = readAllFiles(files);
      expect(contents.pkg).toContain('"name"');
      expect(contents.readme).toBeDefined();
    });

    test('should throw error if any file is missing', () => {
      const files = [
        {
          path: path.join(__dirname, '../../../../package.json'),
          encoding: 'utf-8',
          name: 'pkg',
        },
        { path: '/non/existent/file.txt', encoding: 'utf-8', name: 'missing' },
      ];
      expect(() => readAllFiles(files)).toThrow(/Failed to read/);
    });
  });

  describe('safeParseJSON', () => {
    test('should parse valid JSON', () => {
      const result = safeParseJSON('{"key": "value"}', 'test');
      expect(result).toEqual({ key: 'value' });
    });

    test('should throw error for invalid JSON', () => {
      expect(() => safeParseJSON('invalid json', 'test')).toThrow(/Invalid JSON in test/);
    });

    test('should handle arrays', () => {
      const result = safeParseJSON('[1, 2, 3]', 'test');
      expect(result).toEqual([1, 2, 3]);
    });

    test('should handle nested objects', () => {
      const result = safeParseJSON('{"a": {"b": 1}}', 'test');
      expect(result).toEqual({ a: { b: 1 } });
    });
  });

  describe('sanitizeForTemplate', () => {
    test('should escape backticks', () => {
      const result = sanitizeForTemplate('hello `world`');
      expect(result).toBe('hello \\`world\\`');
    });

    test('should escape dollar signs', () => {
      const result = sanitizeForTemplate('price: $100');
      expect(result).toBe('price: \\$100');
    });

    test('should escape backslashes', () => {
      const result = sanitizeForTemplate('path\\to\\file');
      expect(result).toBe('path\\\\to\\\\file');
    });

    test('should handle mixed content', () => {
      const result = sanitizeForTemplate('`$var` = \\n');
      expect(result).toBe('\\`\\$var\\` = \\\\n');
    });

    test('should handle empty string', () => {
      const result = sanitizeForTemplate('');
      expect(result).toBe('');
    });
  });

  describe('FileOperationError', () => {
    test('should create error with correct properties', () => {
      const error = new FileOperationError('Test error', '/path/to/file', 'read');
      expect(error.message).toBe('Test error');
      expect(error.filePath).toBe('/path/to/file');
      expect(error.operation).toBe('read');
      expect(error.name).toBe('FileOperationError');
    });

    test('should include cause if provided', () => {
      const cause = new Error('Original error');
      const error = new FileOperationError('Test error', '/path', 'read', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('escapeHtml', () => {
    const { escapeHtml } = require('../../../../typescript/portfolio-worker/lib/utils');

    test('should escape < and > characters', () => {
      const result = escapeHtml('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    test('should escape ampersand', () => {
      const result = escapeHtml('Tom & Jerry');
      expect(result).toBe('Tom &amp; Jerry');
    });

    test('should escape double quotes', () => {
      const result = escapeHtml('He said "hello"');
      expect(result).toBe('He said &quot;hello&quot;');
    });

    test('should escape single quotes', () => {
      const result = escapeHtml("It's fine");
      expect(result).toBe('It&#039;s fine');
    });

    test('should handle empty string', () => {
      const result = escapeHtml('');
      expect(result).toBe('');
    });

    test('should handle null input', () => {
      const result = escapeHtml(null);
      expect(result).toBe('');
    });

    test('should handle undefined input', () => {
      const result = escapeHtml(undefined);
      expect(result).toBe('');
    });

    test('should convert numbers to string', () => {
      const result = escapeHtml(123);
      expect(result).toBe('123');
    });

    test('should handle mixed XSS payload', () => {
      const result = escapeHtml('<img src="x" onerror="alert(\'XSS\')">');
      expect(result).toBe(
        '&lt;img src=&quot;x&quot; onerror=&quot;alert(&#039;XSS&#039;)&quot;&gt;'
      );
    });

    test('should neutralize javascript: URI payloads', () => {
      const result = escapeHtml('javascript:alert(1)" onclick="alert(2)');
      expect(result).toBe('javascript:alert(1)&quot; onclick=&quot;alert(2)');
    });

    test('should neutralize data URI payloads with script tag content', () => {
      const input = 'data:text/html,<script>alert(1)</script>';
      const result = escapeHtml(input);
      expect(result).toBe('data:text/html,&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    test('should preserve unicode while escaping HTML control characters', () => {
      const input = 'Hello 한글 😀 <b>bold</b> & "quoted"';
      const result = escapeHtml(input);
      expect(result).toBe('Hello 한글 😀 &lt;b&gt;bold&lt;/b&gt; &amp; &quot;quoted&quot;');
    });

    test('should escape already escaped entities again (nested escaping)', () => {
      const onceEscaped = '&lt;script&gt;';
      const result = escapeHtml(onceEscaped);
      expect(result).toBe('&amp;lt;script&amp;gt;');
    });

    test('should neutralize onclick attribute injection in quoted context', () => {
      const payload = '" onclick="javascript:alert(1)';
      const result = escapeHtml(payload);
      expect(result).toBe('&quot; onclick=&quot;javascript:alert(1)');
    });

    test('should preserve safe characters', () => {
      const result = escapeHtml('Hello World 123 !@#$%^*()');
      expect(result).toBe('Hello World 123 !@#$%^*()');
    });
  });

  describe('Edge Cases', () => {
    test('should handle permission errors', () => {
      // Try to read a file that requires elevated permissions
      expect(() => safeReadFile('/root/.ssh/id_rsa')).toThrow(FileOperationError);
    });

    test('should throw on invalid JSON', () => {
      expect(() => safeParseJSON('{ invalid json }')).toThrow(/Invalid JSON/);
    });

    test('should throw on empty JSON string', () => {
      expect(() => safeParseJSON('')).toThrow(/Invalid JSON/);
    });

    test('should parse null as JSON', () => {
      // JSON.parse(null) returns null, which is valid
      const result = safeParseJSON('null');
      expect(result).toBeNull();
    });

    test('should parse undefined string as JSON', () => {
      // JSON.parse('undefined') throws, which is expected
      expect(() => safeParseJSON('undefined')).toThrow(/Invalid JSON/);
    });

    test('should include context in JSON error', () => {
      const invalidJson = '{"key": "value", invalid}';
      expect(() => safeParseJSON(invalidJson, 'test-source')).toThrow(/test-source/);
    });

    test('should rethrow non-SyntaxError from JSON.parse', () => {
      const origParse = JSON.parse;
      JSON.parse = () => {
        throw new TypeError('unexpected type');
      };
      try {
        expect(() => safeParseJSON('{}')).toThrow(TypeError);
        expect(() => safeParseJSON('{}')).toThrow('unexpected type');
      } finally {
        JSON.parse = origParse;
      }
    });
  });

  describe('safeReadFile - edge cases', () => {
    test('should warn on large files (>5MB)', () => {
      const fs = require('fs');
      const logger = require('../../../../typescript/portfolio-worker/logger');
      const warnSpy = jest.spyOn(logger, 'warn').mockImplementation();
      const origExistsSync = fs.existsSync;
      const origStatSync = fs.statSync;
      const origReadFileSync = fs.readFileSync;

      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.statSync = jest.fn().mockReturnValue({ size: 6 * 1024 * 1024 });
      fs.readFileSync = jest.fn().mockReturnValue('file content');

      try {
        const result = safeReadFile('/some/large-file.txt');
        expect(result).toBe('file content');
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Large file detected'));
      } finally {
        fs.existsSync = origExistsSync;
        fs.statSync = origStatSync;
        fs.readFileSync = origReadFileSync;
        warnSpy.mockRestore();
      }
    });

    test('should throw FileOperationError when readFileSync fails', () => {
      const fs = require('fs');
      const origExistsSync = fs.existsSync;
      const origStatSync = fs.statSync;
      const origReadFileSync = fs.readFileSync;

      fs.existsSync = jest.fn().mockReturnValue(true);
      fs.statSync = jest.fn().mockReturnValue({ size: 1024 });
      fs.readFileSync = jest.fn().mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      try {
        expect(() => safeReadFile('/some/file.txt')).toThrow(/Failed to read/);
      } finally {
        fs.existsSync = origExistsSync;
        fs.statSync = origStatSync;
        fs.readFileSync = origReadFileSync;
      }
    });
  });
});
