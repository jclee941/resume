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
 * Platform configuration.
 * @type {Record<string, {name: string, profileUrl: string, editUrl: string, selectors: Record<string, string>, mapData: (ssot: Object) => Object}>}
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
    mapData: (ssot) => {
      const intro = ssot.summary.profileStatement || '';
      return {
        name: ssot.personal.name,
        // Wanted API limit: 150 chars
        introduction: intro.length > 150 ? intro.slice(0, 147) + '...' : intro,
      };
    },  // end mapData
  },  // end wanted
  jobkorea: {
    name: 'JobKorea',
    profileUrl: 'https://www.jobkorea.co.kr/User/Resume/View?rNo=30236578',
    editUrl: 'https://www.jobkorea.co.kr/User/Resume/Edit?RNo=30236578',
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
export { JOB_CATEGORY_MAPPING, DEFAULT_JOB_CATEGORY } from '@resume/shared/job-categories';
