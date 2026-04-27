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
