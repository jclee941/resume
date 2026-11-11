import { fetchText } from '../public-jobs/text.js';
import { deadline, harvest } from './common.js';
import { identifier, object, optionalText, parseObject, rows, text } from './payload.js';

const ORIGIN = 'https://careers.linecorp.com';
const LIST = `${ORIGIN}/page-data/ko/jobs/page-data.json`;

/** @param {Record<string, unknown>} job @returns {import('./common.js').Candidate} */
function normalize(job) {
  const id = identifier(job.strapiId);
  return {
    id,
    url: `${ORIGIN}/ko/jobs/${id}/`,
    title: text(job.title),
    company: rows(job.companies, 'line companies')
      .map((company) => text(object(company).name))
      .join(', '),
    location: rows(job.cities, 'line cities')
      .map((city) => text(object(city).name))
      .join(', '),
    open: job.publish === true && job.is_public !== false,
    description: optionalText(job.content) ?? undefined,
    deadline: job.until_filled ? null : deadline(optionalText(job.end_date)),
  };
}

/**
 * Gatsby publishes the full list plus one structured detail document per posting.
 * @param {import('../public-jobs/text.js').Fetcher} fetcher
 * @param {import('./common.js').Options} options
 * @returns {Promise<import('./common.js').Harvest>}
 */
export async function collectLine(fetcher, options) {
  const payload = parseObject(await fetchText(fetcher, LIST));
  const data = object(object(payload.result).data);
  const edges = rows(object(data.allStrapiJobs).edges, 'line');
  const all = edges.map((entry) => {
    const node = object(object(entry).node);
    const start = optionalText(node.start_date);
    return {
      ...normalize(node),
      open:
        node.publish === true &&
        node.is_public === true &&
        (!start || new Date(start).getTime() < Date.parse(`${options.today}T23:59:59+09:00`)),
    };
  });
  return harvest('line', all, options, async (row) => {
    const detail = parseObject(
      await fetchText(fetcher, `${ORIGIN}/page-data/ko/jobs/${row.id}/page-data.json`)
    );
    const job = object(object(object(detail.result).data).strapiJobs);
    if (identifier(job.strapiId) !== row.id) {
      throw new Error('line: unexpected posting detail');
    }
    return normalize(job);
  });
}
