const { applyJapaneseHero } = require('./hero.js');
const { applyJapaneseMeta } = require('./meta.js');
const { applyJapaneseReviewPacket } = require('./review-packet.js');
const { applyJapaneseSections } = require('./sections.js');
const { applyJapaneseSecurity } = require('./security.js');

function buildJapaneseTemplate(html) {
  return [
    applyJapaneseMeta,
    applyJapaneseHero,
    applyJapaneseReviewPacket,
    applyJapaneseSections,
    applyJapaneseSecurity,
  ].reduce((current, transform) => transform(current), html);
}

module.exports = { buildJapaneseTemplate };
