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
              return new Response(JSON.stringify({ error: "Server misconfigured" }), { status: 503, headers: {'Content-Type': 'application/json'} });
            }
            const signature = await signMessage(payloadB64, secret);
            
            // Cookie format: payload.signature
            const sessionValue = \`\${payloadB64}.\${signature}\`;
            const cookieValue = \`dashboard_session=\${sessionValue}; Path=/; HttpOnly; SameSite=Strict; Secure\`;
            
            metrics.requests_success++;
            return new Response(JSON.stringify({ success: true, email }), {
              headers: { 
                'Content-Type': 'application/json',
                'Set-Cookie': cookieValue
              }
            });
          } else {
            return new Response(JSON.stringify({ error: "Unauthorized email" }), { status: 403, headers: {'Content-Type': 'application/json'} });
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: {'Content-Type': 'application/json'} });
        }
      }

      if (url.pathname === '/api/auth/status') {
        const session = await verifySession(request, env);
        metrics.requests_success++;
        return new Response(JSON.stringify({ 
          authenticated: !!session, 
          user: session ? session.email : null 
        }), {
          headers: { 'Content-Type': 'application/json' }
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
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: {'Content-Type': 'application/json'} });
        }

        try {
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
              headers: { 'Content-Type': 'application/json' }
            });
          } else {
            throw new Error(\`N8N Error: \${n8nResponse.status}\`);
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: {'Content-Type': 'application/json'} });
        }
      }`;
}

function generateChatRoute(opts) {
  return `
      if (url.pathname === '/api/chat' && request.method === 'POST') {
        try {
          const body = await request.json();
          const question = (body?.question || '').toString().trim();
          if (!question) {
            return new Response(JSON.stringify({ error: 'question is required' }), {
              status: 400,
              headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' },
            });
          }

          const resumeData = ${opts.resumeChatDataJson};

          const normalize = (value) =>
            String(value || '')
              .toLowerCase()
              .replace(/[^a-z0-9가-힣\\s]/g, ' ')
              .replace(/\\s+/g, ' ')
              .trim();

          const toList = (value) => (Array.isArray(value) ? value : []);

          const localAnswer = (() => {
            const q = normalize(question);
            const experiences = toList(resumeData.resume);
            const projects = toList(resumeData.projects);
            const certs = toList(resumeData.certifications);
            const contact = resumeData.contact || {};

            if (/(experience|career|work|경력|경험|회사|업무)/.test(q) && experiences.length > 0) {
              const top = experiences
                .slice(0, 3)
                .map((item) => item.title + ' (' + item.period + ')')
                .join(', ');
              return 'Top experience: ' + top;
            }

            if (/(skill|stack|tech|기술|스킬|역량)/.test(q) && resumeData.skills) {
              const skillItems = Object.values(resumeData.skills)
                .flatMap((category) => toList(category?.items))
                .slice(0, 10)
                .map((item) => item.name)
                .join(', ');
              if (skillItems) {
                return 'Key skills: ' + skillItems;
              }
            }

            if (/(project|portfolio|프로젝트|사이드)/.test(q) && projects.length > 0) {
              const top = projects
                .slice(0, 3)
                .map((item) => item.title + ': ' + item.description)
                .join(' | ');
              return 'Featured projects: ' + top;
            }

            if (/(cert|certificate|자격증|인증)/.test(q) && certs.length > 0) {
              const active = certs.filter((cert) => cert.status === 'active').map((cert) => cert.name);
              return (
                'Certifications: ' +
                (active.length > 0 ? active : certs.map((cert) => cert.name)).slice(0, 8).join(', ')
              );
            }

            if (/(contact|email|phone|github|연락|이메일|전화)/.test(q) && contact.email) {
              return (
                'Contact info: email ' +
                contact.email +
                ', phone ' +
                (contact.phone || 'N/A') +
                ', github ' +
                (contact.github || 'N/A')
              );
            }

            return 'I can tell you about my experience, skills, projects, certifications, or contact info';
          })();

          let answer = localAnswer;
          if (env?.AI?.run) {
            try {
              const model = ${opts.aiModelJson};
              const contextJson = JSON.stringify(resumeData);
              const systemPrompt =
                'You are a resume assistant for Jaecheol Lee. Answer only using the resume context. Keep answers concise and factual. ' +
                'If information is unavailable, say so and suggest asking about experience, skills, projects, certifications, or contact.\\n\\n' +
                'Resume context JSON:\\n' +
                contextJson;

              const aiResult = await env.AI.run(model, {
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: question },
                ],
                max_tokens: 320,
                temperature: 0.2,
              });

              const aiAnswer =
                aiResult?.response ||
                aiResult?.result ||
                aiResult?.text ||
                (Array.isArray(aiResult) ? aiResult[0] : null);

              if (typeof aiAnswer === 'string' && aiAnswer.trim()) {
                answer = aiAnswer.trim();
              }
            } catch (aiError) {
              ctx.waitUntil(logToElasticsearch(env, 'Chat AI fallback: ' + aiError.message, 'WARN', {
                path: '/api/chat',
                method: 'POST',
              }));
            }
          }

          metrics.requests_success++;
          return new Response(JSON.stringify({ answer }), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        } catch (err) {
          metrics.requests_error++;
          ctx.waitUntil(logToElasticsearch(env, 'Chat route error: ' + err.message, 'ERROR', {
            path: '/api/chat',
            method: 'POST',
          }));
          return new Response(JSON.stringify({ error: 'Invalid request' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          });
        }
      }`;
}

