// Simple A/B testing functions
function assignVariant(config) {
  const { id, splitRatio = 0.5, persistent = true } = config;

  // Check if already assigned
  if (persistent && typeof localStorage !== 'undefined') {
    const stored = localStorage.getItem(`ab_test_${  id}`);
    if (stored) {
      try {
        const test = JSON.parse(stored);
        return test.variant;
      } catch (e) {
        console.warn('Failed to parse stored A/B test:', e);
      }
    }
  }

  // Assign new variant
  const variant = Math.random() < splitRatio ? 'A' : 'B';

  // Store assignment
  if (persistent && typeof localStorage !== 'undefined') {
    try {
      const test = { id, variant, timestamp: Date.now() };
      localStorage.setItem(`ab_test_${  id}`, JSON.stringify(test));
    } catch (e) {
      console.warn('Failed to store A/B test:', e);
    }
  }

  return variant;
}

function getVariant(testId) {
  if (typeof localStorage === 'undefined') {
    return null;
  }

  const stored = localStorage.getItem(`ab_test_${  testId}`);
  if (stored) {
    try {
      const test = JSON.parse(stored);
      return test.variant;
    } catch (e) {
      console.warn('Failed to parse stored A/B test:', e);
    }
  }

  return null;
}

function trackConversion(testId, eventName, metadata = {}) {
  const variant = getVariant(testId);

  if (!variant) {
    console.warn(`No variant assigned for test: ${  testId}`);
    return;
  }

  const event = {
    testId,
    variant,
    eventName,
    timestamp: Date.now(),
    ...metadata,
  };

  // Store in localStorage for analysis
  if (typeof localStorage !== 'undefined') {
    try {
      const key = 'ab_analytics';
      const stored = localStorage.getItem(key);
      const analytics = stored ? JSON.parse(stored) : [];
      analytics.push(event);

      // Keep only last 100 events
      if (analytics.length > 100) {
        analytics.shift();
      }

      localStorage.setItem(key, JSON.stringify(analytics));
    } catch (e) {
      console.warn('Failed to store analytics:', e);
    }
  }

  // Send to backend analytics endpoint
  fetch('/api/analytics', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event),
  }).catch(() => {
    // Silently fail - don't block user experience
  });
}

export function initializeABTesting() {
  // Resume variant test: general vs technical
  const resumeVariant = assignVariant({
    id: 'resume_variant_v1',
    name: 'Resume Variant Test',
    splitRatio: 0.5, // 50/50 split
    persistent: true,
  });

  // Update PDF download link based on variant
  const pdfDownloadLink = document.getElementById('resume-pdf-download');
  const pdfDownloadText = document.getElementById('pdf-download-text');

  if (pdfDownloadLink) {
    const DOWNLOADS_BASE = 'https://raw.githubusercontent.com/jclee-homelab/resume/master';
    if (resumeVariant === 'A') {
      pdfDownloadLink.href = `${DOWNLOADS_BASE}/typescript/data/resumes/generated/resume_general.pdf`;
      if (pdfDownloadText) pdfDownloadText.textContent = '이력서 다운로드 (PDF)';
    } else {
      pdfDownloadLink.href = `${DOWNLOADS_BASE}/typescript/data/resumes/generated/resume_technical.pdf`;
      if (pdfDownloadText) pdfDownloadText.textContent = '이력서 다운로드 (PDF)';
    }

    // Track download clicks
    pdfDownloadLink.addEventListener('click', () => {
      trackConversion('resume_variant_v1', 'pdf_download', {
        variant: resumeVariant,
        timestamp: Date.now(),
      });
    });
  }
}
