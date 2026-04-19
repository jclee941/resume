export const DASHBOARD_SCRIPT_CORE = `
function getCookieValue(name) {
  const prefix = name + '=';
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : '';
}

async function apiFetch(url, options = {}) {
  const method = (options.method || 'GET').toUpperCase();
  const headers = new Headers(options.headers || {});
  let body = options.body;

  if (body && typeof body === 'object' && !(body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
    body = JSON.stringify(body);
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfToken = getCookieValue('csrf_token');
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }

  return fetch(url, {
    ...options,
    method,
    headers,
    body,
    credentials: options.credentials || 'include'
  });
}

function showLoading(message = '로딩 중...') {
  isLoading = true;
  const existing = document.getElementById('loadingOverlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.id = 'loadingOverlay';
  overlay.className = 'loading-overlay';
  overlay.innerHTML = '<div class="loading-spinner"></div><div class="loading-text">' + escapeHtml(message) + '</div>';
  document.body.appendChild(overlay);
}

function hideLoading() {
  isLoading = false;
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) overlay.remove();
}

function showError(message, retryFn = null) {
  lastError = message;
  const existing = document.getElementById('errorBanner');
  if (existing) existing.remove();
  const banner = document.createElement('div');
  banner.id = 'errorBanner';
  banner.className = 'error-banner';
  banner.innerHTML = '<span>⚠️ ' + escapeHtml(message) + '</span>';
  if (retryFn) {
    const btn = document.createElement('button');
    btn.textContent = '다시 시도';
    btn.onclick = () => { banner.remove(); retryFn(); };
    banner.appendChild(btn);
  }
  document.body.insertBefore(banner, document.body.firstChild.nextSibling);
}

function clearError() {
  lastError = null;
  const banner = document.getElementById('errorBanner');
  if (banner) banner.remove();
}

function showSkeletonStats() {
  document.getElementById('stats').innerHTML = Array(6).fill('<div class="skeleton skeleton-stat"></div>').join('');
}

function showSkeletonTable() {
  document.getElementById('applications').innerHTML = '<tr><td colspan="6">' + Array(5).fill('<div class="skeleton skeleton-row"></div>').join('') + '</td></tr>';
}

async function loadDashboard() {
  clearError();
  showSkeletonStats();
  showSkeletonTable();
  try {
    const [statsRes, appsRes] = await Promise.all([
      fetch('/api/stats', { credentials: 'include' }),
      fetch('/api/applications?limit=100', { credentials: 'include' })
    ]);

    if (statsRes.status === 401 || appsRes.status === 401) {
      promptForToken();
      return;
    }

    if (!statsRes.ok) throw new Error('통계 데이터 로딩 실패 (HTTP ' + statsRes.status + ')');
    if (!appsRes.ok) throw new Error('지원 목록 로딩 실패 (HTTP ' + appsRes.status + ')');

    const stats = await statsRes.json();
    const appsData = await appsRes.json();
    applications = appsData.applications || [];

    renderStats(stats);
    renderApplications();
  } catch (e) {
    showError(e.message || '데이터 로딩 실패', loadDashboard);
    console.error(e);
  }
}

async function promptForToken() {
  const token = prompt('Admin Token을 입력하세요:');
  if (token) {
    try {
      const res = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: { token }
      });
      if (res.ok) {
        loadDashboard();
        loadResumeSyncState();
      } else {
        showToast('인증 실패', true);
      }
    } catch (e) {
      showToast('인증 오류: ' + e.message, true);
    }
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast active' + (isError ? ' error' : '');
  setTimeout(() => toast.classList.remove('active'), 3000);
}
`;
