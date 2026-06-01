/**
 * Observability stat cards — fill the #observability section's stat cards with
 * LIVE data instead of the static '--' placeholders, and keep them fresh.
 *
 * Source:
 *   GET /api/status → sanitized status (Operational/Degraded), D1/KV binding
 *   health booleans, build version + short git sha. The raw /health endpoint
 *   (uptime, latency, request counters) is deliberately NOT consumed here so no
 *   operational telemetry leaks to anonymous visitors.
 *
 * Behaviour:
 *   - Fetches the FIRST time the section scrolls into view, then auto-refreshes
 *     while it stays in view and the tab is visible (pauses when hidden or
 *     off-screen to avoid needless requests). No fetch happens on initial load.
 *   - Announces refresh state via an aria-live status line for screen readers.
 *   - Values are written with textContent (XSS-safe). On fetch failure the cards
 *     are set to 'Unavailable' via mapHealthToDisplay(null) — degrades gracefully.
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

/**
 * Map a /health response to a SANITIZED, recruiter-facing display set.
 * Pure (no DOM, no network). Deliberately omits raw uptime/latency/request
 * counts: those are noisy, leak operational patterns, and backfire if a number
 * looks bad. We surface coarse status + build metadata instead.
 * @param {object|null} health - parsed /health JSON, or null on fetch failure.
 * @param {Date} [now] - clock for the 'last checked' stamp (injectable for tests).
 * @returns {{edgeStatus:string,d1:string,kv:string,build:string,lastChecked:string}}
 */
export function mapHealthToDisplay(health, now = new Date()) {
  if (!health || typeof health !== 'object') {
    return {
      edgeStatus: 'Unavailable',
      d1: 'Unavailable',
      kv: 'Unavailable',
      build: 'Unavailable',
      lastChecked: '',
    };
  }
  const bindingState = (b) => {
    if (!b || typeof b !== 'object' || typeof b.healthy !== 'boolean') return 'Unavailable';
    return b.healthy ? 'Healthy' : 'Degraded';
  };
  const bindings = health.bindings || {};
  const edgeStatus =
    health.status === 'healthy'
      ? 'Operational'
      : health.status === 'degraded'
        ? 'Degraded'
        : 'Unavailable';
  const sha = typeof health.git_sha === 'string' ? health.git_sha.slice(0, 7) : '';
  const version = typeof health.version === 'string' ? health.version : '';
  const build = version ? (sha ? `${version} · ${sha}` : version) : sha || 'Unavailable';
  return {
    edgeStatus,
    d1: bindingState(bindings.d1),
    kv: bindingState(bindings.kv),
    build,
    lastChecked: now.toLocaleTimeString(),
  };
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
 * Fetch the sanitized public /api/status and update the cards. On failure the
 * cards are set to 'Unavailable' (no stale values left behind).
 * Returns true on a successful update.
 */
async function refreshStats() {
  const status = await fetchJson('/api/status');
  const view = mapHealthToDisplay(status);
  setStat('Edge Status', view.edgeStatus);
  setStat('D1', view.d1);
  setStat('KV', view.kv);
  setStat('Build', view.build);
  return view.edgeStatus !== 'Unavailable';
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
