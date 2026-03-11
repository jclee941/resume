import { DASHBOARD_STYLES } from './styles.js';
import { DASHBOARD_SCRIPTS } from './scripts.js';

const DASHBOARD_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Job Dashboard - CF Native</title>
  <style>{{STYLES}}</style>
</head>
<body>
  <header role="banner">
  <h1>
    Job Dashboard 
    <span class="badge badge-ok" aria-label="버전 2.1">CF Native v2.1</span>
  </h1>
  </header>
  
  <section class="card" aria-labelledby="automation-heading">
    <h2 id="automation-heading">
      <span>자동화</span>
      <div class="toolbar" role="toolbar" aria-label="자동화 도구">
        <button class="btn btn-primary" onclick="triggerJobSearch()" id="searchBtn" aria-describedby="automation-desc">🔍 채용공고 검색</button>
        <button class="btn btn-secondary" onclick="triggerAutoApply(true)" id="dryRunBtn">🧪 자동지원 테스트</button>
        <button class="btn btn-danger" onclick="triggerAutoApply(false)" id="applyBtn">🚀 자동지원 실행</button>
        <button class="btn btn-secondary" onclick="triggerDailyReport()">📊 일일리포트</button>
      </div>
    </h2>
    <div id="automationStatus" class="automation-status" role="status" aria-live="polite">
      <div id="automationMessage"></div>
    </div>
    <span id="automation-desc" class="sr-only">새로운 채용공고를 검색하고 자동으로 지원합니다</span>
  </section>

  <section class="card" aria-labelledby="resume-sync-heading">
    <h2 id="resume-sync-heading">
      <span>이력서 동기화</span>
      <div class="toolbar" role="toolbar" aria-label="이력서 동기화 도구">
        <button class="btn btn-secondary" onclick="loadResumeSyncState()">새로고침</button>
        <button class="btn btn-primary" onclick="saveResumeMaster()" id="saveResumeBtn">업로드 저장</button>
        <button class="btn btn-secondary" onclick="triggerProfileSyncFromDashboard(true)" id="resumeDryRunBtn">🧪 미리보기</button>
        <button class="btn btn-danger" onclick="triggerProfileSyncFromDashboard(false)" id="resumeSyncBtn">⬆️ 실제 업로드</button>
      </div>
    </h2>

    <div class="form-group">
      <label for="masterResumeId">Master Resume Key</label>
      <input type="text" id="masterResumeId" value="master" autocomplete="off">
    </div>

    <div class="form-group">
      <label for="targetResumeId">Wanted Resume ID</label>
      <input type="text" id="targetResumeId" placeholder="예: 3558323" autocomplete="off">
    </div>

    <div class="form-group">
      <label for="resumeSessionState">Wanted 인증 상태</label>
      <div id="resumeSessionState" class="stats"></div>
    </div>

    <div class="form-group">
      <label for="resumeUploadFile">SSoT JSON 업로드</label>
      <input type="file" id="resumeUploadFile" accept=".json,application/json">
    </div>

    <div class="form-group">
      <label for="resumePayload">SSoT JSON</label>
      <textarea id="resumePayload" rows="12" placeholder="resume_data.json 내용을 붙여넣거나 파일을 선택하세요"></textarea>
    </div>

    <div id="resumeSyncStatus" class="automation-status" role="status" aria-live="polite" style="display:none;">
      <div id="resumeSyncMessage"></div>
    </div>

    <div class="form-group">
      <label for="resumeSyncHistory">최근 동기화 이력</label>
      <div id="resumeSyncHistory" class="stats"></div>
    </div>
  </section>

  <section class="card" aria-labelledby="stats-heading">
    <h2 id="stats-heading">통계</h2>
    <div id="stats" class="stats" role="region" aria-label="지원 현황 통계">
      <div class="loading" aria-busy="true">Loading...</div>
    </div>
  </section>
  
  <section class="card" aria-labelledby="applications-heading">
    <h2 id="applications-heading">
      <span>지원 현황</span>
      <div class="toolbar" role="toolbar" aria-label="검색 및 필터">
        <input type="text" class="search-box" id="searchBox" placeholder="회사명, 포지션 검색..." aria-label="지원 내역 검색">
        <select id="statusFilter" aria-label="상태 필터">
          <option value="">전체 상태</option>
          <option value="saved">저장됨</option>
          <option value="applied">지원완료</option>
          <option value="interview">면접</option>
          <option value="offer">합격</option>
          <option value="rejected">불합격</option>
        </select>
        <button class="btn btn-primary" onclick="openAddModal()" aria-keyshortcuts="Control+n">+ 추가</button>
        <span class="keyboard-hint hide-mobile" aria-hidden="true"><kbd>Ctrl</kbd>+<kbd>N</kbd></span>
      </div>
    </h2>
    <table role="grid" aria-describedby="applications-heading">
      <thead>
        <tr>
          <th scope="col">회사</th>
          <th scope="col">포지션</th>
          <th scope="col">플랫폼</th>
          <th scope="col">상태</th>
          <th scope="col" class="hide-mobile">날짜</th>
          <th scope="col">액션</th>
        </tr>
      </thead>
      <tbody id="applications" aria-live="polite"></tbody>
    </table>
    <nav id="pagination" aria-label="페이지 탐색" style="display:flex;justify-content:center;gap:0.5rem;margin-top:1rem;"></nav>
  </section>

  <!-- Add/Edit Modal -->
  <div class="modal" id="appModal" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
    <div class="modal-content">
      <div class="modal-header">
        <h3 id="modalTitle">지원 추가</h3>
        <button class="close-btn" onclick="closeModal()" aria-label="모달 닫기">&times;</button>
      </div>
      <form id="appForm">
        <input type="hidden" id="appId">
        <div class="form-group">
          <label for="company">회사명 *</label>
          <input type="text" id="company" required autocomplete="organization">
        </div>
        <div class="form-group">
          <label for="position">포지션 *</label>
          <input type="text" id="position" required autocomplete="off">
        </div>
        <div class="form-group">
          <label for="platform">플랫폼</label>
          <select id="platform">
            <option value="wanted">Wanted</option>
            <option value="jobkorea">JobKorea</option>
            <option value="saramin">Saramin</option>
            <option value="linkedin">LinkedIn</option>
            <option value="remember">Remember</option>
            <option value="direct">직접지원</option>
            <option value="other">기타</option>
          </select>
        </div>
        <div class="form-group">
          <label>상태</label>
          <select id="status">
            <option value="saved">저장됨</option>
            <option value="applied">지원완료</option>
            <option value="interview">면접</option>
            <option value="offer">합격</option>
            <option value="rejected">불합격</option>
          </select>
        </div>
        <div class="form-group">
          <label>채용공고 URL</label>
          <input type="url" id="jobUrl" placeholder="https://...">
        </div>
        <div class="form-group">
          <label>메모</label>
          <textarea id="notes" placeholder="면접 일정, 연봉 정보 등..."></textarea>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">취소</button>
          <button type="submit" class="btn btn-primary">저장</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Delete Confirm Modal -->
  <div class="modal" id="deleteModal">
    <div class="modal-content" style="max-width:400px;">
      <div class="modal-header">
        <h3>삭제 확인</h3>
        <button class="close-btn" onclick="closeDeleteModal()">&times;</button>
      </div>
      <p style="margin-bottom:1.5rem;">정말 이 지원 기록을 삭제하시겠습니까?</p>
      <div class="form-actions">
        <button class="btn btn-secondary" onclick="closeDeleteModal()">취소</button>
        <button class="btn btn-danger" id="confirmDeleteBtn">삭제</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <div class="toast" id="toast"></div>

  <script>{{SCRIPTS}}</script>
