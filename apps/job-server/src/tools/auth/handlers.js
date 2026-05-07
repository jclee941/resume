import { handleLogin, handleSetCookies, handleSetToken } from './credential-actions.js';
import { handleLogout, handleStatus } from './session-actions.js';

const AVAILABLE_ACTIONS = ['set_cookies', 'set_token', 'login', 'status', 'logout'];

export async function executeAuthAction(params) {
  const { action, token, cookies, email, password } = params;

  switch (action) {
    case 'set_cookies':
      return handleSetCookies(cookies);

    case 'set_token':
      return handleSetToken(token);

    case 'login':
      return handleLogin(email, password);

    case 'status':
      return handleStatus();

    case 'logout':
      return handleLogout();

    default:
      return {
        success: false,
        error: `Unknown action: ${action}`,
        available_actions: AVAILABLE_ACTIONS,
      };
  }
}

export { AVAILABLE_ACTIONS };
