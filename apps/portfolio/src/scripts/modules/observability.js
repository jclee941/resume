/**
 * Observability stat cards — fill the #observability section's stat cards with
 * LIVE data instead of the static '--' placeholders, and keep them fresh.
 *
 * Sources:
 *   GET /health       → uptime_seconds
 *   GET /api/metrics  → http.requests_total, http.error_rate, http.response_time_ms
 *
 * Behaviour:
 *   - Fetches the FIRST time the section scrolls into view, then auto-refreshes
 *     while it stays in view and the tab is visible (pauses when hidden or
 *     off-screen to avoid needless requests). No fetch happens on initial load.
 *   - Announces refresh state via an aria-live status line for screen readers.
 *   - Values are written with textContent (XSS-safe). Failures leave the last
 *     known value (or the '--' placeholder) in place — degrades gracefully.
 */

const REFRESH_MS = 30_000;

function detectLocale() {
  return (document.documentElement.lang || 'ko').toLowerCase();
}

function t(key) {
  const loc = detectLocale();
  const en = loc.startsWith('en');
  const ja = loc.startsWith('ja');
  const dict = {
    updated: en ? 'Live · updated just now' : ja ? 'ライブ · 今更新' : '실시간 · 방금 갱신',
    offline: en
      ? 'Live metrics unavailable (offline)'
      : ja
        ? 'ライブメトリクスを取得できません（オフライン）'
        : '실시간 지표를 불러올 수 없습니다 (오프라인)',
  };
  return dict[key] || '';
}

function formatUptime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
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

async function fetchJson(url) {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetch both endpoints and update the cards. Returns true on a successful update.
 */
async function refreshStats() {
  const health = await fetchJson('/health');
  if (!health) return false;

  let ok = false;

  if (Number.isFinite(health.uptime_seconds)) {
    setStat('Edge Uptime', formatUptime(health.uptime_seconds));
    ok = true;
  }

  const bindings = health.bindings || {};
  if (bindings.d1 && Number.isFinite(bindings.d1.latency_ms)) {
    setStat('D1 Latency', `${Math.round(bindings.d1.latency_ms)}ms`);
    ok = true;
  }
  if (bindings.kv && Number.isFinite(bindings.kv.latency_ms)) {
    setStat('KV Latency', `${Math.round(bindings.kv.latency_ms)}ms`);
    ok = true;
  }

  const bindingValues = Object.values(bindings);
  if (bindingValues.length > 0) {
    const healthyCount = bindingValues.filter((b) => b && b.healthy).length;
    setStat('Bindings Health', `${healthyCount}/${bindingValues.length}`);
    ok = true;
  }

  return ok;
}

export async function initObservabilityStats() {
  const section = document.getElementById('observability');
  if (!section) return;

  const statusEl = section.querySelector('[data-observability-status]');
  const statusTextEl = section.querySelector('[data-observability-status-text]');

  const setStatus = (key, live) => {
    if (!statusEl || !statusTextEl) return;
    statusEl.hidden = false;
    statusEl.classList.toggle('observability-status--live', !!live);
    statusEl.classList.toggle('observability-status--offline', !live);
    statusTextEl.textContent = t(key);
  };

  let timer = null;
  let inView = false;

  const tick = async () => {
    const ok = await refreshStats();
    setStatus(ok ? 'updated' : 'offline', ok);
  };

  const start = () => {
    if (timer) return;
    tick();
    timer = window.setInterval(() => {
      // Skip polling when the tab is hidden to save requests/battery.
      if (document.visibilityState === 'visible' && inView) tick();
    }, REFRESH_MS);
  };

  const stop = () => {
    if (timer) {
      window.clearInterval(timer);
      timer = null;
    }
  };

  // Only poll while the observability section is on screen AND the tab is
  // visible. The first fetch happens when the section first enters view (via
  // start()) — we deliberately do NOT fetch on init, to avoid off-screen
  // network requests for a below-the-fold widget.
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          inView = entry.isIntersecting;
          if (inView) start();
          else stop();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(section);
  } else {
    // No IntersectionObserver: treat as in view and start once.
    inView = true;
    start();
  }

  document.addEventListener('visibilitychange', () => {
    // Refresh on tab re-focus only if the section is currently in view.
    if (document.visibilityState === 'visible' && inView) tick();
  });
}
