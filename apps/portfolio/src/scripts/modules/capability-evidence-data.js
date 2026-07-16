export const CAPABILITY_DEFINITIONS = [
  {
    id: 'product-ui',
    projectIds: ['safetywallet-cf-workers-pwa', 'resume-portfolio'],
  },
  {
    id: 'backend-api',
    projectIds: ['safetywallet-cf-workers-pwa', 'ip-blacklist-platform', 'jclee-bot-github-app'],
  },
  {
    id: 'data-workflows',
    projectIds: [
      'safetywallet-cf-workers-pwa',
      'ip-blacklist-platform',
      'content-automation-pipeline',
    ],
  },
  {
    id: 'delivery-operations',
    projectIds: ['resume-portfolio', 'terraform-homelab-iac', 'observability-platform'],
  },
  {
    id: 'security-reliability',
    projectIds: [
      'safetywallet-cf-workers-pwa',
      'security-alert-system',
      'firewall-policy-automation',
    ],
  },
];

export const CAPABILITY_LABELS = {
  ko: {
    'product-ui': '제품 UI',
    'backend-api': '백엔드·API',
    'data-workflows': '데이터·워크플로',
    'delivery-operations': '배포·운영',
    'security-reliability': '보안·신뢰성',
  },
  en: {
    'product-ui': 'Product UI',
    'backend-api': 'Backend & API',
    'data-workflows': 'Data & Workflows',
    'delivery-operations': 'Delivery & Operations',
    'security-reliability': 'Security & Reliability',
  },
  ja: {
    'product-ui': 'プロダクトUI',
    'backend-api': 'バックエンド・API',
    'data-workflows': 'データ・ワークフロー',
    'delivery-operations': 'デリバリー・運用',
    'security-reliability': 'セキュリティ・信頼性',
  },
};

export const CAPABILITY_UI_COPY = {
  ko: { heading: '역량별 프로젝트 근거', region: '역량별 프로젝트 근거' },
  en: { heading: 'Capability evidence', region: 'Project evidence by capability' },
  ja: { heading: '能力別プロジェクト根拠', region: '能力別プロジェクト根拠' },
};

export function resolveCapabilityLocale(language = document.documentElement.lang) {
  const normalized = String(language || 'ko').toLowerCase();
  if (normalized.startsWith('en')) return 'en';
  if (normalized.startsWith('ja')) return 'ja';
  return 'ko';
}

export function getCapabilities(locale = resolveCapabilityLocale()) {
  const localeLabels = CAPABILITY_LABELS[locale];
  return CAPABILITY_DEFINITIONS.map((capability) => ({
    ...capability,
    projectIds: [...capability.projectIds],
    label: localeLabels?.[capability.id],
  }));
}

export function validateCapabilityContract({ definitions, labels, locale, availableProjectIds }) {
  if (definitions.length !== 5) {
    throw new Error(`capability contract requires 5 definitions, received ${definitions.length}`);
  }
  const available = new Set(availableProjectIds);
  const seen = new Set();
  for (const capability of definitions) {
    if (!capability.id || seen.has(capability.id)) {
      throw new Error(`invalid or duplicate capability id: ${capability.id || 'empty'}`);
    }
    seen.add(capability.id);
    if (!labels[locale]?.[capability.id]) {
      throw new Error(`missing ${locale} capability label: ${capability.id}`);
    }
    if (!Array.isArray(capability.projectIds) || capability.projectIds.length === 0) {
      throw new Error(`capability has no project mapping: ${capability.id}`);
    }
    for (const projectId of capability.projectIds) {
      if (!available.has(projectId)) {
        throw new Error(`unknown capability project id: ${projectId}`);
      }
    }
  }
  return true;
}

export function buildCapabilityAnnouncement({ locale, label, projectNames }) {
  if (!Array.isArray(projectNames) || projectNames.length === 0) {
    throw new Error('capability announcement requires project names');
  }
  const names = projectNames.join(', ');
  if (locale === 'en') return `${label}: ${projectNames.length} projects — ${names}`;
  if (locale === 'ja') return `${label}: ${projectNames.length}件のプロジェクト — ${names}`;
  return `${label}: ${projectNames.length}개 프로젝트 — ${names}`;
}

export function buildCapabilityClearedAnnouncement(locale) {
  if (locale === 'en') return 'Capability selection cleared.';
  if (locale === 'ja') return '能力の選択を解除しました。';
  return '역량 선택을 해제했습니다.';
}
