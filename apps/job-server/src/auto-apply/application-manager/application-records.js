import { APPLICATION_STATUS } from './status.js';

export function createApplicationRecord(job, options = {}) {
  const now = new Date().toISOString();

  return {
    id: `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    jobId: job.id,
    source: job.source,
    sourceUrl: job.sourceUrl,
    position: job.position,
    company: job.company,
    location: job.location,
    matchScore: job.matchPercentage || job.matchScore || 0,
    status: APPLICATION_STATUS.PENDING,
    priority: job.applicationPriority || 'medium',
    resumeId: options.resumeId || null,
    coverLetter: options.coverLetter || null,
    notes: options.notes || '',
    createdAt: now,
    updatedAt: now,
    appliedAt: null,
    timeline: [
      {
        status: APPLICATION_STATUS.PENDING,
        timestamp: now,
        note: 'Application created',
      },
    ],
  };
}

export function filterApplications(applications, filters = {}) {
  let result = [...applications];

  if (filters.status) {
    result = result.filter((application) => application.status === filters.status);
  }

  if (filters.source) {
    result = result.filter((application) => application.source === filters.source);
  }

  if (filters.company) {
    result = result.filter((application) =>
      application.company.toLowerCase().includes(filters.company.toLowerCase())
    );
  }

  if (filters.fromDate) {
    const from = new Date(filters.fromDate);
    result = result.filter((application) => new Date(application.createdAt) >= from);
  }

  if (filters.toDate) {
    const to = new Date(filters.toDate);
    result = result.filter((application) => new Date(application.createdAt) <= to);
  }

  const sortBy = filters.sortBy || 'createdAt';
  const sortOrder = filters.sortOrder || 'desc';
  result.sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  if (filters.limit) {
    const offset = filters.offset || 0;
    result = result.slice(offset, offset + filters.limit);
  }

  return result;
}

export function getActiveApplications(applications) {
  const activeStatuses = [
    APPLICATION_STATUS.APPLIED,
    APPLICATION_STATUS.VIEWED,
    APPLICATION_STATUS.IN_PROGRESS,
    APPLICATION_STATUS.INTERVIEW,
  ];

  return applications.filter((application) => activeStatuses.includes(application.status));
}
