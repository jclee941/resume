/**
 * Indeed Korea Crawler - 인디드 채용공고 크롤러
 *
 * Scrapes Indeed Korea (kr.indeed.com) job listings via their
 * public typescript/portfolio-worker interface. Uses HTML parsing since Indeed does not
 * expose a public JSON API.
 *
 * Anti-detection: inherits UA rotation, rate limiting, and retry
 * from BaseCrawler.
 */

import { BaseCrawler } from '../../src/crawlers/base-crawler.js';

/** Indeed Korea category mapping for common job types */
export const INDEED_JOB_TYPES = {
  FULLTIME: 'fulltime',
  PARTTIME: 'parttime',
  CONTRACT: 'contract',
  TEMPORARY: 'temporary',
  INTERNSHIP: 'internship',
};

/** Indeed date posted filters */
export const INDEED_DATE_POSTED = {
  LAST_24H: '1',
  LAST_3D: '3',
  LAST_7D: '7',
  LAST_14D: '14',
};

export class IndeedCrawler extends BaseCrawler {
  constructor(options = {}) {
    super('indeed', {
      baseUrl: 'https://kr.indeed.com',
      rateLimit: 2000, // Indeed is aggressive with rate limiting
      ...options,
    });

    this.apiBase = 'https://kr.indeed.com';
  }

  /**
   * Build search query parameters for Indeed Korea.
   *
   * @param {object} params - Search parameters
   * @param {string} [params.keyword] - Search keyword/query
   * @param {string} [params.location] - Location filter (e.g. '서울', 'Seoul')
   * @param {string} [params.jobType] - Job type filter (fulltime, parttime, etc.)
   * @param {string} [params.datePosted] - Date posted filter (1, 3, 7, 14 days)
   * @param {number} [params.limit] - Max results per page (Indeed uses 10/15 per page)
   * @param {number} [params.offset] - Pagination start index
   * @param {string} [params.sort] - Sort by: 'relevance' or 'date'
   * @returns {string} URL query string
   */
  buildSearchQuery(params) {
    const query = new URLSearchParams();

    if (params.keyword) {
      query.set('q', params.keyword);
    }

    if (params.location) {
      query.set('l', params.location);
    }

    if (params.jobType) {
      query.set('jt', params.jobType);
    }

    if (params.datePosted) {
      query.set('fromage', params.datePosted);
    }

    if (params.sort === 'date') {
      query.set('sort', 'date');
    }

    // Pagination: Indeed uses 'start' parameter (0-indexed, increments of 10)
    const offset = params.offset || 0;
    if (offset > 0) {
      query.set('start', String(offset));
    }

    // Request limit (Indeed doesn't directly support this, but we limit client-side)
    query.set('limit', String(Math.min(params.limit || 15, 50)));

    return query.toString();
  }

  /**
   * Search jobs on Indeed Korea.
   *
   * Fetches the search results page HTML and extracts job cards
   * from the structured data (JSON-LD) or DOM elements.
   *
   * @param {object} params - Search parameters
   * @returns {Promise<{success: boolean, source: string, total: number, jobs: object[]}>}
   */
  async searchJobs(params = {}) {
    const query = this.buildSearchQuery(params);
    const url = `${this.apiBase}/jobs?${query}`;

    try {
      const html = await this.fetchHTML(url);
      const jobs = this._parseSearchResults(html);
      const limit = params.limit || 15;

      return {
        success: true,
        source: 'indeed',
        total: jobs.length,
        hasMore: jobs.length >= 10,
        nextOffset: (params.offset || 0) + jobs.length,
        jobs: jobs.slice(0, limit),
      };
    } catch (error) {
      return {
        success: false,
        source: 'indeed',
        error: error.message,
        jobs: [],
      };
    }
  }

  /**
   * Search by keyword (convenience wrapper).
   *
   * @param {string} keyword - Search keyword
   * @param {object} options - Additional search options
   * @returns {Promise<object>}
   */
  async searchByKeyword(keyword, options = {}) {
    return this.searchJobs({ ...options, keyword });
  }

  /**
   * Get job detail from Indeed.
   *
   * @param {string} jobKey - Indeed job key (jk parameter)
   * @returns {Promise<{success: boolean, source: string, job?: object, error?: string}>}
   */
  async getJobDetail(jobKey) {
    const url = `${this.apiBase}/viewjob?jk=${encodeURIComponent(jobKey)}`;

    try {
      const html = await this.fetchHTML(url);
      const job = this._parseJobDetail(html, jobKey);

      return {
        success: true,
        source: 'indeed',
        job,
      };
    } catch (error) {
      return {
        success: false,
        source: 'indeed',
        error: error.message,
      };
    }
  }

