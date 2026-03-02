import { SessionManager } from '../session/index.js';

export const UNIFIED_PROFILE_SCHEMA = {
  basic: {
    name: null,
    email: null,
    phone: null,
    avatar: null,
    headline: null,
    summary: null,
    currentStatus: null,
  },

  careers: [],

  education: [],

  skills: [],

  meta: {
    lastUpdated: 'ISO_DATE',
    sources: ['wanted', 'linkedin'],
    syncStatus: {
      wanted: { status: 'synced', lastSync: 'ISO_DATE' },
      saramin: { status: 'auth_required', lastSync: null },
    },
  },
};

export class ProfileAggregator {
  constructor(crawlers) {
    this.crawlers = crawlers;
  }

  async fetchUnifiedProfile() {
    const unified = JSON.parse(JSON.stringify(UNIFIED_PROFILE_SCHEMA));
    const platforms = ['wanted', 'saramin', 'jobkorea', 'linkedin'];

    await Promise.all(
      platforms.map(async (platform) => {
        try {
          const crawler = this.crawlers[platform];
          if (!crawler) return;

          const session = SessionManager.load(platform);
          if (!session) {
            unified.meta.syncStatus[platform] = {
              status: 'auth_required',
              lastSync: null,
            };
            return;
          }

          if (typeof crawler.getProfile === 'function') {
            const profileData = await crawler.getProfile();
            if (profileData.success) {
              this.mergeProfile(unified, profileData.profile, platform);
              unified.meta.syncStatus[platform] = {
                status: 'synced',
                lastSync: new Date().toISOString(),
              };
              if (!unified.meta.sources.includes(platform))
                unified.meta.sources.push(platform);
            } else {
              unified.meta.syncStatus[platform] = {
                status: 'error',
                error: profileData.error,
              };
            }
          } else {
            unified.meta.syncStatus[platform] = {
              status: 'not_implemented',
              lastSync: null,
            };
          }
        } catch (e) {
          unified.meta.syncStatus[platform] = {
            status: 'error',
            error: e.message,
          };
        }
      }),
    );

    unified.meta.lastUpdated = new Date().toISOString();
    return unified;
  }

  mergeProfile(unified, sourceProfile, platform) {
    if (
      platform === 'wanted' ||
      (platform === 'linkedin' && !unified.basic.name)
    ) {
      unified.basic.name = sourceProfile.name || unified.basic.name;
      unified.basic.email = sourceProfile.email || unified.basic.email;
      unified.basic.headline = sourceProfile.headline || unified.basic.headline;
      unified.basic.avatar = sourceProfile.avatar || unified.basic.avatar;
    }

    if (sourceProfile.careers) {
      sourceProfile.careers.forEach((career) => {
        const exists = unified.careers.some(
          (c) =>
            c.company.toLowerCase() === career.company.toLowerCase() &&
            c.startDate === career.startDate,
        );
        if (!exists) {
          unified.careers.push({ ...career, platform });
        }
      });
    }

    if (sourceProfile.skills) {
      sourceProfile.skills.forEach((skill) => {
        const exists = unified.skills.some(
          (s) => s.name.toLowerCase() === skill.name.toLowerCase(),
        );
        if (!exists) {
          unified.skills.push({ ...skill, platform });
        }
      });
    }
  }
}
