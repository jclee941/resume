import {
  FOREIGN_ATS_LOCATION_TARGETS,
  normalizeForeignAtsSearchCriteria,
  normalizePostingLocations,
} from './location-normalizer.js';
import {
  createAshbyPostingFetcher,
  createGreenhousePostingFetcher,
  createLeverPostingFetcher,
} from './public-source-fetchers.js';

export function createDefaultForeignAtsAdapters(options = {}) {
  const sharedFetch = options.fetch ?? options.httpFetch;

  return {
    greenhouse: createPublicPostingAdapter({
      platform: 'greenhouse',
      fetchPostings:
        options.greenhouse?.fetchPostings ??
        createGreenhousePostingFetcher(options.greenhouse?.fetch ?? sharedFetch),
      normalizePosting: normalizeGreenhousePosting,
    }),
    lever: createPublicPostingAdapter({
      platform: 'lever',
      fetchPostings:
        options.lever?.fetchPostings ??
        createLeverPostingFetcher(options.lever?.fetch ?? sharedFetch),
      normalizePosting: normalizeLeverPosting,
    }),
    ashby: createPublicPostingAdapter({
      platform: 'ashby',
      apiKey: options.ashby?.apiKey ?? options.ashbyApiKey,
      backendApiKeyOnly: true,
      fetchPostings:
        options.ashby?.fetchPostings ??
        createAshbyPostingFetcher(options.ashby?.fetch ?? sharedFetch),
      normalizePosting: normalizeAshbyPosting,
    }),
  };
}

export function createBoundaryAdapter(platform) {
  return createPublicPostingAdapter({
    platform,
    normalizePosting: () => null,
  });
}

function createPublicPostingAdapter(config) {
  const platform = normalizePlatform(config.platform);

  return {
    platform,
    capabilities: createCapabilities(config),
    async planSearch(criteria = {}) {
      return {
        platform,
        ...normalizeForeignAtsSearchCriteria(criteria),
        networkSkipped: !config.fetchPostings,
        submissionSkipped: true,
      };
    },
    async search(criteria = {}) {
      const safeCriteria = isRecord(criteria) ? criteria : {};
      const plan = await this.planSearch(safeCriteria);
      const postings = await loadPostings(safeCriteria, config);

      return postings
        .map((posting) => config.normalizePosting(posting, safeCriteria))
        .filter((job) => job && hasTargetLocation(job.normalizedLocations, plan.locationTargets));
    },
  };
}

function createCapabilities(config) {
  return {
    locations: [...FOREIGN_ATS_LOCATION_TARGETS],
    dryRunFirst: true,
    canFetchNetwork: Boolean(config.fetchPostings),
    canSubmit: false,
    backendApiKeyOnly: config.backendApiKeyOnly === true,
  };
}

async function loadPostings(criteria, config) {
  if (Array.isArray(criteria.postings)) return criteria.postings;
  if (!config.fetchPostings) return [];

  const postings = await config.fetchPostings({
    company: criteria.company,
    boardToken: criteria.boardToken,
    apiKey: config.apiKey,
  });

  return Array.isArray(postings) ? postings : [];
}

function normalizeGreenhousePosting(posting, criteria) {
  if (!isRecord(posting)) return null;

  return createJob({
    platform: 'greenhouse',
    criteria,
    externalJobId: posting.id ?? posting.internal_job_id,
    title: posting.title,
    sourceUrl: posting.absolute_url,
    applicationUrl: posting.apply_url ?? posting.absolute_url,
    normalizedLocations: normalizePostingLocations([posting.location, posting.offices]),
  });
}

function normalizeLeverPosting(posting, criteria) {
  if (!isRecord(posting)) return null;

  return createJob({
    platform: 'lever',
    criteria,
    externalJobId: posting.id,
    title: posting.text ?? posting.title,
    sourceUrl: posting.hostedUrl,
    applicationUrl: posting.applyUrl ?? posting.hostedUrl,
    normalizedLocations: normalizePostingLocations([posting.categories, posting.workplaceType]),
  });
}

function normalizeAshbyPosting(posting, criteria) {
  if (!isRecord(posting)) return null;

  return createJob({
    platform: 'ashby',
    criteria,
    externalJobId: posting.id ?? posting.jobId,
    title: posting.title,
    sourceUrl: posting.jobUrl ?? posting.url,
    applicationUrl: posting.applyUrl ?? posting.applicationUrl ?? posting.jobUrl,
    normalizedLocations: normalizePostingLocations([posting.location, posting.locationName]),
  });
}

function createJob({
  platform,
  criteria,
  externalJobId,
  title,
  sourceUrl,
  applicationUrl,
  normalizedLocations,
}) {
  if (!title || !sourceUrl || normalizedLocations.length === 0) return null;

  return {
    id: `${platform}:${String(externalJobId ?? sourceUrl)}`,
    company: criteria.company ?? null,
    position: String(title),
    title: String(title),
    source: platform,
    atsPlatform: platform,
    externalJobId: externalJobId === undefined ? null : String(externalJobId),
    sourceUrl: String(sourceUrl),
    applicationUrl: applicationUrl ? String(applicationUrl) : String(sourceUrl),
    normalizedLocations,
    locationTargets: normalizedLocations,
    remote: normalizedLocations.includes('remote'),
    dryRunOnly: true,
    submissionSkipped: true,
  };
}

function hasTargetLocation(normalizedLocations, locationTargets) {
  return normalizedLocations.some((location) => locationTargets.includes(location));
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizePlatform(platform) {
  return String(platform).trim().toLowerCase();
}