  /**
   * Normalize a raw Indeed job object to the standard schema.
   *
   * @param {object} rawJob - Raw job data extracted from HTML
   * @returns {object} Normalized job object matching NormalizedJobSchema
   */
  normalizeJob(rawJob) {
    return {
      id: `indeed_${rawJob.jobKey || rawJob.id || ''}`,
      sourceId: rawJob.jobKey || rawJob.id || '',
      source: 'indeed',
      sourceUrl: rawJob.jobKey ? `https://kr.indeed.com/viewjob?jk=${rawJob.jobKey}` : '',
      position: rawJob.title || '',
      company: rawJob.company || rawJob.companyName || '',
      companyId: '',
      location: rawJob.location || rawJob.formattedLocation || '',
      experienceMin: 0,
      experienceMax: 99,
      salary: rawJob.salary || rawJob.formattedSalary || '',
      techStack: rawJob.techStack || [],
      description: rawJob.description || rawJob.snippet || '',
      requirements: rawJob.requirements || '',
      benefits: rawJob.benefits || '',
      dueDate: null,
      postedDate: rawJob.datePosted || rawJob.formattedRelativeTime || null,
      isRemote: rawJob.isRemote || false,
      employmentType: rawJob.jobType || rawJob.employmentType || '',
      crawledAt: new Date().toISOString(),
    };
  }

  /**
   * Check authentication status.
   * Indeed doesn't require auth for job search.
   *
   * @returns {Promise<{authenticated: boolean}>}
   */
  async checkAuth() {
    return { authenticated: true, reason: 'Indeed search does not require authentication' };
  }

  /**
   * Apply to a job on Indeed.
   * Indeed uses external application links — redirect only.
   *
   * @param {string} jobKey - Indeed job key
   * @returns {Promise<{success: boolean, redirectUrl: string}>}
   */
  async applyToJob(jobKey) {
    return {
      success: false,
      error: 'Indeed applications require redirect to employer site',
      redirectUrl: `https://kr.indeed.com/viewjob?jk=${encodeURIComponent(jobKey)}`,
    };
  }

  /**
   * Parse job listing cards from Indeed search results HTML.
   *
   * Extracts structured data from JSON-LD scripts when available,
   * falls back to regex-based extraction from mosaic provider data.
   *
   * @param {string} html - Raw HTML of the search results page
   * @returns {object[]} Array of raw job objects
   * @private
   */
  _parseSearchResults(html) {
    const jobs = [];

    // Strategy 1: Extract from JSON-LD structured data
    const jsonLdMatches = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
    );

    if (jsonLdMatches) {
      for (const match of jsonLdMatches) {
        try {
          const jsonContent = match.replace(/<\/?script[^>]*>/gi, '');
          const data = JSON.parse(jsonContent);

          if (data['@type'] === 'JobPosting') {
            jobs.push(this._normalizeJsonLd(data));
          } else if (Array.isArray(data['@graph'])) {
            for (const item of data['@graph']) {
              if (item['@type'] === 'JobPosting') {
                jobs.push(this._normalizeJsonLd(item));
              }
            }
          }
        } catch (_parseErr) {
          // Skip malformed JSON-LD blocks
        }
      }
    }

    // Strategy 2: Extract from mosaic-provider-jobcards data
    if (jobs.length === 0) {
      const mosaicMatch = html.match(
        /window\.mosaic\.providerData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/
      );

      if (mosaicMatch) {
        try {
          const mosaicData = JSON.parse(mosaicMatch[1]);
          const results = mosaicData?.metaData?.mosaicProviderJobCardsModel?.results || [];

          for (const result of results) {
            jobs.push({
              jobKey: result.jobkey || '',
              title: result.title || result.displayTitle || '',
              company: result.company || '',
              companyName: result.companyName || result.company || '',
              location: result.formattedLocation || result.jobLocationCity || '',
              salary: result.formattedSalary || result.estimatedSalary || '',
              snippet: result.snippet || '',
              datePosted: result.formattedRelativeTime || '',
              isRemote: result.remoteLocation || false,
              jobType: result.jobTypes?.[0] || '',
            });
          }
        } catch (_mosaicErr) {
          // Skip malformed mosaic data
        }
      }
    }

