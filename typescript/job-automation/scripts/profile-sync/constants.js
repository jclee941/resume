import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Runtime configuration from CLI flags and environment.
 * @type {{SSOT_PATH: string, USER_DATA_DIR: string, SESSION_DIR: string, HEADLESS: boolean, APPLY: boolean, DIFF_ONLY: boolean}}
 */
export const CONFIG = {
  SSOT_PATH: path.resolve(__dirname, '../../../data/resumes/master/resume_data.json'),
  USER_DATA_DIR: path.join(process.env.HOME || '/tmp', '.opencode/browser-data'),
  SESSION_DIR: path.join(process.env.HOME || '/tmp', '.opencode/data'),
  HEADLESS: process.argv.includes('--headless'),
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
    mapData: (ssot) => ({
      name: ssot.personal.name,
      introduction: ssot.summary.profileStatement,
    }),
  },
  jobkorea: {
    name: 'JobKorea',
    profileUrl: 'https://www.jobkorea.co.kr/User/Mng/Resume/ResumeList',
    editUrl: 'https://www.jobkorea.co.kr/User/Resume/RegResume',
    selectors: {
      name: '#userName',
      email: '#userEmail',
      phone: '#userPhone',
      headline: '#selfIntroduce',
      skills: '.skill-tag-area',
    },
    mapData: (ssot) => ({
      name: ssot.personal.name,
      email: ssot.personal.email,
      phone: ssot.personal.phone,
      headline: `${ssot.current.position} | ${ssot.summary.totalExperience}`,
      skills: ssot.summary.expertise,
    }),
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
      headline: `${ssot.current.position} | ${ssot.summary.totalExperience}`,
      skills: ssot.summary.expertise,
    }),
  },
};

/**
 * Job category ID mapping for Wanted Korea.
 * @type {Record<string, number>}
 */
export const JOB_CATEGORY_MAPPING = {
  '보안운영 담당': 672,
  '보안 엔지니어': 672,
  보안엔지니어: 672,
  정보보안: 672,

  '인프라 엔지니어': 674,
  '인프라 담당': 674,
  DevOps: 674,
  SRE: 674,
  'SRE Engineer': 674,
  '클라우드 엔지니어': 674,

  '시스템 엔지니어': 665,
  '네트워크 엔지니어': 665,
  'IT지원/OA운영': 665,
  'IT 운영': 665,

  'Backend Developer': 872,
  '백엔드 개발자': 872,
  '서버 개발자': 872,
};

/** @type {number} */
export const DEFAULT_JOB_CATEGORY = 674;
