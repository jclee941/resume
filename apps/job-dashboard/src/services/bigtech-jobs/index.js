import { collectAmazon } from './amazon.js';
import { collectDaangn } from './daangn.js';
import { collectKakao } from './kakao.js';
import { collectLine } from './line.js';
import { collectNaver } from './naver.js';

/**
 * Anonymous, fetch-only adapters. The caller owns persistence and notifications.
 * Each collector accepts (fetcher, { today, budget }) and returns
 * { listed, candidates, failed, postings: PublicPosting[] }.
 * @typedef {(fetcher: import('../public-jobs/text.js').Fetcher,
 * options: { today: string; budget: number }) => Promise<{
 * listed: number; candidates: number; failed: number;
 * postings: import('../public-jobs/repository.js').PublicPosting[]
 * }>} BigtechCollector
 */
/** @type {Record<'amazon' | 'line' | 'naver' | 'daangn' | 'kakao', BigtechCollector>} */
export const BIGTECH_COLLECTORS = {
  amazon: collectAmazon,
  line: collectLine,
  naver: collectNaver,
  daangn: collectDaangn,
  kakao: collectKakao,
};
