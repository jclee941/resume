#!/usr/bin/env node
/**
 * Prometheus metrics exporter for Wanted login automation
 * Exposes metrics at /metrics endpoint for scraping
 */

import http from 'http';
import fs from 'fs';
import path from 'path';

const PORT = process.env.METRICS_PORT || 9101;
const METRICS_FILE = path.join(
  process.env.HOME,
  '.claude/data/wanted-login-metrics.json',
);
const SESSION_FILE = path.join(
  process.env.HOME,
  '.claude/data/wanted-session.json',
);

function loadMetrics() {
  try {
    if (fs.existsSync(METRICS_FILE)) {
      return JSON.parse(fs.readFileSync(METRICS_FILE, 'utf8'));
    }
  } catch {
    /* ignore */
  }
  return {
    attempts: 0,
    successes: 0,
    failures: 0,
    captchaDetected: 0,
    twoFactorDetected: 0,
  };
}

function getSessionAge() {
  try {
    if (fs.existsSync(SESSION_FILE)) {
      const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
      const ageHours = (Date.now() - session.timestamp) / (1000 * 60 * 60);
      return {
        ageHours: ageHours.toFixed(2),
        valid: ageHours < 24,
        email: session.email || 'unknown',
      };
    }
  } catch {
    /* ignore */
  }
  return { ageHours: -1, valid: false, email: 'none' };
}

function generateMetrics() {
  const metrics = loadMetrics();
  const session = getSessionAge();
  const successRate =
    metrics.attempts > 0
      ? ((metrics.successes / metrics.attempts) * 100).toFixed(2)
      : 0;

  return `# HELP wanted_login_attempts_total Total login attempts
# TYPE wanted_login_attempts_total counter
wanted_login_attempts_total ${metrics.attempts}

# HELP wanted_login_successes_total Total successful logins
# TYPE wanted_login_successes_total counter
wanted_login_successes_total ${metrics.successes}

# HELP wanted_login_failures_total Total failed logins
# TYPE wanted_login_failures_total counter
wanted_login_failures_total ${metrics.failures}

# HELP wanted_login_success_rate Login success rate percentage
# TYPE wanted_login_success_rate gauge
wanted_login_success_rate ${successRate}

# HELP wanted_captcha_detected_total Total CAPTCHA detections
# TYPE wanted_captcha_detected_total counter
wanted_captcha_detected_total ${metrics.captchaDetected}

# HELP wanted_2fa_detected_total Total 2FA detections
# TYPE wanted_2fa_detected_total counter
wanted_2fa_detected_total ${metrics.twoFactorDetected}

# HELP wanted_session_age_hours Current session age in hours
# TYPE wanted_session_age_hours gauge
wanted_session_age_hours ${session.ageHours}

# HELP wanted_session_valid Is the current session valid (1=yes, 0=no)
# TYPE wanted_session_valid gauge
wanted_session_valid ${session.valid ? 1 : 0}

# HELP wanted_session_info Session information
# TYPE wanted_session_info gauge
wanted_session_info{email="${session.email}"} 1
`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/metrics') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(generateMetrics());
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'wanted-metrics' }));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log(`Wanted metrics exporter running on port ${PORT}`);
  console.log(`  Metrics: http://localhost:${PORT}/metrics`);
  console.log(`  Health:  http://localhost:${PORT}/health`);
});
