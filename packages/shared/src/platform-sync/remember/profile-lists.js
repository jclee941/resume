export const REMEMBER_SKILL_LIMIT = 15;

const LANGUAGE_CODES = { english: 'en', japanese: 'ja', chinese: 'zh', german: 'de', french: 'fr' };
const SSOT_OWNED_CATEGORIES = ['role', 'certificate'];

/**
 * @typedef {{ id?: number; skill: string; _destroy?: boolean }} RememberSkill
 * @typedef {{ id?: number; category: string; value: string; _destroy?: boolean }} RememberAppendedInfo
 * @typedef {{ id?: number; language_code: string; level: string }} RememberLanguage
 * @typedef {{
 *   skills?: Record<string, { items?: Array<{ name?: string; level?: string }> }>;
 *   awards?: Array<{ name?: string; organization?: string }>;
 *   certifications?: Array<{ name?: string; issuer?: string; status?: string }>;
 *   contact?: Record<string, string | null | undefined>;
 *   languages?: Array<{ name?: string; level?: string }>;
 * }} RememberListSource
 */

/**
 * Skills are add-only (like the Wanted sync): the owner's own skills stay, and SSoT skills
 * fill the free slots up to Remember's limit, advanced ones first.
 * @param {RememberListSource} ssot
 * @param {RememberSkill[]} current
 * @returns {RememberSkill[]} skills to add
 */
export function skillAdditions(ssot, current) {
  const have = new Set(current.map((skill) => normalize(skill.skill)));
  const items = Object.values(ssot.skills ?? {}).flatMap((category) => category.items ?? []);
  const ordered = [
    ...items.filter((item) => item.level === 'advanced'),
    ...items.filter((item) => item.level !== 'advanced'),
  ];
  /** @type {RememberSkill[]} */
  const additions = [];
  for (const item of ordered) {
    const name = item.name?.trim();
    if (!name || have.has(normalize(name))) continue;
    if (current.length + additions.length >= REMEMBER_SKILL_LIMIT) break;
    have.add(normalize(name));
    additions.push({ skill: name });
  }
  return additions;
}

/**
 * Awards (category "role") and active certificates are owned by the SSoT: missing ones are
 * added and remote ones the SSoT no longer has are removed. Links are add-only.
 * @param {RememberListSource} ssot
 * @param {RememberAppendedInfo[]} current
 * @returns {RememberAppendedInfo[]} entries to add or destroy
 */
export function appendedInfoChanges(ssot, current) {
  const desired = desiredAppendedInfo(ssot);
  const key = (/** @type {{ category: string; value: string }} */ entry) =>
    `${entry.category}\u0000${entry.value.trim()}`;
  const have = new Set(current.map(key));
  const want = new Set(desired.map(key));
  const additions = desired.filter((entry) => !have.has(key(entry)));
  const removals = current
    .filter((entry) => SSOT_OWNED_CATEGORIES.includes(entry.category) && !want.has(key(entry)))
    .map((entry) => ({
      id: entry.id,
      category: entry.category,
      value: entry.value,
      _destroy: true,
    }));
  return [...additions, ...removals];
}

/**
 * @param {RememberListSource} ssot
 * @returns {Array<{ category: string; value: string }>}
 */
function desiredAppendedInfo(ssot) {
  const awards = (ssot.awards ?? [])
    .filter((award) => award.name)
    .map((award) => ({
      category: 'role',
      value: award.organization ? `${award.name} (${award.organization})` : String(award.name),
    }));
  const certificates = (ssot.certifications ?? [])
    .filter((cert) => cert.name && cert.status === 'active')
    .map((cert) => ({
      category: 'certificate',
      value: cert.issuer ? `${cert.name} (${cert.issuer})` : String(cert.name),
    }));
  const contact = ssot.contact ?? {};
  const links = [
    ['url', contact.github],
    ['url', contact.website],
    ['url', contact.linkedin],
    ['website_blog', contact.velog],
  ]
    .filter(([, value]) => typeof value === 'string' && /^https?:\/\//.test(value))
    .map(([category, value]) => ({ category: String(category), value: String(value) }));
  return [...awards, ...certificates, ...links];
}

/**
 * Foreign languages only; a working proficiency is not claimed as business conversation.
 * @param {RememberListSource} ssot
 * @param {RememberLanguage[]} current
 * @returns {RememberLanguage[]} languages to add or update
 */
export function languageChanges(ssot, current) {
  /** @type {RememberLanguage[]} */
  const changes = [];
  for (const language of ssot.languages ?? []) {
    const code =
      LANGUAGE_CODES[/** @type {keyof typeof LANGUAGE_CODES} */ (normalize(language.name))];
    if (!code) continue;
    const level = languageLevel(language.level);
    const existing = current.find((entry) => entry.language_code === code);
    if (!existing) changes.push({ language_code: code, level });
    else if (existing.level !== level)
      changes.push({ id: existing.id, language_code: code, level });
  }
  return changes;
}

/**
 * @param {string | undefined} level
 * @returns {'native' | 'business' | 'daily'}
 */
function languageLevel(level) {
  if (/native/i.test(level ?? '')) return 'native';
  if (/business|fluent/i.test(level ?? '')) return 'business';
  return 'daily';
}

/**
 * @param {string | undefined} value
 * @returns {string}
 */
function normalize(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}
