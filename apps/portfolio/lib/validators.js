/**
 * Portfolio data validation — CJS shim re-exporting the canonical Zod schema
 * from @resume/schemas to avoid duplicating validation logic.
 * @module validators
 */

const { validatePortfolioData } = require('@resume/schemas');

module.exports = { validatePortfolioData };
