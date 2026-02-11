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
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
};
