import { z } from 'zod';
import { isoTimestampSchema, idSchema } from './common.js';

export const webhookSignatureHeaderSchema = z.object({
  'x-webhook-signature': z.string().regex(/^[a-f0-9]{64}$/, 'must be 64-char hex HMAC-SHA256'),
  'x-webhook-timestamp': isoTimestampSchema.optional(),
});

export const notificationPayloadSchema = z.object({
  message: z.string().min(1),
  company: z.string().optional(),
  jobId: idSchema.optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const jobFoundPayloadSchema = z.object({
  jobId: idSchema,
  title: z.string().min(1),
  score: z.number().min(0).max(100),
});

export const applicationStatusChangePayloadSchema = z.object({
  applicationId: z.string().min(1),
  oldStatus: z.string().min(1),
  newStatus: z.string().min(1),
});
