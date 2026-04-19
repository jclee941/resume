/**
 * Lazy Loader - Dynamic module loading utilities
 *
 * Provides lazy loading for heavy modules, crawlers, and services
 * to improve startup time and reduce memory footprint.
 */

export { LazyModule } from './lazy-loader/lazy-module.js';
export { LazyCrawlerRegistry } from './lazy-loader/lazy-crawler-registry.js';
export { ServiceLocator } from './lazy-loader/service-locator.js';
export { DynamicImporter } from './lazy-loader/dynamic-importer.js';
export { StreamProcessor } from './lazy-loader/stream-processor.js';
export { getCrawlerRegistry } from './lazy-loader/registry.js';
export { lazy, lazyLoad } from './lazy-loader/decorators.js';

import { LazyModule } from './lazy-loader/lazy-module.js';
import { LazyCrawlerRegistry } from './lazy-loader/lazy-crawler-registry.js';
import { ServiceLocator } from './lazy-loader/service-locator.js';
import { DynamicImporter } from './lazy-loader/dynamic-importer.js';
import { StreamProcessor } from './lazy-loader/stream-processor.js';
import { getCrawlerRegistry } from './lazy-loader/registry.js';
import { lazy, lazyLoad } from './lazy-loader/decorators.js';

export default {
  LazyModule,
  LazyCrawlerRegistry,
  ServiceLocator,
  DynamicImporter,
  StreamProcessor,
  getCrawlerRegistry,
  lazy,
  lazyLoad,
};
