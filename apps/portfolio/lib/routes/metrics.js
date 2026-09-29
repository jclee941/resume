function generateMetricsPostRoute() {
  return `
      // METRICS ENDPOINT (Performance Metrics POST)
      // ============================================================
      if (url.pathname === '/api/metrics' && request.method === 'POST') {
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

          const metricsData = await request.json();

          // Validate metrics data
          if (!metricsData || typeof metricsData !== 'object') {
            throw new Error('Invalid metrics object');
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
          console.error(\`Metrics error: \${err.message}\`);
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
              response_time_ms: (metrics.response_times || []).length > 0 
                ? Math.round(metrics.response_times.reduce((a, b) => a + b) / metrics.response_times.length)
                : 0
            },
            
            // Web Vitals Stats
            vitals: metrics.vitals_received > 0 ? {
              count: metrics.vitals_received,
              avg_lcp_ms: Math.round((metrics.vitals_sum?.lcp || 0) / metrics.vitals_received),
              avg_fid_ms: Math.round((metrics.vitals_sum?.fid || 0) / metrics.vitals_received),
              avg_cls: ((metrics.vitals_sum?.cls || 0) / metrics.vitals_received).toFixed(3)
            } : null,
            
            // Tracking Events Summary
            tracking: {
              note: 'For detailed tracking data, query Loki logs with filter path=/api/track'
            }
          };
          
          return new Response(JSON.stringify(metricsResponse), {
            headers: {
              ...SECURITY_HEADERS,
              ...rateLimitHeaders,
              ...corsHeaders,
              'Content-Type': 'application/json',
              'Cache-Control': 'public, max-age=60'
            }
          });
        } catch (err) {
          console.error(\`Metrics GET error: \${err.message}\`);
          return new Response(JSON.stringify({ error: 'Failed to retrieve metrics', status: 'error' }), {
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
  generateMetricsPostRoute,
  generateMetricsGetRoute,
};
