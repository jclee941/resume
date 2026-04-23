export async function getActivePage(page) {
  const pages = await page.browser().pages();
  const openPage = pages.reverse().find((candidate) => !candidate.isClosed());
  if (openPage) {
    return openPage;
  }

  if (!page.isClosed()) {
    return page;
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
  return /Target closed|Execution context was destroyed|Cannot find context|detached Frame/i.test(
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
  }
}
