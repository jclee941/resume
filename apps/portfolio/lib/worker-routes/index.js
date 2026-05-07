'use strict';

module.exports = {
  ...require('./fetch-and-rate-limit'),
  ...require('./locale-routes'),
  ...require('./static-routes'),
  ...require('./health-route'),
  ...require('./metrics-route'),
  ...require('./seo-routes'),
  ...require('./fallback-routes'),
  ...require('./error-handler'),
};
