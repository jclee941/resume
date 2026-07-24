export const mockTimelineEvents = [
  {
    id: 'tl-001',
    application_id: 'app-001',
    status: 'discovered',
    previous_status: null,
    note: 'Application created',
    timestamp: '2026-03-15T10:00:00Z',
  },
  {
    id: 'tl-002',
    application_id: 'app-001',
    status: 'pending',
    previous_status: 'discovered',
    note: 'Awaiting approval',
    timestamp: '2026-03-15T11:00:00Z',
  },
  {
    id: 'tl-003',
    application_id: 'app-001',
    status: 'approved',
    previous_status: 'pending',
    note: 'Auto-approved (score >= 75)',
    timestamp: '2026-03-15T11:05:00Z',
  },
  {
    id: 'tl-004',
    application_id: 'app-001',
    status: 'applied',
    previous_status: 'approved',
    note: 'Application submitted',
    timestamp: '2026-03-15T12:00:00Z',
  },
];
