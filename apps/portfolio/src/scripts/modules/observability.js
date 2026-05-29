/**
 * Observability stat cards — fill the #observability section's stat cards with
 * live data instead of the static '--' placeholders.
 *
 * Sources:
 *   GET /health       → uptime_seconds
 *   GET /api/metrics  → http.requests_total, http.error_rate, http.response_time_ms
 *
 * Values are written with textContent (XSS-safe). Failures leave the '--'
 * placeholder in place — the section degrades gracefully offline.
 */

function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatNumber(n) {
  if (!Number.isFinite(n)) return '--';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * Set a stat card value by its label, using textContent.
 * @param {string} label - The stat-label text to match.
 * @param {string} value
 */
function setStat(label, value) {
  const cards = document.querySelectorAll('.observability-stat');
  for (const card of cards) {
    const labelEl = card.querySelector('.stat-label');
    if (labelEl && labelEl.textContent.trim() === label) {
      const valueEl = card.querySelector('.stat-value');
      if (valueEl) valueEl.textContent = value;
      return;
    }
  }
}

export async function initObservabilityStats() {
  const section = document.getElementById('observability');
  if (!section) return;

  const fetchJson = async (url) => {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const [health, metrics] = await Promise.all([
    fetchJson('/health'),
    fetchJson('/api/metrics'),
  ]);

  if (health && Number.isFinite(health.uptime_seconds)) {
    setStat('Uptime', formatUptime(health.uptime_seconds));
  }

  const http = metrics && metrics.http;
  if (http) {
    if (Number.isFinite(http.requests_total)) {
      setStat('Total Requests', formatNumber(http.requests_total));
    }
    if (Number.isFinite(http.response_time_ms)) {
      setStat('Avg Response Time', `${Math.round(http.response_time_ms)}ms`);
    }
    if (typeof http.error_rate === 'string') {
      setStat('Error Rate', http.error_rate);
    } else if (Number.isFinite(http.error_rate)) {
      setStat('Error Rate', `${http.error_rate.toFixed(2)}%`);
    }
  }
}
