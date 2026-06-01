const webVitals = {};
let vitalsSent = false;

// Largest Contentful Paint (LCP)
const observeLCP = () => {
  try {
    const po = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries();
      const lastEntry = entries[entries.length - 1];
      webVitals.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);
    });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // LCP not supported
  }
};

// Interaction to Next Paint (INP) — replaces the deprecated FID Core Web Vital.
// Tracks the longest interaction latency seen on the page (event-timing).
const observeINP = () => {
  try {
    let worstInp = 0;
    const po = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.duration > worstInp) {
          worstInp = entry.duration;
          webVitals.inp = Math.round(worstInp);
        }
      }
    });
    po.observe({ type: 'event', durationThreshold: 40, buffered: true });
  } catch {
    // INP / event-timing not supported
  }
};

// Cumulative Layout Shift (CLS)
const observeCLS = () => {
  try {
    const po = new PerformanceObserver((entryList) => {
      let clsValue = 0;
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      webVitals.cls = Math.round(clsValue * 1000) / 1000;
    });
    po.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // CLS not supported
  }
};

// First Contentful Paint (FCP)
const observeFCP = () => {
  try {
    const po = new PerformanceObserver((entryList) => {
      const fcpEntry = entryList
        .getEntries()
        .find((entry) => entry.name === 'first-contentful-paint');
      if (fcpEntry) {
        webVitals.fcp = Math.round(fcpEntry.startTime);
      }
    });
    po.observe({ type: 'paint', buffered: true });
  } catch {
    // FCP not supported
  }
};

// Time to First Byte (TTFB)
const observeTTFB = () => {
  try {
    const navEntry = performance.getEntriesByType('navigation')[0];
    if (navEntry) {
      webVitals.ttfb = Math.round(navEntry.responseStart - navEntry.requestStart);
    }
  } catch {
    // TTFB not supported
  }
};

const sendVitals = () => {
  if (vitalsSent) return;
  if (Object.keys(webVitals).length === 0) return;
  vitalsSent = true;
  const isLocalTestHost = /^(127\.0\.0\.1|localhost)$/.test(window.location.hostname);

  const vitalsData = {
    ...webVitals,
    url: window.location.pathname,
    timestamp: Date.now(),
    userAgent: navigator.userAgent.substring(0, 100), // Truncate for privacy
  };

  // P3-6 fix: sendBeacon can silently drop on Safari/Firefox over quota.
  // Try beacon first; if it returns false, fall back to fetch with keepalive.
  const payload = JSON.stringify(vitalsData);
  let beaconOk = false;
  if (navigator.sendBeacon && !isLocalTestHost) {
    const blob = new Blob([payload], { type: 'application/json' });
    try {
      beaconOk = navigator.sendBeacon('/api/vitals', blob);
    } catch {
      beaconOk = false;
    }
  }
  if (!beaconOk) {
    fetch('/api/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {
      // Final fallback: silently drop. /api/vitals is fire-and-forget telemetry.
    });
  }
};

export function initWebVitals() {
  observeLCP();
  observeINP();
  observeCLS();
  observeFCP();
  observeTTFB();

  // Send vitals on page hide (user leaves page)
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      sendVitals();
    }
  });

  // Send vitals on page unload (fallback)
  window.addEventListener('pagehide', sendVitals);

  // Send vitals after 10 seconds (to capture late metrics)
  setTimeout(sendVitals, 10000);
}
