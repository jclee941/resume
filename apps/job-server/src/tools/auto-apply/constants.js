export const AUTO_APPLY_ACTIONS = [
  'search_and_apply',
  'apply_to_job',
  'get_status',
  'set_preferences',
];

export const AUTO_APPLY_DESCRIPTION = `Automatically apply to jobs based on search criteria and match score.

**Actions:**
- search_and_apply: Search jobs with criteria, filter by match score, apply to matches
- apply_to_job: Apply to a specific job by ID
- get_status: Get current auto-apply session status
- set_preferences: Configure match threshold, daily limits, and platform preferences

**Match Score System:**
- < 60: Skip (poor match)
- 60-74: Review recommended (manual review)
- ≥ 75: Auto-apply eligible (default threshold)

**Daily Limits:**
- Default: 20 applications per day
- Configurable via set_preferences

**Example Usage:**
// Search and apply to DevOps jobs with 80+ match score
wanted_auto_apply({
  action: 'search_and_apply',
  keywords: ['DevOps', 'SRE'],
  match_score_threshold: 80,
  dry_run: true  // Set false for actual applications
});

// Apply to specific job
wanted_auto_apply({
  action: 'apply_to_job',
  job_id: 325174,
  dry_run: false
});

// Check session status
wanted_auto_apply({ action: 'get_status' });

// Update preferences
wanted_auto_apply({
  action: 'set_preferences',
  match_score_threshold: 70,
  daily_application_limit: 15
});`;

export const AUTO_APPLY_INPUT_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      enum: AUTO_APPLY_ACTIONS,
      description: 'Action to perform',
    },
    keywords: {
      type: 'array',
      items: { type: 'string' },
      description: 'Job search keywords (e.g., ["DevOps", "SRE", "클우드"])',
    },
    tag_type_ids: {
      type: 'array',
      items: { type: 'number' },
      description: 'Job category IDs (674=DevOps, 672=Security, 665=System Admin)',
    },
    locations: {
      type: 'string',
      description: 'Location filter (all, seoul, busan, etc.)',
      default: 'all',
    },
    years: {
      type: 'number',
      description: 'Experience years (-1 for all, 0 for entry level)',
      default: -1,
    },
    limit: {
      type: 'number',
      description: 'Maximum jobs to search (max 100)',
      default: 50,
    },
    match_score_threshold: {
      type: 'number',
      description: 'Minimum match score to apply (0-100, default: 75)',
      default: 75,
      minimum: 0,
      maximum: 100,
    },
    job_id: {
      type: 'number',
      description: 'Job ID to apply to (required for apply_to_job)',
    },
    resume_id: {
      type: 'string',
      description: 'Resume ID to use for application (optional)',
    },
    cover_letter: {
      type: 'string',
      description: 'Custom cover letter text (optional)',
    },
    daily_application_limit: {
      type: 'number',
      description: 'Maximum daily applications (default: 20)',
      default: 20,
      minimum: 1,
      maximum: 100,
    },
    preferred_platforms: {
      type: 'array',
      items: { type: 'string' },
      description: 'Platforms to search (wanted, jobkorea, saramin)',
      default: ['wanted'],
    },
    exclude_companies: {
      type: 'array',
      items: { type: 'string' },
      description: 'Company names to exclude from results',
      default: [],
    },
    preferred_companies: {
      type: 'array',
      items: { type: 'string' },
      description: 'Company names to prioritize',
      default: [],
    },
    dry_run: {
      type: 'boolean',
      description: 'Preview mode - show what would be applied without actual submission',
      default: true,
    },
  },
  required: ['action'],
};
