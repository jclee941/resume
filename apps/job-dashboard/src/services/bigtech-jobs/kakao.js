import { fetchText } from '../public-jobs/text.js';
import { deadline, harvest } from './common.js';
import { count, object, optionalText, parseObject, rows, text } from './payload.js';

/**
 * The public list already supplies all job description sections.
 * @param {import('../public-jobs/text.js').Fetcher} fetcher
 * @param {import('./common.js').Options} options
 * @returns {Promise<import('./common.js').Harvest>}
 */
export async function collectKakao(fetcher, options) {
  /** @type {unknown[]} */
  const all = [];
  let pages = 1;
  for (let page = 1; page <= pages; page += 1) {
    if (page > 50) throw new Error('kakao: pagination limit exceeded');
    const data = parseObject(
      await fetchText(fetcher, `https://careers.kakao.com/public/api/job-list?page=${page}`)
    );
    const jobs = rows(data.jobList, 'kakao');
    pages = count(data.totalPage);
    if (pages && !jobs.length) throw new Error('kakao: incomplete pagination');
    all.push(...jobs);
  }
  return harvest(
    'kakao',
    all.map((entry) => {
      const job = object(entry);
      const title = text(job.jobOfferTitle);
      const id = text(job.realId);
      return {
        id,
        url: `https://careers.kakao.com/jobs/${encodeURIComponent(id)}`,
        title,
        company: text(job.companyName),
        location: text(job.locationName),
        open:
          !job.closeFlag &&
          !job.privateFlag &&
          job.useFlag !== false &&
          job.statusCode === 'PROGRESS',
        description: [job.introduction, job.workContentDesc, job.qualification, job.krewComment]
          .map(optionalText)
          .join('\n'),
        career: /경력/.test(title) ? '경력' : null,
        deadline: deadline(optionalText(job.resumeSubmissionEndDatetime || job.endDate)),
      };
    }),
    options
  );
}
