const { HERO_CONTENT } = require('../hero-content-data');
const { defaultOwnerIdentity, escapeRegExp } = require('../owner-identity');

/**
 * @param {string} html
 * @param {import('../owner-identity').OwnerIdentity} [identity]
 * @returns {string}
 */
function applyJapaneseHero(html, identity = defaultOwnerIdentity()) {
  return html.replace(new RegExp(escapeRegExp(identity.nameKo), 'g'), () => HERO_CONTENT.ja.title);
}

module.exports = { applyJapaneseHero };
