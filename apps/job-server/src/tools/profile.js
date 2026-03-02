import { SessionManager } from '../shared/services/session/index.js';

const normalizeQuery = (query) => {
  if (typeof query !== 'string') return null;
  const trimmed = query.trim();
  return trimmed ? trimmed.toLowerCase() : null;
};

const filterByQuery = (items, query) => {
  const normalized = normalizeQuery(query);
  if (!normalized) return items;

  return items.filter((item) => {
    const company = item.company ? String(item.company).toLowerCase() : '';
    const position = item.position ? String(item.position).toLowerCase() : '';
    return company.includes(normalized) || position.includes(normalized);
  });
};

export const profileTool = {
  name: 'wanted_profile',
  description: `Get user profile information from Wanted Korea (requires login).
Returns:
- Profile overview
- Applied jobs list
- Bookmarked jobs list

Use wanted_auth with action="set_cookies" (recommended) or action="set_token" first if not logged in.`,

  inputSchema: {
    type: 'object',
    properties: {
      view: {
        type: 'string',
        enum: ['overview', 'applications', 'bookmarks'],
        description:
          'What to view: overview (profile), applications (applied jobs), bookmarks (saved jobs)',
        default: 'overview',
      },
      limit: {
        type: 'number',
        description: 'Number of items to return (for applications/bookmarks)',
        default: 20,
      },
      offset: {
        type: 'number',
        description: 'Offset for pagination (for applications/bookmarks)',
        default: 0,
      },
      query: {
        type: 'string',
        description:
          'Filter results by company or position substring (optional)',
      },
      include_raw: {
        type: 'boolean',
        description: 'Include raw API response (overview only)',
        default: false,
      },
    },
  },

  async execute(params) {
    const api = await SessionManager.getAPI();

    if (!api) {
      return {
        success: false,
        error:
          'Not logged in. Use wanted_auth with action="set_cookies" or action="set_token" first.',
        hint: 'wanted_auth({ action: "set_cookies", cookies: "cookie_string_here" })',
      };
    }

    const view = params.view || 'overview';
    const limit = Number.isFinite(params.limit)
      ? Math.max(1, params.limit)
      : 20;
    const offset = Number.isFinite(params.offset)
      ? Math.max(0, params.offset)
      : 0;
    const query = params.query || null;
    const includeRaw = Boolean(params.include_raw);

    try {
      switch (view) {
        case 'overview': {
          const profile = await api.getProfile();

          const result = {
            success: true,
            profile: {
              id: profile.id ?? null,
              name: profile.name ?? null,
              email: profile.email ?? null,
              phone: profile.phone ?? null,
              avatar: profile.avatar ?? null,
              annual: profile.annual ?? null,
              status: profile.status ?? null,
              jobCategory: profile.jobCategory ?? null,
              roleCategories: profile.roleCategories ?? null,
              headline: profile.headline ?? null,
              introduction: profile.introduction ?? null,
              experiences: profile.experiences ?? [],
              educations: profile.educations ?? [],
              skills: profile.skills ?? [],
              activities: profile.activities ?? null,
              languageCerts: profile.languageCerts ?? null,
            },
          };

          if (includeRaw) {
            result.raw = profile._raw ?? null;
          }

          return result;
        }

        case 'applications': {
          const result = await api.getApplications({ limit, offset });
          const applications = Array.isArray(result?.data) ? result.data : [];

          const mapped = applications.map((app) => ({
            id: app?.id ?? null,
            job_id: app?.job?.id ?? null,
            position: app?.job?.position ?? null,
            company: app?.job?.company?.name ?? null,
            status: app?.status ?? null,
            applied_at: app?.created_at ?? null,
            url: app?.job?.id
              ? `https://www.wanted.co.kr/wd/${app.job.id}`
              : null,
          }));

          const filtered = filterByQuery(mapped, query);

          return {
            success: true,
            limit,
            offset,
            returned: filtered.length,
            applications: filtered,
          };
        }

        case 'bookmarks': {
          const result = await api.getBookmarks({ limit, offset });
          const bookmarks = Array.isArray(result?.data) ? result.data : [];

          const mapped = bookmarks.map((bm) => ({
            id: bm?.id ?? null,
            job_id: bm?.job?.id ?? null,
            position: bm?.job?.position ?? null,
            company: bm?.job?.company?.name ?? null,
            bookmarked_at: bm?.created_at ?? null,
            url: bm?.job?.id
              ? `https://www.wanted.co.kr/wd/${bm.job.id}`
              : null,
          }));

          const filtered = filterByQuery(mapped, query);

          return {
            success: true,
            limit,
            offset,
            returned: filtered.length,
            bookmarks: filtered,
          };
        }

        default:
          return {
            success: false,
            error: `Unknown view: ${view}`,
          };
      }
    } catch (error) {
      const message = error?.message ? String(error.message) : 'Unknown error';

      if (
        message.includes('401') ||
        message.includes('403') ||
        message.includes('Unauthorized')
      ) {
        return {
          success: false,
          error: 'Session expired. Please authenticate again.',
          hint: 'wanted_auth({ action: "set_cookies", cookies: "cookie_string_here" })',
        };
      }

      return {
        success: false,
        error: message,
      };
    }
  },
};

export default profileTool;
