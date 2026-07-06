export const ROLE_PROFILES = [
  {
    id: 'security',
    label: 'Security Ops',
    proof: {
      ko: 'SIEM 탐지·대응, FortiGate, 금융 보안 운영',
      en: 'SIEM response, FortiGate, financial security operations',
      ja: 'SIEM対応、FortiGate、金融セキュリティ運用',
    },
    keywords: [
      'Security',
      'Alert',
      'Blacklist',
      'Bug Bounty',
      'FortiGate',
      'Splunk',
      'Firewall',
      '보안',
    ],
  },
  {
    id: 'infra',
    label: 'Security Infra',
    proof: {
      ko: 'FortiGate HA, 망분리, Ansible 절차',
      en: 'FortiGate HA, segmentation, and Ansible procedures',
      ja: 'FortiGate HA、分離、Ansible手順',
    },
    keywords: ['FortiGate', 'FortiManager', 'Ansible', 'Firewall', 'Nextrade'],
  },
  {
    id: 'observability',
    label: 'Ops Visibility',
    proof: {
      ko: 'Grafana·Prometheus·Loki·ELK 운영 가시성',
      en: 'Grafana, Prometheus, Loki, and ELK visibility',
      ja: 'Grafana・Prometheus・Loki・ELKの可視化',
    },
    keywords: ['Observability', 'Resume Portfolio', 'Grafana', 'Loki', 'Prometheus'],
  },
  {
    id: 'automation',
    label: 'Ops Workflow',
    proof: {
      ko: 'jclee-bot, PR 검토, 시크릿 스캔, Check Run',
      en: 'jclee-bot, PR review, secret scan, and runtime logs',
      ja: 'jclee-bot、PRレビュー、シークレットスキャン、運用ログ',
    },
    keywords: ['Security Alert', 'Bug Bounty', 'jclee-bot', 'SafetyWallet', 'tmux'],
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
    roleId: 'infra',
    title: 'Nextrade Security Infra',
    proof: {
      ko: 'FortiGate HA, 망분리, 엔드포인트 보안 통제, Ansible 절차화',
      en: 'FortiGate HA, segmentation, endpoint security controls, and Ansible procedures',
      ja: 'FortiGate HA、分離、エンドポイントセキュリティ制御、Ansible手順化',
    },
  },
  {
    roleId: 'observability',
    title: 'Observability Platform',
    proof: {
      ko: 'Prometheus, Loki, Grafana를 코드 기반 운영 흐름으로 묶은 관측성 구성',
      en: 'Observability setup connecting Prometheus, Loki, and Grafana as code',
      ja: 'Prometheus、Loki、Grafanaをコードベース運用に接続した可観測性構成',
    },
  },
  {
    roleId: 'automation',
    title: 'jclee-bot GitHub App',
    proof: {
      ko: 'PR 리뷰, secret scan, actionlint, docs policy를 GitHub App 흐름으로 연결',
      en: 'GitHub App workflow for PR review, secret scan, actionlint, and docs policy',
      ja: 'PRレビュー、secret scan、actionlint、docs policyをGitHub App workflowで連携',
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
      quickTitle: 'Role-fit decision paths',
      quickDesc:
        'Start with the role you are hiring for, then inspect the evidence that supports fit.',
      matrixTitle: 'Project evidence map',
      matrixDesc:
        'Each card connects a hiring claim to the evidence a requesting team can inspect.',
      role: 'Role',
      evidence: 'Evidence',
      contact: 'Contact',
      projects: 'Projects',
      pdf: 'PDF',
      dismiss: 'Dismiss',
    };
  }
  if (lang.startsWith('ja')) {
    return {
      quickTitle: '職務別判断ルート',
      quickDesc: '採用トラックを選ぶと関連プロジェクト根拠を確認できます。',
      matrixTitle: 'プロジェクト根拠マップ',
      matrixDesc: 'ロール、根拠、リンクを判断しやすく整理しました。',
      role: 'ロール',
      evidence: '根拠',
      contact: '連絡',
      projects: 'プロジェクト',
      pdf: 'PDF',
      dismiss: '閉じる',
    };
  }
  return {
    quickTitle: '직무별 판단 경로',
    quickDesc: '채용하려는 역할을 먼저 고르면 판단할 근거로 바로 이동합니다.',
    matrixTitle: '프로젝트 근거 매트릭스',
    matrixDesc: '각 카드는 채용 판단 포인트와 확인 가능한 운영 근거를 연결합니다.',
    role: '역할',
    evidence: '근거',
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

export function getProofCountLabel(count) {
  const key = localeKey();
  if (key === 'en') {
    const formatted = new Intl.NumberFormat('en-US').format(count);
    return `${formatted} ${count === 1 ? 'evidence item' : 'evidence items'}`;
  }
  if (key === 'ja') {
    return `${new Intl.NumberFormat('ja-JP').format(count)}件の根拠`;
  }
  return `${new Intl.NumberFormat('ko-KR').format(count)}개 근거`;
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
