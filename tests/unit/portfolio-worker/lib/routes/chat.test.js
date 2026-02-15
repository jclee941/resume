/**
 * @file Unit tests for routes/chat.js
 * @description Tests for generateChatRoute code generator
 */

const { generateChatRoute } = require('../../../../../typescript/portfolio-worker/lib/routes/chat');

describe('routes/chat', () => {
  describe('generateChatRoute', () => {
    const opts = {
      resumeChatDataBase64: Buffer.from('{"name":"Test"}').toString('base64'),
      aiModel: '@cf/meta/llama-3-8b-instruct',
    };

    it('returns a string', () => {
      const result = generateChatRoute(opts);
      expect(typeof result).toBe('string');
    });

    it('contains /api/chat route', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('/api/chat');
    });

    it('interpolates resumeChatDataBase64', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain(opts.resumeChatDataBase64);
    });

    it('interpolates aiModel', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain(opts.aiModel);
    });

    it('checks content-type for non-JSON', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('application/json');
    });

    it('returns 415 for non-JSON', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('415');
    });

    it('validates question is required', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('question');
    });

    it('validates question length <= 500', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('500');
    });

    it('has local answer regex matching', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('experience');
      expect(result).toContain('skill');
    });

    it('has AI fallback', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('AI');
    });

    it('returns answer in response', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('answer');
    });

    it('handles project-related queries', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('project');
    });

    it('handles certification-related queries', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('cert');
    });

    it('handles contact-related queries', () => {
      const result = generateChatRoute(opts);
      expect(result).toContain('contact');
    });
  });
});
