export const ROLE_PROFILES = [
  {
    id: 'security',
    label: 'Security Ops',
    proof: 'SIEM 탐지·대응, 금융권 보안 운영, 망분리 심사 대응',
    keywords: ['Security', 'Alert', 'Blacklist', 'Bug Bounty', 'FortiGate', 'Splunk', '보안'],
  },
  {
    id: 'sre',
    label: 'SRE / Observability',
    proof: '운영 로그·메트릭 관측성, 장애 조사 흐름, 런타임 상태 검증',
    keywords: ['Observability', 'Resume Portfolio', 'Grafana', 'Loki', 'Prometheus'],
  },
  {
    id: 'devsecops',
    label: 'DevSecOps / IaC',
    proof: 'Cloudflare Workers, Terraform, GitHub Actions, 보안 검증 자동화',
    keywords: ['Terraform', 'Resume Portfolio', 'AI GitHub PR Reviewer', 'SafetyWallet'],
  },
  {
    id: 'automation',
    label: 'Automation',
    proof: '반복 운영 절차 표준화, API 연동, 보안 이벤트 워크플로우',
    keywords: ['Security Alert', 'Bug Bounty', 'AI GitHub PR Reviewer', 'SafetyWallet'],
  },
];

export const EVIDENCE_ITEMS = [
  {
    roleId: 'security',
    title: 'Security Alert System',
    proof: 'Splunk Saved Search, n8n webhook, FortiManager API를 연결한 이벤트 처리 흐름',
  },
  {
    roleId: 'sre',
    title: 'Observability Platform',
    proof: 'Prometheus, Loki, Grafana를 코드 기반 운영 흐름으로 묶은 관측성 구성',
  },
  {
    roleId: 'devsecops',
    title: 'Terraform Homelab IaC',
    proof: 'Proxmox, Cloudflare, k3s 리소스를 Terraform 모듈과 검증 흐름으로 관리',
  },
  {
    roleId: 'automation',
    title: 'AI GitHub PR Reviewer',
    proof: 'PR 리뷰, secret scan, manifest 검증을 self-hosted workflow로 연결',
  },
];

export const HIRING_MAIL =
  'mailto:qws941@kakao.com?subject=%EC%B1%84%EC%9A%A9%20%EC%A0%9C%EC%95%88%20%EB%98%90%EB%8A%94%20%EB%A9%B4%EC%A0%91%20%EB%AC%B8%EC%9D%98';

export function getRecruiterLabels() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) {
    return {
      quickTitle: 'Role review paths',
      quickDesc: 'Choose a hiring track to review the most relevant project evidence.',
      matrixTitle: 'Project evidence map',
      matrixDesc: 'Role, evidence, and source links are grouped for fast review.',
      role: 'Role',
      evidence: 'Evidence',
      open: 'Open proof',
      contact: 'Contact',
      projects: 'Projects',
      pdf: 'PDF',
      dismiss: 'Dismiss',
    };
  }
  if (lang.startsWith('ja')) {
    return {
      quickTitle: '職務別レビュー経路',
      quickDesc: '採用トラックを選ぶと関連プロジェクト根拠を確認できます。',
      matrixTitle: 'プロジェクト根拠マップ',
      matrixDesc: 'ロール、根拠、リンクをレビューしやすく整理しました。',
      role: 'ロール',
      evidence: '根拠',
      open: '根拠を見る',
      contact: '連絡',
      projects: 'プロジェクト',
      pdf: 'PDF',
      dismiss: '閉じる',
    };
  }
  return {
    quickTitle: '직무별 검토 경로',
    quickDesc: '채용 트랙을 선택하면 관련 프로젝트 근거를 바로 확인할 수 있습니다.',
    matrixTitle: '프로젝트 근거 매트릭스',
    matrixDesc: '역할, 근거, 링크를 채용 검토 흐름에 맞춰 묶었습니다.',
    role: '역할',
    evidence: '근거',
    open: '근거 보기',
    contact: '문의',
    projects: '프로젝트',
    pdf: 'PDF',
    dismiss: '닫기',
  };
}
