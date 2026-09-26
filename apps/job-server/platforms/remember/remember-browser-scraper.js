import { withStealthBrowser } from '../../src/crawlers/browser-utils.js';

export async function searchRememberWithBrowser(baseUrl, normalizeFn, params = {}) {
  return withStealthBrowser(async (page) => {
    const query = params.keyword ? `?search=${encodeURIComponent(params.keyword)}` : '';
    const url = `${baseUrl}/job/postings${query}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('a[href*="/job/posting/"]', { timeout: 10000 }).catch(() => {});

    const jobs = await page.evaluate((limit) => {
      const results = [];
      const links = document.querySelectorAll('a[href*="/job/posting/"]');
      const seen = new Set();

      links.forEach((link) => {
        if (results.length >= limit) return;

        const href = link.getAttribute('href') || '';
        const idMatch = href.match(/\/job\/posting\/(\d+)/);
        if (!idMatch) return;

        const jobId = idMatch[1];
        if (seen.has(jobId)) return;
        seen.add(jobId);

        // DOM text format: title\ncompany\nexperience\nlocation
        const text = (link.innerText || '').trim();
        const lines = text
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean);

        if (lines.length >= 2) {
          results.push({
            id: jobId,
            title: lines[0] || '',
            company: lines[1] || '',
            experience: lines[2] || '',
            location: lines[3] || '',
            url: href,
          });
        }
      });

      return results;
    }, params.limit || 20);

    return {
      success: true,
      source: 'remember',
      total: jobs.length,
      hasMore: jobs.length >= (params.limit || 20),
      jobs: jobs.map((job) => normalizeFn(job)),
    };
  });
}

export async function getRememberJobDetailWithBrowser(baseUrl, normalizeFn, jobId) {
  const job = await withStealthBrowser(async (page) => {
    const url = `${baseUrl}/job/posting/${jobId}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForSelector('h1, [class*="title"], [class*="company"], main', {
      timeout: 10000,
    });

    return page.evaluate((jid) => {
      const getText = (sel) => document.querySelector(sel)?.textContent?.trim() || '';
      const title = getText('h1') || getText('[class*="title"]');
      const company = getText('[class*="company"]') || getText('[class*="CompanyName"]');
      const description =
        getText('[class*="description"]') || getText('[class*="content"]') || getText('main');

      return {
        id: jid,
        title,
        company,
        description: description.substring(0, 5000),
      };
    }, jobId);
  });

  return {
    success: true,
    source: 'remember',
    job: normalizeFn(job, true),
  };
}
