/** Indeed job extraction and normalization helpers. */

/**
 * @typedef {Object} RawIndeedJob
 * @property {string} [jobKey]
 * @property {string} [id]
 * @property {string} [title]
 * @property {string} [displayTitle]
 * @property {string} [company]
 * @property {string} [companyName]
 * @property {string} [location]
 * @property {string} [formattedLocation]
 * @property {string} [jobLocationCity]
 * @property {string} [salary]
 * @property {string} [formattedSalary]
 * @property {string} [estimatedSalary]
 * @property {string[]} [techStack]
 * @property {string} [description]
 * @property {string} [snippet]
 * @property {string | number} [requirements]
 * @property {string} [benefits]
 * @property {string} [datePosted]
 * @property {string} [formattedRelativeTime]
 * @property {boolean} [isRemote]
 * @property {boolean} [remoteLocation]
 * @property {string} [jobType]
 * @property {string[]} [jobTypes]
 * @property {string} [employmentType]
 */

/**
 * @typedef {Object} NormalizedIndeedJob
 * @property {string} id
 * @property {string} sourceId
 * @property {string} source
 * @property {string} sourceUrl
 * @property {string} position
 * @property {string} company
 * @property {string} companyId
 * @property {string} location
 * @property {number} experienceMin
 * @property {number} experienceMax
 * @property {string} salary
 * @property {string[]} techStack
 * @property {string} description
 * @property {string | number} requirements
 * @property {string} benefits
 * @property {null} dueDate
 * @property {string | null} postedDate
 * @property {boolean} isRemote
 * @property {string} employmentType
 * @property {string} crawledAt
 */

/**
 * @typedef {Object} JsonLdHiringOrg
 * @property {string} [name]
 */

/**
 * @typedef {Object} JsonLdAddress
 * @property {string} [addressLocality]
 * @property {string} [addressRegion]
 * @property {string} [addressCountry]
 */

/**
 * @typedef {Object} JsonLdLocation
 * @property {JsonLdAddress} [address]
 */

/**
 * @typedef {Object} JsonLdSalaryValue
 * @property {number} [minValue]
 * @property {number} [maxValue]
 */

/**
 * @typedef {Object} JsonLdSalary
 * @property {string} [currency]
 * @property {JsonLdSalaryValue} [value]
 */

/**
 * @typedef {{
 *   '@type'?: string;
 *   title?: string;
 *   description?: string;
 *   datePosted?: string;
 *   jobLocationType?: string;
 *   applicantLocationRequirements?: unknown;
 *   employmentType?: string;
 *   jobBenefits?: string | string[];
 *   qualifications?: string;
 *   identifier?: { value?: string };
 *   hiringOrganization?: JsonLdHiringOrg;
 *   jobLocation?: JsonLdLocation;
 *   baseSalary?: JsonLdSalary;
 *   experienceRequirements?: { monthsOfExperience?: string | number };
 *   '@graph'?: JsonLdJob[];
 * }} JsonLdJob
 */

/**
 * @param {RawIndeedJob} rawJob
 * @returns {NormalizedIndeedJob}
 */
export function normalizeJob(rawJob) {
  return {
    id: `indeed_${rawJob.jobKey || rawJob.id || ''}`,
    sourceId: rawJob.jobKey || rawJob.id || '',
    source: 'indeed',
    sourceUrl: rawJob.jobKey ? `https://kr.indeed.com/viewjob?jk=${rawJob.jobKey}` : '',
    position: rawJob.title || '',
    company: rawJob.company || rawJob.companyName || '',
    companyId: '',
    location: rawJob.location || rawJob.formattedLocation || '',
    experienceMin: 0,
    experienceMax: 99,
    salary: rawJob.salary || rawJob.formattedSalary || '',
    techStack: rawJob.techStack || [],
    description: rawJob.description || rawJob.snippet || '',
    requirements: rawJob.requirements || '',
    benefits: rawJob.benefits || '',
    dueDate: null,
    postedDate: rawJob.datePosted || rawJob.formattedRelativeTime || null,
    isRemote: rawJob.isRemote || false,
    employmentType: rawJob.jobType || rawJob.employmentType || '',
    crawledAt: new Date().toISOString(),
  };
}

