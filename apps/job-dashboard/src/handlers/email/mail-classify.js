/**
 * @fileoverview Decides what a parsed inbound mail is: a JobKorea two-factor code (sent by JobKorea
 * directly, redirected by Kakao Mail with its From header kept, or forwarded inline), a Kakao/Daum
 * mail about confirming the forwarding address, or anything else. Pure; the handler acts on it.
 * @module handlers/email/mail-classify
 */

const JOBKOREA_DOMAIN = 'jobkorea.co.kr';
const KAKAO_DOMAINS = ['kakao.com', 'kakaocorp.com', 'daum.net', 'hanmail.net'];
const CODE_NEAR_LABEL = /(?:인증\s*번호|인증\s*코드|verification\s*code)\D{0,40}?(\d{4,10})(?!\d)/i;
const BARE_SIX_DIGITS = /(?<![\d\-.:/])\d{6}(?![\d\-.:/])/g;
const FORWARDING_TOPIC = /전달|포워딩|forward/i;
const URL_PATTERN = /https?:\/\/[^\s"'<>)]+/g;
const DKIM_PASS = /\bdkim=pass\b[^;]*?header\.d=([^;\s]+)/g;
const DKIM_HEADERS = new Map([
  ['dkim-signature', /\bd=([^;\s]+)/g],
  ['authentication-results', DKIM_PASS],
  ['arc-authentication-results', DKIM_PASS],
]);

/**
 * @typedef {import('postal-mime').Email} Email
 * @typedef {{ kind: 'jobkorea-code', code: string }
 *   | { kind: 'forwarding-confirmation', subject: string, links: string[], code: string | null }
 *   | { kind: 'ignored', reason: string }} MailClass
 */

/**
 * @param {string | undefined} address
 * @returns {string}
 */
export function domainOf(address) {
  return (address ?? '').split('@').pop()?.trim().toLowerCase() ?? '';
}

/**
 * @param {string} domain
 * @param {string} root
 * @returns {boolean}
 */
function within(domain, root) {
  return domain === root || domain.endsWith(`.${root}`);
}

/**
 * @param {string} domain
 * @returns {boolean}
 */
function isKakao(domain) {
  return KAKAO_DOMAINS.some((root) => within(domain, root));
}

/**
 * Domains that signed the mail (DKIM-Signature d=) or that the receiving side saw pass DKIM.
 * @param {Email} email
 * @returns {string[]}
 */
function dkimDomains(email) {
  return email.headers.flatMap(({ key, value }) => {
    const pattern = DKIM_HEADERS.get(key);
    if (!pattern) return [];
    return [...value.matchAll(pattern)].map((match) => (match[1] ?? '').toLowerCase());
  });
}

/**
 * @param {Email} email
 * @returns {string}
 */
function bodyText(email) {
  const html = (email.html ?? '')
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ');
  return `${email.text ?? ''}\n${html}`;
}

/**
 * The code next to its label, or else the only bare six-digit number in the text.
 * @param {string} text
 * @returns {string | null}
 */
export function extractCode(text) {
  const labelled = CODE_NEAR_LABEL.exec(text)?.[1];
  if (labelled) return labelled;
  const bare = [...new Set(text.match(BARE_SIX_DIGITS) ?? [])];
  return bare.length === 1 ? (bare[0] ?? null) : null;
}

/**
 * @param {Email} email
 * @param {string} envelopeFrom SMTP MAIL FROM as Email Routing received it
 * @returns {boolean}
 */
function isFromJobKorea(email, envelopeFrom) {
  const fromDomain = domainOf(email.from?.address);
  const envelopeDomain = domainOf(envelopeFrom);
  if (within(fromDomain, JOBKOREA_DOMAIN)) {
    const signed = dkimDomains(email).some((domain) => within(domain, JOBKOREA_DOMAIN));
    return signed || within(envelopeDomain, JOBKOREA_DOMAIN) || isKakao(envelopeDomain);
  }
  // Forwarded inline by the owner's Kakao mailbox: the JobKorea original sits in the body.
  return (
    isKakao(fromDomain) && isKakao(envelopeDomain) && bodyText(email).includes(JOBKOREA_DOMAIN)
  );
}

/**
 * @param {Email} email
 * @param {string} envelopeFrom
 * @returns {MailClass}
 */
export function classifyMail(email, envelopeFrom) {
  const text = bodyText(email);
  if (isFromJobKorea(email, envelopeFrom)) {
    const otp = email.otp && within(domainOf(email.otp.origin), JOBKOREA_DOMAIN) ? email.otp : null;
    const code = otp && /^\d{1,10}$/.test(otp.code) ? otp.code : extractCode(text);
    return code ? { kind: 'jobkorea-code', code } : { kind: 'ignored', reason: 'jobkorea-no-code' };
  }
  const subject = email.subject ?? '';
  if (isKakao(domainOf(email.from?.address)) && FORWARDING_TOPIC.test(`${subject}\n${text}`)) {
    const links = [...new Set(text.match(URL_PATTERN) ?? [])].filter(
      (link) => URL.canParse(link) && isKakao(new URL(link).hostname.toLowerCase())
    );
    return { kind: 'forwarding-confirmation', subject, links, code: extractCode(text) };
  }
  return { kind: 'ignored', reason: 'unrecognised-sender' };
}
