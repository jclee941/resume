/**
 * MCP Tool: Get Company Info
 */

import WantedAPI from '../shared/clients/wanted/index.js';

export const getCompanyTool = {
  name: 'wanted_get_company',
  description: `Get detailed information about a company on Wanted Korea.
Use this to research companies before applying:
- Company overview and industry
- Size and location
- Open job positions
- Company culture info`,

  inputSchema: {
    type: 'object',
    properties: {
      company_id: {
        type: 'number',
        description: 'The company ID (found in job detail or URL)',
      },
      include_jobs: {
        type: 'boolean',
        description: 'Include open job listings',
        default: true,
      },
    },
    required: ['company_id'],
  },

  async execute(params) {
    const api = new WantedAPI();

    try {
      const companyResult = await api.getCompany(params.company_id);
      const company = companyResult.data || companyResult;

      const result = {
        success: true,
        company: {
          id: company.id,
          name: company.name,
          industry: company.industry_name,
          logo: company.logo_img?.origin,
          address: company.address?.full_location,
          description: company.description,
          website: company.website,
          employee_count: company.employee_count,
          url: `https://www.wanted.co.kr/company/${company.id}`,
        },
      };

      // Fetch open jobs if requested
      if (params.include_jobs !== false) {
        try {
          const jobsResult = await api.getCompanyJobs(params.company_id, {
            limit: 10,
          });
          const jobsData = jobsResult.data || [];

          result.open_jobs = jobsData.map((job) => ({
            id: job.id,
            position: job.position,
            experience: `${job.annual_from || 0}~${job.annual_to || 99}년`,
            url: `https://www.wanted.co.kr/wd/${job.id}`,
          }));
          result.total_jobs = result.open_jobs.length;
        } catch {
          result.open_jobs = [];
          result.total_jobs = 0;
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default getCompanyTool;
