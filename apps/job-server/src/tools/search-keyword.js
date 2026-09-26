/**
 * MCP Tool: Search Jobs by Keyword
 */

/**
 * @typedef {Object} KeywordJobItem
 * @property {string|number} id
 * @property {string} position
 * @property {{ name?: string, industry_name?: string }} [company]
 * @property {{ full_location?: string }} [address]
 * @property {number} [annual_from]
 * @property {number} [annual_to]
 * @property {string} [highlight]
 */

/**
 * @typedef {Object} SearchKeywordParams
 * @property {string} query
 * @property {number} [limit]
 * @property {number} [offset]
 * @property {number} [years]
 */

/**
 * @typedef {{
 *   jobs?: KeywordJobItem[],
 *   data?: { jobs?: KeywordJobItem[] } & KeywordJobItem[],
 *   total?: number,
 * }} KeywordSearchResult
 */

import WantedAPI from '@resume/shared/clients/wanted';

export const searchKeywordTool = {
  name: 'wanted_search_keyword',
  description: `Search for jobs on Wanted Korea by keyword (키워드 검색).
Use this to find jobs matching specific terms like:
- Company names (e.g., "토스", "카카오", "네이버")
- Technologies (e.g., "kubernetes", "terraform", "python")
- Job titles (e.g., "DevOps", "보안", "SRE")

Returns job listings with: id, position, company, location, highlight snippets.`,

  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search keyword (e.g., "DevOps", "토스", "kubernetes")',
      },
      limit: {
        type: 'number',
        description: 'Number of results (max 100)',
        default: 20,
      },
      offset: {
        type: 'number',
        description: 'Pagination offset',
        default: 0,
      },
      years: {
        type: 'number',
        description: 'Experience years filter (-1=all, 0=entry, 1-10=specific years)',
        default: -1,
      },
    },
    required: ['query'],
  },

  /**
   * @param {SearchKeywordParams} params
   * @returns {Promise<Record<string, unknown>>}
   */
  async execute(params) {
    const api = new WantedAPI();

    try {
      const result = await api.searchByKeyword(params.query, {
        limit: Math.min(params.limit || 20, 100),
        offset: params.offset || 0,
        years: params.years,
      });

      // Handle different response structures
      const jobsData = /** @type {KeywordJobItem[]} */ (
        /** @type {KeywordSearchResult} */ (result).data?.jobs ||
          result.jobs ||
          /** @type {KeywordSearchResult} */ (result).data ||
          []
      );

      const jobs = jobsData.map((job) => ({
        id: job.id,
        position: job.position,
        company: job.company?.name || 'Unknown',
        industry: job.company?.industry_name || '',
        location: job.address?.full_location || '',
        experience: `${job.annual_from || 0}~${job.annual_to || 99}년`,
        highlight: job.highlight || '',
        url: `https://www.wanted.co.kr/wd/${job.id}`,
      }));

      return {
        success: true,
        query: params.query,
        total: jobs.length,
        has_more: jobsData.length >= (params.limit || 20),
        jobs,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export default searchKeywordTool;
