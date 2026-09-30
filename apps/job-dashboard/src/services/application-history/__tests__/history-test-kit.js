import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

import { writePlatformSession } from '../../platform-session.js';

export const ENCRYPTION_KEY = btoa('0123456789abcdef0123456789abcdef');
const SCHEMA_URL = new URL('../../../../schema.sql', import.meta.url);

/** D1 stand-in backed by real SQLite loaded from schema.sql, so SQL and constraints are real. */
export function createSqliteD1() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(SCHEMA_URL, 'utf8'));
  const statement = (sql, args = []) => ({
    bind: (...next) => statement(sql, next),
    run: async () => sqlite.prepare(sql).run(...args),
    all: async () => ({ results: sqlite.prepare(sql).all(...args) }),
    first: async () => sqlite.prepare(sql).get(...args) ?? null,
  });
  return {
    sqlite,
    prepare: (sql) => statement(sql),
    batch: async (statements) => {
      for (const item of statements) await item.run();
    },
  };
}

export async function sessionEnv(db, platforms = []) {
  const store = new Map();
  const SESSIONS = {
    get: async (key) => store.get(key) ?? null,
    put: async (key, value) => void store.set(key, value),
  };
  const env = { JOB_DB: db, SESSIONS, ENCRYPTION_KEY };
  for (const platform of platforms) await writePlatformSession(env, platform, 'session=fake', 3600);
  return env;
}

export const wantedRecord = (id, status = 'applied', extra = {}) => ({
  source: 'wanted',
  jobId: `wanted-${id}`,
  company: `Company ${id}`,
  position: `Role ${id}`,
  url: `https://www.wanted.co.kr/wd/${id}`,
  appliedAt: '2026-09-01T10:00:00',
  status,
  ...extra,
});

const APPLY_ROW = ({
  label = '지원완료',
  date = '2026.09.01',
  company,
  no,
  title,
  read = false,
}) => `
<tr><td class="vertical-align-top" rowspan="2"><div class="vertical-align-middle apply-status"><div class="inner">
<div class="item status">${label}</div><div class="item date">${date}</div></div></div></td>
<td><div class="vertical-align-middle apply-board"><div class="inner">
<div class="company"><a target="_blank" href="/Recruit/Co_read/C/1?Oem_Code=C1">${company}</a></div>
<div class="description"><a target="_blank" href="/Recruit/GI_Read/${no}?Oem_Code=C1">${title}</a></div></div></div></td>
<td><div class="vertical-align-middle apply-progress"><div class="inner"><div class="status"><div class="extra">접수마감</div></div></div></div></td>
<td><div class="vertical-align-middle reading${read ? ' is-reading-yes' : ''}"><div class="inner"><div class="${read ? 'date' : 'read-not'}">${read ? '2026.09.02' : '미열람'}</div></div></div></td>
<td><button class="btn devBtnCancel">지원취소</button></td></tr>
<tr><td colspan="4"><div class="similar"><ul class="similar-list"><li class="listItem">
<div class="company"><a href="/Recruit/Co_Read/C/9">Decoy Corp</a></div>
<div class="description dmp-imp-start"><a class="giread" href="/Recruit/GI_Read/49999999?x=1">Decoy Role</a></div>
</li></ul></div></td></tr>`;

const CARRIED_ROW = ({ company, no, title }) => `
<tr><td><div class="vertical-align-middle apply-board"><div class="inner">
<div class="company"><a href="/Recruit/Co_read/C/2">${company}</a></div>
<div class="description"><a href="/Recruit/GI_Read/${no}?Oem_Code=C1">${title}</a></div></div></div></td></tr>`;

export function applyListHtml({
  rows = [],
  carried = [],
  pager = '<span class="now">1</span>',
} = {}) {
  return `<html><head><title>입사지원 현황│잡코리아</title></head><body>
<table class="table"><thead><tr><th>지원일</th><th>지원내역</th></tr></thead><tbody>
${rows.map(APPLY_ROW).join('')}${carried.map(CARRIED_ROW).join('')}</tbody></table>
<div class="tplPagination"><ul><li>${pager}</li></ul></div></body></html>`;
}

export const EXPIRED_HTML = '<html><head><title>로그인│잡코리아</title></head><body></body></html>';

/**
 * Fake Browser Rendering session. `gotoFailures` are thrown by successive `goto` calls; with
 * `partialLoad` the page has already committed the URL when `goto` throws, like a real timeout
 * that fires after the document arrived but before DOMContentLoaded.
 */
export function fakeBrowser(pagesByUrl, { gotoFailures = [], partialLoad = false } = {}) {
  const visited = [];
  const failures = [...gotoFailures];
  const cookies = [];
  const calls = [];
  const gotoOptions = [];
  const requestHandlers = [];
  let opened = 0;
  const withBrowserSession = async (_env, run) => {
    opened += 1;
    const page = {
      current: '',
      setCookie: async (...next) => void cookies.push(...next),
      setRequestInterception: async (enabled) => void calls.push(`intercept:${enabled}`),
      on: (event, handler) => {
        if (event === 'request') requestHandlers.push(handler);
      },
      goto: async (url, options) => {
        calls.push('goto');
        visited.push(url);
        gotoOptions.push(options);
        if (failures.length > 0) {
          if (partialLoad) page.current = url;
          throw failures.shift();
        }
        page.current = url;
      },
      content: async () => pagesByUrl[page.current] ?? EXPIRED_HTML,
      url: () => page.current,
      close: async () => {},
    };
    return run({ newPage: async () => page });
  };
  return {
    withBrowserSession,
    visited,
    cookies,
    calls,
    gotoOptions,
    requestHandlers,
    opened: () => opened,
  };
}