/**
 * @param {string} html
 * @param {(raw: RawIndeedJob) => NormalizedIndeedJob} [normalize]
 * @param {(json: JsonLdJob) => RawIndeedJob} [normalizeJson]
 * @returns {NormalizedIndeedJob[]}
 */
export function parseSearchResults(
  html,
  normalize = normalizeJob,
  normalizeJson = normalizeJsonLd
) {
  const jobs = parseJsonLdJobs(html, normalizeJson);

  if (jobs.length === 0) {
    jobs.push(...parseMosaicJobs(html));
  }

  if (jobs.length === 0) {
    jobs.push(...parseRegexJobCards(html));
  }

  return jobs.map((job) => normalize(job));
}

/**
 * @param {string} html
 * @param {string} jobKey
 * @param {(raw: RawIndeedJob) => NormalizedIndeedJob} [normalize]
 * @param {(json: JsonLdJob) => RawIndeedJob} [normalizeJson]
 * @returns {NormalizedIndeedJob}
 */
export function parseJobDetail(
  html,
  jobKey,
  normalize = normalizeJob,
  normalizeJson = normalizeJsonLd
) {
  const jsonLdMatch = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i
  );

  if (jsonLdMatch) {
    try {
      const data = JSON.parse(jsonLdMatch[1]);
      if (data['@type'] === 'JobPosting') {
        const normalized = normalizeJson(data);
        normalized.jobKey = jobKey;
        return normalize(normalized);
      }
    } catch (_parseErr) {
      // Fall through to regex parsing
    }
  }

  return normalize(parseDetailFields(html, jobKey));
}

/**
 * @param {JsonLdJob} jsonLd
 * @returns {RawIndeedJob}
 */
export function normalizeJsonLd(jsonLd) {
  const hiringOrg = jsonLd.hiringOrganization || {};
  const jobLocation = jsonLd.jobLocation || {};
  const address = jobLocation.address || {};
  const salary = jsonLd.baseSalary || {};
  const salaryValue = salary.value || {};

  let formattedSalary = '';
  if (salaryValue.minValue && salaryValue.maxValue) {
    const currency = salary.currency || 'KRW';
    formattedSalary = `${currency} ${salaryValue.minValue.toLocaleString()} - ${salaryValue.maxValue.toLocaleString()}`;
  }

  return {
    jobKey: jsonLd.identifier?.value || '',
    title: jsonLd.title || '',
    company: hiringOrg.name || '',
    location: [address.addressLocality, address.addressRegion, address.addressCountry]
      .filter(Boolean)
      .join(', '),
    salary: formattedSalary,
    description: jsonLd.description || '',
    datePosted: jsonLd.datePosted || '',
    isRemote:
      jsonLd.jobLocationType === 'TELECOMMUTE' || jsonLd.applicantLocationRequirements != null,
    jobType: jsonLd.employmentType || '',
    benefits: Array.isArray(jsonLd.jobBenefits)
      ? jsonLd.jobBenefits.join(', ')
      : jsonLd.jobBenefits || '',
    requirements: jsonLd.qualifications || jsonLd.experienceRequirements?.monthsOfExperience || '',
  };
}

/**
 * @param {string} html
 * @param {(json: JsonLdJob) => RawIndeedJob} normalizeJson
 * @returns {RawIndeedJob[]}
 */
function parseJsonLdJobs(html, normalizeJson) {
  /** @type {RawIndeedJob[]} */
  const jobs = [];
  const jsonLdMatches = html.match(
    /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  );

  if (!jsonLdMatches) {
    return jobs;
  }

  for (const match of jsonLdMatches) {
    try {
      const jsonContent = match.replace(/<\/?script[^>]*>/gi, '');
      const data = JSON.parse(jsonContent);

      if (data['@type'] === 'JobPosting') {
        jobs.push(normalizeJson(data));
      } else if (Array.isArray(data['@graph'])) {
        for (const item of data['@graph']) {
          if (item['@type'] === 'JobPosting') {
            jobs.push(normalizeJson(item));
          }
        }
      }
    } catch (_parseErr) {
      // Skip malformed JSON-LD blocks
    }
  }

  return jobs;
}

