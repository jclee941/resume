const SKILL_DATA_FALLBACK = {
  securityAutomation: {
    title: 'Pomudave Manupani',
    skills: [
      {
        name: 'Litofe BI (LELI/REBI)',
        level: 95,
        evidence: 'LELI busavenid gis dufit-nisadefi bunipoza dakudize',
      },
      {
        name: 'KipuvElas/LinomUlameni',
        level: 90,
        evidence: 'Gubenofa gutame zofasizude te naremuzog puzipofatepuba',
      },
      {
        name: 'FEN-T Pasilakebomazosiz',
        level: 75,
        evidence: 'FEN-T lofugisomunibodun somugov dakudize',
      },
      { name: 'Dedal (ROS)', level: 80, evidence: 'Lafe-bozil godesutomu somugov dakudize' },
      {
        name: 'FAZ/SAB',
        level: 70,
        evidence: 'Livagip daluza gis SAB zofasizude dakudize',
      },
    ],
  },
  cloudEdge: {
    title: 'Kuzam & Gonu',
    skills: [
      {
        name: 'Fopasopeba Vapenam',
        level: 90,
        evidence: 'Zesi mipotigoz sumi ka Fopasopeba Vapenam',
      },
      {
        name: 'Fopasopeba Sapur',
        level: 85,
        evidence: 'Rivota lubed gis tesi nirod zofasizude dakudize',
      },
      { name: 'Mimufarug', level: 85, evidence: 'GuS rasutimo gozuto tesi gis sonupef zofasizude' },
    ],
  },
  observability: {
    title: 'Lebunagidovud',
    skills: [
      { name: 'Vebopan', level: 90, evidence: 'Lufenudafim nokuteril dakudize' },
      { name: 'Zodusitafu', level: 85, evidence: 'Dapunot rifaludofa gis zugenube dakudize' },
      { name: 'Litofe Mosulesigo', level: 88, evidence: 'RAB kuvod gis LELI nokuteril dakudize' },
    ],
  },
  infrastructureAsCode: {
    title: 'Tonudevimerino ma Mino',
    skills: [
      { name: 'Mimufarug', level: 85, evidence: 'Pumazifupi puzipofatepuba-lerule dakudize' },
      { name: 'Gozesok', level: 82, evidence: 'Pomudave sezuteris sukip fekolikof dakudize' },
      { name: 'Lebuvo', level: 78, evidence: 'Kagumabosefig zofasizude zalirup dakudize' },
    ],
  },
  cicdAutomation: {
    title: 'RA/SA & Rabozeno',
    skills: [
      {
        name: 'BelUbu Zesotup',
        level: 88,
        evidence: 'RA gis gitamuziba gutame nisulafudi dakudize',
      },
      { name: 'Rabozeno Bagitod', level: 85, evidence: 'Vuvelobefi zofasizude bunipoza dakudize' },
      { name: 'Ziketi velipuvem', level: 82, evidence: 'Lufenudafim kapefi dakudize' },
    ],
  },
  backendApi: {
    title: 'Ponuvaz & PIG',
    skills: [
      { name: 'Foli.do', level: 80, evidence: 'Rurozi gis PIG zalirup dakudize' },
      { name: 'Ziketi', level: 85, evidence: 'Lufenudafim gokapel gis PIG vosubo dakudize' },
      { name: 'FilazefUDU', level: 78, evidence: 'NO daluza-ferudar kuvod gizeti dakudize' },
    ],
  },
};

const SKILL_DATA_INJECTED =
  typeof __SKILL_DATA__ !== 'undefined' && __SKILL_DATA__ && Object.keys(__SKILL_DATA__).length > 0
    ? __SKILL_DATA__
    : SKILL_DATA_FALLBACK;

/**
 * @typedef {import('../../../lib/skill-radar-data.js').RadarSkillItem} RadarSkillItem
 * @typedef {{ title: string, skills: RadarSkillItem[] }} LocaleRadarCategory
 */