function generateCfStatsRoute() {
  return `
      // CLOUDFLARE ANALYTICS ENDPOINT
      // ============================================================

      if (url.pathname === '/api/cf/stats') {
        const session = await verifySession(request, env);
        if (!session) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: {'Content-Type': 'application/json'} });
        }

        // Use env vars from Cloudflare Worker runtime (Security: Do not inject build-time secrets)
        const cfApiKey = (typeof env !== 'undefined' && env.CF_API_KEY) || "";
        const cfEmail = (typeof env !== 'undefined' && env.CF_EMAIL) || "";

        const zoneId = await getCFZoneId(cfApiKey, cfEmail);
        if (!zoneId) {
          return new Response(JSON.stringify({ error: "Zone not found" }), { status: 404, headers: {'Content-Type': 'application/json'} });
        }

        const stats = await getCFStats(zoneId, cfApiKey, cfEmail);
        metrics.requests_success++;
        return new Response(JSON.stringify({ stats }), {
          headers: { 'Content-Type': 'application/json' }
        });
      }`;
}

function generateVitalsRoute() {
  return `
      // WEB VITALS ENDPOINT
      // ============================================================
      if (url.pathname === '/api/vitals' && request.method === 'POST') {
        try {
          const vitals = await request.json();

          // Validate vitals data structure
          const isValidNumber = (v) => typeof v === 'number' && !isNaN(v) && isFinite(v) && v >= 0 && v < 60000; // Max 60s
          if (!vitals || typeof vitals !== 'object') {
            throw new Error('Invalid vitals object');
          }
          if (vitals.lcp !== undefined && (!isValidNumber(vitals.lcp) || vitals.lcp < 0)) {
            throw new Error('Invalid LCP value (must be >= 0)');
          }
          if (vitals.fid !== undefined && (!isValidNumber(vitals.fid) || vitals.fid < 0)) {
            throw new Error('Invalid FID value (must be >= 0)');
          }
          if (vitals.cls !== undefined && (!isValidNumber(vitals.cls) || vitals.cls < 0 || vitals.cls > 1)) {
            throw new Error('Invalid CLS value (must be 0-1)');
          }

          metrics.vitals_received++;

          ctx.waitUntil(logToElasticsearch(env, \`Web Vitals: LCP=\${vitals.lcp}ms FID=\${vitals.fid}ms CLS=\${vitals.cls}\`, 'INFO', {
            path: '/api/vitals',
            method: 'POST'
          }));

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Vitals error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        }
      }`;
}

function generateTrackRoute() {
  return `
      // LINK CLICK TRACKING ENDPOINT
      // ============================================================
      if (url.pathname === '/api/track' && request.method === 'POST') {
        try {
          const trackingData = await request.json();
          
          // Validate tracking data structure
          if (!trackingData || typeof trackingData !== 'object') {
            throw new Error('Invalid tracking object');
          }
          if (!trackingData.event) {
            throw new Error('Missing event field');
          }
          
          // Log to Loki for observability
          ctx.waitUntil(logToElasticsearch(env, \`Track: \${trackingData.event} - \${trackingData.type || 'N/A'}\`, 'INFO', {
            path: '/api/track',
            event: trackingData.event,
            type: trackingData.type,
            language: trackingData.language,
            href: trackingData.href || ''
          }));
          
          metrics.requests_success++;
          return new Response('', { status: 204 }); // No Content (fire-and-forget)
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Tracking error: \${err.message}\`, 'ERROR'));
          return new Response('', { status: 204 }); // Still return 204 for fire-and-forget
        }
      }`;
}

function generateAnalyticsRoute() {
  return `
      // ANALYTICS ENDPOINT (A/B Testing Data)
      // ============================================================
      if (url.pathname === '/api/analytics' && request.method === 'POST') {
        try {
          const analyticsData = await request.json();

          // Validate analytics data
          if (!analyticsData || typeof analyticsData !== 'object') {
            throw new Error('Invalid analytics object');
          }

          // Log to Loki for observability
          ctx.waitUntil(logToElasticsearch(env, \`Analytics: \${analyticsData.event || 'unknown'}\`, 'INFO', {
            path: '/api/analytics',
            method: 'POST',
            event: analyticsData.event,
            variant: analyticsData.variant
          }));

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Analytics error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }`;
}

