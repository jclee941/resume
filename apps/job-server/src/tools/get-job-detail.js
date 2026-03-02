/**
 * MCP Tool: Get Job Detail
 */

import WantedAPI from '../shared/clients/wanted/index.js';

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

  async execute(params) {
    const api = new WantedAPI();

    try {
      const result = await api.getJobDetail(params.job_id);
      const job = result.job || result.data || result;

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
        error: error.message,
      };
    }
  },
};

export default getJobDetailTool;
