const createMockCrawler = (jobs = []) => {
  const callLog = { search: 0, searchCalls: [] };
  return {
    callLog,
    search: async (platform, keywords, options) => {
      callLog.search++;
      callLog.searchCalls.push({ platform, keywords, options });
      return jobs.filter((job) => job.source === platform);
    },
  };
};

const createMockApplier = (results = []) => {
  const callLog = { applyToJob: 0 };
  return {
    callLog,
    applyToJob: async (job) => {
      callLog.applyToJob++;
      return results.shift() || { success: true, jobId: `mock-${job.jobId || Math.random()}` };
    },
    initBrowser: async () => {},
    closeBrowser: async () => {},
  };
};

const createMockAppManager = (existingApps = []) => {
  const apps = [...existingApps];
  return {
    listApplications: () => apps,
    addApplication: (app) => apps.push(app),
    updateApplication: (id, updates) => {
      const index = apps.findIndex((app) => app.id === id);
      if (index !== -1) apps[index] = { ...apps[index], ...updates };
    },
  };
};

const loadApplyModules = async () => {
  const orchestratorModule =
    await import('../../apps/job-server/src/shared/services/apply/orchestrator.js');
  const filterModule =
    await import('../../apps/job-server/src/shared/services/apply/job-filter.js');
  return {
    ApplyOrchestrator: orchestratorModule.ApplyOrchestrator,
    JobFilter: filterModule.JobFilter,
  };
};

module.exports = {
  createMockAppManager,
  createMockApplier,
  createMockCrawler,
  loadApplyModules,
};
