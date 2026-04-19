import { join } from 'path';
import { getResumeBasePath } from '../../../src/shared/utils/paths.js';

const PROJECT_ROOT = getResumeBasePath();

export const SESSION_PATH = join(PROJECT_ROOT, 'saramin-session.json');

export const SARAMIN_URLS = {
  login: 'https://www.saramin.co.kr/zf_user/login',
  resumeList: 'https://www.saramin.co.kr/zf_user/mypage',
  resumeEdit: 'https://www.saramin.co.kr/zf_user/mypage/resumemanage',
  suitedRecruitPerson: 'https://www.saramin.co.kr/zf_user/member/suited-recruit-person',
};

export function parseCookieString(cookieString, domain = '.saramin.co.kr') {
  if (!cookieString || typeof cookieString !== 'string') {
    return [];
  }

  return cookieString
    .split(';')
    .map((pair) => pair.trim())
    .filter((pair) => pair && pair.includes('='))
    .map((pair) => {
      const [name, ...valueParts] = pair.split('=');
      return {
        name: name.trim(),
        value: valueParts.join('=').trim(),
        domain,
        path: '/',
        httpOnly: false,
        secure: true,
        sameSite: 'Lax',
      };
    });
}
