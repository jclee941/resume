import { SessionManager } from '../shared/services/session/index.js';
import WantedAPI from '../shared/clients/wanted/index.js';

export const authTool = {
  name: 'platform_auth',
  description:
    'Manage authentication for various job platforms (Wanted, Saramin, JobKorea, Remember, LinkedIn).',
  inputSchema: {
    type: 'object',
    properties: {
      platform: {
        type: 'string',
        enum: ['wanted', 'saramin', 'jobkorea', 'remember', 'linkedin'],
        description: 'Target platform',
      },
      action: {
        type: 'string',
        enum: ['set_cookies', 'status', 'logout'],
        description: 'Authentication action',
      },
      cookies: {
        type: 'string',
        description: 'Cookie header string from browser',
      },
      email: {
        type: 'string',
        description: 'Associated email address',
      },
    },
    required: ['platform', 'action'],
  },

  async execute(params) {
    const { platform, action, cookies, email } = params;

    switch (action) {
      case 'set_cookies': {
        if (!cookies) {
          return { success: false, error: 'Cookies string is required' };
        }

        let validatedEmail = email || 'user@example.com';

        if (platform === 'wanted') {
          const api = new WantedAPI({ cookies });
          try {
            const profile = await api.getProfile();
            if (profile && (profile.email || profile.name)) {
              validatedEmail = profile.email || profile.name;
            }
          } catch (e) {
            console.warn(
              'Wanted profile validation failed, but saving cookies anyway:',
              e.message,
            );
          }
        }

        SessionManager.save(platform, { cookies, email: validatedEmail });

        return {
          success: true,
          message: `Cookies saved for ${platform}`,
          platform,
          user: { email: validatedEmail },
        };
      }

      case 'status': {
        const session = SessionManager.load(platform);
        if (session) {
          return {
            success: true,
            platform,
            authenticated: true,
            email: session.email,
            lastUpdated: new Date(session.timestamp).toISOString(),
          };
        }
        return {
          success: true,
          platform,
          authenticated: false,
          message: 'Not logged in',
        };
      }

      case 'logout': {
        SessionManager.clear(platform);
        return {
          success: true,
          message: `Logged out from ${platform}`,
        };
      }

      default:
        return { success: false, error: `Unknown action: ${action}` };
    }
  },
};

export default authTool;
