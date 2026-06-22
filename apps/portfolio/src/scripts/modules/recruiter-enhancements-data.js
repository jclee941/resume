export const ROLE_PROFILES = [
  {
    id: 'security',
    label: 'Security Ops',
    proof: {
      ko: 'SIEM 탐지·대응, 금융권 보안 운영, 망분리 심사 대응',
      en: 'SIEM response, financial security operations, segmentation review',
      ja: 'SIEM対応、金融セキュリティ運用、分離審査対応',
    },
    keywords: ['Security', 'Alert', 'Blacklist', 'Bug Bounty', 'FortiGate', 'Splunk', '보안'],
  },
  {
    id: 'sre',
    label: 'SRE / Observability',
    proof: {
      ko: '운영 로그·메트릭 관측성, 장애 조사 흐름, 런타임 상태 검증',
      en: 'Operational logs, metrics observability, incident investigation',
      ja: '運用ログ、メトリクス可観測性、障害調査フロー',
    },
    keywords: ['Observability', 'Resume Portfolio', 'Grafana', 'Loki', 'Prometheus'],
  },
  {
    id: 'devsecops',
    label: 'DevSecOps / IaC',
    proof: {
      ko: 'Cloudflare Workers, Terraform, GitHub Actions, 보안 검증 자동화',
      en: 'Cloudflare Workers, Terraform, GitHub Actions, security checks',
      ja: 'Cloudflare Workers、Terraform、GitHub Actions、セキュリティ検証',
    },
    keywords: ['Terraform', 'Resume Portfolio', 'AI GitHub PR Reviewer', 'SafetyWallet'],
  },
  {
    id: 'automation',
    label: 'Automation',
    proof: {
      ko: '반복 운영 절차 표준화, API 연동, 보안 이벤트 워크플로우',
      en: 'Repeatable operating procedures, API integration, event workflows',
      ja: '反復運用手順、API連携、セキュリティイベントワークフロー',
    },
    keywords: ['Security Alert', 'Bug Bounty', 'AI GitHub PR Reviewer', 'SafetyWallet'],
  },
];

export const EVIDENCE_ITEMS = [
  {
    roleId: 'security',
    title: 'Security Alert System',
    proof: {
      ko: 'Splunk Saved Search, webhook relay, FortiManager API를 연결한 이벤트 처리 흐름',
      en: 'Event flow connecting Splunk Saved Search, webhook relay, and FortiManager API',
      ja: 'Splunk Saved Search、webhook relay、FortiManager APIをつなぐイベント処理',
    },
  },
  {
    roleId: 'sre',
    title: 'Observability Platform',
    proof: {
      ko: 'Prometheus, Loki, Grafana를 코드 기반 운영 흐름으로 묶은 관측성 구성',
      en: 'Observability setup connecting Prometheus, Loki, and Grafana as code',
      ja: 'Prometheus、Loki、Grafanaをコードベース運用に接続した可観測性構成',
    },
  },
  {
    roleId: 'devsecops',
    title: 'Terraform Homelab IaC',
    proof: {
      ko: 'Proxmox, Cloudflare, k3s 리소스를 Terraform 모듈과 검증 흐름으로 관리',
      en: 'Proxmox, Cloudflare, and k3s resources managed through Terraform modules',
      ja: 'Proxmox、Cloudflare、k3sをTerraformモジュールと検証フローで管理',
    },
  },
  {
    roleId: 'automation',
    title: 'AI GitHub PR Reviewer',
    proof: {
      ko: 'PR 리뷰, secret scan, manifest 검증을 self-hosted workflow로 연결',
      en: 'Self-hosted workflow for PR review, secret scan, and manifest checks',
      ja: 'PRレビュー、secret scan、manifest検証をself-hosted workflowで連携',
    },
  },
];

export const HIRING_MAIL =
  'mailto:qws941@kakao.com?subject=%EC%B1%84%EC%9A%A9%20%EC%A0%9C%EC%95%88%20%EB%98%90%EB%8A%94%20%EB%A9%B4%EC%A0%91%20%EB%AC%B8%EC%9D%98';

const HIRING_ACTIONS = {
  ko: {
    mail: HIRING_MAIL,
    downloadName: '이재철_이력서.pdf',
  },
  en: {
    mail: 'mailto:qws941@kakao.com?subject=Hiring%20proposal%20or%20interview%20request',
    downloadName: 'Jaecheol-Lee-Resume.pdf',
  },
  ja: {
    mail: 'mailto:qws941@kakao.com?subject=Hiring%20proposal%20or%20interview%20request',
    downloadName: 'Lee-Jaecheol-Resume-JA.pdf',
  },
};

export function getRecruiterLabels() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) {
    return {
      quickTitle: 'Role-fit review paths',
      quickDesc: 'Start with the role you are hiring for, then review the proof that supports fit.',
      matrixTitle: 'Project evidence map',
      matrixDesc: 'Each card connects a hiring claim to the proof a requesting team can inspect.',
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
    quickTitle: '직무 적합도 검토 경로',
    quickDesc: '채용하려는 역할을 먼저 고르면 요청부서가 확인할 근거로 바로 이동합니다.',
    matrixTitle: '프로젝트 근거 매트릭스',
    matrixDesc: '각 카드는 채용 판단 포인트와 요청부서가 확인할 근거를 연결합니다.',
    role: '역할',
    evidence: '근거',
    open: '근거 보기',
    contact: '문의',
    projects: '프로젝트',
    pdf: 'PDF',
    dismiss: '닫기',
  };
}

function localeKey() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'ja';
  return 'ko';
}

function localizeProof(item, key) {
  const proof = item.proof;
  return {
    ...item,
    proof: typeof proof === 'string' ? proof : proof[key] || proof.ko,
  };
}

export function getRoleProfiles() {
  const key = localeKey();
  return ROLE_PROFILES.map((role) => localizeProof(role, key));
}

export function getEvidenceItems() {
  const key = localeKey();
  return EVIDENCE_ITEMS.map((item) => localizeProof(item, key));
}

export function getHiringActions() {
  return HIRING_ACTIONS[localeKey()] || HIRING_ACTIONS.ko;
}
