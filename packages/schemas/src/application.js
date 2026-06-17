import { z } from 'zod';
import { applicationPriorityWideSchema } from './application-dashboard.js';
import { applicationStatusWideSchema } from './application-core.js';

export * from './application-core.js';
export * from './foreign-ats-application.js';
export * from './application-dashboard.js';

// === Dashboard-shape application schemas (issue #17 Phase 2) ===
//
// apps/job-dashboard exposes a slightly looser API surface than the
// canonical applicationCreateSchema above:
//   - body may be the application directly OR { job: {...}, options: {...} }
//   - status uses the wider enum (10 values incl. saved/viewed/in_progress/expired)
//   - additional optional fields (location, notes, source, platform, sourceUrl,
//     priority, matchScore)
//
// These schemas back the wrapper functions in @resume/shared/validation so the
// runtime validation lives in one place while the call-site shape stays unchanged.
const dashboardJobBaseSchema = z.object({
  position: z.string().min(1).max(500).optional(),
  title: z.string().min(1).max(500).optional(),
  company: z.string().min(1).max(200).optional(),
  location: z.string().max(1000).optional(),
  notes: z.string().max(1000).optional(),
  source: z.string().max(1000).optional(),
  platform: z.string().max(1000).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
  source_url: z.string().url().max(2000).optional(),
  jobUrl: z.string().url().max(2000).optional(),
  job_url: z.string().url().max(2000).optional(),
  priority: applicationPriorityWideSchema.optional(),
  status: applicationStatusWideSchema.optional(),
  matchScore: z.coerce.number().min(0).max(100).optional(),
  match_score: z.coerce.number().min(0).max(100).optional(),
  matchPercentage: z.coerce.number().min(0).max(100).optional(),
  match_percentage: z.coerce.number().min(0).max(100).optional(),
});

// Schema accepts either { job: {...}, options: {...} } OR the inline shape
// (where the body itself is the job).
export const dashboardApplicationCreateSchema = z
  .object({
    job: dashboardJobBaseSchema.optional(),
    options: z
      .object({
        priority: applicationPriorityWideSchema.optional(),
        status: applicationStatusWideSchema.optional(),
      })
      .passthrough()
      .optional(),
    status: applicationStatusWideSchema.optional(),
  })
  .passthrough()
  .superRefine((body, ctx) => {
    const job = body.job ?? body;
    const position = job?.position ?? job?.title;
    if (!position || typeof position !== 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'position/title is required and must be a string',
        path: ['job', 'position'],
      });
    } else if (position.length > 500) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'position/title must be 500 characters or less',
        path: ['job', 'position'],
      });
    }
    if (!job?.company || typeof job.company !== 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'company is required and must be a string',
        path: ['job', 'company'],
      });
    } else if (job.company.length > 200) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'company must be 200 characters or less',
        path: ['job', 'company'],
      });
    }
  });

export const dashboardApplicationUpdateSchema = z
  .object({
    notes: z.string().max(5000).optional(),
    priority: applicationPriorityWideSchema.optional(),
    resumeId: z.string().max(100).optional(),
  })
  .passthrough();

export const dashboardStatusUpdateSchema = z
  .object({
    status: applicationStatusWideSchema,
    note: z.string().max(1000).optional(),
  })
  .passthrough();