/**
 * @typedef {Object} MosaicJobResult
 * @property {string} [jobkey]
 * @property {string} [title]
 * @property {string} [displayTitle]
 * @property {string} [company]
 * @property {string} [companyName]
 * @property {string} [formattedLocation]
 * @property {string} [jobLocationCity]
 * @property {string} [formattedSalary]
 * @property {string} [estimatedSalary]
 * @property {string} [snippet]
 * @property {string} [formattedRelativeTime]
 * @property {boolean} [remoteLocation]
 * @property {string[]} [jobTypes]
 */

/**
 * @param {string} html
 * @returns {RawIndeedJob[]}
 */
function parseMosaicJobs(html) {
  const mosaicMatch = html.match(/window\.mosaic\.providerData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!mosaicMatch) {
    return [];
  }

  try {
    const mosaicData = JSON.parse(mosaicMatch[1]);
    /** @type {MosaicJobResult[]} */
    const results = mosaicData?.metaData?.mosaicProviderJobCardsModel?.results || [];

    return results.map((result) => ({
      jobKey: result.jobkey || '',
      title: result.title || result.displayTitle || '',
      company: result.company || '',
      companyName: result.companyName || result.company || '',
      location: result.formattedLocation || result.jobLocationCity || '',
      salary: result.formattedSalary || result.estimatedSalary || '',
      snippet: result.snippet || '',
      datePosted: result.formattedRelativeTime || '',
      isRemote: result.remoteLocation || false,
      jobType: result.jobTypes?.[0] || '',
    }));
  } catch (_mosaicErr) {
    return [];
  }
}

/**
 * @param {string} html
 * @returns {RawIndeedJob[]}
 */
function parseRegexJobCards(html) {
  /** @type {RawIndeedJob[]} */
  const jobs = [];
  const cardPattern =
    /data-jk="([^"]+)"[\s\S]*?<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>[\s\S]*?<(?:span|a)[^>]*>([^<]+)<\/(?:span|a)>[\s\S]*?data-testid="company-name"[^>]*>([^<]+)<[\s\S]*?data-testid="text-location"[^>]*>([^<]+)</gi;

  for (
    let cardMatch = cardPattern.exec(html);
    cardMatch !== null;
    cardMatch = cardPattern.exec(html)
  ) {
    jobs.push({
      jobKey: cardMatch[1],
      title: cardMatch[2].trim(),
      company: cardMatch[3].trim(),
      location: cardMatch[4].trim(),
    });
  }

  return jobs;
}

/**
 * @param {string} html
 * @param {string} jobKey
 * @returns {RawIndeedJob}
 */
function parseDetailFields(html, jobKey) {
  const titleMatch = html.match(
    /<h1[^>]*class="[^"]*jobsearch-JobInfoHeader-title[^"]*"[^>]*>([^<]+)/i
  );
  const companyMatch = html.match(
    /data-testid="inlineHeader-companyName"[^>]*>[\s\S]*?<a[^>]*>([^<]+)/i
  );
  const locationMatch = html.match(/data-testid="inlineHeader-companyLocation"[^>]*>([^<]+)/i);
  const descriptionMatch = html.match(/<div[^>]*id="jobDescriptionText"[^>]*>([\s\S]*?)<\/div>/i);

  return {
    jobKey,
    title: titleMatch ? titleMatch[1].trim() : '',
    company: companyMatch ? companyMatch[1].trim() : '',
    location: locationMatch ? locationMatch[1].trim() : '',
    description: descriptionMatch ? stripHtml(descriptionMatch[1]) : '',
  };
}

/**
 * @param {string} html
 * @returns {string}
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
