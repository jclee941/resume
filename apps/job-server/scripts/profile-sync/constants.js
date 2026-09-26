import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runtime configuration from CLI flags and environment.
 * @type {{SSOT_PATH: string, USER_DATA_DIR: string, SESSION_DIR: string, HEADLESS: boolean, APPLY: boolean, DIFF_ONLY: boolean}}
 */
export const CONFIG = {
  SSOT_PATH: path.resolve(__dirname, '../../../../packages/data/resumes/master/resume_data.json'),
  USER_DATA_DIR: path.join(process.env.HOME || '/tmp', '.opencode/browser-data'),
  SESSION_DIR: path.resolve(__dirname, '../../../../'),
  HEADLESS: !process.argv.includes('--headed'),
  APPLY: process.argv.includes('--apply'),
  DIFF_ONLY: process.argv.includes('--diff'),
};

/**
 * @typedef {object} SsotResume
 * @property {{ name: string, email: string, phone: string, github?: string, portfolio?: string }} personal
 * @property {{ profileStatement?: string, totalExperience?: string, expertise: string[] }} summary
 * @property {{ wanted?: { headline?: string } }} [platformVariants]
 * @property {{ position?: string }} [current]
 * @property {Array<{ role?: string }>} [careers]
 */

/**
 * @typedef {object} PlatformConfig
 * @property {string} name
 * @property {string} profileUrl
 * @property {string} editUrl
 * @property {Record<string, string>} [selectors]
 * @property {((ssot: SsotResume) => Record<string, unknown>)} [mapData]
 */

/**
 * Platform configuration.
 * @type {Record<string, PlatformConfig>}
 */
export const PLATFORMS = {
  wanted: {
    name: 'Wanted',
    profileUrl: 'https://www.wanted.co.kr/cv/list',
    editUrl: 'https://www.wanted.co.kr/cv/edit',
    selectors: {
      name: 'input[name="name"]',
      email: 'input[name="email"]',
      phone: 'input[name="phone"]',
      headline: 'textarea[name="introduction"]',
      skills: '[data-testid="skills-section"]',
    },
    /** @param {SsotResume} ssot */
    mapData: (ssot) => {
      const intro = ssot.platformVariants?.wanted?.headline || ssot.summary.profileStatement || '';
      return {
        name: ssot.personal.name,
        // Wanted API limit: 150 chars
        introduction: intro.length > 150 ? `${intro.slice(0, 147)}...` : intro,
      };
    }, // end mapData
  }, // end wanted
  jobkorea: {
    name: 'JobKorea',
    get profileUrl() {
      const rNo = process.env.JOBKOREA_RNO?.trim() || '';
      return `https://www.jobkorea.co.kr/User/Resume/View?rNo=${rNo}`;
    },
    get editUrl() {
      const rNo = process.env.JOBKOREA_RNO?.trim() || '';
      return `https://www.jobkorea.co.kr/User/Resume/Edit?RNo=${rNo}`;
    },
  },
  saramin: {
    name: 'Saramin',
    profileUrl: 'https://www.saramin.co.kr/zf_user/member/info',
    editUrl: 'https://www.saramin.co.kr/zf_user/resume/write',
    selectors: {
      name: '#name',
      email: '#email',
      phone: '#phone',
      headline: '#selfIntro',
      skills: '.skill-list',
    },
    /** @param {SsotResume} ssot */
    mapData: (ssot) => ({
      name: ssot.personal.name,
      email: ssot.personal.email,
      phone: ssot.personal.phone,
      headline: `${ssot.current?.position || ssot.careers?.[0]?.role || ''} | ${ssot.summary?.totalExperience || ''}`,
      skills: ssot.summary.expertise,
    }),
  },
};

// Re-export pure data constants from Workers-compatible module.
// CLI consumers can keep importing from this file unchanged.
export {
  JOB_CATEGORY_MAPPING,
  DEFAULT_JOB_CATEGORY,
  hasJobCategoryMapping,
  resolveJobCategoryId,
} from '@resume/shared/job-categories';
