import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  USER_DATA_DIR: path.join(process.env.HOME || '/tmp', '.opencode/browser-data'),
  SESSION_DIR: path.resolve(__dirname, '../../../..'),
  JOB_WORKER_URL: process.env.JOB_WORKER_URL || 'https://resume.jclee.me/job',
  AUTH_SYNC_SECRET: process.env.AUTH_SYNC_SECRET,
};

export const PLATFORMS = {
  wanted: {
    name: 'Wanted',
    loginUrl: 'https://id.wanted.jobs/login',
    checkUrl: 'https://www.wanted.co.kr/cv/list',
    successIndicator: '/cv/',
    cookieDomains: ['wanted.co.kr', 'id.wanted.jobs'],
    verifyLogin: null,
  },
  jobkorea: {
    name: 'JobKorea',
    loginUrl: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp',
    checkUrl: 'https://www.jobkorea.co.kr/User/Mng/Resume/ResumeList',
    successIndicator: '/User/',
    cookieDomains: ['jobkorea.co.kr'],
    verifyLogin: async (page) => {
      return page
        .evaluate(() => {
          const body = document.body?.innerText || '';
          if (body.includes('찾을 수 없습니다') || body.includes('페이지의 주소가 변경')) {
            return false;
          }
          return (
            document.querySelector('.resumeList, .myPage, #container .user') !== null ||
            (body.includes('이력서') && !body.includes('로그인'))
          );
        })
        .catch(() => false);
    },
  },
  saramin: {
    name: 'Saramin',
    loginUrl: 'https://www.saramin.co.kr/zf_user/auth',
    checkUrl: 'https://www.saramin.co.kr/zf_user/member/info',
    successIndicator: '/member/',
    cookieDomains: ['saramin.co.kr'],
    verifyLogin: null,
  },
};
