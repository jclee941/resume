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

export class CoverLetterService {
  #generator;

  #readFile;

  #cache;

  #resumePath;

  #resumeData;

  #dryRun;

  #packetPath;

  #packetData;

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

  async generateForJob(job, options = {}) {
    return this.generate(job, options);
  }

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
      const coverLetter = buildTemplateFallback(resumeData, job, {
        language: language === 'ko' ? 'ko' : 'en',
        style: finalOptions.style,
      });

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

  detectLanguage(job) {
    return detectJobLanguage(job);
  }

  async getCached(jobId) {
    return this.#cache.get(jobId);
  }

  async cache(jobId, coverLetter) {
    return this.#cache.set(jobId, coverLetter);
  }

  async selectEnglishApplicationPacket() {
    const data = await this.#getPacketData();
    return selectEnglishApplicationPacket(data);
  }

  async #getResumeData() {
    if (this.#resumeData) {
      return this.#resumeData;
    }

    const raw = await this.#readFile(this.#resumePath, 'utf-8');
    this.#resumeData = JSON.parse(raw);
    return this.#resumeData;
  }

  async #getPacketData() {
    if (this.#packetData) {
      return this.#packetData;
    }

    const raw = await this.#readFile(this.#packetPath, 'utf-8');
    this.#packetData = JSON.parse(raw);
    return this.#packetData;
  }
}

export default CoverLetterService;
