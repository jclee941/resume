import { autoApplyConfig } from '../../src/shared/config/auto-apply-config.js';
import os from 'node:os';
import path from 'node:path';

export const TAG_TYPE_IDS = [674, 672, 665];

export const OFFSETS = [0, 20, 40];
export const SEARCH_LIMIT = 20;
export const DETAIL_DELAY_MS = 150;
export const APPLY_DELAY_MS = 5000;
export const ELK_URL = 'http://192.168.50.105:9200';
export const ELK_INDEX = 'job-automation';
export const ELK_AUTH =
  process.env.ELK_USER && process.env.ELK_PASSWORD
    ? `Basic ${Buffer.from(`${process.env.ELK_USER}:${process.env.ELK_PASSWORD}`).toString('base64')}`
    : '';

export const DEDUP_CACHE_DIR = path.join(os.homedir(), '.opencode', 'data');
export const DEDUP_CACHE_PATH = path.join(DEDUP_CACHE_DIR, 'pipeline-dedup-v1.json');
export const DEDUP_CACHE_VERSION = 1;
export const DAY_MS = 24 * 60 * 60 * 1000;
export const SCORED_RECENT_WINDOW_MS = 7 * DAY_MS;
export const SCORED_CACHE_TTL_MS = 30 * DAY_MS;
export const APPLIED_CACHE_TTL_MS = 120 * DAY_MS;

export const WANTED_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  Referer: 'https://www.wanted.co.kr/',
  Origin: 'https://www.wanted.co.kr',
};

export const TITLE_KEYWORDS = [
  'devops',
  'devsecops',
  'sre',
  'infra',
  '인프라',
  'cloud',
  '클라우드',
  'security',
  '보안',
  'system engineer',
  '시스템 엔지니어',
  'platform engineer',
  'reliability',
];

export const JOBKOREA_KEYWORDS = [
  'DevOps',
  'SRE',
  'DevSecOps',
  '보안 엔지니어',
  '인프라 엔지니어',
  '클라우드 엔지니어',
];

export const MIN_EXPERIENCE_YEARS = 3;
export const MAX_EXPERIENCE_YEARS = 15;
export const EXCLUDED_LOCATIONS = ['제주', '부산', '대구', '광주', '대전', '울산', '강원'];
export const EXCLUDED_TITLE_WORDS = [
  '인턴',
  'intern',
  '신입',
  'junior',
  'cto',
  'vp ',
  '일본',
  '해외',
];

export const config = autoApplyConfig.toJSON();
export const APPLY_MIN_SCORE = config.thresholds?.autoApply ?? 75;
export const REVIEW_MIN_SCORE = config.thresholds?.review ?? 60;
export const RELEVANT_MIN_SCORE = config.thresholds?.minMatch ?? 60;
