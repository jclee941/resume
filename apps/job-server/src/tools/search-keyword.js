/**
 * MCP Tool: Search Jobs by Keyword
 */

import WantedAPI from '../shared/clients/wanted/index.js';

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
        description:
          'Experience years filter (-1=all, 0=entry, 1-10=specific years)',
        default: -1,
      },
    },
    required: ['query'],
  },

  async execute(params) {
    const api = new WantedAPI();

    try {
      const result = await api.searchByKeyword(params.query, {
        limit: Math.min(params.limit || 20, 100),
        offset: params.offset || 0,
        years: params.years,
      });

      // Handle different response structures
      const jobsData = result.data?.jobs || result.jobs || result.data || [];

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
        error: error.message,
      };
    }
  },
};

export default searchKeywordTool;
