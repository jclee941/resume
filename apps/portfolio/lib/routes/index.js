const { generateAuthRoutes, generateControlRoutes } = require('./auth');
const { generateChatRoute } = require('./chat');
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
} = require('./observability');

module.exports = {
  generateAuthRoutes,
  generateControlRoutes,
  generateChatRoute,
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
};
