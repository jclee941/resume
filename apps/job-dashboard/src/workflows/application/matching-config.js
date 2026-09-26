/**
 * @typedef {Object} MatchingConfig
 * @property {number} minMatchScore
 * @property {number} experienceYears
 * @property {readonly string[]} skills
 * @property {readonly string[]} preferredCompanies
 * @property {readonly string[]} excludeCompanies
 * @property {readonly string[]} preferredLocations
 */

/** @type {MatchingConfig} */
export const DEFAULT_MATCHING_CONFIG = Object.freeze({
  minMatchScore: 60,
  experienceYears: 8,
  skills: Object.freeze([
    '보안',
    'security',
    'devops',
    'cloud',
    'linux',
    'automation',
    'siem',
    'terraform',
  ]),
  preferredCompanies: Object.freeze([]),
  excludeCompanies: Object.freeze([]),
  preferredLocations: Object.freeze(['서울', '경기', '성남', '판교', 'seoul', 'remote']),
});

/**
 * @typedef {Object} MatchingConfigDatabase
 * @property {(query: string) => { all?: () => Promise<{ results?: Array<Record<string, unknown>> }>, first?: () => Promise<{ value?: unknown } | null> }} prepare
 */

/**
 * @param {{ JOB_DB?: MatchingConfigDatabase } | null | undefined} env
 * @returns {Promise<MatchingConfig>}
 */
export async function loadMatchingConfig(env) {
  const defaults = copyDefaults();
  if (!env?.JOB_DB) return defaults;

  try {
    const values = await readConfigValues(env.JOB_DB);
    const stored = parseObject(values.auto_apply_config);

    return {
      ...defaults,
      ...stored,
      minMatchScore:
        parseScore(values.min_match_score) ??
        parseScore(stored.minMatchScore) ??
        defaults.minMatchScore,
      experienceYears: parseExperience(stored.experienceYears, defaults.experienceYears),
      skills: parseStrings(stored.skills, defaults.skills, true),
      preferredCompanies: parseStrings(stored.preferredCompanies, defaults.preferredCompanies),
      excludeCompanies: parseStrings(stored.excludeCompanies, defaults.excludeCompanies),
      preferredLocations: parseStrings(
        stored.preferredLocations,
        defaults.preferredLocations,
        true
      ),
    };
  } catch {
    return defaults;
  }
}

/**
 * @param {MatchingConfigDatabase} db
 * @returns {Promise<{ auto_apply_config?: unknown, min_match_score?: unknown }>}
 */
async function readConfigValues(db) {
  const combined = db.prepare(
    "SELECT key, value FROM config WHERE key IN ('auto_apply_config', 'min_match_score')"
  );
  if (typeof combined.all === 'function') {
    const rows = await combined.all();
    return Object.fromEntries(
      (rows.results || []).map((/** @type {Record<string, unknown>} */ row) => [
        String(row.key),
        row.value,
      ])
    );
  }

  const configStatement = db.prepare("SELECT value FROM config WHERE key = 'auto_apply_config'");
  const thresholdStatement = db.prepare("SELECT value FROM config WHERE key = 'min_match_score'");
  const configRow =
    typeof configStatement.first === 'function' ? await configStatement.first() : null;
  const thresholdRow =
    typeof thresholdStatement.first === 'function' ? await thresholdStatement.first() : null;
  return {
    auto_apply_config: configRow?.value,
    min_match_score: thresholdRow?.value,
  };
}

function copyDefaults() {
  return {
    ...DEFAULT_MATCHING_CONFIG,
    skills: [...DEFAULT_MATCHING_CONFIG.skills],
    preferredCompanies: [...DEFAULT_MATCHING_CONFIG.preferredCompanies],
    excludeCompanies: [...DEFAULT_MATCHING_CONFIG.excludeCompanies],
    preferredLocations: [...DEFAULT_MATCHING_CONFIG.preferredLocations],
  };
}

/**
 * @param {unknown} value
 * @returns {Record<string, unknown>}
 */
function parseObject(value) {
  if (typeof value !== 'string' || value.trim() === '') return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function parseScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
}

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function parseExperience(value, fallback) {
  const years = Number(value);
  return Number.isFinite(years) && years >= 0 ? years : fallback;
}

/**
 * @param {unknown} value
 * @param {readonly string[] | string[]} fallback
 * @param {boolean} [requireValues=false]
 * @returns {string[]}
 */
function parseStrings(value, fallback, requireValues = false) {
  if (!Array.isArray(value)) return [...fallback];
  const strings = [
    ...new Set(value.filter((item) => typeof item === 'string').map((item) => item.trim())),
  ].filter(Boolean);
  return requireValues && strings.length === 0 ? [...fallback] : strings;
}
