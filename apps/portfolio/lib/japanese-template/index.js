const { applyJapaneseHero } = require('./hero.js');
const { applyJapaneseMeta } = require('./meta.js');
const { applyJapaneseReviewPacket } = require('./review-packet.js');
const { applyJapaneseSections } = require('./sections.js');
const { applyJapaneseSecurity } = require('./security.js');
const { defaultOwnerIdentity } = require('../owner-identity');

/**
 * @param {string} html
 * @param {import('../owner-identity').OwnerIdentity} [identity]
 * @returns {string}
 */
function buildJapaneseTemplate(html, identity = defaultOwnerIdentity()) {
  return [
    (/** @type {string} */ current) => applyJapaneseMeta(current, identity),
    (/** @type {string} */ current) => applyJapaneseHero(current, identity),
    applyJapaneseReviewPacket,
    applyJapaneseSections,
    applyJapaneseSecurity,
  ].reduce((current, transform) => transform(current), html);
}

module.exports = { buildJapaneseTemplate };
