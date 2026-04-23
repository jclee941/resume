export { readJson, buildCookieString, hasFreshSession, ensureSessionDir, savePlatformSession, defaultSessionFile } from './cookie-utils.js';
export { verifyAuthenticatedSession } from './session-validator.js';
export { getActivePage, evaluateWithFallback, isTransientPageError, sleep, withTimeout } from './page-utils.js';
export { detectCaptcha, handleCaptchaIfNeeded, waitForLoginConfirmation } from './captcha-handler.js';
export { isLoggedIn, getDiagnostics } from './auth-checker.js';
export { resolveInput, fillLoginForm, clickVisibleSubmit } from './form-filler.js';
export { maybeUseExistingSession } from './session-resolver.js';
