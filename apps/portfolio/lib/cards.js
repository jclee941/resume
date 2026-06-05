/**
 * Backward-compatible barrel export for portfolio card generation functions.
 * @module cards
 */

module.exports = {
  ...require('./cards/resume'),
  ...require('./cards/projects'),
  ...require('./cards/credentials'),
  ...require('./cards/skills'),
  ...require('./cards/layout'),
  ...require('./cards/about'),
  ...require('./cards/profile'),
  ...require('./cards/evidence'),
  ...require('./cards/cover-letter'),
  ...require('./cards/project-schemas'),
};
