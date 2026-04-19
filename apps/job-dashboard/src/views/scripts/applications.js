export const DASHBOARD_SCRIPT_APPLICATIONS = `
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
    const matchSearch = !search
      || app.company?.toLowerCase().includes(search)
      || app.position?.toLowerCase().includes(search);
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
    const res = await apiFetch(\`/api/applications/\${id}/status\`, {
      method: 'PUT',
      body: { status }
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
    const res = await apiFetch(\`/api/applications/\${id}\`, { method: 'DELETE' });
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
      res = await apiFetch(\`/api/applications/\${editingId}\`, {
        method: 'PUT',
        body: data
      });
    } else {
      res = await apiFetch('/api/applications', {
        method: 'POST',
        body: data
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
`;
