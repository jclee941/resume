const MESSAGE_TYPES = {
  CRAWL: 'crawl',
  APPLY: 'apply',
  SYNC: 'sync',
  REPORT: 'report',
  CLEANUP: 'cleanup',
};

const PRIORITY = {
  URGENT: 'urgent',
  BACKGROUND: 'background',
};

const RETRY_DELAYS = [10, 30, 60, 120, 300];

export { MESSAGE_TYPES, PRIORITY, RETRY_DELAYS };
