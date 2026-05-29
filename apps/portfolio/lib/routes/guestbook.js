'use strict';

/**
 * Guestbook (방명록) API route generators.
 *
 * Public write with anti-spam (honeypot + IP-hash rate limit + length caps),
 * admin-only delete (verifySession). Backed by D1 (env.DB). The table is
 * created lazily with CREATE TABLE IF NOT EXISTS on first use, so no external
 * migration step is required.
 *
 * Endpoints:
 *   GET    /api/guestbook        list visible entries (newest first, paginated)
 *   POST   /api/guestbook        create an entry (honeypot + rate-limited)
 *   DELETE /api/guestbook/:id    hide an entry (admin only, verifySession)
 *
 * Stored text is NOT HTML — the client renders it with textContent, never
 * innerHTML, so it is XSS-safe by construction. The server additionally strips
 * control characters and enforces length caps.
 *
 * @module routes/guestbook
 */

const GUESTBOOK_SCHEMA = `
        CREATE TABLE IF NOT EXISTS guestbook (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          message TEXT NOT NULL,
          locale TEXT DEFAULT 'ko',
          ip_hash TEXT,
          status TEXT NOT NULL DEFAULT 'visible',
          created_at INTEGER NOT NULL
        )`;

/**
 * Generate the guestbook route block (GET list + POST create + DELETE hide).
 * Emitted verbatim into the worker fetch handler.
 * @returns {string} Worker source for the guestbook routes.
 */
function generateGuestbookRoute() {
  return `
      // GUESTBOOK ENDPOINTS (방명록)
      // ============================================================
      if (url.pathname === '/api/guestbook' && request.method === 'GET') {
        try {
          if (!env.DB) {
            return new Response(JSON.stringify({ entries: [] }), {
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache, no-store, must-revalidate'
              }
            });
          }
          await env.DB.prepare(\`${GUESTBOOK_SCHEMA}\`).run();

          const limitParam = parseInt(url.searchParams.get('limit') || '50', 10);
          const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 50, 1), 100);
          const offsetParam = parseInt(url.searchParams.get('offset') || '0', 10);
          const offset = Math.max(Number.isFinite(offsetParam) ? offsetParam : 0, 0);

          const result = await env.DB.prepare(
            'SELECT id, name, message, locale, created_at FROM guestbook WHERE status = ? ORDER BY id DESC LIMIT ? OFFSET ?'
          ).bind('visible', limit, offset).all();

          const countRow = await env.DB.prepare(
            'SELECT COUNT(*) AS total FROM guestbook WHERE status = ?'
          ).bind('visible').first();

          metrics.requests_success++;
          return new Response(JSON.stringify({
            entries: (result.results || []),
            total: countRow ? countRow.total : 0
          }), {
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Guestbook GET error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Failed to load guestbook' }), {
            status: 500,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      if (url.pathname === '/api/guestbook' && request.method === 'POST') {
        try {
          if (!hasJsonContentType(request)) {
            return new Response(JSON.stringify({ error: 'Content-Type must be application/json' }), {
              status: 415,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          if (!env.DB) {
            return new Response(JSON.stringify({ error: 'Guestbook storage unavailable' }), {
              status: 503,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          const body = await request.json();

          // Honeypot: bots fill hidden fields. A non-empty 'website' (or 'url')
          // field means it is almost certainly a bot. Return 200 so the bot
          // believes it succeeded, but silently discard.
          if (body && (body.website || body.url || body.homepage)) {
            metrics.requests_success++;
            return new Response(JSON.stringify({ status: 'ok' }), {
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          // Normalise + validate. Strip control chars, collapse, enforce caps.
          const stripControl = (s) => String(s == null ? '' : s)
            .replace(/[\\u0000-\\u001F\\u007F]/g, ' ')
            .trim();
          const name = stripControl(body && body.name).slice(0, 40);
          const message = stripControl(body && body.message).slice(0, 500);
          const localeRaw = String((body && body.locale) || 'ko');
          const locale = ['ko', 'en', 'ja'].includes(localeRaw) ? localeRaw : 'ko';

          if (name.length < 1 || message.length < 1) {
            return new Response(JSON.stringify({ error: 'Name and message are required' }), {
              status: 400,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          await env.DB.prepare(\`${GUESTBOOK_SCHEMA}\`).run();

          // Per-IP throttle: max 1 post per 30s, derived from the connecting IP.
          const clientIp = request.headers.get('cf-connecting-ip') || 'unknown';
          const ipHashBuf = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(clientIp + '|guestbook')
          );
          const ipHash = Array.from(new Uint8Array(ipHashBuf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          const recent = await env.DB.prepare(
            'SELECT created_at FROM guestbook WHERE ip_hash = ? ORDER BY id DESC LIMIT 1'
          ).bind(ipHash).first();
          const now = Date.now();
          if (recent && now - recent.created_at < 30000) {
            return new Response(JSON.stringify({ error: 'You are posting too fast. Please wait a moment.' }), {
              status: 429,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          const insert = await env.DB.prepare(
            'INSERT INTO guestbook (name, message, locale, ip_hash, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
          ).bind(name, message, locale, ipHash, 'visible', now).run();

          metrics.requests_success++;
          return new Response(JSON.stringify({
            status: 'ok',
            entry: {
              id: insert.meta ? insert.meta.last_row_id : null,
              name,
              message,
              locale,
              created_at: now
            }
          }), {
            status: 201,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Guestbook POST error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Failed to save entry' }), {
            status: 500,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      if (url.pathname.startsWith('/api/guestbook/') && request.method === 'DELETE') {
        try {
          const session = await verifySession(request, env);
          if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
              status: 401,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
          if (!env.DB) {
            return new Response(JSON.stringify({ error: 'Guestbook storage unavailable' }), {
              status: 503,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          const idStr = url.pathname.slice('/api/guestbook/'.length);
          const id = parseInt(idStr, 10);
          if (!Number.isInteger(id) || id < 1) {
            return new Response(JSON.stringify({ error: 'Invalid id' }), {
              status: 400,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }

          // Soft delete: flip status to 'hidden' (auditable, reversible).
          await env.DB.prepare('UPDATE guestbook SET status = ? WHERE id = ?')
            .bind('hidden', id).run();

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok', id }), {
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Guestbook DELETE error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Failed to delete entry' }), {
            status: 500,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }`;
}

module.exports = { generateGuestbookRoute };
