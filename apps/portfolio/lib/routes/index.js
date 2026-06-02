const { generateAuthRoutes, generateControlRoutes } = require('./auth');
const {
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
} = require('./metrics');
const {
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateCspViolationRoute,
} = require('./observability');

module.exports = {
  generateAuthRoutes,
  generateControlRoutes,
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateCspViolationRoute,
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
};
