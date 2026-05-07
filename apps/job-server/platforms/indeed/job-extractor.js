/** Indeed job extraction and normalization helpers. */

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

export function parseSearchResults(html, normalize = normalizeJob, normalizeJson = normalizeJsonLd) {
  const jobs = parseJsonLdJobs(html, normalizeJson);

  if (jobs.length === 0) {
    jobs.push(...parseMosaicJobs(html));
  }

  if (jobs.length === 0) {
    jobs.push(...parseRegexJobCards(html));
  }

  return jobs.map((job) => normalize(job));
}

export function parseJobDetail(html, jobKey, normalize = normalizeJob, normalizeJson = normalizeJsonLd) {
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
    isRemote: jsonLd.jobLocationType === 'TELECOMMUTE' || jsonLd.applicantLocationRequirements != null,
    jobType: jsonLd.employmentType || '',
    benefits: Array.isArray(jsonLd.jobBenefits) ? jsonLd.jobBenefits.join(', ') : jsonLd.jobBenefits || '',
    requirements: jsonLd.qualifications || jsonLd.experienceRequirements?.monthsOfExperience || '',
  };
}

function parseJsonLdJobs(html, normalizeJson) {
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

function parseMosaicJobs(html) {
  const mosaicMatch = html.match(/window\.mosaic\.providerData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/);
  if (!mosaicMatch) {
    return [];
  }

  try {
    const mosaicData = JSON.parse(mosaicMatch[1]);
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

function parseRegexJobCards(html) {
  const jobs = [];
  const cardPattern =
    /data-jk="([^"]+)"[\s\S]*?<h2[^>]*class="[^"]*jobTitle[^"]*"[^>]*>[\s\S]*?<(?:span|a)[^>]*>([^<]+)<\/(?:span|a)>[\s\S]*?data-testid="company-name"[^>]*>([^<]+)<[\s\S]*?data-testid="text-location"[^>]*>([^<]+)</gi;

  for (let cardMatch = cardPattern.exec(html); cardMatch !== null; cardMatch = cardPattern.exec(html)) {
    jobs.push({
      jobKey: cardMatch[1],
      title: cardMatch[2].trim(),
      company: cardMatch[3].trim(),
      location: cardMatch[4].trim(),
    });
  }

  return jobs;
}

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

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}
