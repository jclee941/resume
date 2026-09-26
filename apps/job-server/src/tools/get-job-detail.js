/**
 * MCP Tool: Get Job Detail
 */

/**
 * @typedef {Object} RawCompanyInfo
 * @property {string} [name]
 * @property {string} [industry_name]
 * @property {{ origin?: string }} [logo_img]
 *
 * @typedef {Object} RawJobDetailSection
 * @property {string} [main_tasks]
 * @property {string} [requirements]
 * @property {string} [preferred_points]
 * @property {string} [benefits]
 * @property {string} [intro]
 *
 * @typedef {import('@resume/types/wanted.js').WantedJobDetail & {
 *   job?: unknown,
 *   data?: unknown,
 *   company?: RawCompanyInfo,
 *   address?: { full_location?: string, location?: string },
 *   annual_from?: number,
 *   annual_to?: number,
 *   reward?: { formatted_total?: string },
 *   due_time?: string,
 *   detail?: RawJobDetailSection,
 *   requirements?: string,
 *   preferred?: string,
 *   benefits?: string,
 *   intro?: string,
 * }} JobDetailApiResponse
 */

import WantedAPI from '@resume/shared/clients/wanted';

export const getJobDetailTool = {
  name: 'wanted_get_job_detail',
  description: `Get detailed information about a specific job posting on Wanted Korea.
Use this after searching for jobs to get full details including:
- Full job description
- Requirements
- Preferred qualifications
- Company information
- Benefits and perks`,

  inputSchema: {
    type: 'object',
    properties: {
      job_id: {
        type: 'number',
        description: 'The job ID from search results (e.g., 304000)',
      },
    },
    required: ['job_id'],
  },

  /**
   * @param {{ job_id: number | string }} params
   * @returns {Promise<Record<string, unknown>>}
   */
  async execute(params) {
    const api = new WantedAPI();

    try {
      const result = /** @type {JobDetailApiResponse} */ (await api.getJobDetail(params.job_id));
      const job = /** @type {JobDetailApiResponse} */ (result.job || result.data || result);

      return {
        success: true,
        job: {
          id: job.id,
          position: job.position,
          company: {
            name: job.company ? job.company.name : 'Unknown',
            industry: job.company ? job.company.industry_name : '',
            logo: job.company?.logo_img?.origin,
          },
          location: job.address ? job.address.full_location : '',
          experience: `${job.annual_from || 0}~${job.annual_to || 99}년`,
          reward: job.reward ? job.reward.formatted_total : '',
          due_date: job.due_time,
          detail: job.detail?.main_tasks || job.detail || '',
          requirements: job.detail?.requirements || job.requirements || '',
          preferred: job.detail?.preferred_points || job.preferred || '',
          benefits: job.detail?.benefits || job.benefits || '',
          intro: job.detail?.intro || job.intro || '',
          url: `https://www.wanted.co.kr/wd/${job.id}`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export default getJobDetailTool;
