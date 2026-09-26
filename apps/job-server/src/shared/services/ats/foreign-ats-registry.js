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

/**
 * @typedef {import('./public-source-adapters.js').PublicPostingAdapter} PublicPostingAdapter
 *
 * Adapter supplied through options.adapters; platform and capabilities fall back
 * to the registry key and the default dry-run capabilities.
 * @typedef {Omit<PublicPostingAdapter, 'platform' | 'capabilities'> & {
 *   platform?: string;
 *   capabilities?: Partial<PublicPostingAdapter['capabilities']>;
 * }} ForeignAtsAdapterInput
 *
 * @typedef {import('./public-source-adapters.js').DefaultForeignAtsAdaptersOptions & {
 *   adapters?: Record<string, ForeignAtsAdapterInput>;
 * }} ForeignAtsRegistryOptions
 *
 * @typedef {ReturnType<typeof normalizeAdapter>} RegisteredForeignAtsAdapter
 */

export class ForeignAtsAdapterRegistry {
  /** @type {Map<string, RegisteredForeignAtsAdapter>} */
  #adapters;

  /**
   * @param {ForeignAtsRegistryOptions} [options]
   */
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

  /**
   * @param {unknown} platform
   */
  supports(platform) {
    return this.#adapters.has(normalizePlatform(platform));
  }

  /**
   * @param {unknown} platform
   */
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

/**
 * @param {ForeignAtsRegistryOptions} [options]
 */
export function createForeignAtsAdapterRegistry(options = {}) {
  return new ForeignAtsAdapterRegistry(options);
}

/**
 * @param {ForeignAtsRegistryOptions} options
 */
function createDefaultAdapters(options) {
  /** @type {Record<string, PublicPostingAdapter>} */
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

/**
 * @param {string} platform
 * @param {PublicPostingAdapter | ForeignAtsAdapterInput} adapter
 */
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

/**
 * @param {unknown} platform
 * @returns {string}
 */
function normalizePlatform(platform) {
  return String(platform).trim().toLowerCase();
}
