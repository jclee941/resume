export const WANTED_HOME_URL = 'https://www.wanted.co.kr/';
export const WANTED_LOGIN_URL = 'https://www.wanted.co.kr/login';
export const WANTED_PROFILE_API_URL = 'https://www.wanted.co.kr/sns-api/profile';
export const DEFAULT_PROFILE_DIR = '/tmp/cloak-wanted-profile';
export const DEFAULT_BACKOFF_MS = 1000;
export const AUTH_COOKIE_PATTERNS = [/wanted.*token/i, /^oneid/i, /wmw/i, /session/i];

export const WANTED_LOGIN_ERRORS = Object.freeze({
  CAPTCHA_DETECTED: 'ERR_WANTED_CAPTCHA_DETECTED',
  LOGIN_FAILED: 'ERR_WANTED_LOGIN_FAILED',
  WAF_BLOCKED: 'ERR_WANTED_WAF_BLOCKED',
  TIMEOUT: 'ERR_WANTED_TIMEOUT',
});

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createSessionError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}

export function isTimeoutError(error) {
  return /timeout|timed out|navigation/i.test(error?.message || '');
}

export function isWafBlocked(state, error) {
  return Boolean(
    state?.waf ||
    /cloudfront|attention required|challenge|access denied|forbidden/i.test(error?.message || '')
  );
}

export function isCaptchaDetected(state, error) {
  return Boolean(state?.captcha || /captcha|recaptcha|hcaptcha/i.test(error?.message || ''));
}

export function isAuthCookie(cookie) {
  return AUTH_COOKIE_PATTERNS.some((pattern) => pattern.test(cookie?.name || ''));
}

export function cookiesToHeader(cookies) {
  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join('; ');
}

export function maskEmail(email) {
  if (typeof email !== 'string' || !email.includes('@')) return null;
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

export function buildSessionStateExpression() {
  return `(() => {
    const text = document.body?.innerText || '';
    const hasProfile = Boolean(
      document.querySelector('[data-qa="gnb-avatar"]') ||
      document.querySelector('[data-testid="gnb-avatar"]') ||
      document.querySelector('img[alt*="프로필"]') ||
      document.querySelector('button[aria-label*="프로필"]') ||
      document.querySelector('a[href*="/profile"]') ||
      document.querySelector('a[href*="/mypage"]')
    );
    const hasCaptcha = Boolean(
      document.querySelector('iframe[src*="recaptcha"]') ||
      document.querySelector('.g-recaptcha') ||
      document.querySelector('[data-sitekey]') ||
      /captcha|robot|보안문자|자동입력 방지/i.test(text)
    );
    const hasWaf = Boolean(/cloudfront|attention required|access denied|request blocked|forbidden/i.test(text));
    const hasLoginForm = Boolean(
      document.querySelector('input[type="email"]') ||
      document.querySelector('input[name="email"]') ||
      document.querySelector('input[type="password"]')
    );
    return {
      url: location.href,
      loggedIn: hasProfile && !hasLoginForm,
      captcha: hasCaptcha,
      waf: hasWaf,
      loginForm: hasLoginForm
    };
  })();`;
}

export function buildCredentialFillExpression(email, password) {
  const payload = JSON.stringify({ email, password });
  return `(() => {
    const payload = ${payload};
    const emailInput = document.querySelector('input[type="email"], input[name="email"], input[autocomplete="username"]');
    const passwordInput = document.querySelector('input[type="password"], input[name="password"], input[autocomplete="current-password"]');
    if (!emailInput || !passwordInput) {
      throw new Error('Wanted login form not found');
    }
    const assignValue = (input, value) => {
      input.focus();
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Tab' }));
      input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Tab' }));
    };
    assignValue(emailInput, payload.email);
    assignValue(passwordInput, payload.password);
    const submitButton = document.querySelector('button[type="submit"], button[data-testid*="login"], button[class*="login"]');
    if (!submitButton) {
      throw new Error('Wanted login submit button not found');
    }
    submitButton.click();
    return {
      emailFilled: emailInput.value === payload.email,
      passwordFilled: passwordInput.value === payload.password,
      submitted: true
    };
  })();`;
}

export async function readJsonSafely(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}
