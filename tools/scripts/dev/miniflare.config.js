module.exports = {
  scriptPath: 'typescript/portfolio-worker/worker.js',
  port: 8787,
  modules: true,
  compatibilityDate: '2026-02-15',
  d1Databases: {
    DB: 'local-resume-db',
  },
  kvNamespaces: {
    SESSIONS: 'local-sessions-kv',
    CACHE: 'local-cache-kv',
  },
  r2Buckets: {
    RESUME_ASSETS_BUCKET: 'local-resume-assets',
  },
  durableObjects: {
    objects: [],
  },
  bindings: {
    NODE_ENV: 'development',
  },
};
