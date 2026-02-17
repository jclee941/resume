const { generateChatRoute } = require('../../../../../typescript/portfolio-worker/lib/routes/chat');

describe('routes/chat Gemini fallback', () => {
  const opts = {
    resumeChatDataBase64: Buffer.from('{"name":"Test"}').toString('base64'),
    aiModel: '@cf/meta/llama-3-8b-instruct',
  };

  it('uses Gemini fallback only when local answer is missing', () => {
    const result = generateChatRoute(opts);
    expect(result).toContain('if (!answer && env?.GEMINI_API_KEY)');
  });

  it('calls Gemini generateContent endpoint', () => {
    const result = generateChatRoute(opts);
    expect(result).toContain(
      'generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
    );
  });

  it('applies a 3-second timeout with AbortController', () => {
    const result = generateChatRoute(opts);
    expect(result).toContain('new AbortController()');
    expect(result).toContain('setTimeout(() => controller.abort(), 3000)');
    expect(result).toContain('signal: controller.signal');
  });

  it('enforces per-IP AI rate limiting to 10 calls per minute', () => {
    const result = generateChatRoute(opts);
    expect(result).toContain('maxAiCallsPerMinute = 10');
    expect(result).toContain('CF-Connecting-IP');
    expect(result).toContain('__resume_chat_ai_rate_limit_state__');
  });

  it('constrains AI responses to resume-related questions', () => {
    const result = generateChatRoute(opts);
    expect(result).toContain('Answer only questions directly related to the resume data');
    expect(result).toContain(
      'If a question is unrelated, say you can only answer resume-related questions'
    );
  });

  it('falls back to default local guidance when AI is unavailable', () => {
    const result = generateChatRoute(opts);
    expect(result).toContain('Gemini API unavailable');
    expect(result).toContain(
      'I can tell you about my experience, skills, projects, certifications, or contact info'
    );
  });
});
