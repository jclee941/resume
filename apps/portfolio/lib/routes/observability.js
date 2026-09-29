function generateCfStatsRoute() {
  return `
      // CLOUDFLARE ANALYTICS ENDPOINT
      // ============================================================

      if (url.pathname === '/api/cf/stats') {
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

        // Use env vars from Cloudflare Worker runtime (Security: Do not inject build-time secrets)
        const cfApiKey = (typeof env !== 'undefined' && env.CF_API_KEY) || "";
        const cfEmail = (typeof env !== 'undefined' && env.CF_EMAIL) || "";

        if (!cfApiKey || !cfEmail) {
          return new Response(JSON.stringify({ error: "Cloudflare API credentials not configured" }), {
            status: 503,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        const zoneId = await getCFZoneId(cfApiKey, cfEmail);
        if (!zoneId) {
          return new Response(JSON.stringify({ error: "Zone not found" }), {
            status: 404,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        const stats = await getCFStats(zoneId, cfApiKey, cfEmail);
        metrics.requests_success++;
        return new Response(JSON.stringify({ stats }), {
          headers: {
            ...SECURITY_HEADERS,
            ...rateLimitHeaders,
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }`;
}

function generateVitalsRoute() {
  return `
      // WEB VITALS ENDPOINT
      // ============================================================
      if (url.pathname === '/api/vitals' && request.method === 'POST') {
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

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          console.error(\`Vitals error: \${err.message}\`);
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
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

          const trackingData = await request.json();
          
          // Validate tracking data structure
          if (!trackingData || typeof trackingData !== 'object') {
            throw new Error('Invalid tracking object');
          }
          if (!trackingData.event) {
            throw new Error('Missing event field');
          }
          
          metrics.requests_success++;
          return new Response('', {
            status: 204,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
            }
          }); // No Content (fire-and-forget)
        } catch (err) {
          console.error(\`Tracking error: \${err.message}\`);
          return new Response('', {
            status: 204,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
            }
          }); // Still return 204 for fire-and-forget
        }
      }`;
}

function generateAnalyticsRoute() {
  return `
      // ANALYTICS ENDPOINT (A/B Testing Data)
      // ============================================================
      if (url.pathname === '/api/analytics' && request.method === 'POST') {
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

          const analyticsData = await request.json();

          // Validate analytics data
          if (!analyticsData || typeof analyticsData !== 'object') {
            throw new Error('Invalid analytics object');
          }

          metrics.requests_success++;
          return new Response(JSON.stringify({ status: 'ok' }), {
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache, no-store, must-revalidate'
            }
          });
        } catch (err) {
          console.error(\`Analytics error: \${err.message}\`);
          return new Response(JSON.stringify({ error: 'Invalid data' }), {
            status: 400,
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

function generateCspViolationRoute() {
  return `
      // CSP VIOLATION REPORT ENDPOINT
      // ============================================================
      if (url.pathname === '/api/csp-violation' && request.method === 'POST') {
        try {
          // Accept legacy report-uri (application/csp-report, sometimes application/json)
          // AND the modern Reporting API (application/reports+json).
          const cspContentType = (request.headers.get('Content-Type') || '').toLowerCase();
          const isReportContentType =
            hasJsonContentType(request) ||
            cspContentType.includes('application/csp-report') ||
            cspContentType.includes('application/reports+json');
          if (!isReportContentType) {
            return new Response(null, {
              status: 204,
              headers: {
                ...SECURITY_HEADERS,
                ...rateLimitHeaders,
                ...corsHeaders,
              }
            });
          }

          const payload = await request.json();
          // Normalize the three shapes into a flat {blockedUri, violatedDirective, documentUri, sourceFile, type}.
          const normalizeOne = (entry) => {
            if (!entry || typeof entry !== 'object') return null;
            // Reporting API: { type, url, body: { blockedURL, effectiveDirective, documentURL, sourceFile, disposition } }
            if (entry.body && typeof entry.body === 'object') {
              const b = entry.body;
              return {
                type: entry.type || 'csp-violation',
                blockedUri: b.blockedURL || b['blocked-uri'] || '',
                violatedDirective: b.effectiveDirective || b.violatedDirective || b['violated-directive'] || '',
                documentUri: b.documentURL || entry.url || b['document-uri'] || '',
                sourceFile: b.sourceFile || b['source-file'] || '',
              };
            }
            // Legacy report-uri: { 'csp-report': { 'blocked-uri', 'violated-directive', ... } }
            const r = entry['csp-report'] || entry;
            return {
              type: 'csp-violation',
              blockedUri: r['blocked-uri'] || r.blockedURL || '',
              violatedDirective: r['violated-directive'] || r.violatedDirective || '',
              documentUri: r['document-uri'] || r.documentURL || '',
              sourceFile: r['source-file'] || r.sourceFile || '',
            };
          };
          const entries = Array.isArray(payload) ? payload : [payload];
          for (const entry of entries) {
            const n = normalizeOne(entry);
            if (!n) continue;
            console.warn(\`CSP Violation: \${n.violatedDirective || n.type || 'unknown'}\`, {
              path: '/api/csp-violation',
              reportType: n.type,
              blockedUri: n.blockedUri,
              violatedDirective: n.violatedDirective,
              documentUri: n.documentUri,
              sourceFile: n.sourceFile,
            });
          }

          metrics.requests_success++;
          return new Response(null, {
            status: 204,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
            }
          });
        } catch (err) {
          console.error(\`CSP report error: \${err.message}\`);
          return new Response(null, {
            status: 204,
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
            }
          });
        }
      }`;
}

module.exports = {
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateCspViolationRoute,
};
