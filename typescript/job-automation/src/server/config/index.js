const config = {
  port: parseInt(process.env.DASHBOARD_PORT || '3456', 10),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',

  adminEmail: process.env.ADMIN_EMAIL || 'qwer941a@gmail.com',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  sessionTTL: 24 * 60 * 60 * 1000,

  slackSigningSecret: process.env.SLACK_SIGNING_SECRET || '',
  corsOrigins: [
    'https://resume.jclee.me',
    'https://resume.jclee.me/job',
    'http://localhost:3456',
    'http://127.0.0.1:3456',
  ],

  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: process.env.D1_DATABASE_ID,
    apiKey: process.env.CLOUDFLARE_API_KEY,
  },

  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    claudeModel: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
  },

  paths: {
    public: new URL('../../dashboard/public', import.meta.url).pathname,
    data: process.env.DATA_DIR || new URL('../../../../', import.meta.url).pathname,
    resume:
      process.env.RESUME_PATH ||
      new URL('../../../data/resumes/master/resume_master.md', import.meta.url).pathname,
  },

  limits: {
    maxBodySize: 1024 * 1024,
    rateLimit: { max: 100, timeWindow: '1 minute' },
  },
};

export default config;
