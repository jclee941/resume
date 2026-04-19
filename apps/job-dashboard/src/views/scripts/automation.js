export const DASHBOARD_SCRIPT_AUTOMATION = `
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

async function triggerJobSearch() {
  const btn = document.getElementById('searchBtn');
  btn.disabled = true;
  btn.textContent = '검색 중...';
  showAutomationStatus('🔍 채용공고 검색 트리거 중...');

  try {
    const res = await apiFetch('/api/automation/search', {
      method: 'POST',
      body: { keywords: 'DevOps,SRE,Platform,Security', minScore: 70 }
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
    const res = await apiFetch('/api/automation/apply', {
      method: 'POST',
      body: { dryRun, maxApplications: 5 }
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
    const res = await apiFetch('/api/automation/report', { method: 'POST' });
    if (res.status === 401) { promptForToken(); return; }
    const data = await res.json();
    if (data.success) {
      showAutomationStatus('✅ 리포트 생성 트리거됨! 확인', 'success');
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
  container.style.borderLeft = type === 'success' ? '3px solid #10b981'
    : type === 'error' ? '3px solid #ef4444'
    : '3px solid #3b82f6';
}

initTheme();
initKbdHelp();
loadDashboard();
loadResumeSyncState();
document.getElementById('resumeUploadFile').addEventListener('change', handleResumeFileUpload);
`;
