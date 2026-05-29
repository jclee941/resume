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
  generateCspViolationRoute,
} = require('./observability');
const { generateGuestbookRoute } = require('./guestbook');

module.exports = {
  generateAuthRoutes,
  generateControlRoutes,
  generateChatRoute,
  generateCfStatsRoute,
  generateVitalsRoute,
  generateTrackRoute,
  generateAnalyticsRoute,
  generateCspViolationRoute,
  generateMetricsPostRoute,
  generateMetricsGetRoute,
  generateMetricsSnapshotRoute,
  generateGuestbookRoute,
};
