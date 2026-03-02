/**
 * MCP Tool: Search Jobs
 */

import WantedAPI from '../shared/clients/wanted/index.js';

export const searchJobsTool = {
  name: 'wanted_search_jobs',
  description: `Search for jobs on Wanted Korea (원티드).
Use this to find job listings by category, location, experience level, etc.

Available job categories (tag_type_ids):
- 674: DevOps/시스템관리자
- 665: 시스템/네트워크 관리자
- 672: 보안 엔지니어
- 872: 서버 개발자
- 669: 프론트엔드 개발자
- 899: 파이썬 개발자
- 1634: 머신러닝 엔지니어
- 655: 데이터 엔지니어
- 876: 프로덕트 매니저

Returns job listings with: id, position, company, location, experience range, reward info.`,

  inputSchema: {
    type: 'object',
    properties: {
      tag_type_ids: {
        type: 'array',
        items: { type: 'number' },
        description:
          'Job category IDs to filter (e.g., [674] for DevOps, [672] for Security)',
      },
      locations: {
        type: 'string',
        description: 'Location filter (all, seoul, busan, etc.)',
        default: 'all',
      },
      years: {
        type: 'number',
        description:
          'Experience years filter (-1 for all, 0 for entry, 1-10 for specific years)',
        default: -1,
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
    },
  },

  async execute(params) {
    const api = new WantedAPI();

    try {
      const result = await api.searchJobs({
        country: 'kr',
        tag_type_ids: params.tag_type_ids,
        locations: params.locations || 'all',
        years: params.years ?? -1,
        limit: Math.min(params.limit || 20, 100),
        offset: params.offset || 0,
      });

      return {
        success: true,
        total: result.total,
        has_more: !!result.links?.next,
        next_offset: (params.offset || 0) + result.jobs.length,
        jobs: result.jobs,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default searchJobsTool;
