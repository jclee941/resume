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

/**
 * @typedef {{
 *   load(platform: string): unknown;
 * }} SessionStore
 *
 * @typedef {{
 *   company: string;
 *   startDate?: string;
 *   [key: string]: unknown;
 * }} SourceCareer
 *
 * @typedef {{
 *   name: string;
 *   [key: string]: unknown;
 * }} SourceSkill
 *
 * @typedef {{
 *   name?: string | null;
 *   email?: string | null;
 *   headline?: string | null;
 *   avatar?: string | null;
 *   careers?: SourceCareer[];
 *   skills?: SourceSkill[];
 *   [key: string]: unknown;
 * }} SourceProfile
 *
 * @typedef {{
 *   getProfile?: () => Promise<{ success: boolean; profile: SourceProfile; status?: string; error?: unknown; reason?: unknown }>;
 *   [key: string]: unknown;
 * }} CrawlerInstance
 *
 * @typedef {{
 *   basic: {
 *     name: string | null;
 *     email: string | null;
 *     phone: string | null;
 *     avatar: string | null;
 *     headline: string | null;
 *     summary: string | null;
 *     currentStatus: string | null;
 *   };
 *   careers: Array<SourceCareer & { platform: string }>;
 *   education: unknown[];
 *   skills: Array<SourceSkill & { platform: string }>;
 *   meta: {
 *     lastUpdated: string;
 *     sources: string[];
 *     syncStatus: Record<string, { status: string; lastSync?: string | null; error?: unknown }>;
 *   };
 * }} UnifiedProfile
 */

export class ProfileAggregator {
  /**
   * @param {Record<string, CrawlerInstance>} crawlers
   * @param {{ sessionStore?: SessionStore }} [dependencies]
   */
  constructor(crawlers, dependencies = {}) {
    this.crawlers = crawlers;
    this.sessionStore = dependencies.sessionStore;
  }

  /**
   * @param {string} platform
   * @returns {unknown}
   */
  loadSession(platform) {
    if (!this.sessionStore || typeof this.sessionStore.load !== 'function') {
      throw new Error('ProfileAggregator requires a sessionStore with load(platform)');
    }

    return this.sessionStore.load(platform);
  }

  /**
   * @returns {Promise<UnifiedProfile>}
   */
  async fetchUnifiedProfile() {
    /** @type {UnifiedProfile} */
    const unified = JSON.parse(JSON.stringify(UNIFIED_PROFILE_SCHEMA));
    const platforms = ['wanted', 'saramin', 'jobkorea', 'linkedin'];

    await Promise.all(
      platforms.map(async (platform) => {
        try {
          const crawler = this.crawlers[platform];
          if (!crawler) return;

          const session = this.loadSession(platform);
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
              if (!unified.meta.sources.includes(platform)) unified.meta.sources.push(platform);
            } else {
              unified.meta.syncStatus[platform] = {
                status: profileData.status === 'NOT_IMPLEMENTED' ? 'not_implemented' : 'error',
                error: profileData.error ?? profileData.reason ?? null,
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
            error: e instanceof Error ? e.message : String(e),
          };
        }
      })
    );

    unified.meta.lastUpdated = new Date().toISOString();
    return unified;
  }

  /**
   * @param {UnifiedProfile} unified
   * @param {SourceProfile} sourceProfile
   * @param {string} platform
   */
  mergeProfile(unified, sourceProfile, platform) {
    if (platform === 'wanted' || (platform === 'linkedin' && !unified.basic.name)) {
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
            c.startDate === career.startDate
        );
        if (!exists) {
          unified.careers.push({ ...career, platform });
        }
      });
    }

    if (sourceProfile.skills) {
      sourceProfile.skills.forEach((skill) => {
        const exists = unified.skills.some(
          (s) => s.name.toLowerCase() === skill.name.toLowerCase()
        );
        if (!exists) {
          unified.skills.push({ ...skill, platform });
        }
      });
    }
  }
}
