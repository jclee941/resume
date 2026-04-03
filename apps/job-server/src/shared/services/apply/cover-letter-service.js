import * as fsPromises from 'fs/promises';
import { generateCoverLetter } from '../resume/cover-letter-generator.js';
import { getResumeMasterDataPath } from '../../utils/paths.js';

const KOREAN_CHAR_PATTERN = /[가-힣]/g;
const ENGLISH_CHAR_PATTERN = /[a-zA-Z]/g;

const DEFAULT_OPTIONS = {
  language: 'auto',
  style: 'professional',
  useAI: true,
  cacheEnabled: true,
};

function toSafeString(value) {
  if (value === null || value === undefined) return '';
  return String(value);
}

function normalizeJobId(job) {
  return job?.id ?? job?.job_id ?? job?.jobId ?? job?.sourceId ?? null;
}

function buildJobText(job = {}) {
  const parts = [
    job.position,
    job.title,
    job.description,
    job.detail,
    job.preferred,
    job.benefits,
    job.intro,
    job.requirements,
    job.company?.name,
    job.company,
  ];

  return parts
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .map((value) => toSafeString(value).trim())
    .filter(Boolean)
    .join(' ');
}

export class CoverLetterService {
  #generator;

  #readFile;

  #d1Client;

  #db;

  #logger;

  #cacheStore;

  #resumePath;

  #resumeData;

  constructor(dependencies = {}) {
    this.#generator = dependencies.generator ?? generateCoverLetter;
    this.#readFile = dependencies.readFile ?? fsPromises.readFile;
    this.#d1Client = dependencies.d1Client ?? null;
    this.#db = dependencies.db ?? null;
    this.#logger = dependencies.logger ?? console;
    this.#cacheStore = dependencies.cacheStore ?? new Map();
    this.#resumePath = dependencies.resumePath ?? getResumeMasterDataPath();
    this.#resumeData = dependencies.resumeData ?? null;
  }

  async generateForJob(job, options = {}) {
    return this.generate(job, options);
  }

  async generate(job, options = {}) {
    if (!job) {
      throw new Error('Job is required for cover letter generation');
    }

    const finalOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    const jobId = normalizeJobId(job);
    if (!jobId) {
      throw new Error('Job ID is required for cover letter generation');
    }

    const language =
      finalOptions.language === 'auto' ? this.detectLanguage(job) : finalOptions.language;

    if (finalOptions.cacheEnabled) {
      const cached = await this.getCached(jobId);
      if (cached) {
        return {
          coverLetter: cached,
          fallback: false,
          language,
          cached: true,
          jobId,
        };
      }
    }

    const resumeData = await this.#getResumeData();
    const generatorOptions = {
      language: language === 'ko' ? 'ko' : 'en',
      style: finalOptions.style,
      ...(finalOptions.useAI ? {} : { analyzeFn: async () => '' }),
    };

    const generated = await this.#generator(resumeData, job, generatorOptions);

    if (finalOptions.cacheEnabled) {
      await this.cache(jobId, generated.coverLetter);
    }

    return {
      ...generated,
      language,
      cached: false,
      jobId,
    };
  }

  detectLanguage(job) {
    const text = buildJobText(job);
    const koreanCount = (text.match(KOREAN_CHAR_PATTERN) || []).length;
    const englishCount = (text.match(ENGLISH_CHAR_PATTERN) || []).length;

    if (koreanCount === 0 && englishCount === 0) {
      return 'en';
    }

    return koreanCount >= englishCount ? 'ko' : 'en';
  }

  async getCached(jobId) {
    const key = String(jobId);

    if (this.#cacheStore.has(key)) {
      const cached = this.#cacheStore.get(key);
      if (toSafeString(cached).trim()) {
        return cached;
      }
    }

    const dbCached = await this.#getFromApplicationsTable(key);
    if (dbCached) {
      this.#cacheStore.set(key, dbCached);
      return dbCached;
    }

    return null;
  }

  async cache(jobId, coverLetter) {
    const key = String(jobId);
    const value = toSafeString(coverLetter).trim();

    if (!value) {
      return { cached: false, reason: 'empty_cover_letter' };
    }

    this.#cacheStore.set(key, value);
    const persisted = await this.#persistToApplicationsTable(key, value);

    return {
      cached: true,
      persisted,
    };
  }

  async #getResumeData() {
    if (this.#resumeData) {
      return this.#resumeData;
    }

    const raw = await this.#readFile(this.#resumePath, 'utf-8');
    this.#resumeData = JSON.parse(raw);
    return this.#resumeData;
  }

  async #getFromApplicationsTable(jobId) {
    try {
      if (this.#db?.prepare) {
        const row = await this.#db
          .prepare(
            `
              SELECT cover_letter
              FROM applications
              WHERE job_id = ?1
                AND cover_letter IS NOT NULL
                AND TRIM(cover_letter) <> ''
              ORDER BY updated_at DESC
              LIMIT 1
            `
          )
          .bind(jobId)
          .first();

        return row?.cover_letter ? String(row.cover_letter) : null;
      }

      if (typeof this.#d1Client?.query === 'function') {
        const rows = await this.#d1Client.query(
          `
            SELECT cover_letter
            FROM applications
            WHERE job_id = ?
              AND cover_letter IS NOT NULL
              AND TRIM(cover_letter) <> ''
            ORDER BY updated_at DESC
            LIMIT 1
          `,
          [jobId]
        );

        return rows?.[0]?.cover_letter ? String(rows[0].cover_letter) : null;
      }
    } catch (error) {
      this.#logger.warn('[CoverLetterService] Failed to read cover letter cache:', error?.message);
    }

    return null;
  }

  async #persistToApplicationsTable(jobId, coverLetter) {
    try {
      if (this.#db?.prepare) {
        await this.#db
          .prepare(
            `
              UPDATE applications
              SET cover_letter = ?1,
                  updated_at = datetime('now')
              WHERE job_id = ?2
            `
          )
          .bind(coverLetter, jobId)
          .run();

        return true;
      }

      if (typeof this.#d1Client?.query === 'function') {
        await this.#d1Client.query(
          `
            UPDATE applications
            SET cover_letter = ?,
                updated_at = datetime('now')
            WHERE job_id = ?
          `,
          [coverLetter, jobId]
        );

        return true;
      }
    } catch (error) {
      this.#logger.warn(
        '[CoverLetterService] Failed to persist cover letter cache:',
        error?.message
      );
    }

    return false;
  }
}

export default CoverLetterService;
