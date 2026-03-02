import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const CONFIG = {
  WANTED_EMAIL: process.env.WANTED_EMAIL,
  WANTED_PASSWORD: process.env.WANTED_PASSWORD,
  GOOGLE_EMAIL: process.env.GOOGLE_EMAIL,
  GOOGLE_PASSWORD: process.env.GOOGLE_PASSWORD,
  JOB_WORKER_URL: process.env.JOB_WORKER_URL || 'https://resume.jclee.me/job',
  AUTH_SYNC_SECRET: process.env.AUTH_SYNC_SECRET,
  SESSION_DIR: path.join(process.env.HOME || '/tmp', '.opencode/data'),
  SCREENSHOTS_DIR: path.join(__dirname, '../../.data/screenshots'),
};

export const PLATFORMS = {
  wanted: {
    name: 'Wanted',
    authMethod: 'direct',
    urls: {
      login: 'https://id.wanted.jobs/login',
      main: 'https://www.wanted.co.kr',
      profile: 'https://www.wanted.co.kr/profile',
    },
    cookieDomains: ['www.wanted.co.kr', 'id.wanted.jobs', 'wanted.co.kr', 'wanted.jobs'],
    sessionCookie: 'WWW_ONEID_ACCESS_TOKEN',
  },
  jobkorea: {
    name: 'JobKorea',
    authMethod: 'manual',
    urls: {
      login: 'https://www.jobkorea.co.kr/Login/Login_Tot.asp',
      main: 'https://www.jobkorea.co.kr',
      profile: 'https://www.jobkorea.co.kr/User/MyPage',
    },
    cookieDomains: ['www.jobkorea.co.kr', 'jobkorea.co.kr'],
    sessionCookie: 'NET_SessionId',
  },
  saramin: {
    name: 'Saramin',
    authMethod: 'manual',
    urls: {
      login: 'https://www.saramin.co.kr/zf_user/auth',
      main: 'https://www.saramin.co.kr',
      profile: 'https://www.saramin.co.kr/zf_user/mypage',
    },
    cookieDomains: ['www.saramin.co.kr', 'saramin.co.kr'],
    sessionCookie: 'PHPSESSID',
  },
};
