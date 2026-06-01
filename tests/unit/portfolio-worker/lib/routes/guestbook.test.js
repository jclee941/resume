/**
 * @file Unit tests for routes/guestbook.js
 * @description Tests for generateGuestbookRoute — the public-write guestbook
 * route generator (GET list, POST create with honeypot + IP-hash rate limit,
 * admin-only DELETE).
 */

const { generateGuestbookRoute } = require('../../../../../apps/portfolio/lib/routes/guestbook');

describe('routes/guestbook', () => {
  let code;
  beforeAll(() => {
    code = generateGuestbookRoute();
  });

  it('returns a non-empty string', () => {
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });

  it('handles GET /api/guestbook', () => {
    expect(code).toContain("url.pathname === '/api/guestbook' && request.method === 'GET'");
  });

  it('handles POST /api/guestbook', () => {
    expect(code).toContain("url.pathname === '/api/guestbook' && request.method === 'POST'");
  });

  it('handles DELETE /api/guestbook/:id', () => {
    expect(code).toContain(
      "url.pathname.startsWith('/api/guestbook/') && request.method === 'DELETE'"
    );
  });

  it('creates the table lazily with CREATE TABLE IF NOT EXISTS', () => {
    expect(code).toContain('CREATE TABLE IF NOT EXISTS guestbook');
  });

  it('uses parameterized INSERT (no string concatenation of user input)', () => {
    expect(code).toContain('INSERT INTO guestbook');
    expect(code).toContain('.bind(name, message, locale, ipHash');
  });

  it('implements a honeypot (website/url/homepage) that silently discards bots', () => {
    expect(code).toMatch(/body\.website \|\| body\.url \|\| body\.homepage/);
  });

  it('rate-limits by hashed client IP', () => {
    expect(code).toContain("request.headers.get('cf-connecting-ip')");
    expect(code).toContain('crypto.subtle.digest');
    expect(code).toContain('30000'); // 30s window
    expect(code).toContain('429');
  });

  it('enforces name/message length caps', () => {
    expect(code).toContain('.slice(0, 40)'); // name
    expect(code).toContain('.slice(0, 500)'); // message
  });

  it('rejects empty name or message with 400', () => {
    expect(code).toContain('name.length < 1 || message.length < 1');
    expect(code).toContain('400');
  });

  it('gates DELETE behind verifySession (admin only)', () => {
    expect(code).toContain('verifySession(request, env)');
    expect(code).toContain('Unauthorized');
    expect(code).toContain('401');
  });

  it('uses a soft delete (status = hidden), not a hard DELETE', () => {
    expect(code).toContain('UPDATE guestbook SET status = ?');
    expect(code).toContain("'hidden'");
  });

  it('only returns visible entries from GET', () => {
    expect(code).toContain('WHERE status = ?');
    expect(code).toContain("'visible'");
  });

  it('degrades gracefully when env.DB is missing', () => {
    expect(code).toContain('if (!env.DB)');
  });

  it('caps and floors the list limit (1..100)', () => {
    expect(code).toContain('Math.min(Math.max');
    expect(code).toContain('100');
  });

  it('emits valid JavaScript (parses without throwing)', () => {
    // The generated block is a sequence of `if` statements meant to live inside
    // an async fetch handler; wrap it so `await`, `request`, `env`, etc. parse.
    const wrapped = `async function __h(request, env, ctx, url, metrics, SECURITY_HEADERS, rateLimitHeaders, corsHeaders, hasJsonContentType, verifySession, logToElasticsearch, crypto) {${code}\n}`;
    expect(() => new Function(wrapped)).not.toThrow();
  });
});
