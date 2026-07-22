import { z } from 'zod';
import { isoTimestampSchema } from './common.js';
import { applicationSchema, applicationStatusSchema } from './application-core.js';

export const foreignAtsPlatformSchema = z.enum([
  'ashby',
  'greenhouse',
  'lever',
  'smartrecruiters',
  'teamtailor',
  'workday',
]);

export const foreignAtsLocationSchema = z
  .object({
    countryCode: z.string().regex(/^[A-Z]{2}$/, 'must be ISO 3166-1 alpha-2 uppercase'),
    region: z.string().min(1).max(100).optional(),
    city: z.string().min(1).max(100).optional(),
    remote: z.boolean().optional(),
  })
  .strict();

export const foreignAtsSourceSchema = z
  .object({
    platform: foreignAtsPlatformSchema,
    sourceUrl: z.string().url().max(2000),
    externalJobId: z.string().min(1).max(200).optional(),
    requisitionId: z.string().min(1).max(200).optional(),
    location: foreignAtsLocationSchema.optional(),
  })
  .strict();

export const foreignAtsApplicationPacketMetadataSchema = z
  .object({
    source: foreignAtsSourceSchema,
    capturedAt: isoTimestampSchema,
    externalApplicationId: z.string().min(1).max(200).optional(),
    status: applicationStatusSchema.optional(),
    raw: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const foreignAtsApplicationPacketSchema = z
  .object({
    metadata: foreignAtsApplicationPacketMetadataSchema,
    application: applicationSchema.optional(),
  })
  .strict();
