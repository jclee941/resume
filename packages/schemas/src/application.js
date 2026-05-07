import { z } from 'zod';
import { idSchema, platformSchema, isoTimestampSchema } from './common.js';

export const applicationStatusSchema = z.enum([
  'pending',
  'applied',
  'reviewing',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
]);

// Wider enum used by apps/job-dashboard's API surface, which historically
// supports additional intermediate states. The narrow `applicationStatusSchema`
// above is the canonical contract for cross-app communication; the wider
// `applicationStatusWideSchema` is for legacy dashboard endpoints. New code
// should prefer the narrow set.
export const applicationStatusWideSchema = z.enum([
  'pending',
  'saved',
  'applied',
  'viewed',
  'in_progress',
  'interview',
  'offer',
  'rejected',
  'withdrawn',
  'expired',
]);

export const applicationCreateSchema = z.object({
  jobId: idSchema,
  platform: platformSchema,
  company: z.string().min(1).max(200),
  position: z.string().min(1).max(300),
  status: applicationStatusSchema.optional().default('pending'),
  metadata: z.record(z.unknown()).optional(),
});

export const applicationUpdateSchema = z
  .object({
    company: z.string().min(1).max(200).optional(),
    position: z.string().min(1).max(300).optional(),
    status: applicationStatusSchema.optional(),
    metadata: z.record(z.unknown()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: 'at least one field required' });

export const applicationStatusUpdateSchema = z.object({
  status: applicationStatusSchema,
});

export const applicationSchema = applicationCreateSchema.extend({
  id: z.string().min(1),
  appliedAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional(),
});

/**
 * @typedef {z.infer<typeof applicationSchema>} ApplicationFromSchema
 * @typedef {z.infer<typeof applicationCreateSchema>} ApplicationCreate
 * @typedef {z.infer<typeof applicationUpdateSchema>} ApplicationUpdate
 * @typedef {z.infer<typeof applicationStatusUpdateSchema>} ApplicationStatusUpdate
 */

export const VALID_APPLICATION_STATUSES = applicationStatusSchema.options;

export const VALID_APPLICATION_STATUSES_WIDE = applicationStatusWideSchema.options;

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
export const applicationPriorityWideSchema = z.enum(['low', 'medium', 'high']);

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

export const dashboardApplicationUpdateSchema = z.object({
  notes: z.string().max(5000).optional(),
  priority: applicationPriorityWideSchema.optional(),
  resumeId: z.string().max(100).optional(),
}).passthrough();

export const dashboardStatusUpdateSchema = z.object({
  status: applicationStatusWideSchema,
  note: z.string().max(1000).optional(),
}).passthrough();
