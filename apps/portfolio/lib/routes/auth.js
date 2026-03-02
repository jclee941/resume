/**
 * Worker API route generators.
 * Extracted from generate-worker.js template literal.
 * @param {Object} opts - Build-time interpolation values
 */

function generateAuthRoutes(opts) {
  return `
      // AUTHENTICATION ENDPOINTS
      // ============================================================
      
      if (url.pathname === '/api/auth/google' && request.method === 'POST') {
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

          const body = await request.json();
          const payload = await verifyGoogleToken(body.credential);
          const email = payload.email;
          const allowedEmails = ${opts.allowedEmailsJson};

          if (allowedEmails.length > 0 && allowedEmails.includes(email)) {
            const sessionObj = { email, expires: Date.now() + 24 * 60 * 60 * 1000 };
            const sessionJson = JSON.stringify(sessionObj);
            const payloadB64 = btoa(sessionJson);
            
            const secret = (typeof env !== 'undefined' && env.SIGNING_SECRET);
            if (!secret) {
              return new Response(JSON.stringify({ error: "Server misconfigured" }), {
                status: 503,
                headers: {
                  ...SECURITY_HEADERS,
                  ...rateLimitHeaders,
                  ...corsHeaders,
                  'Content-Type': 'application/json'
                }
              });
            }
            const signature = await signMessage(payloadB64, secret);
            
            // Cookie format: payload.signature
            const sessionValue = \`\${payloadB64}.\${signature}\`;
            const cookieValue = \`dashboard_session=\${sessionValue}; Path=/; HttpOnly; SameSite=Strict; Secure\`;
            
            metrics.requests_success++;
            return new Response(JSON.stringify({ success: true, email }), {
              headers: { 
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Set-Cookie': cookieValue
              }
            });
          } else {
            return new Response(JSON.stringify({ error: "Unauthorized email" }), {
              status: 403,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 401,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }
      }

      if (url.pathname === '/api/auth/status') {
        const session = await verifySession(request, env);
        metrics.requests_success++;
        return new Response(JSON.stringify({ 
          authenticated: !!session, 
          user: session ? session.email : null 
        }), {
          headers: {
            ...SECURITY_HEADERS,
            ...rateLimitHeaders,
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }`;
}

function generateControlRoutes() {
  return `
      // AUTOMATION CONTROL ENDPOINT (REMOTE CONTROL)
      // ============================================================

      if (url.pathname === '/api/ai/run-system' && request.method === 'POST') {
        const session = await verifySession(request, env);
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

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

          const body = await request.json();
          // Forward command to N8N Webhook (The Real Engine)
          const webhookBase = (typeof env !== 'undefined' && env.N8N_WEBHOOK_BASE) || "https://n8n.jclee.me/webhook";
          const n8nResponse = await fetch(\`\${webhookBase}/auto-apply-trigger\`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...body,
              user: session.email,
              source: 'dashboard-worker' 
            })
          });

          if (n8nResponse.ok) {
             metrics.requests_success++;
             return new Response(JSON.stringify({ success: true, message: "Automation triggered via N8N" }), {
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
                'Content-Type': 'application/json'
              }
            });
          } else {
            throw new Error(\`N8N Error: \${n8nResponse.status}\`);
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), {
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

module.exports = {
  generateAuthRoutes,
  generateControlRoutes,
};
