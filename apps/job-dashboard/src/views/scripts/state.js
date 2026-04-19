export const DASHBOARD_SCRIPT_STATE = `
let applications = [];
let currentPage = 1;
const pageSize = 20;
let editingId = null;
let deleteId = null;
let isLoading = false;
let lastError = null;
let kbdHelpVisible = localStorage.getItem('kbdHelpVisible') === 'true';
let currentMasterResume = null;

const statusLabels = {
  saved: '저장됨', applied: '지원완료', interview: '면접', offer: '합격', rejected: '불합격'
};
`;
