export const TELEGRAM_MAX_LENGTH = 4096;
export const TELEGRAM_TIMEOUT_MS = 10000;
export const N8N_TIMEOUT_MS = 10000;
export const RETRY_DELAYS_MS = [1000, 2000, 4000];
export const RATE_LIMIT_MAX_PER_MINUTE = 20;
export const RATE_LIMIT_WINDOW_MS = 60 * 1000;

export const TELEGRAM_ALLOWED_HTML_TAGS =
  /<(b|strong|i|em|u|ins|s|strike|del|code|pre|a|tg-spoiler|blockquote)[\s>]/i;