function generateMetricsPostRoute() {
  return `
      // METRICS ENDPOINT (Performance Metrics POST)
      // ============================================================
      if (url.pathname === '/api/metrics' && request.method === 'POST') {
        try {
          const metricsData = await request.json();

          // Validate metrics data
          if (!metricsData || typeof metricsData !== 'object') {
            throw new Error('Invalid metrics object');
          }

          // Log to Loki for observability
          ctx.waitUntil(logToElasticsearch(env, \`Metrics: \${JSON.stringify(metricsData).slice(0, 200)}\`, 'INFO', {
            path: '/api/metrics',
            method: 'POST'
          }));

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Metrics error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }`;
}

function generateMetricsGetRoute() {
  return `
      // METRICS AGGREGATION ENDPOINT (GET) - NEW FOR PHASE 6b
      // ============================================================
      if (url.pathname === '/api/metrics' && request.method === 'GET') {
        try {
          const metricsResponse = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            
            // HTTP Metrics
            http: {
              requests_total: metrics.requests_total,
              requests_success: metrics.requests_success,
              requests_error: metrics.requests_error,
              error_rate: metrics.requests_total > 0 
                ? (metrics.requests_error / metrics.requests_total * 100).toFixed(2) + '%'
                : '0%',
              response_time_ms: metrics.response_times.length > 0 
                ? Math.round(metrics.response_times.reduce((a, b) => a + b) / metrics.response_times.length)
                : 0
            },
            
            // Web Vitals Stats
            vitals: metrics.vitals_received > 0 ? {
              count: metrics.vitals_received,
              avg_lcp_ms: metrics.vitals_received > 0 ? Math.round(metrics.vitals_sum.lcp / metrics.vitals_received) : 0,
              avg_fid_ms: metrics.vitals_received > 0 ? Math.round(metrics.vitals_sum.fid / metrics.vitals_received) : 0,
              avg_cls: metrics.vitals_received > 0 ? (metrics.vitals_sum.cls / metrics.vitals_received).toFixed(3) : '0'
            } : null,
            
            // Tracking Events Summary
            tracking: {
              note: 'For detailed tracking data, query Loki logs with filter path=/api/track'
            }
          };
          
          ctx.waitUntil(logToElasticsearch(env, \`Metrics GET: \${metrics.requests_total} requests, \${metrics.vitals_received} vitals\`, 'INFO', {
            path: '/api/metrics',
            method: 'GET',
            requests_total: metrics.requests_total
          }));
          
          return new Response(JSON.stringify(metricsResponse), {
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60'
            }
          });
        } catch (err) {
          ctx.waitUntil(logToElasticsearch(env, \`Metrics GET error: \${err.message}\`, 'ERROR'));
          return new Response(JSON.stringify({ error: 'Failed to retrieve metrics', status: 'error' }), {
            status: 500,
            headers: {
              ...SECURITY_HEADERS,
              'Content-Type': 'application/json'
            }
          });
        }
      }`;
}

function generateMetricsSnapshotRoute() {
  return `
      if (url.pathname === '/api/metrics/snapshot' && request.method === 'POST') {
        try {
          const uptime = Math.floor((Date.now() - metrics.worker_start_time) / 1000);
          const errorRate = metrics.requests_total > 0
            ? (metrics.requests_error / metrics.requests_total * 100)
            : 0;
          const avgResponseTime = metrics.response_times.length > 0
            ? Math.round(metrics.response_times.reduce((a, b) => a + b) / metrics.response_times.length)
            : 0;
          const cacheHitRatio = metrics.cache_hits + metrics.cache_misses > 0
            ? (metrics.cache_hits / (metrics.cache_hits + metrics.cache_misses) * 100)
            : 0;

          const topCountries = JSON.stringify(
            Object.entries(metrics.geo_countries || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
          );
          const topColos = JSON.stringify(
            Object.entries(metrics.geo_colos || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
          );

          await env.DB.prepare(
            'INSERT INTO metrics_snapshots (total_requests, successful_requests, error_requests, avg_response_time_ms, cache_hit_ratio, web_vitals_lcp, web_vitals_inp, web_vitals_cls, web_vitals_fcp, web_vitals_ttfb, error_rate, uptime_seconds, top_countries, top_colos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
          ).bind(
            metrics.requests_total,
            metrics.requests_success,
            metrics.requests_error,
            avgResponseTime,
            cacheHitRatio,
            metrics.vitals_received > 0 ? Math.round(metrics.vitals_sum.lcp / metrics.vitals_received) : null,
            metrics.vitals_received > 0 ? Math.round((metrics.vitals_sum.fid || 0) / metrics.vitals_received) : null,
            metrics.vitals_received > 0 ? (metrics.vitals_sum.cls / metrics.vitals_received) : null,
            null,
            null,
            errorRate,
            uptime,
            topCountries,
            topColos
          ).run();

          return new Response(JSON.stringify({ status: 'ok', snapshot: 'saved' }), {
            headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
          });
        } catch (err) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { ...SECURITY_HEADERS, 'Content-Type': 'application/json' }
          });
        }
      }`;
}

module.exports = {
  generateAuthRoutes,
  generateControlRoutes,
  generateChatRoute,
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
};
