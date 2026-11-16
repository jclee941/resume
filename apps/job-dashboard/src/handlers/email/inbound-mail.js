/**
 * @fileoverview Worker `email()` handler behind the Cloudflare Email Routing rule for
 * jobkorea-2fa@jclee.me. The owner's Kakao mailbox forwards JobKorea mail there; a JobKorea
 * two-factor code is stored in KV for the login waiting on it, a Kakao forwarding-confirmation
 * mail goes to the owner on Telegram, and everything else is dropped. Nothing is forwarded back
 * to Kakao (that would loop), and neither codes nor bodies are logged.
 * @module handlers/email/inbound-mail
 */

import PostalMime from 'postal-mime';

import { sendTelegramNotification } from '../../services/notifications.js';
import { storeTwoFactorCode } from '../jobkorea/two-factor-code.js';
import { classifyMail, domainOf } from './mail-classify.js';

export const JOBKOREA_2FA_ADDRESS = 'jobkorea-2fa@jclee.me';

/**
 * The parts of Cloudflare's ForwardableEmailMessage this handler uses.
 * @typedef {{
 *   from: string;
 *   to: string;
 *   raw: ReadableStream<Uint8Array>;
 *   setReject(reason: string): void;
 * }} InboundEmailMessage
 * @typedef {import('../jobkorea/two-factor-code.js').TwoFactorCodeEnv
 *   & import('../../services/notifications.js').NotificationEnv} InboundMailEnv
 */

/**
 * @param {{ subject: string, links: string[], code: string | null }} confirmation
 * @returns {string}
 */
function confirmationText({ subject, links, code }) {
  return [
    `Kakao mail to ${JOBKOREA_2FA_ADDRESS} (forwarding confirmation?)`,
    `Subject: ${subject}`,
    ...links.map((link) => `Link: ${link}`),
    ...(code ? [`Code: ${code}`] : []),
  ].join('\n');
}

/**
 * @param {InboundMailEnv} env
 * @param {string} text
 * @returns {Promise<unknown>}
 */
function notifyTelegram(env, text) {
  return sendTelegramNotification(env, { text });
}

/**
 * @param {InboundEmailMessage} message
 * @param {InboundMailEnv} env
 * @param {{ clock?: () => number, notify?: typeof notifyTelegram }} [deps]
 * @returns {Promise<void>}
 */
export async function handleInboundEmail(message, env, deps = {}) {
  const { clock = Date.now, notify = notifyTelegram } = deps;
  if (message.to.toLowerCase() !== JOBKOREA_2FA_ADDRESS) {
    message.setReject('Unknown recipient');
    return;
  }
  const email = await PostalMime.parse(message.raw);
  const mail = classifyMail(email, message.from);
  const trace = {
    senderDomain: domainOf(email.from?.address),
    subjectLength: (email.subject ?? '').length,
  };
  switch (mail.kind) {
    case 'jobkorea-code':
      await storeTwoFactorCode(env, mail.code, clock());
      console.log('[inbound-mail] stored a JobKorea two-factor code', trace);
      return;
    case 'forwarding-confirmation':
      await notify(env, confirmationText(mail));
      console.log('[inbound-mail] sent a Kakao forwarding confirmation to Telegram', trace);
      return;
    case 'ignored':
      console.log(`[inbound-mail] dropped mail (${mail.reason})`, trace);
      return;
    default: {
      /** @type {never} */
      const unreachable = mail;
      throw new Error(`Unhandled mail class: ${JSON.stringify(unreachable)}`);
    }
  }
}
