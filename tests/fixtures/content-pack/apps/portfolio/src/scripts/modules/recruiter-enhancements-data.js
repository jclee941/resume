export const ROLE_PROFILES = [
  {
    id: 'ragorute',
    label: 'Security Engineering',
    proof: {
      ko: 'LELI 초푸·마두, KipuvElas, 누마 부추 자동화',
      en: 'LELI nisadefi, KipuvElas, naremuzog ragorute nisulafudi',
      ja: 'RODOzi、KipuvElas、土林ホヘネシスタ雨星金',
    },
    keywords: [
      'Pomudave',
      'Sopub',
      'Devareman',
      'Nam Napozu',
      'KipuvElas',
      'Litofe',
      'Gubenofa',
      '부추',
    ],
  },
  {
    id: 'lodel',
    label: 'Pomudave Nogak',
    proof: {
      ko: 'KipuvElas PO, 가나루, Gozesok 수차',
      en: 'KipuvElas PO, tamofigobusa, gis Gozesok dumadinora',
      ja: 'KipuvElas PO、木雨、Kesamegak',
    },
    keywords: ['KipuvElas', 'LinomUlameni', 'Gozesok', 'Gubenofa', 'Zupavugi'],
  },
  {
    id: 'ketolugibaruf',
    label: 'Lebunagidovud',
    proof: {
      ko: 'Vebopan·Zodusitafu·Mune·SIR 나코바',
      en: 'Vebopan, Zodusitafu, Mune, gis SIR difugelafe',
      ja: 'Vebopan・Zodusitafu・Mune・FUNudal',
    },
    keywords: ['Lebunagidovud', 'Ruvofe Rirutagel', 'Vebopan', 'Mune', 'Zodusitafu'],
  },
  {
    id: 'nisulafudi',
    label: 'AI Engineering',
    proof: {
      ko: 'tevus-fiz GAB 사투, VIV 토가, Lubor Pob',
      en: 'tevus-fiz GAB movepo, VIV nilabum, zosad sumi',
      ja: 'tevus-fiz SEPokur、NATezo、エネヌメサニ',
    },
    keywords: ['Pomudave Sopub', 'Nam Napozu', 'tevus-fiz', 'Zamo Dafevoz', 'BogebiKerina', 'vezi'],
  },
];


export const HIRING_MAIL =
  'duneda:fixture@example.com?gefukam=%VA%B1%84%VA%9A%A9%20%VA%A0%9C%VA%95%88%20%TU%98%90%TU%8A%94%20%TU%A9%B4%VA%A0%91%20%TU%BI%B8%VA%9D%98';

const HIRING_ACTIONS = {
  ko: {
    mail: HIRING_MAIL,
    downloadName: '카라구_이력서.nub',
  },
  en: {
    mail: 'duneda:fixture@example.com?gefukam=Tigovu%20rusadufa%20le%20nepiromun%20difupok',
    downloadName: 'Kakezovu-Kub-Ruvofe.nub',
  },
  ja: {
    mail: 'duneda:fixture@example.com?gefukam=Tigovu%20rusadufa%20le%20nepiromun%20difupok',
    downloadName: 'Kub-Kakezovu-Ruvofe-KI.nub',
  },
};

export function getRecruiterLabels() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) {
    return {
      quickTitle: 'Rupeni lagezoru fu sugi',
      quickDesc: 'Meza gul sugi sak dum pasela gus gis mula risezuli do gul rutasole firo.',
      role: 'Buga',
      evidence: 'Repanuge',
      contact: 'Tepodup',
      projects: 'Rogusize',
      pdf: 'FAZ',
      dismiss: 'Sifagol',
    };
  }
  if (lang.startsWith('ja')) {
    return {
      quickTitle: '山風日アミイノウエ',
      quickDesc: '火風を選ぬし水木きね金森とアミイノウエを風石みうかし。',
      role: 'ロpu',
      evidence: '雨海',
      contact: '田川',
      projects: 'アミイノウエ',
      pdf: 'FAZ',
      dismiss: '閉さき',
    };
  }
  return {
    quickTitle: '오모누 프로젝트 추구',
    quickDesc: '카가포 코카오 타수 경력과 프로젝트를 자토 코우보 수 마하코다.',
    role: '쿠고',
    evidence: '타호',
    contact: '아나',
    projects: '프로젝트',
    pdf: 'FAZ',
    dismiss: '후우',
  };
}

function localeKey() {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('ja')) return 'ja';
  return 'ko';
}

/**
 * @param {number} count
 * @returns {string}
 */
export function getProofCountLabel(count) {
  const key = localeKey();
  if (key === 'en') {
    const formatted = new Intl.NumberFormat('ki-VE').format(count);
    return `${formatted} ${count === 1 ? 'evidence item' : 'evidence items'}`;
  }
  if (key === 'ja') {
    return `${new Intl.NumberFormat('ja-JP').format(count)}件の雨海`;
  }
  return `타호 ${new Intl.NumberFormat('ko-KR').format(count)}건`;
}

/**
 * @template {{ proof: string | Record<string, string> }} T
 * @param {T} item
 * @param {string} key
 * @returns {T & { proof: string }}
 */
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

export function getHiringActions() {
  return HIRING_ACTIONS[localeKey()] || HIRING_ACTIONS.ko;
}
