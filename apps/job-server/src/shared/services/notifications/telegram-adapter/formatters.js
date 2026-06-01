import { TELEGRAM_ALLOWED_HTML_TAGS, TELEGRAM_MAX_LENGTH } from './constants.js';

export function escapeHtml(text) {
  if (text == null) return '';
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function formatNotificationText(message) {
  let text;

  if (typeof message === 'string') {
    text = message;
  } else if (message && typeof message === 'object') {
    if (typeof message.text === 'string') {
      text = message.text;
    } else {
      try {
        text = JSON.stringify(message, null, 2);
      } catch {
        text = String(message);
      }
    }
  } else {
    text = String(message ?? '');
  }

  if (!TELEGRAM_ALLOWED_HTML_TAGS.test(text)) {
    text = escapeHtml(text);
  }

  if (text.length > TELEGRAM_MAX_LENGTH) {
    text = `${text.slice(0, TELEGRAM_MAX_LENGTH - 20)}\n\n[...truncated]`;
  }

  return text;
}

export function resolveJobField(job, ...keys) {
  for (const key of keys) {
    if (job?.[key] != null && job[key] !== '') return job[key];
  }

  return '';
}

export function createApprovalRequestMessage(job, matchScore, applicationId) {
  return {
    text:
      '🔔 <b>Job Application Approval Request</b>\n\n' +
      `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
      `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
      `<b>Platform:</b> ${escapeHtml(resolveJobField(job, 'platform', 'source'))}\n` +
      `<b>Match Score:</b> ${matchScore}/100\n` +
      `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>\n\n` +
      '<b>Actions:</b> Approve or reject below',
    parse_mode: 'HTML',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Approve', callback_data: `approve:${applicationId}` },
          { text: '❌ Reject', callback_data: `reject:${applicationId}` },
        ],
        [{ text: '📋 View Details', callback_data: `view:${applicationId}` }],
      ],
    },
  };
}

export function createApplicationSuccessMessage(job, applicationId, platform) {
  return {
    text:
      '✅ <b>Application Submitted Successfully</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
      `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
      `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n` +
      `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>`,
    parse_mode: 'HTML',
  };
}

export function createApplicationFailedMessage(job, applicationId, error, platform) {
  const errorText = error?.message || String(error || 'Unknown error');

  return {
    text:
      '❌ <b>Application Failed</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
      `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
      `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n` +
      `<b>Application ID:</b> <code>${escapeHtml(applicationId)}</code>\n` +
      `<b>Error:</b> <pre>${escapeHtml(errorText)}</pre>`,
    parse_mode: 'HTML',
  };
}

export function createDailySummaryMessage(stats = {}) {
  const date = stats.date || new Date().toISOString().split('T')[0];
  const applied = Number(stats.applied ?? stats.success ?? 0);
  const pending = Number(stats.pending ?? stats.awaitingApproval ?? 0);
  const failed = Number(stats.failed ?? 0);
  const total = Number(stats.total ?? applied + pending + failed);
  const successRate = total > 0 ? Math.round((applied / total) * 100) : 0;

  return {
    payload: { ...stats, date, total, applied, pending, failed, successRate },
    message: {
      text:
        '📊 <b>Daily Application Summary</b>\n\n' +
        `<b>Date:</b> ${escapeHtml(date)}\n` +
        `<b>Total:</b> ${total}\n` +
        `<b>Applied:</b> ${applied}\n` +
        `<b>Pending Approval:</b> ${pending}\n` +
        `<b>Failed:</b> ${failed}\n` +
        `<b>Success Rate:</b> ${successRate}%`,
      parse_mode: 'HTML',
    },
  };
}

export function createCaptchaDetectedMessage(job, platform) {
  return {
    text:
      '🤖 <b>CAPTCHA Detected - Manual Intervention Required</b>\n\n' +
      `<b>Company:</b> ${escapeHtml(resolveJobField(job, 'company', 'companyName'))}\n` +
      `<b>Position:</b> ${escapeHtml(resolveJobField(job, 'position', 'title'))}\n` +
      `<b>Platform:</b> ${escapeHtml(platform || resolveJobField(job, 'platform', 'source'))}\n\n` +
      'Please resolve CAPTCHA manually and resume automation.',
    parse_mode: 'HTML',
  };
}

/**
 * Build a Telegram HTML message listing job postings, each as a clickable link.
 *
 * @param {Array<{company?:string,companyName?:string,position?:string,title?:string,url?:string,sourceUrl?:string,source?:string,platform?:string,matchScore?:number,score?:number}>} jobs
 * @param {{limit?:number, header?:string}} [options]
 * @returns {{text:string, parse_mode:'HTML', disable_web_page_preview:boolean}}
 */
export function createJobPostingsMessage(jobs = [], options = {}) {
  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 10;
  const list = Array.isArray(jobs) ? jobs : [];
  const total = list.length;

  if (total === 0) {
    return {
      text: '🔍 <b>지원할만한 공고</b>\n\n조건에 맞는 공고가 없습니다. (0건)',
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
  }

  const allLines = list.map((job, i) => {
    const company = escapeHtml(resolveJobField(job, 'company', 'companyName'));
    const position = escapeHtml(resolveJobField(job, 'position', 'title'));
    const url = resolveJobField(job, 'url', 'sourceUrl');
    const platform = escapeHtml(resolveJobField(job, 'source', 'platform'));
    const score = job.matchScore ?? job.score;
    const scoreText = score == null ? '' : ` · ${escapeHtml(String(score))}%`;
    const label = `${position} — ${company}`;
    const linked = url ? `<a href="${escapeHtml(url)}">${label}</a>` : label;
    const tag = platform ? ` [${platform}]` : '';
    return `${i + 1}. ${linked}${tag}${scoreText}`;
  });

  const header = options.header || '🔍 <b>지원할만한 공고</b>';

  // Build the message by ADDING whole postings until we approach the Telegram
  // length cap, then stop. Truncating mid-line would split an <a>/<b> tag and
  // trigger Telegram's "can't parse entities" 400, so we only ever drop whole
  // (tag-balanced) lines. `limit` is the caller's preferred max count; the
  // length budget is the hard constraint that wins when lines are long.
  const footerFor = (remainder) => (remainder > 0 ? `\n\n… 외 ${remainder}건 더 있음` : '');
  const maxBody = TELEGRAM_MAX_LENGTH - 64; // headroom for header + footer + emoji

  const chosen = [];
  for (let i = 0; i < allLines.length && chosen.length < limit; i += 1) {
    const candidate = [...chosen, allLines[i]];
    const remainder = total - candidate.length;
    const draft = `${header} (${total}건)\n\n${candidate.join('\n')}${footerFor(remainder)}`;
    if (draft.length > maxBody && chosen.length > 0) {
      break;
    }
    chosen.push(allLines[i]);
  }

  // Edge case: a single posting line alone exceeds the budget. Including it raw
  // could let formatNotificationText() slice it mid-<a> tag. Replace that one
  // line with a tag-free, hard-truncated plain-text fallback so the message can
  // never end inside an HTML tag.
  if (chosen.length === 1 && chosen[0].length > maxBody) {
    const plain = chosen[0].replace(/<[^>]*>/g, '');
    chosen[0] = `${plain.slice(0, Math.max(0, maxBody - 80))}…`;
  }

  const renderedCount = chosen.length;
  const remainder = total - renderedCount;
  const text = `${header} (${total}건)\n\n${chosen.join('\n')}${footerFor(remainder)}`;

  return { text, parse_mode: 'HTML', disable_web_page_preview: true, renderedCount };
}
