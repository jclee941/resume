'use strict';

describe('metrics', () => {
  let metrics;

  beforeEach(() => {
    jest.resetModules();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T00:00:00Z'));
    metrics = require('../../../../apps/portfolio/lib/metrics');
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('HISTOGRAM_BUCKETS', () => {
    test('should be an array of 11 numbers', () => {
      expect(Array.isArray(metrics.HISTOGRAM_BUCKETS)).toBe(true);
      expect(metrics.HISTOGRAM_BUCKETS).toHaveLength(11);
      metrics.HISTOGRAM_BUCKETS.forEach((val) => {
        expect(typeof val).toBe('number');
      });
    });

    test('should contain correct bucket values', () => {
      expect(metrics.HISTOGRAM_BUCKETS).toEqual([
        0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10,
      ]);
    });

    test('should be in ascending order', () => {
      const buckets = metrics.HISTOGRAM_BUCKETS;
      for (let i = 1; i < buckets.length; i++) {
        expect(buckets[i]).toBeGreaterThan(buckets[i - 1]);
      }
    });
  });

  describe('initHistogramBuckets()', () => {
    test('should return an object', () => {
      const result = metrics.initHistogramBuckets();
      expect(typeof result).toBe('object');
      expect(result).not.toBeNull();
    });

    test('should have keys for each bucket boundary plus +Inf', () => {
      const result = metrics.initHistogramBuckets();
      metrics.HISTOGRAM_BUCKETS.forEach((le) => {
        expect(Object.keys(result)).toContain(le.toString());
      });
      expect(Object.keys(result)).toContain('+Inf');
    });

    test('should have exactly 12 keys', () => {
      const result = metrics.initHistogramBuckets();
      expect(Object.keys(result)).toHaveLength(12);
    });

    test('should initialize all bucket values to 0', () => {
      const result = metrics.initHistogramBuckets();
      Object.values(result).forEach((val) => {
        expect(val).toBe(0);
      });
    });
  });

  describe('observeHistogram(buckets, valueSeconds)', () => {
    test('value <= smallest bucket increments all buckets plus +Inf', () => {
      const buckets = metrics.initHistogramBuckets();
      metrics.observeHistogram(buckets, 0.001);
      metrics.HISTOGRAM_BUCKETS.forEach((le) => {
        expect(buckets[le]).toBe(1);
      });
      expect(buckets['+Inf']).toBe(1);
    });

    test('value between two buckets increments only those >= value plus +Inf', () => {
      const buckets = metrics.initHistogramBuckets();
      metrics.observeHistogram(buckets, 0.03);
      expect(buckets['0.005']).toBe(0);
      expect(buckets['0.01']).toBe(0);
      expect(buckets['0.025']).toBe(0);
      expect(buckets['0.05']).toBe(1);
      expect(buckets['0.1']).toBe(1);
      expect(buckets['0.25']).toBe(1);
      expect(buckets['0.5']).toBe(1);
      expect(buckets['1']).toBe(1);
      expect(buckets['2.5']).toBe(1);
      expect(buckets['5']).toBe(1);
      expect(buckets['10']).toBe(1);
      expect(buckets['+Inf']).toBe(1);
    });

    test('value > largest bucket only increments +Inf', () => {
      const buckets = metrics.initHistogramBuckets();
      metrics.observeHistogram(buckets, 100);
      metrics.HISTOGRAM_BUCKETS.forEach((le) => {
        expect(buckets[le]).toBe(0);
      });
      expect(buckets['+Inf']).toBe(1);
    });

    test('value exactly at bucket boundary increments that bucket and larger', () => {
      const buckets = metrics.initHistogramBuckets();
      metrics.observeHistogram(buckets, 0.1);
      expect(buckets[0.1]).toBe(1);
      expect(buckets[0.25]).toBe(1);
      expect(buckets[0.5]).toBe(1);
      expect(buckets[1]).toBe(1);
      expect(buckets[2.5]).toBe(1);
      expect(buckets[5]).toBe(1);
      expect(buckets[10]).toBe(1);
      expect(buckets[0.05]).toBe(0);
    });

    test('multiple observations accumulate correctly', () => {
      const buckets = metrics.initHistogramBuckets();
      metrics.observeHistogram(buckets, 0.001);
      metrics.observeHistogram(buckets, 0.05);
      metrics.observeHistogram(buckets, 0.05);
      expect(buckets['0.005']).toBe(1);
      expect(buckets['0.01']).toBe(1);
      expect(buckets['0.025']).toBe(1);
      expect(buckets['0.05']).toBe(3);
      expect(buckets['+Inf']).toBe(3);
    });
  });

  describe('generateHistogramLines(name, buckets, labels)', () => {
    test('generates correct _bucket{le="..."} format lines', () => {
      const buckets = metrics.initHistogramBuckets();
      buckets[0.1] = 5;
      buckets['+Inf'] = 10;
      const result = metrics.generateHistogramLines('http_request_duration_seconds', buckets, '');
      expect(result).toContain('http_request_duration_seconds_bucket{le="0.005"} 0');
      expect(result).toContain('http_request_duration_seconds_bucket{le="0.1"} 5');
      expect(result).toContain('http_request_duration_seconds_bucket{le="+Inf"} 10');
    });

    test('handles empty labels (no comma prefix)', () => {
      const buckets = metrics.initHistogramBuckets();
      const result = metrics.generateHistogramLines('test_metric', buckets, '');
      const lines = result.split('\n');
      const firstLine = lines[0];
      expect(firstLine).toMatch(/^test_metric_bucket\{le="0\.005"\} 0$/);
      expect(firstLine).not.toContain(',le=');
    });

    test('handles non-empty labels (with comma prefix)', () => {
      const buckets = metrics.initHistogramBuckets();
      const result = metrics.generateHistogramLines('test_metric', buckets, 'job="resume"');
      const firstLine = result.split('\n')[0];
      expect(firstLine).toMatch(/^test_metric_bucket\{job="resume",le="0\.005"\} 0$/);
      expect(firstLine).toContain('job="resume"');
    });

    test('includes +Inf bucket line', () => {
      const buckets = metrics.initHistogramBuckets();
      const result = metrics.generateHistogramLines('test_metric', buckets, '');
      expect(result).toContain('test_metric_bucket{le="+Inf"} 0');
    });

    test('each line ends with newline', () => {
      const buckets = metrics.initHistogramBuckets();
      const result = metrics.generateHistogramLines('test_metric', buckets, '');
      expect(result).toMatch(/\n$/);
    });
  });

  describe('createMetricsCollector()', () => {
    test('returns an object with all expected properties', () => {
      const collector = metrics.createMetricsCollector();
      expect(collector).toHaveProperty('requests_total');
      expect(collector).toHaveProperty('requests_success');
      expect(collector).toHaveProperty('requests_error');
      expect(collector).toHaveProperty('response_time_sum');
      expect(collector).toHaveProperty('vitals_received');
      expect(collector).toHaveProperty('worker_start_time');
      expect(collector).toHaveProperty('response_time_buckets');
      expect(collector).toHaveProperty('web_vitals');
      expect(collector).toHaveProperty('cf_metrics');
      expect(collector).toHaveProperty('geo_metrics');
    });

    test('initializes requests_total/success/error to 0', () => {
      const collector = metrics.createMetricsCollector();
      expect(collector.requests_total).toBe(0);
      expect(collector.requests_success).toBe(0);
      expect(collector.requests_error).toBe(0);
    });

    test('response_time_buckets is properly initialized histogram', () => {
      const collector = metrics.createMetricsCollector();
      expect(collector.response_time_buckets).toBeDefined();
      expect(Object.keys(collector.response_time_buckets)).toHaveLength(12);
      Object.values(collector.response_time_buckets).forEach((val) => {
        expect(val).toBe(0);
      });
    });

    test('web_vitals has all 5 fields plus samples', () => {
      const collector = metrics.createMetricsCollector();
      expect(collector.web_vitals).toEqual({
        lcp: 0,
        inp: 0,
        cls: 0,
        fcp: 0,
        ttfb: 0,
        samples: 0,
      });
    });

    test('cf_metrics has all required fields initialized to 0', () => {
      const collector = metrics.createMetricsCollector();
      expect(collector.cf_metrics.cache_hit_ratio).toBe(0);
      expect(collector.cf_metrics.cache_bypass_ratio).toBe(0);
      expect(collector.cf_metrics.cpu_time_ms).toBe(0);
      expect(collector.cf_metrics.cache_hits).toBe(0);
      expect(collector.cf_metrics.cache_misses).toBe(0);
    });

    test('geo_metrics.by_country and by_colo are empty objects', () => {
      const collector = metrics.createMetricsCollector();
      expect(collector.geo_metrics.by_country).toEqual({});
      expect(collector.geo_metrics.by_colo).toEqual({});
    });

    test('worker_start_time is set to Date.now()', () => {
      const collector = metrics.createMetricsCollector();
      expect(collector.worker_start_time).toBe(new Date('2025-01-01T00:00:00Z').getTime());
    });
  });

  describe('recordRequest(collector, options)', () => {
    test('increments requests_total', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200 });
      expect(collector.requests_total).toBe(1);
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200 });
      expect(collector.requests_total).toBe(2);
    });

    test('200 status increments requests_success', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200 });
      expect(collector.requests_success).toBe(1);
      expect(collector.requests_error).toBe(0);
    });

    test('500 status increments requests_error', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 500 });
      expect(collector.requests_success).toBe(0);
      expect(collector.requests_error).toBe(1);
    });

    test('301 status (2xx range) increments requests_success', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 301 });
      expect(collector.requests_success).toBe(1);
      expect(collector.requests_error).toBe(0);
    });

    test('400 status (4xx range) increments requests_error', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 400 });
      expect(collector.requests_success).toBe(0);
      expect(collector.requests_error).toBe(1);
    });

    test('adds responseTimeMs to response_time_sum', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 150, status: 200 });
      expect(collector.response_time_sum).toBe(150);
      metrics.recordRequest(collector, { responseTimeMs: 250, status: 200 });
      expect(collector.response_time_sum).toBe(400);
    });

    test('updates response_time_buckets via observeHistogram', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 50, status: 200 }); // 0.05 seconds
      expect(collector.response_time_buckets[0.05]).toBe(1);
      expect(collector.response_time_buckets['+Inf']).toBe(1);
    });

    test('country option increments geo_metrics.by_country', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, country: 'KR' });
      expect(collector.geo_metrics.by_country['KR']).toBe(1);
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, country: 'KR' });
      expect(collector.geo_metrics.by_country['KR']).toBe(2);
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, country: 'US' });
      expect(collector.geo_metrics.by_country['US']).toBe(1);
    });

    test('colo option increments geo_metrics.by_colo', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, colo: 'ICN1' });
      expect(collector.geo_metrics.by_colo['ICN1']).toBe(1);
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, colo: 'ICN1' });
      expect(collector.geo_metrics.by_colo['ICN1']).toBe(2);
    });

    test('cacheHit=true increments cache_hits and updates cache_hit_ratio', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, cacheHit: true });
      expect(collector.cf_metrics.cache_hits).toBe(1);
      expect(collector.cf_metrics.cache_misses).toBe(0);
      expect(collector.cf_metrics.cache_hit_ratio).toBe(1);
      expect(collector.cf_metrics.cache_bypass_ratio).toBe(0);
    });

    test('cacheHit=false increments cache_misses and updates cache_bypass_ratio', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, cacheHit: false });
      expect(collector.cf_metrics.cache_hits).toBe(0);
      expect(collector.cf_metrics.cache_misses).toBe(1);
      expect(collector.cf_metrics.cache_hit_ratio).toBe(0);
      expect(collector.cf_metrics.cache_bypass_ratio).toBe(1);
    });

    test('multiple cache operations compute correct ratios', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, cacheHit: true });
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, cacheHit: true });
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, cacheHit: false });
      expect(collector.cf_metrics.cache_hits).toBe(2);
      expect(collector.cf_metrics.cache_misses).toBe(1);
      expect(collector.cf_metrics.cache_hit_ratio).toBeCloseTo(2 / 3, 5);
      expect(collector.cf_metrics.cache_bypass_ratio).toBeCloseTo(1 / 3, 5);
    });

    test('cpuTimeMs updates running average in cf_metrics.cpu_time_ms', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, cpuTimeMs: 10 });
      expect(collector.cf_metrics.cpu_time_ms).toBe(10);
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, cpuTimeMs: 30 });
      // Running average: 10 + (30 - 10) / 2 = 20
      expect(collector.cf_metrics.cpu_time_ms).toBe(20);
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200, cpuTimeMs: 50 });
      // Running average: 20 + (50 - 20) / 3 = 20 + 10 = 30
      expect(collector.cf_metrics.cpu_time_ms).toBe(30);
    });

    test('without country option skips country update', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200 });
      expect(collector.geo_metrics.by_country).toEqual({});
    });

    test('without colo option skips colo update', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200 });
      expect(collector.geo_metrics.by_colo).toEqual({});
    });

    test('without cacheHit option skips cache update', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200 });
      expect(collector.cf_metrics.cache_hits).toBe(0);
      expect(collector.cf_metrics.cache_misses).toBe(0);
    });

    test('without cpuTimeMs option skips cpu update', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200 });
      expect(collector.cf_metrics.cpu_time_ms).toBe(0);
    });
  });

  describe('recordWebVitals(collector, vitals)', () => {
    test('increments vitals_received', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordWebVitals(collector, { lcp: 100 });
      expect(collector.vitals_received).toBe(1);
      metrics.recordWebVitals(collector, { lcp: 200 });
      expect(collector.vitals_received).toBe(2);
    });

    test('increments web_vitals.samples', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordWebVitals(collector, { lcp: 100 });
      expect(collector.web_vitals.samples).toBe(1);
      metrics.recordWebVitals(collector, { lcp: 200 });
      expect(collector.web_vitals.samples).toBe(2);
    });

    test('first call sets values directly (running avg with n=1)', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordWebVitals(collector, { lcp: 500, inp: 100, cls: 0.1, fcp: 200, ttfb: 50 });
      expect(collector.web_vitals.lcp).toBe(500);
      expect(collector.web_vitals.inp).toBe(100);
      expect(collector.web_vitals.cls).toBe(0.1);
      expect(collector.web_vitals.fcp).toBe(200);
      expect(collector.web_vitals.ttfb).toBe(50);
    });

    test('second call computes running average correctly', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordWebVitals(collector, { lcp: 1000 });
      metrics.recordWebVitals(collector, { lcp: 2000 });
      // Running average: 1000 + (2000 - 1000) / 2 = 1500
      expect(collector.web_vitals.lcp).toBe(1500);
    });

    test('partial vitals updates only provided fields', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordWebVitals(collector, { lcp: 1000, inp: 200 });
      expect(collector.web_vitals.lcp).toBe(1000);
      expect(collector.web_vitals.inp).toBe(200);
      expect(collector.web_vitals.cls).toBe(0);
      expect(collector.web_vitals.fcp).toBe(0);
      expect(collector.web_vitals.ttfb).toBe(0);
      metrics.recordWebVitals(collector, { lcp: 2000 });
      expect(collector.web_vitals.lcp).toBe(1500); // Running avg
      expect(collector.web_vitals.inp).toBe(200); // Unchanged
    });

    test('all 5 vitals fields work correctly', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordWebVitals(collector, { lcp: 1000, inp: 150, cls: 0.05, fcp: 500, ttfb: 100 });
      metrics.recordWebVitals(collector, { lcp: 2000, inp: 250, cls: 0.15, fcp: 1000, ttfb: 200 });
      // Running averages
      expect(collector.web_vitals.lcp).toBe(1500);
      expect(collector.web_vitals.inp).toBe(200);
      expect(collector.web_vitals.cls).toBe(0.1);
      expect(collector.web_vitals.fcp).toBe(750);
      expect(collector.web_vitals.ttfb).toBe(150);
    });
  });

  describe('generateMetrics(metrics, requestInfo)', () => {
    test('contains all HELP and TYPE lines', () => {
      const collector = metrics.createMetricsCollector();
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('# HELP http_requests_total');
      expect(output).toContain('# TYPE http_requests_total counter');
      expect(output).toContain('# HELP web_vitals_received');
      expect(output).toContain('# TYPE web_vitals_received counter');
      expect(output).toContain('# HELP worker_uptime_seconds');
      expect(output).toContain('# TYPE worker_uptime_seconds gauge');
    });

    test('contains correct counter values from metrics object', () => {
      const collector = metrics.createMetricsCollector();
      collector.requests_total = 10;
      collector.requests_success = 9;
      collector.requests_error = 1;
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('http_requests_total{job="resume"} 10');
      expect(output).toContain('http_requests_success{job="resume"} 9');
      expect(output).toContain('http_requests_error{job="resume"} 1');
    });

    test('computes avgResponseTime correctly', () => {
      const collector = metrics.createMetricsCollector();
      collector.requests_total = 2;
      collector.response_time_sum = 200; // ms
      const output = metrics.generateMetrics(collector);
      // avgResponseTime = 200 / 2 = 100ms = 0.1s
      expect(output).toContain('http_response_time_seconds{job="resume"} 0.1000');
      expect(output).toContain('http_response_time_ms{job="resume"} 100');
    });

    test('computes errorRate and successRate percentages', () => {
      const collector = metrics.createMetricsCollector();
      collector.requests_total = 100;
      collector.requests_success = 95;
      collector.requests_error = 5;
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('http_error_rate_percent{job="resume"} 5.00');
      expect(output).toContain('http_success_rate_percent{job="resume"} 95.00');
    });

    test('includes histogram section from response_time_buckets', () => {
      const collector = metrics.createMetricsCollector();
      metrics.recordRequest(collector, { responseTimeMs: 100, status: 200 });
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('http_request_duration_seconds_bucket');
      expect(output).toContain('http_request_duration_seconds_sum');
      expect(output).toContain('http_request_duration_seconds_count');
    });

    test('includes Web Vitals gauges', () => {
      const collector = metrics.createMetricsCollector();
      collector.web_vitals.lcp = 1500;
      collector.web_vitals.inp = 200;
      collector.web_vitals.cls = 0.1;
      collector.web_vitals.fcp = 800;
      collector.web_vitals.ttfb = 100;
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('web_vitals_lcp_ms{job="resume"} 1500');
      expect(output).toContain('web_vitals_inp_ms{job="resume"} 200');
      expect(output).toContain('web_vitals_cls{job="resume"} 0.1');
      expect(output).toContain('web_vitals_fcp_ms{job="resume"} 800');
      expect(output).toContain('web_vitals_ttfb_ms{job="resume"} 100');
    });

    test('includes Cloudflare metrics (cache ratios, cpu time)', () => {
      const collector = metrics.createMetricsCollector();
      collector.cf_metrics.cache_hit_ratio = 0.9;
      collector.cf_metrics.cache_bypass_ratio = 0.1;
      collector.cf_metrics.cpu_time_ms = 15;
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('cloudflare_cache_hit_ratio{job="resume"} 0.9');
      expect(output).toContain('cloudflare_cache_bypass_ratio{job="resume"} 0.1');
      expect(output).toContain('cloudflare_worker_cpu_time_ms{job="resume"} 15');
    });

    test('includes worker_uptime_seconds (uses fake timers)', () => {
      const collector = metrics.createMetricsCollector();
      jest.setSystemTime(new Date('2025-01-01T00:01:00Z')); // 60 seconds later
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('worker_uptime_seconds{job="resume"} 60');
    });

    test('includes worker_info with version/deployed_at', () => {
      const collector = metrics.createMetricsCollector();
      collector.version = '1.2.3';
      collector.deployed_at = '2025-01-01T00:00:00Z';
      const output = metrics.generateMetrics(collector);
      expect(output).toContain(
        'worker_info{job="resume",version="1.2.3",deployed_at="2025-01-01T00:00:00Z"} 1'
      );
    });

    test('with geo_metrics includes country/colo counter lines', () => {
      const collector = metrics.createMetricsCollector();
      collector.geo_metrics.by_country['KR'] = 5;
      collector.geo_metrics.by_country['US'] = 3;
      collector.geo_metrics.by_colo['ICN1'] = 5;
      collector.geo_metrics.by_colo['LAX1'] = 3;
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('http_requests_by_country{job="resume",country="KR"} 5');
      expect(output).toContain('http_requests_by_country{job="resume",country="US"} 3');
      expect(output).toContain('http_requests_by_colo{job="resume",colo="ICN1"} 5');
      expect(output).toContain('http_requests_by_colo{job="resume",colo="LAX1"} 3');
    });

    test('without geo_metrics includes "No geographic data" comment', () => {
      const collector = metrics.createMetricsCollector();
      collector.geo_metrics = null;
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('No geographic data');
    });

    test('with zero requests avgResponseTime is 0, errorRate is 0, successRate is 100', () => {
      const collector = metrics.createMetricsCollector();
      const output = metrics.generateMetrics(collector);
      expect(output).toContain('http_response_time_seconds{job="resume"} 0.0000');
      expect(output).toContain('http_error_rate_percent{job="resume"} 0');
      expect(output).toContain('http_success_rate_percent{job="resume"} 100');
    });

    test('requestInfo parameter is ignored (prefixed with _)', () => {
      const collector = metrics.createMetricsCollector();
      collector.version = '1.0.0';
      const output = metrics.generateMetrics(collector, { country: 'KR' });
      // Should not crash and should still generate valid metrics
      expect(output).toContain('http_requests_total{job="resume"} 0');
    });
  });
});
