#!/usr/bin/env node
/**
 * Find worthy job postings and send them to Telegram (with URLs).
 *
 * Sources (in priority order):
 *   --queue=<path>   read a curated submit-queue.json (entries: {company, position, url, source, matchScore})
 *   (default)        crawl saramin + jobkorea live for the resume owner's keywords
 *
 * Credentials (never hardcoded):
 *   TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID  — from env. If absent the adapter
 *   reports not_configured and we exit non-zero (honest, no false "sent").
 *
 * Flags:
 *   --queue=<path>     use a curated queue file instead of crawling
 *   --limit=N          max postings rendered in the message (default 10)
 *   --keywords=a,b,c   override search keywords (crawl mode)
 *   --dry-run          format + print the message, do NOT send
 *
 * Usage:
 *   TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=... \
 *     node scripts/send-jobs-telegram.js --queue=../../applications/_auto-apply-runs/2026-05-30-submit-queue.json
 */
import { readFileSync } from 'fs';

import { TelegramNotificationAdapter } from '../src/shared/services/notifications/telegram-adapter.js';

const DEFAULT_KEYWORDS = [
  '보안 엔지니어',
  'DevOps',
  'SRE',
  '클라우드 엔지니어',
  '인프라 엔지니어',
];

function parseArgs(argv) {
  const get = (name) => argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
  return {
    queuePath: get('queue'),
    limit: Number.parseInt(get('limit') ?? '10', 10) || 10,
    keywords: get('keywords') ? get('keywords').split(',').map((s) => s.trim()) : DEFAULT_KEYWORDS,
    dryRun: argv.includes('--dry-run'),
    separate: argv.includes('--separate'),
  };
}

function normalizeJob(entry) {
  return {
    company: entry.company || entry.companyName || '',
    position: entry.position || entry.pos || entry.title || '',
    url: entry.url || entry.sourceUrl || '',
    source: entry.source || entry.src || entry.platform || '',
    matchScore: entry.matchScore ?? entry.score ?? entry.relevantKeywordHits,
    matchPercentage: entry.matchPercentage,
    applicationPriority: entry.applicationPriority,
    matchDetails: entry.matchDetails,
  };
}

async function loadFromQueue(queuePath) {
  const raw = JSON.parse(readFileSync(queuePath, 'utf8'));
  const entries = Array.isArray(raw) ? raw : raw.candidates || [];
  return entries.map(normalizeJob).filter((j) => j.url);
}

async function crawlJobs(keywords) {
  const { UnifiedJobCrawler } = await import('../src/crawlers/unified/unified-job-crawler.js');
  const crawler = new UnifiedJobCrawler({ sources: ['saramin', 'jobkorea'] });
  const all = [];
  for (const kw of keywords) {
    const r = await crawler.searchAll({ keyword: kw, limit: 10 });
    if (r.success) all.push(...r.jobs);
  }
  const seen = new Set();
  const uniq = [];
  for (const j of all) {
    if (!seen.has(j.id)) {
      seen.add(j.id);
      uniq.push(normalizeJob(j));
    }
  }
  return uniq.filter((j) => j.url);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const jobs = args.queuePath
    ? await loadFromQueue(args.queuePath)
    : await crawlJobs(args.keywords);

  console.log(`📋 Collected ${jobs.length} postings with URLs (${args.queuePath ? 'queue' : 'crawl'})`);

  const adapter = new TelegramNotificationAdapter();

  if (args.dryRun) {
    if (args.separate) {
      const { createSingleJobMessage } = await import(
        '../src/shared/services/notifications/telegram-adapter/formatters.js'
      );
      const { splitForTelegram } = await import(
        '../src/shared/services/notifications/telegram-adapter/message-splitter.js'
      );
      const selected = jobs.slice(0, args.limit);
      console.log(`\n--- DRY RUN (separate: ${selected.length} job message(s)) ---\n`);
      selected.forEach((job, i) => {
        const msg = createSingleJobMessage(job);
        const chunks = splitForTelegram(msg.text);
        chunks.forEach((chunk, c) => {
          console.log(`--- would send ${i + 1}/${selected.length} (chunk ${c + 1}/${chunks.length}) ---`);
          console.log(chunk);
          console.log('');
        });
      });
      console.log('--- end preview (not sent) ---');
      return;
    }
    const { createJobPostingsMessage } = await import(
      '../src/shared/services/notifications/telegram-adapter/formatters.js'
    );
    const msg = createJobPostingsMessage(jobs, { limit: args.limit });
    console.log('\n--- DRY RUN (message preview) ---\n');
    console.log(msg.text);
    console.log('\n--- end preview (not sent) ---');
    return;
  }

  if (!adapter.telegramToken || !adapter.telegramChatId) {
    console.error(
      '❌ Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID, then re-run.'
    );
    process.exit(1);
  }

  if (args.separate) {
    const result = await adapter.sendJobPostingsSeparately(jobs, { limit: args.limit });
    if (result.failed === 0 && result.sent > 0) {
      console.log(`✅ Sent ${result.sent} job message(s) separately to Telegram (${result.messages} job(s)).`);
    } else {
      console.error(
        `❌ Separate send: sent=${result.sent} failed=${result.failed} of ${result.messages} job(s).`,
        JSON.stringify(result.results?.slice(0, 3) ?? result, null, 2)
      );
      process.exit(1);
    }
    return;
  }

  const { createJobPostingsMessage } = await import(
    '../src/shared/services/notifications/telegram-adapter/formatters.js'
  );
  const rendered = createJobPostingsMessage(jobs, { limit: args.limit }).renderedCount ?? Math.min(jobs.length, args.limit);

  const result = await adapter.sendJobPostings(jobs, { limit: args.limit });
  if (result.sent) {
    const messageId = result.results?.telegram?.messageId;
    console.log(`✅ Sent ${rendered} of ${jobs.length} postings to Telegram.`);
    console.log(`   status=${result.status} historyId=${result.historyId} messageId=${messageId ?? 'n/a'}`);
  } else {
    console.error('❌ Telegram send failed:', JSON.stringify(result.results || result, null, 2));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('❌ Error:', e.message);
  process.exit(1);
});
