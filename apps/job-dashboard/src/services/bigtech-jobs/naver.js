import { fetchText } from '../public-jobs/text.js';
import { deadline, harvest } from './common.js';
import {
  count,
  identifier,
  object,
  optionalText,
  parseObject,
  rows,
  schemaJob,
  text,
} from './payload.js';

const ORIGIN = 'https://recruit.navercorp.com';

/** @param {string} html @returns {string} */
function jobBody(html) {
  const start = /<div\b[^>]*class=["']detail_wrap["'][^>]*>/i.exec(html);
  if (!start) throw new Error('naver: missing job description');
  const tail = html.slice(start.index);
  let depth = 0;
  for (const tag of tail.matchAll(/<\/?div\b[^>]*>/gi)) {
    depth += tag[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return tail.slice(0, tag.index + tag[0].length);
  }
  throw new Error('naver: incomplete job description');
}

/**
 * JSON list offsets are zero-based; the server currently returns ten rows per read.
 * @param {import('../public-jobs/text.js').Fetcher} fetcher
 * @param {import('./common.js').Options} options
 * @returns {Promise<import('./common.js').Harvest>}
 */
export async function collectNaver(fetcher, options) {
  /** @type {unknown[]} */
  const all = [];
  let total = 1;
  for (let page = 0; all.length < total; page += 1) {
    if (page === 50) throw new Error('naver: pagination limit exceeded');
    const data = parseObject(
      await fetchText(fetcher, `${ORIGIN}/rcrt/loadJobList.do?firstIndex=${all.length}`)
    );
    const jobs = rows(data.list, 'naver');
    if (data.result !== 'Y') throw new Error('naver: invalid list response');
    total = count(data.totalSize);
    if (!jobs.length && all.length < total) throw new Error('naver: incomplete pagination');
    all.push(...jobs);
  }
  return harvest(
    'naver',
    all.map((entry) => {
      const job = object(entry);
      return {
        id: identifier(job.annoId),
        url: text(job.jobDetailLink),
        title: text(job.annoSubject),
        company: text(job.sysCompanyCdNm),
        location: null,
        career: optionalText(job.entTypeCdNm),
        deadline: deadline(optionalText(job.endYmdTime)),
      };
    }),
    options,
    async (row) => {
      const url = new URL(row.url);
      if (
        url.origin !== ORIGIN ||
        url.pathname !== '/rcrt/view.do' ||
        url.searchParams.get('annoId') !== String(row.id)
      ) {
        throw new Error('naver: unexpected detail URL');
      }
      const html = await fetchText(fetcher, row.url);
      const job = schemaJob(html);
      const address = object(object(job.jobLocation).address);
      return {
        ...row,
        location: [
          address.streetAddress,
          address.addressLocality,
          address.addressRegion,
          address.addressCountry,
        ]
          .map(optionalText)
          .filter(Boolean)
          .join(', '),
        description: jobBody(html),
        baseSalary: job.baseSalary,
      };
    }
  );
}
