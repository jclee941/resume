/**
 * Portfolio data validation — CJS shim re-exporting the canonical Zod schema
 * from @resume/schemas to avoid duplicating validation logic.
 *
 * @resume/schemas exposes a CJS entry point (`dist/index.cjs`) via the
 * package `exports` map, so plain `require()` works under any runtime.
 *
 * @module validators
 */

const { validatePortfolioData } = require('@resume/schemas');

module.exports = { validatePortfolioData };
