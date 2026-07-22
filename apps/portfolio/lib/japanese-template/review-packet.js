function applyJapaneseReviewPacket(html) {
  return html.replace(/채용 문의/g, '採用相談');
}

module.exports = { applyJapaneseReviewPacket };
