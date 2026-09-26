/**
 * @typedef {{
 *   maxRetries: number;
 *   [key: string]: unknown;
 * }} RetryConfig
 */

/**
 * @typedef {RequestInit & {
 *   retry?: Record<string, unknown>;
 * }} RequestOptions
 */

/**
 * @typedef {{
 *   timer: { wait(): Promise<void> };
 *   lastRequestTime: number;
 *   retryConfig: RetryConfig;
 *   cookieJar: {
 *     getCookieHeader(url: string | URL): string;
 *     setCookiesFromHeader(header: string, url: string | URL): void;
 *   };
 *   cookies: string;
 *   proxyRotator: {
 *     getNext(opts: { excludeRecent?: string | null }): string | null;
 *     markSuccess(proxy: string, duration: number): void;
 *     markFailure(proxy: string, err: unknown): void;
 *   };
 *   currentProxy: string | null;
 *   _resolveFingerprint(proxyUrl: string | null): { userAgent?: string } | null;
 *   _resolveDispatcher(proxyUrl: string | null, fingerprint: unknown): Promise<unknown>;
 *   headers: Record<string, string>;
 *   timeout: number;
 *   retryMetrics: {
 *     successAfterRetry: number;
 *     nonRetryableFailures: number;
 *     totalRetries: number;
 *     lastRetryAt: Date | null;
 *     exhaustedRetries: number;
 *   };
 *   emit(event: string, data?: unknown): boolean;
 *   name: string;
 *   captchaDetector: {
 *     detectFromStatusCode(status: number, headers: Headers, url: string | URL): unknown;
 *     shouldPause(): boolean;
 *   };
 *   sleep(ms: number): Promise<void>;
 *   _isRetryable(statusCode: number | null, config: unknown): boolean;
 *   _calculateBackoff(attempt: number, config: unknown): number;
 * }} RequestCrawlerContext
 */

/**
 * @this {RequestCrawlerContext}
 * @param {string | URL} url
 * @param {RequestOptions} [options]
 * @returns {Promise<Response>}
 */
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
  /** @type {Error & { statusCode?: number; retryAfter?: number } | undefined} */
  let lastError;

  for (let attempt = 1; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (!response.ok) {
        const error = /** @type {Error & { statusCode?: number; retryAfter?: number }} */ (
          new Error(`HTTP ${response.status}: ${response.statusText}`)
        );
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
      lastError = /** @type {Error & { statusCode?: number; retryAfter?: number }} */ (error);
      const statusCode = /** @type {Error & { statusCode?: number }} */ (error).statusCode || null;

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
          error: /** @type {Error} */ (error).message,
          crawler: this.name,
        });
        throw error;
      }

      this.retryMetrics.totalRetries++;
      this.retryMetrics.lastRetryAt = new Date();

      const delay =
        /** @type {{ retryAfter?: number }} */ (error).retryAfter ||
        this._calculateBackoff(attempt, retryConfig);
      this.emit('retry', {
        url,
        attempt,
        maxRetries: retryConfig.maxRetries,
        delay,
        statusCode,
        error: /** @type {Error} */ (error).message,
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
    error: /** @type {Error} */ (lastError).message,
    crawler: this.name,
  });

  throw lastError;
}
