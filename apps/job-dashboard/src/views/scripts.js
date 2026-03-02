export const DASHBOARD_SCRIPTS = `
let applications = [];
let currentPage = 1;
const pageSize = 20;
let editingId = null;
let deleteId = null;
let isLoading = false;
let lastError = null;
let kbdHelpVisible = localStorage.getItem('kbdHelpVisible') === 'true';

const statusLabels = {
  saved: '저장됨', applied: '지원완료', interview: '면접', offer: '합격', rejected: '불합격'
};

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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });
      if (res.ok) {
        loadDashboard();
      } else {
        showToast('인증 실패', true);
      }
    } catch (e) {
      showToast('인증 오류: ' + e.message, true);
    }
  }
}

function renderStats(stats) {
  const total = Number(stats.totalApplications) || 0;
  const applied = Number(stats.byStatus?.applied) || 0;
  const interview = Number(stats.byStatus?.interview) || 0;
  const offer = Number(stats.byStatus?.offer) || 0;
  const rejected = Number(stats.byStatus?.rejected) || 0;
  const rate = Number(stats.successRate) || 0;
  document.getElementById('stats').innerHTML = \`
    <div class="stat" onclick="filterByStatus('')"><div class="stat-value">\${total}</div><div class="stat-label">전체</div></div>
    <div class="stat" onclick="filterByStatus('applied')"><div class="stat-value">\${applied}</div><div class="stat-label">지원완료</div></div>
    <div class="stat" onclick="filterByStatus('interview')"><div class="stat-value">\${interview}</div><div class="stat-label">면접</div></div>
    <div class="stat" onclick="filterByStatus('offer')"><div class="stat-value">\${offer}</div><div class="stat-label">합격</div></div>
    <div class="stat" onclick="filterByStatus('rejected')"><div class="stat-value">\${rejected}</div><div class="stat-label">불합격</div></div>
    <div class="stat"><div class="stat-value">\${rate}%</div><div class="stat-label">성공률</div></div>
  \`;
}

function filterByStatus(status) {
  document.getElementById('statusFilter').value = status;
  renderApplications();
}

function getFilteredApps() {
  const search = document.getElementById('searchBox').value.toLowerCase();
  const status = document.getElementById('statusFilter').value;
  return applications.filter(app => {
    const matchSearch = !search || 
      app.company?.toLowerCase().includes(search) || 
      app.position?.toLowerCase().includes(search);
    const matchStatus = !status || app.status === status;
    return matchSearch && matchStatus;
  });
}

function renderApplications() {
  const filtered = getFilteredApps();
  const start = (currentPage - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);
  
  const tbody = document.getElementById('applications');
  if (paged.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-state">지원 기록이 없습니다. + 추가 버튼을 눌러 시작하세요.</td></tr>';
    document.getElementById('pagination').innerHTML = '';
    return;
  }

  const validStatuses = ['saved', 'applied', 'interview', 'offer', 'rejected'];
  const validPlatforms = ['wanted', 'jobkorea', 'saramin', 'linkedin', 'remember', 'direct', 'other'];
  
  tbody.innerHTML = paged.map(app => {
    const safeId = escapeHtml(String(app.id || ''));
    const platformValue = app.source || app.platform || 'wanted';
    const safePlatform = validPlatforms.includes(platformValue) ? platformValue : 'wanted';
    const safeStatus = validStatuses.includes(app.status) ? app.status : 'saved';
    return \`
    <tr>
      <td><strong>\${escapeHtml(app.company || '')}</strong></td>
      <td>\${escapeHtml(app.position || '')}</td>
      <td>\${safePlatform}</td>
      <td>
        <select class="badge badge-\${safeStatus}" onchange="updateStatus('\${safeId}', this.value)" style="border:none;cursor:pointer;">
          \${Object.entries(statusLabels).map(([k,v]) => 
            \`<option value="\${k}" \${safeStatus === k ? 'selected' : ''}>\${v}</option>\`
          ).join('')}
        </select>
      </td>
      <td class="hide-mobile">\${formatDate(app.created_at || app.createdAt)}</td>
      <td>
        <div class="actions">
          <button class="btn btn-sm btn-secondary" onclick="openEditModal('\${safeId}')">수정</button>
          <button class="btn btn-sm btn-danger" onclick="confirmDelete('\${safeId}')">삭제</button>
        </div>
      </td>
    </tr>
  \`;}).join('');

  renderPagination(filtered.length);
}

function renderPagination(total) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) {
    document.getElementById('pagination').innerHTML = '';
    return;
  }
  let html = '';
  for (let i = 1; i <= pages; i++) {
    html += \`<button class="btn \${i === currentPage ? 'btn-primary' : 'btn-secondary'} btn-sm" onclick="goToPage(\${i})">\${i}</button>\`;
  }
  document.getElementById('pagination').innerHTML = html;
}

function goToPage(page) { currentPage = page; renderApplications(); }

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ko-KR');
}

function openAddModal() {
  editingId = null;
  document.getElementById('modalTitle').textContent = '지원 추가';
  document.getElementById('appForm').reset();
  document.getElementById('appModal').classList.add('active');
}

function openEditModal(id) {
  const app = applications.find(a => a.id == id);
  if (!app) return;
  editingId = id;
  document.getElementById('modalTitle').textContent = '지원 수정';
  document.getElementById('company').value = app.company || '';
  document.getElementById('position').value = app.position || '';
  document.getElementById('platform').value = app.source || app.platform || 'wanted';
  document.getElementById('status').value = app.status || 'saved';
  document.getElementById('jobUrl').value = app.source_url || app.sourceUrl || app.job_url || app.jobUrl || '';
  document.getElementById('notes').value = app.notes || '';
  document.getElementById('appModal').classList.add('active');
}

function closeModal() {
  document.getElementById('appModal').classList.remove('active');
  editingId = null;
}

function confirmDelete(id) {
  deleteId = id;
  document.getElementById('deleteModal').classList.add('active');
  document.getElementById('confirmDeleteBtn').onclick = () => deleteApplication(id);
}

function closeDeleteModal() {
  document.getElementById('deleteModal').classList.remove('active');
  deleteId = null;
}

async function updateStatus(id, status) {
  const select = event?.target;
  const originalValue = select?.dataset?.original || status;
  try {
    if (select) select.disabled = true;
    const res = await fetch(\`/api/applications/\${id}/status\`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status })
    });
    if (res.status === 401) { promptForToken(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const app = applications.find(a => a.id == id);
    if (app) app.status = status;
    showToast('상태 변경됨');
    loadDashboard();
  } catch (e) {
    if (select) { select.value = originalValue; select.disabled = false; }
    showToast('상태 변경 실패: ' + e.message, true);
  }
}

async function deleteApplication(id) {
  showLoading('삭제 중...');
  try {
    const res = await fetch(\`/api/applications/\${id}\`, { method: 'DELETE', credentials: 'include' });
    if (res.status === 401) { hideLoading(); promptForToken(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    closeDeleteModal();
    hideLoading();
    showToast('삭제 완료');
    loadDashboard();
  } catch (e) {
    hideLoading();
    showToast('삭제 실패: ' + e.message, true);
  }
}

document.getElementById('appForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = '저장 중...';
  
  const selectedPlatform = document.getElementById('platform').value;
  const jobUrl = document.getElementById('jobUrl').value;
  const data = {
    company: document.getElementById('company').value,
    position: document.getElementById('position').value,
    source: selectedPlatform,
    status: document.getElementById('status').value,
    sourceUrl: jobUrl,
    notes: document.getElementById('notes').value
  };

  try {
    let res;
    if (editingId) {
      res = await fetch(\`/api/applications/\${editingId}\`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
    }
    if (res.status === 401) { submitBtn.disabled = false; submitBtn.textContent = originalText; promptForToken(); return; }
    if (!res.ok) throw new Error('HTTP ' + res.status);
    closeModal();
    showToast(editingId ? '수정 완료' : '추가 완료');
    loadDashboard();
  } catch (e) {
    showToast('저장 실패: ' + e.message, true);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
});

document.getElementById('searchBox').addEventListener('input', () => { currentPage = 1; renderApplications(); });
document.getElementById('statusFilter').addEventListener('change', () => { currentPage = 1; renderApplications(); });

function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast active' + (isError ? ' error' : '');
  setTimeout(() => toast.classList.remove('active'), 3000);
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { closeModal(); closeDeleteModal(); }
  if (e.key === 'n' && e.ctrlKey) { e.preventDefault(); openAddModal(); }
  if (e.key === '?' && !e.ctrlKey && !e.altKey) { toggleKbdHelp(); }
  if (e.key === 't' && e.ctrlKey) { e.preventDefault(); toggleTheme(); }
});

function initKbdHelp() {
  const toggle = document.createElement('button');
  toggle.className = 'kbd-help-toggle';
  toggle.id = 'kbdToggle';
  toggle.textContent = '⌨';
  toggle.title = '키보드 단축키';
  toggle.onclick = toggleKbdHelp;
  document.body.appendChild(toggle);
  
  const help = document.createElement('div');
  help.className = 'kbd-help';
  help.id = 'kbdHelp';
  help.style.display = kbdHelpVisible ? 'block' : 'none';
  help.innerHTML = '<h4>단축키</h4><ul><li><span>새 지원 추가</span><kbd>Ctrl+N</kbd></li><li><span>모달 닫기</span><kbd>Esc</kbd></li><li><span>테마 전환</span><kbd>Ctrl+T</kbd></li><li><span>도움말 토글</span><kbd>?</kbd></li></ul>';
  document.body.appendChild(help);
  if (kbdHelpVisible) toggle.style.display = 'none';
}

function toggleKbdHelp() {
  const help = document.getElementById('kbdHelp');
  const toggle = document.getElementById('kbdToggle');
  kbdHelpVisible = !kbdHelpVisible;
  localStorage.setItem('kbdHelpVisible', kbdHelpVisible);
  help.style.display = kbdHelpVisible ? 'block' : 'none';
  toggle.style.display = kbdHelpVisible ? 'none' : 'flex';
}

function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  const btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.id = 'themeToggle';
  btn.textContent = saved === 'light' ? '🌙' : '☀️';
  btn.title = '테마 전환 (Ctrl+T)';
  btn.onclick = toggleTheme;
  document.querySelector('h1').appendChild(btn);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  const btn = document.getElementById('themeToggle');
  if (btn) btn.textContent = next === 'light' ? '🌙' : '☀️';
}

initTheme();
initKbdHelp();
loadDashboard();

async function triggerJobSearch() {
  const btn = document.getElementById('searchBtn');
  btn.disabled = true;
  btn.textContent = '검색 중...';
  showAutomationStatus('🔍 채용공고 검색 트리거 중...');
  
  try {
    const res = await fetch('/api/automation/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ keywords: 'DevOps,SRE,Platform,Security', minScore: 70 })
    });
    if (res.status === 401) { promptForToken(); return; }
    const data = await res.json();
    if (data.success) {
      showAutomationStatus('검색 트리거 완료! 처리 중...', 'success');
      showToast('검색 트리거됨');
    } else {
      throw new Error(data.error || 'Failed');
    }
  } catch (e) {
    showAutomationStatus('❌ 검색 실패: ' + e.message, 'error');
    showToast('검색 실패', true);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 채용공고 검색';
  }
}

async function triggerAutoApply(dryRun) {
  const btn = dryRun ? document.getElementById('dryRunBtn') : document.getElementById('applyBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = dryRun ? '테스트 중...' : '지원 중...';
  showAutomationStatus(dryRun ? '🧪 자동지원 테스트 실행 중...' : '🚀 자동지원 실행 중...');
  
  try {
    const res = await fetch('/api/automation/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ dryRun, maxApplications: 5 })
    });
    if (res.status === 401) { promptForToken(); return; }
    const data = await res.json();
    if (data.success) {
      showAutomationStatus(dryRun ? '테스트 완료! 결과 확인' : '자동지원 트리거됨!', 'success');
      showToast(dryRun ? '테스트 트리거됨' : '자동지원 트리거됨');
    } else {
      throw new Error(data.error || 'Failed');
    }
  } catch (e) {
    showAutomationStatus('❌ 실패: ' + e.message, 'error');
    showToast('실패', true);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function triggerDailyReport() {
  showAutomationStatus('📊 일일 리포트 생성 중...');
  try {
    const res = await fetch('/api/automation/report', { method: 'POST', credentials: 'include' });
    if (res.status === 401) { promptForToken(); return; }
    const data = await res.json();
    if (data.success) {
      showAutomationStatus('✅ 리포트 생성 트리거됨! Slack에서 확인', 'success');
      showToast('리포트 트리거됨');
    } else {
      throw new Error(data.error || 'Failed');
    }
  } catch (e) {
    showAutomationStatus('❌ 실패: ' + e.message, 'error');
    showToast('실패', true);
  }
}

function showAutomationStatus(msg, type = 'info') {
  const container = document.getElementById('automationStatus');
  const message = document.getElementById('automationMessage');
  container.style.display = 'block';
  message.textContent = msg;
  container.style.borderLeft = type === 'success' ? '3px solid #10b981' : 
                                type === 'error' ? '3px solid #ef4444' : '3px solid #3b82f6';
}
`;
