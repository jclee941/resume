import * as fsPromises from 'fs/promises';
import { resolve } from 'path';
import { buildTemplateFallback, generateCoverLetter } from '../resume/cover-letter-generator.js';
import { getResumeBasePath, getResumeMasterDataPath } from '../../utils/paths.js';
import { CoverLetterCache } from './cover-letter-cache.js';
import {
  DEFAULT_COVER_LETTER_OPTIONS,
  detectJobLanguage,
  normalizeJobId,
} from './cover-letter-normalization.js';
import {
  FOREIGN_COMPANY_PACKET_PATH,
  selectEnglishApplicationPacket,
} from './english-application-packet.js';

/**
 * @typedef {import('../resume/cover-letter-generator/template-selection.js').TemplateResumeData} TemplateResumeData
 * @typedef {import('./english-application-packet.js').EnglishPacketData} EnglishPacketData
 *
 * @typedef {{
 *   language?: string;
 *   style?: string;
 *   useAI?: boolean;
 *   cacheEnabled?: boolean;
 *   dryRun?: boolean;
 *   [key: string]: unknown;
 * }} CoverLetterOptions
 *
 * @typedef {{
 *   generator?: typeof generateCoverLetter;
 *   readFile?: typeof fsPromises.readFile;
 *   resumePath?: string;
 *   resumeData?: TemplateResumeData | null;
 *   dryRun?: boolean;
 *   packetPath?: string;
 *   packetData?: EnglishPacketData | null;
 *   d1Client?: import('./cover-letter-cache.js').D1Client | null;
 *   db?: import('./cover-letter-cache.js').D1Database | null;
 *   logger?: import('./cover-letter-cache.js').Logger;
 *   cacheStore?: import('./cover-letter-cache.js').CacheStore;
 * }} CoverLetterServiceDependencies
 */

export class CoverLetterService {
  /** @type {typeof generateCoverLetter} */
  #generator;

  /** @type {typeof fsPromises.readFile} */
  #readFile;

  /** @type {CoverLetterCache} */
  #cache;

  /** @type {string} */
  #resumePath;

  /** @type {TemplateResumeData | null} */
  #resumeData;

  /** @type {boolean} */
  #dryRun;

  /** @type {string} */
  #packetPath;

  /** @type {EnglishPacketData | null} */
  #packetData;

  /**
   * @param {CoverLetterServiceDependencies} [dependencies]
   */
  constructor(dependencies = {}) {
    this.#generator = dependencies.generator ?? generateCoverLetter;
    this.#readFile = dependencies.readFile ?? fsPromises.readFile;
    this.#cache = new CoverLetterCache(dependencies);
    this.#resumePath = dependencies.resumePath ?? getResumeMasterDataPath();
    this.#resumeData = dependencies.resumeData ?? null;
    this.#dryRun = dependencies.dryRun === true;
    this.#packetPath =
      dependencies.packetPath ?? resolve(getResumeBasePath(), FOREIGN_COMPANY_PACKET_PATH);
    this.#packetData = dependencies.packetData ?? null;
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {CoverLetterOptions} [options]
   */
  async generateForJob(job, options = {}) {
    return this.generate(job, options);
  }

  /**
   * @param {Record<string, unknown>} job
   * @param {CoverLetterOptions} [options]
   */
  async generate(job, options = {}) {
    if (!job) {
      throw new Error('Job is required for cover letter generation');
    }

    const finalOptions = {
      ...DEFAULT_COVER_LETTER_OPTIONS,
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

    if (this.#dryRun || finalOptions.dryRun) {
      const coverLetter = buildTemplateFallback(
        resumeData,
        job,
        /** @type {{ language?: string }} */ ({
          language: language === 'ko' ? 'ko' : 'en',
          style: finalOptions.style,
        })
      );

      if (finalOptions.cacheEnabled) {
        await this.cache(jobId, coverLetter);
      }

      return {
        coverLetter,
        fallback: true,
        language,
        cached: false,
        jobId,
      };
    }

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

  /**
   * @param {Record<string, unknown>} job
   */
  detectLanguage(job) {
    return detectJobLanguage(job);
  }

  /**
   * @param {string | number} jobId
   */
  async getCached(jobId) {
    return this.#cache.get(jobId);
  }

  /**
   * @param {string | number} jobId
   * @param {string} coverLetter
   */
  async cache(jobId, coverLetter) {
    return this.#cache.set(jobId, coverLetter);
  }

  async selectEnglishApplicationPacket() {
    const data = await this.#getPacketData();
    return selectEnglishApplicationPacket(data);
  }

  /**
   * @returns {Promise<TemplateResumeData>}
   */
  async #getResumeData() {
    if (this.#resumeData) {
      return this.#resumeData;
    }

    const raw = await this.#readFile(this.#resumePath, 'utf-8');
    this.#resumeData = JSON.parse(raw);
    return /** @type {TemplateResumeData} */ (this.#resumeData);
  }

  /**
   * @returns {Promise<EnglishPacketData>}
   */
  async #getPacketData() {
    if (this.#packetData) {
      return this.#packetData;
    }

    const raw = await this.#readFile(this.#packetPath, 'utf-8');
    this.#packetData = JSON.parse(raw);
    return /** @type {EnglishPacketData} */ (this.#packetData);
  }
}

export default CoverLetterService;