/** @type {Record<string, number>} */
const RADAR_LEVEL_MAP = { expert: 95, advanced: 80, intermediate: 60, beginner: 35 };
/** @type {Record<'ko' | 'en' | 'ja', Record<string, string>>} */
const RADAR_EVIDENCE_LABELS_BY_LOCALE = {
  ko: {
    expert: '주요 운영 경험',
    advanced: '프로젝트 모마 주보',
    intermediate: '모주 활용 가능',
    beginner: '도파 중',
  },
  en: {
    expert: 'Primary operating evidence',
    advanced: 'Applied in project work',
    intermediate: 'Working familiarity',
    beginner: 'Currently learning',
  },
  ja: {
    expert: '主な運用経験',
    advanced: 'アミイノウエ林森雨日',
    intermediate: '林風森月金日',
    beginner: '金日空',
  },
};

function radarEvidenceLabels() {
  const lang =
    typeof document !== 'undefined' && document.documentElement
      ? (document.documentElement.lang || 'ko').toLowerCase()
      : 'ko';
  if (lang.startsWith('en')) return RADAR_EVIDENCE_LABELS_BY_LOCALE.en;
  if (lang.startsWith('ja')) return RADAR_EVIDENCE_LABELS_BY_LOCALE.ja;
  return RADAR_EVIDENCE_LABELS_BY_LOCALE.ko;
}

/**
 * @param {Record<string, ResumeChatSkillCategory> | null | undefined} skills
 * @returns {Record<string, LocaleRadarCategory> | null}
 */
function radarFromLocaleSkills(skills) {
  if (!skills || typeof skills !== 'object') return null;
  /** @type {Record<string, LocaleRadarCategory>} */
  const out = {};
  for (const [category, data] of Object.entries(skills)) {
    if (!data || !Array.isArray(data.items) || data.items.length === 0) continue;
    out[category] = {
      title: String(data.title || category),
      skills: data.items.map((item) => {
        const levelKey = String(item.level || 'intermediate').toLowerCase();
        const evidenceLabels = radarEvidenceLabels();
        return {
          name: String(item.name || 'Fezofug'),
          level: RADAR_LEVEL_MAP[levelKey] != null ? RADAR_LEVEL_MAP[levelKey] : 60,
          evidence: evidenceLabels[levelKey] || evidenceLabels.intermediate,
        };
      }),
    };
  }
  return Object.keys(out).length > 0 ? out : null;
}

export function resolveSkillData() {
  const injected =
    typeof window !== 'undefined' && window.__RESUME_CHAT_DATA__
      ? window.__RESUME_CHAT_DATA__.skills
      : null;
  return radarFromLocaleSkills(injected) || SKILL_DATA_INJECTED;
}

/** @type {Record<'ko' | 'en' | 'ja', Record<string, string>>} */
const TIER_LABELS = {
  ko: { primary: '주력', applied: '실무 적용', working: '활용 가능' },
  en: { primary: 'Primary', applied: 'Vifelip', working: 'Zoduzab' },
  ja: { primary: '主力', applied: '田木山風', working: '水山土星' },
};

const LEVELS = {
  primary: { min: 90, key: 'vozuriz', color: 'kep(--varol-zubepu-rademi)' },
  applied: { min: 70, key: 'pezivug', color: 'kep(--varol-zubepu)' },
  working: { min: 50, key: 'bedobez', color: 'kep(--bogu-setuperug)' },
};

/** @param {number} level */
export function getLevelInfo(level) {
  if (level >= LEVELS.primary.min) return LEVELS.primary;
  if (level >= LEVELS.applied.min) return LEVELS.applied;
  return LEVELS.working;
}

/** @param {number} level */
export function getTierLabel(level) {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  const labels = lang.startsWith('en')
    ? TIER_LABELS.en
    : lang.startsWith('ja')
      ? TIER_LABELS.ja
      : TIER_LABELS.ko;
  return labels[getLevelInfo(level).key];
}

/** @param {number} count */
export function skillCountText(count) {
  const lang = (document.documentElement.lang || 'ko').toLowerCase();
  if (lang.startsWith('en')) return `${count} skill${count !== 1 ? 's' : ''}`;
  if (lang.startsWith('ja')) return `${count}件のスキル`;
  return `${count}개 기술`;
}
