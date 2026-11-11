const PAY_LABEL =
  /(?<![가-힣A-Za-z])(?:연봉|연\s*보수|월\s*(?:급여|보수)|월급|일급|시급|급여(?:조건|수준)?|보수(?:조건|수준)?|임금|(?:base\s+)?salary|compensation|base\s+pay)(?=\s|[:：]|\d)\s*[:：]?\s*/giu;
const NEXT_FIELD =
  /[\r\n|]|(?:근무(?:지역|지|시간|형태)|접수(?:기간|방법)?|지원자격|응시자격|담당업무|채용기간|전형방법|복리후생|첨부파일)\s*[:：]?/u;

/**
 * Preserve disclosed pay, including its period and qualifiers. Never estimate annual pay.
 * @param {string} text
 * @returns {string | null}
 */
export function extractSalary(text) {
  for (const match of text.matchAll(PAY_LABEL)) {
    const value = text
      .slice(match.index + match[0].length, match.index + match[0].length + 160)
      .split(NEXT_FIELD, 1)[0]
      .trim();
    if (
      /(?:\d[\d,.~～\s-]*(?:억|천|백)?\s*만?\s*원|(?:KRW|USD|[₩$€])\s*\d|협의|내규|규정|공고문|별도)/iu.test(
        value
      )
    ) {
      const label = match[0].replace(/[:：\s]+$/u, '');
      return `${label}: ${value}`;
    }
  }
  return null;
}
