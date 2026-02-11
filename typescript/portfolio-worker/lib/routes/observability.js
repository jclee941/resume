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

module.exports = {
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
};
