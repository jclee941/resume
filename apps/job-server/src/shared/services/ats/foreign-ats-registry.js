import { FOREIGN_ATS_PLATFORMS } from '@resume/types/application';
import {
  createBoundaryAdapter,
  createDefaultForeignAtsAdapters,
} from './public-source-adapters.js';
import {
  FOREIGN_ATS_LOCATION_TARGETS,
  normalizeForeignAtsSearchCriteria,
} from './location-normalizer.js';

export const SUPPORTED_FOREIGN_ATS_PLATFORMS = FOREIGN_ATS_PLATFORMS;
export { FOREIGN_ATS_LOCATION_TARGETS, normalizeForeignAtsSearchCriteria };

export class ForeignAtsAdapterRegistry {
  #adapters;

  constructor(options = {}) {
    this.#adapters = new Map();
    const adapters = {
      ...createDefaultAdapters(options),
      ...(options.adapters || {}),
    };

    for (const [platform, adapter] of Object.entries(adapters)) {
      this.#adapters.set(normalizePlatform(platform), normalizeAdapter(platform, adapter));
    }
  }

  supports(platform) {
    return this.#adapters.has(normalizePlatform(platform));
  }

  getAdapter(platform) {
    const key = normalizePlatform(platform);
    const adapter = this.#adapters.get(key);

    if (!adapter) {
      throw new Error(`Unsupported foreign ATS platform: ${String(platform).toLowerCase()}`);
    }

    return adapter;
  }

  listCapabilities() {
    return Array.from(this.#adapters.values()).map((adapter) => ({
      platform: adapter.platform,
      capabilities: { ...adapter.capabilities, locations: [...adapter.capabilities.locations] },
    }));
  }
}

export function createForeignAtsAdapterRegistry(options = {}) {
  return new ForeignAtsAdapterRegistry(options);
}

function createDefaultAdapters(options) {
  const adapters = createDefaultForeignAtsAdapters(options);

  for (const platform of SUPPORTED_FOREIGN_ATS_PLATFORMS) {
    if (!adapters[platform]) adapters[platform] = createBoundaryAdapter(platform);
  }

  return adapters;
}

function createCapabilities() {
  return {
    locations: [...FOREIGN_ATS_LOCATION_TARGETS],
    dryRunFirst: true,
    canFetchNetwork: false,
    canSubmit: false,
  };
}

function normalizeAdapter(platform, adapter) {
  return {
    ...adapter,
    platform: normalizePlatform(adapter.platform || platform),
    capabilities: {
      ...createCapabilities(),
      ...(adapter.capabilities || {}),
      locations: [...(adapter.capabilities?.locations || FOREIGN_ATS_LOCATION_TARGETS)],
    },
  };
}

function normalizePlatform(platform) {
  return String(platform).trim().toLowerCase();
}
