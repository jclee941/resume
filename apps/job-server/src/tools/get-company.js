/**
 * MCP Tool: Get Company Info
 */

/**
 * @typedef {import('@resume/types/wanted.js').WantedCompany & {
 *   industry_name?: string,
 *   logo_img?: { origin?: string, thumb?: string },
 *   address?: { full_location?: string },
 *   employee_count?: number,
 *   data?: unknown,
 * }} CompanyApiResponse
 *
 * @typedef {{
 *   company_id: number | string,
 *   include_jobs?: boolean,
 * }} GetCompanyParams
 *
 * @typedef {{
 *   id: number | string,
 *   position: string,
 *   annual_from?: number,
 *   annual_to?: number,
 * }} CompanyOpenJob
 *
 * @typedef {{
 *   id: number | string,
 *   position: string,
 *   experience: string,
 *   url: string,
 * }} FormattedCompanyJob
 *
 * @typedef {{
 *   success: boolean,
 *   company?: Record<string, unknown>,
 *   open_jobs?: FormattedCompanyJob[],
 *   total_jobs?: number,
 *   error?: string,
 * }} GetCompanyResult
 *
 * @typedef {{
 *   error(msg: string, ...args: unknown[]): void,
 *   log?(msg: string, ...args: unknown[]): void,
 * }} ToolLogger
 */

import WantedAPI from '@resume/shared/clients/wanted';

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

  /**
   * @param {GetCompanyParams} params
   * @param {{ logger?: ToolLogger }} [options]
   * @returns {Promise<GetCompanyResult>}
   */
  async execute(params, { logger = console } = {}) {
    const api = new WantedAPI();

    try {
      const companyResult = /** @type {CompanyApiResponse} */ (
        await api.getCompany(params.company_id)
      );
      const company = /** @type {CompanyApiResponse} */ (companyResult.data) || companyResult;

      /** @type {GetCompanyResult} */
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
          const jobsData = /** @type {{ data?: CompanyOpenJob[] }} */ (jobsResult).data || [];

          result.open_jobs = jobsData.map((job) => ({
            id: job.id,
            position: job.position,
            experience: `${job.annual_from || 0}~${job.annual_to || 99}년`,
            url: `https://www.wanted.co.kr/wd/${job.id}`,
          }));
          result.total_jobs = result.open_jobs.length;
        } catch (e) {
          logger.error('Failed to parse open jobs:', e);
          result.open_jobs = [];
          result.total_jobs = 0;
        }
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export default getCompanyTool;
