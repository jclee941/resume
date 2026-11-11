import { fetchText, htmlToText } from '../public-jobs/text.js';
import { deadline, harvest } from './common.js';
import { object, optionalText, rows, schemaJob, text } from './payload.js';

const ORIGIN = 'https://careers.daangn.com';

/**
 * Job cards are server-rendered; each role page publishes a JobPosting JSON-LD object.
 * @param {import('../public-jobs/text.js').Fetcher} fetcher
 * @param {import('./common.js').Options} options
 * @returns {Promise<import('./common.js').Harvest>}
 */
export async function collectDaangn(fetcher, options) {
  const html = await fetchText(fetcher, `${ORIGIN}/jobs/`);
  if (!html.includes('data-job-card')) throw new Error('daangn: missing job listing');
  /** @type {Map<string, import('./common.js').Candidate>} */
  const cards = new Map();
  for (const match of html.matchAll(/<li\b[^>]*\bdata-job-card\b[^>]*>([\s\S]*?)<\/li>/gi)) {
    const id = /href=["']\/jobs\/role\/(\d+)\/["']/i.exec(match[1])?.[1];
    const title = /<h3\b[^>]*>([\s\S]*?)<\/h3>/i.exec(match[1])?.[1];
    if (!id || !title) throw new Error('daangn: invalid job card');
    cards.set(id, {
      id,
      title: htmlToText(title),
      location: null,
      deadline: null,
      url: `${ORIGIN}/jobs/role/${id}/`,
    });
  }
  return harvest('daangn', [...cards.values()], options, async (row) => {
    const job = schemaJob(await fetchText(fetcher, row.url));
    if (job.url !== row.url) throw new Error('daangn: unexpected posting detail');
    const locations = Array.isArray(job.jobLocation) ? job.jobLocation : [job.jobLocation];
    const addresses = rows(locations, 'daangn locations').map((location) =>
      object(object(location).address)
    );
    return {
      ...row,
      title: text(job.title),
      company: text(object(job.hiringOrganization).name),
      location: addresses
        .map((address) =>
          [address.addressLocality, address.addressRegion, address.addressCountry]
            .map(optionalText)
            .filter(Boolean)
            .join(', ')
        )
        .join('; '),
      description: text(job.description),
      open: !/INTERN/i.test(String(job.employmentType ?? '')),
      deadline: deadline(optionalText(job.validThrough)),
      baseSalary: job.baseSalary,
    };
  });
}
