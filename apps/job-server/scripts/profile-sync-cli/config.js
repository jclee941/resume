import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  SSOT_PATH: path.resolve(__dirname, '../../../../packages/data/resumes/master/resume_data.json'),
  USER_DATA_DIR: path.join(process.env.HOME || '/tmp', '.opencode/browser-data'),
  SESSION_DIR: path.resolve(__dirname, '../../../..'),
  HEADLESS: process.argv.includes('--headless'),
  APPLY: process.argv.includes('--apply'),
  DIFF_ONLY: process.argv.includes('--diff'),
};

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
      headline: `${ssot.current?.position || ssot.careers?.[0]?.role || ''} | ${ssot.summary.totalExperience}`,
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
      headline: `${ssot.current?.position || ssot.careers?.[0]?.role || ''} | ${ssot.summary.totalExperience}`,
      skills: ssot.summary.expertise,
    }),
  },
};
