#!/usr/bin/env node
/**
 * Wanted Cookie Injection Script
 *
 * 사용법:
 * 1. Chrome에서 www.wanted.co.kr 로그인
 * 2. DevTools > Application > Cookies 에서 쿠키 복사
 * 3. 이 스크립트 실행: node cookie-inject.js "COOKIE_STRING"
 *
 * 또는 EditThisCookie 확장 프로그램으로 JSON 내보내기 후:
 * node cookie-inject.js --json cookies.json
 */

import fs from 'fs';
import path from 'path';

const SESSION_FILE = path.join(process.env.HOME, '.opencode/data/sessions.json');

function parseCookieString(cookieStr) {
  return cookieStr
    .split(';')
    .map((pair) => {
      const [name, ...valueParts] = pair.trim().split('=');
      return { name: name.trim(), value: valueParts.join('=').trim() };
    })
    .filter((c) => c.name && c.value);
}

function saveSession(cookies, email = 'qwer941a@gmail.com') {
  const cookieString =
    typeof cookies === 'string' ? cookies : cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  const session = {
    wanted: {
      cookies: cookieString,
      email,
      expires_at: Date.now() + 24 * 60 * 60 * 1000,
      created_at: new Date().toISOString(),
    },
  };

  let existingSessions = {};
  try {
    if (fs.existsSync(SESSION_FILE)) {
      existingSessions = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf8'));
    }
  } catch (_e) {
    console.log('Creating new sessions file');
  }

  const mergedSessions = { ...existingSessions, ...session };

  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
  fs.writeFileSync(SESSION_FILE, JSON.stringify(mergedSessions, null, 2));

  console.log('✅ Session saved to:', SESSION_FILE);
  console.log('📅 Expires at:', new Date(session.wanted.expires_at).toLocaleString());

  return cookieString;
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Wanted Cookie Injection Tool

사용법:
  # Cookie 문자열로 직접 입력
  node cookie-inject.js "cookie1=value1; cookie2=value2; ..."

  # JSON 파일에서 가져오기 (EditThisCookie 형식)
  node cookie-inject.js --json cookies.json

  # 대화형 입력
  node cookie-inject.js --interactive

쿠키 추출 방법:
  1. Chrome에서 www.wanted.co.kr 로그인
  2. F12 > Application > Cookies > www.wanted.co.kr
  3. 각 쿠키의 Name과 Value를 복사
  
필수 쿠키:
  - WWW_ONEID_ACCESS_TOKEN
  - WWW_ONEID_REFRESH_TOKEN  
  - _gat, _gid (optional but helpful)
`);
    process.exit(0);
  }

  if (args[0] === '--json' && args[1]) {
    const jsonPath = args[1];
    if (!fs.existsSync(jsonPath)) {
      console.error('❌ JSON file not found:', jsonPath);
      process.exit(1);
    }
    const cookies = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    saveSession(cookies);
    console.log(`✅ Imported ${cookies.length} cookies from JSON`);
    return;
  }

  if (args[0] === '--interactive') {
    console.log('대화형 모드는 아직 구현되지 않았습니다.');
    console.log('Cookie 문자열을 직접 전달해주세요.');
    process.exit(1);
  }

  // Direct cookie string
  const cookieStr = args.join(' ');
  const cookies = parseCookieString(cookieStr);

  if (cookies.length === 0) {
    console.error('❌ No valid cookies found in input');
    process.exit(1);
  }

  saveSession(cookieStr);
  console.log(`✅ Saved ${cookies.length} cookies`);

  // Verify important cookies
  const importantCookies = ['WWW_ONEID_ACCESS_TOKEN', 'WWW_ONEID_REFRESH_TOKEN', 'ONEID_SESSION'];
  const found = cookies.filter((c) => importantCookies.some((name) => c.name.includes(name)));

  if (found.length > 0) {
    console.log('🔑 Auth cookies found:', found.map((c) => c.name).join(', '));
  } else {
    console.log('⚠️  Warning: No auth cookies found. Session may not work.');
    console.log('   Expected: WWW_ONEID_ACCESS_TOKEN, WWW_ONEID_REFRESH_TOKEN');
  }
}

main();