</body>
</html>`;

/**
 * Security headers for all HTML responses
 * @param {string} nonce - CSP nonce for inline scripts
 * @param {string} styleHash - SHA-256 hash of inline styles
 * @returns {Record<string, string>}
 */
function getSecurityHeaders(nonce, styleHash) {
  return {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Security-Policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://accounts.google.com; style-src 'self' '${styleHash}' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https://accounts.google.com; frame-src https://accounts.google.com; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self';`,
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'same-origin',
    'Permissions-Policy':
      'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()',
    'Cache-Control': 'public, max-age=300, must-revalidate',
  };
}

/**
 * Compute SHA-256 hash of content for CSP
 * @param {string} content
 * @returns {Promise<string>}
 */
async function computeStyleHash(content) {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return `sha256-${btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))}`;
}

/**
 * Serve the dashboard HTML with proper security headers
 * @param {string} pathname
 * @returns {Promise<Response>}
 */
export async function serveStatic(pathname) {
  const path = pathname === '/' || pathname === '/dashboard' ? '/index.html' : pathname;

  if (path === '/index.html') {
    const nonce = crypto.randomUUID().replace(/-/g, '');
    const styleHash = await computeStyleHash(DASHBOARD_STYLES);

    const html = DASHBOARD_HTML_TEMPLATE.replace('{{STYLES}}', DASHBOARD_STYLES)
      .replace('{{SCRIPTS}}', DASHBOARD_SCRIPTS)
      .replace('<script>', `<script nonce="${nonce}">`);

    return new Response(html, {
      headers: getSecurityHeaders(nonce, styleHash),
    });
  }

  return new Response(JSON.stringify({ error: 'Not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

export { DASHBOARD_HTML_TEMPLATE, getSecurityHeaders, computeStyleHash };
