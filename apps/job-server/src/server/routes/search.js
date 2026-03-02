import { UnifiedJobCrawler } from '../../crawlers/index.js';

const crawler = new UnifiedJobCrawler();

export default async function searchRoutes(fastify) {
  fastify.get('/', async (request) => {
    const {
      keyword = '시니어 엔지니어',
      limit = 20,
      minScore,
      platforms,
    } = request.query;

    const result = await crawler.searchWithMatching({
      keyword,
      limit: parseInt(limit),
      minScore: minScore !== undefined ? parseInt(minScore) : 50,
      sources: platforms ? platforms.split(',') : undefined,
    });

    return result;
  });

  fastify.post('/batch', async (request) => {
    const {
      keywords = ['시니어 엔지니어', '클라우드 엔지니어', 'SRE'],
      platforms,
      limit = 10,
      minScore = 60,
    } = request.body || {};

    const results = [];
    for (const keyword of keywords) {
      const result = await crawler.searchWithMatching({
        keyword,
        limit: parseInt(limit),
        minScore: parseInt(minScore),
        sources: platforms,
      });
      results.push({ keyword, ...result });
    }

    return {
      results,
      totalJobs: results.reduce((sum, r) => sum + (r.totalJobs || 0), 0),
    };
  });
}
