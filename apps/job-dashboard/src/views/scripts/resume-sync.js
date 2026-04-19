export const DASHBOARD_SCRIPT_RESUME_SYNC = `
function formatResumeJson(data) {
  return JSON.stringify(data, null, 2);
}

function parseResumePayload() {
  const raw = document.getElementById('resumePayload').value.trim();
  if (!raw) throw new Error('이력서 JSON을 입력하세요.');
  return JSON.parse(raw);
}

function renderResumeSyncHistory(history) {
  const container = document.getElementById('resumeSyncHistory');
  if (!history || history.length === 0) {
    container.innerHTML = '<div class="empty-state">동기화 이력이 없습니다.</div>';
    return;
  }

  container.innerHTML = history.map((item) => {
    const summary = item.result?.wanted?.message || item.result?.wanted?.error || '-';
    return '<div class="stat">'
      + '<div class="stat-value">' + escapeHtml(item.status || '-') + '</div>'
      + '<div class="stat-label">' + escapeHtml((item.platforms || []).join(', ') || 'wanted') + '</div>'
      + '<div class="stat-label">' + escapeHtml(formatDate(item.updatedAt || item.createdAt)) + '</div>'
      + '<div class="stat-label">' + escapeHtml(summary) + '</div>'
      + '</div>';
  }).join('');
}

function renderResumeSessionState(sessionStatus) {
  const container = document.getElementById('resumeSessionState');
  const wanted = sessionStatus?.wanted;
  if (!wanted) {
    container.innerHTML = '<div class="empty-state">Wanted 세션이 없습니다. 먼저 인증을 동기화하세요.</div>';
    return;
  }

  const authText = wanted.authenticated ? 'authenticated' : 'missing';
  container.innerHTML = '<div class="stat">'
    + '<div class="stat-value">' + escapeHtml(authText) + '</div>'
    + '<div class="stat-label">' + escapeHtml(wanted.email || '-') + '</div>'
    + '<div class="stat-label">' + escapeHtml(formatDate(wanted.updatedAt || wanted.updated_at || '')) + '</div>'
    + '</div>';
}

function showResumeSyncStatus(message, type = 'info') {
  const container = document.getElementById('resumeSyncStatus');
  const target = document.getElementById('resumeSyncMessage');
  container.style.display = 'block';
  target.textContent = message;
  container.style.borderLeft = type === 'success' ? '3px solid #10b981'
    : type === 'error' ? '3px solid #ef4444'
    : '3px solid #3b82f6';
}

async function loadResumeSyncState() {
  try {
    const resumeId = document.getElementById('masterResumeId')?.value || 'master';
    const [masterRes, historyRes, authRes] = await Promise.all([
      fetch('/api/resume/master?resumeId=' + encodeURIComponent(resumeId), { credentials: 'include' }),
      fetch('/api/automation/profile-sync/history?limit=10', { credentials: 'include' }),
      fetch('/api/auth/status', { credentials: 'include' })
    ]);

    if (masterRes.ok) {
      const master = await masterRes.json();
      currentMasterResume = master.resume;
      document.getElementById('resumePayload').value = formatResumeJson(master.resume);
      document.getElementById('targetResumeId').value = master.meta?.targetResumeId || '';
    }

    if (historyRes.ok) {
      const history = await historyRes.json();
      renderResumeSyncHistory(history.history || []);
    }

    if (authRes.ok) {
      const authState = await authRes.json();
      renderResumeSessionState(authState.status || {});
    }
  } catch (e) {
    showResumeSyncStatus('❌ 동기화 상태 로딩 실패: ' + e.message, 'error');
  }
}

async function saveResumeMaster() {
  const btn = document.getElementById('saveResumeBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '저장 중...';

  try {
    const ssotData = parseResumePayload();
    const resumeId = document.getElementById('masterResumeId').value.trim() || 'master';
    const targetResumeId = document.getElementById('targetResumeId').value.trim();
    const res = await apiFetch('/api/resume/master', {
      method: 'PUT',
      body: { resumeId, targetResumeId, ssotData, source: 'dashboard' }
    });
    if (res.status === 401) { promptForToken(); return; }
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || '저장 실패');
    currentMasterResume = ssotData;
    showResumeSyncStatus('✅ 마스터 이력서 저장 완료', 'success');
    showToast('이력서 저장 완료');
    await loadResumeSyncState();
  } catch (e) {
    showResumeSyncStatus('❌ 저장 실패: ' + e.message, 'error');
    showToast('이력서 저장 실패', true);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function triggerProfileSyncFromDashboard(dryRun) {
  const btn = dryRun ? document.getElementById('resumeDryRunBtn') : document.getElementById('resumeSyncBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = dryRun ? '미리보기 중...' : '업로드 중...';

  try {
    const ssotData = parseResumePayload();
    const resumeId = document.getElementById('masterResumeId').value.trim() || 'master';
    const targetResumeId = document.getElementById('targetResumeId').value.trim();
    const res = await apiFetch('/api/automation/profile-sync', {
      method: 'POST',
      body: { resumeId, targetResumeId, dryRun, platforms: ['wanted'], ssotData }
    });
    if (res.status === 401) { promptForToken(); return; }
    const data = await res.json();
    if (!res.ok || !data.success) throw new Error(data.error || '동기화 실패');
    const wantedMessage = data.platformResults?.wanted?.message || (dryRun ? '미리보기 완료' : '업로드 완료');
    showResumeSyncStatus('✅ ' + wantedMessage, 'success');
    showToast(dryRun ? '동기화 미리보기 완료' : '실제 업로드 완료');
    await loadResumeSyncState();
  } catch (e) {
    showResumeSyncStatus('❌ 동기화 실패: ' + e.message, 'error');
    showToast('이력서 동기화 실패', true);
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

async function handleResumeFileUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    document.getElementById('resumePayload').value = formatResumeJson(parsed);
    currentMasterResume = parsed;
    showResumeSyncStatus('✅ JSON 파일을 불러왔습니다. 저장 또는 동기화를 실행하세요.', 'success');
  } catch (e) {
    showResumeSyncStatus('❌ JSON 파일 파싱 실패: ' + e.message, 'error');
    showToast('JSON 파일 읽기 실패', true);
  }
}
`;
