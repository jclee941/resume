import { fetchText } from '../public-jobs/text.js';
import { harvest } from './common.js';
import { count, identifier, object, optionalText, parseObject, rows, text } from './payload.js';

const ORIGIN = 'https://www.amazon.jobs';

/**
 * Public search JSON includes full descriptions; no per-job fetch is needed.
 * @param {import('../public-jobs/text.js').Fetcher} fetcher
 * @param {import('./common.js').Options} options
 * @returns {Promise<import('./common.js').Harvest>}
 */
export async function collectAmazon(fetcher, options) {
  /** @type {unknown[]} */
  const all = [];
  let total = 1;
  for (let page = 0; all.length < total; page += 1) {
    if (page === 50) throw new Error('amazon: pagination limit exceeded');
    const url = new URL('/en/search.json', ORIGIN);
    url.search = new URLSearchParams({
      offset: String(all.length),
      result_limit: '100',
      'normalized_country_code[]': 'KOR',
    }).toString();
    const data = parseObject(await fetchText(fetcher, url.href));
    const jobs = rows(data.jobs, 'amazon');
    if (data.error) throw new Error('amazon: invalid search response');
    total = count(data.hits);
    if (!jobs.length && all.length < total) throw new Error('amazon: incomplete pagination');
    all.push(...jobs);
  }
  return harvest(
    'amazon',
    all.map((entry) => {
      const job = object(entry);
      return {
        id: identifier(job.id_icims),
        url: new URL(text(job.job_path), ORIGIN).href,
        title: text(job.title),
        company: text(job.company_name),
        location: job.country_code === 'KOR' ? text(job.location) : '',
        description: [job.description, job.basic_qualifications, job.preferred_qualifications]
          .map(optionalText)
          .join('\n'),
        deadline: null,
      };
    }),
    options
  );
}
