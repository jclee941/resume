export async function rateLimitedFetch(url, options = {}) {
  await this.timer.wait();
  this.lastRequestTime = Date.now();

  const { retry: retryOverride, ...restOptions } = options;
  const retryConfig = { ...this.retryConfig, ...retryOverride };

  const jarCookies = this.cookieJar.getCookieHeader(url);
  const combinedCookies = [this.cookies, jarCookies].filter(Boolean).join('; ');

  const proxyUrl = this.proxyRotator.getNext({ excludeRecent: this.currentProxy });
  const fingerprint = this._resolveFingerprint(proxyUrl);
  const dispatcher = await this._resolveDispatcher(proxyUrl, fingerprint);
  const fetchOptions = {
    method: restOptions.method || 'GET',
    headers: {
      ...this.headers,
      ...(fingerprint?.userAgent ? { 'User-Agent': fingerprint.userAgent } : {}),
      ...restOptions.headers,
      ...(combinedCookies ? { Cookie: combinedCookies } : {}),
    },
    signal: AbortSignal.timeout(this.timeout),
    ...restOptions,
    ...(dispatcher ? { dispatcher } : {}),
  };

  const requestStart = Date.now();
  let lastError;

  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.statusCode = response.status;

        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const parsed = Number(retryAfter);
            if (!Number.isNaN(parsed)) {
              error.retryAfter = parsed * 1000;
            }
          }
        }

        throw error;
      }

      if (attempt > 1) {
        this.retryMetrics.successAfterRetry++;
        this.emit('retry:success', {
          url,
          attempt,
          maxRetries: retryConfig.maxRetries,
          crawler: this.name,
        });
      }

      const setCookieHeader = response.headers.get('Set-Cookie');
      if (setCookieHeader) {
        this.cookieJar.setCookiesFromHeader(setCookieHeader, url);
      }

      if (proxyUrl) {
        this.proxyRotator.markSuccess(proxyUrl, Date.now() - requestStart);
      }

      const captchaResult = this.captchaDetector.detectFromStatusCode(
        response.status,
        response.headers,
        url
      );
      if (captchaResult) {
        this.emit('captcha:detected', captchaResult);
        if (this.captchaDetector.shouldPause()) {
          this.emit('captcha:paused', { url, crawler: this.name });
          await this.sleep(30000);
        }
      }

      return response;
    } catch (error) {
      lastError = error;
      const statusCode = error.statusCode || null;

      if (proxyUrl) {
        this.proxyRotator.markFailure(proxyUrl, error);
      }

      if (!this._isRetryable(statusCode, retryConfig)) {
        this.retryMetrics.nonRetryableFailures++;
        this.emit('retry:non-retryable', {
          url,
          attempt,
          maxRetries: retryConfig.maxRetries,
          statusCode,
          error: error.message,
          crawler: this.name,
        });
        throw error;
      }

      this.retryMetrics.totalRetries++;
      this.retryMetrics.lastRetryAt = new Date();

      const delay = error.retryAfter || this._calculateBackoff(attempt, retryConfig);
      this.emit('retry', {
        url,
        attempt,
        maxRetries: retryConfig.maxRetries,
        delay,
        statusCode,
        error: error.message,
        crawler: this.name,
      });

      if (attempt < retryConfig.maxRetries) {
        await this.sleep(delay);
      }
    }
  }

  this.retryMetrics.exhaustedRetries++;
  this.emit('retry:exhausted', {
    url,
    maxRetries: retryConfig.maxRetries,
    error: lastError.message,
    crawler: this.name,
  });

  throw lastError;
}
