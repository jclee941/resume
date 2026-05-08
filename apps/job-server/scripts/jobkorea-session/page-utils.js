export async function getActivePage(page, { retries = 3, delayMs = 1500 } = {}) {
  let lastError;
  for (let i = 0; i < retries; i++) {
    try {
      if (page.browser && typeof page.browser === 'function') {
        const pages = await page.browser().pages();
        const openPage = pages.reverse().find((candidate) => {
          try {
            return !candidate.isClosed();
          } catch {
            return false;
          }
        });
        if (openPage) {
          return openPage;
        }
      }
    } catch (e) {
      lastError = e;
    }

    try {
      if (!page.isClosed()) {
        return page;
      }
    } catch {
      // Page target may be destroyed; treat as closed.
    }

    if (i < retries - 1) {
      await sleep(delayMs);
    }
  }

  throw new Error('Browser page closed before login could be confirmed');
}

export async function evaluateWithFallback(page, callback) {
  try {
    return await callback(page);
  } catch (error) {
    if (!isTransientPageError(error)) {
      throw error;
    }

    await sleep(1500);
    const fallbackPage = await getActivePage(page);
    return callback(fallbackPage);
  }
}

export function isTransientPageError(error) {
  return /Target closed|Execution context was destroyed|Cannot find context|detached Frame|timed out|Browser page closed before login could be confirmed/i.test(
    error?.message || ''
  );
}

export async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withTimeout(promise, timeoutMs, fallbackValue) {
  let timeoutId;
  const timeoutPromise = new Promise((resolve) => {
    timeoutId = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
    // Swallow late rejections from the original promise so they don't become
    // unhandled rejections after the race has already settled.
    promise.catch(() => {});
  }
}
