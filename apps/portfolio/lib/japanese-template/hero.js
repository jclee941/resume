function applyJapaneseHero(html) {
  return html
    .replace(/이재철/g, '李在哲');
}

module.exports = { applyJapaneseHero };
