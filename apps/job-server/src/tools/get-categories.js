/**
 * MCP Tool: Get Job Categories
 */

import WantedAPI from '../shared/clients/wanted/index.js';

export const getCategoriesTool = {
  name: 'wanted_get_categories',
  description: `Get all job categories (tags) available on Wanted Korea.
Use this to discover category IDs for filtering job searches.
Returns main categories and their sub-categories with IDs.`,

  inputSchema: {
    type: 'object',
    properties: {},
  },

  async execute() {
    const api = new WantedAPI();

    try {
      const result = await api.getTags();
      // Handle both normalized array and raw response structure
      const tagsData = Array.isArray(result) ? result : result.data || [];

      const categories = tagsData.map((cat) => ({
        id: cat.id,
        sub_categories: cat.sub_tags
          ? cat.sub_tags.map((sub) => ({
              id: sub.id,
              title: sub.title,
              sub_categories: [], // MCP schema expects this or similar structure, keeping simple
            }))
          : [],
      }));

      // Common DevOps/Security categories for quick reference
      const commonCategories = {
        devops: { id: 674, title: 'DevOps / 시스템 관리자' },
        security: { id: 672, title: '보안 엔지니어' },
        sysadmin: { id: 665, title: '시스템,네트워크 관리자' },
        backend: { id: 872, title: '서버 개발자' },
        frontend: { id: 669, title: '프론트엔드 개발자' },
        data_engineer: { id: 655, title: '데이터 엔지니어' },
        ml_engineer: { id: 1634, title: '머신러닝 엔지니어' },
        pm: { id: 876, title: '프로덕트 매니저' },
        dba: { id: 10231, title: 'DBA' },
      };

      return {
        success: true,
        common_categories: commonCategories,
        all_categories: categories,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  },
};

export default getCategoriesTool;
