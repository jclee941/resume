const webVitals = {};

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

// First Input Delay (FID)
const observeFID = () => {
  try {
    const po = new PerformanceObserver((entryList) => {
      const firstInput = entryList.getEntries()[0];
      webVitals.fid = Math.round(firstInput.processingStart - firstInput.startTime);
    });
    po.observe({ type: 'first-input', buffered: true });
  } catch {
    // FID not supported
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
  if (Object.keys(webVitals).length === 0) return;

  const vitalsData = {
    ...webVitals,
    url: window.location.pathname,
    timestamp: Date.now(),
    userAgent: navigator.userAgent.substring(0, 100), // Truncate for privacy
  };

  // Beacon API (preferred, non-blocking)
  if (navigator.sendBeacon) {
    const blob = new Blob([JSON.stringify(vitalsData)], {
      type: 'application/json',
    });
    navigator.sendBeacon('/api/vitals', blob);
  } else {
    // Fallback to fetch
    fetch('/api/vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(vitalsData),
      keepalive: true,
    }).catch(() => {
      // Silently fail - don't block user experience
    });
  }
};

export function initWebVitals() {
  observeLCP();
  observeFID();
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