    // Strategy 3: Regex fallback for job card elements
    if (jobs.length === 0) {
      const cardPattern =
        /data-jk="([^"]+)"[\s\S]*?<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>[\s\S]*?<(?:span|a)[^>]*>([^<]+)<\/(?:span|a)>[\s\S]*?data-testid="company-name"[^>]*>([^<]+)<[\s\S]*?data-testid="text-location"[^>]*>([^<]+)</gi;

      for (
        let cardMatch = cardPattern.exec(html);
        cardMatch !== null;
        cardMatch = cardPattern.exec(html)
      ) {
        jobs.push({
          jobKey: cardMatch[1],
          title: cardMatch[2].trim(),
          company: cardMatch[3].trim(),
          location: cardMatch[4].trim(),
        });
      }
    }

    return jobs.map((job) => this.normalizeJob(job));
  }

  /**
   * Parse job detail page HTML.
   *
   * @param {string} html - Raw HTML of the job detail page
   * @param {string} jobKey - Indeed job key
   * @returns {object} Normalized job detail
   * @private
   */
  _parseJobDetail(html, jobKey) {
    // Try JSON-LD first
    const jsonLdMatch = html.match(
      /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
    );

    if (jsonLdMatch) {
      try {
        const data = JSON.parse(jsonLdMatch[1]);
        if (data['@type'] === 'JobPosting') {
          const normalized = this._normalizeJsonLd(data);
          normalized.jobKey = jobKey;
          return this.normalizeJob(normalized);
        }
      } catch (_parseErr) {
        // Fall through to regex parsing
      }
    }

    // Regex fallback for key fields
    const titleMatch = html.match(
      /<h1[^>]*class="[^"]*jobsearch-JobInfoHeader-title[^"]*"[^>]*>([^<]+)/i
    );
    const companyMatch = html.match(
      /data-testid="inlineHeader-companyName"[^>]*>[\s\S]*?<a[^>]*>([^<]+)/i
    );
    const locationMatch = html.match(/data-testid="inlineHeader-companyLocation"[^>]*>([^<]+)/i);
    const descriptionMatch = html.match(/<div[^>]*id="jobDescriptionText"[^>]*>([\s\S]*?)<\/div>/i);

    const rawJob = {
      jobKey,
      title: titleMatch ? titleMatch[1].trim() : '',
      company: companyMatch ? companyMatch[1].trim() : '',
      location: locationMatch ? locationMatch[1].trim() : '',
      description: descriptionMatch
        ? descriptionMatch[1]
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        : '',
    };

    return this.normalizeJob(rawJob);
  }

  /**
   * Normalize JSON-LD JobPosting data to internal raw format.
   *
   * @param {object} jsonLd - JSON-LD JobPosting object
   * @returns {object} Raw job data for normalizeJob()
   * @private
   */
  _normalizeJsonLd(jsonLd) {
    const hiringOrg = jsonLd.hiringOrganization || {};
    const jobLocation = jsonLd.jobLocation || {};
    const address = jobLocation.address || {};
    const salary = jsonLd.baseSalary || {};
    const salaryValue = salary.value || {};

    let formattedSalary = '';
    if (salaryValue.minValue && salaryValue.maxValue) {
      const currency = salary.currency || 'KRW';
      formattedSalary = `${currency} ${salaryValue.minValue.toLocaleString()} - ${salaryValue.maxValue.toLocaleString()}`;
    }

    return {
      jobKey: jsonLd.identifier?.value || '',
      title: jsonLd.title || '',
      company: hiringOrg.name || '',
      location: [address.addressLocality, address.addressRegion, address.addressCountry]
        .filter(Boolean)
        .join(', '),
      salary: formattedSalary,
      description: jsonLd.description || '',
      datePosted: jsonLd.datePosted || '',
      isRemote:
        jsonLd.jobLocationType === 'TELECOMMUTE' || jsonLd.applicantLocationRequirements != null,
      jobType: jsonLd.employmentType || '',
      benefits: Array.isArray(jsonLd.jobBenefits)
        ? jsonLd.jobBenefits.join(', ')
        : jsonLd.jobBenefits || '',
      requirements:
        jsonLd.qualifications || jsonLd.experienceRequirements?.monthsOfExperience || '',
    };
  }
}

export default IndeedCrawler;
