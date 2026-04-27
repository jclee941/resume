import { z } from 'zod';

export const isoTimestampSchema = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/,
    'must be ISO-8601 timestamp'
  );

export const idSchema = z.union([z.string().min(1), z.number().int().positive()]);

export const platformSchema = z.enum([
  'wanted',
  'jobkorea',
  'saramin',
  'linkedin',
  'remember',
  'jumpit',
  'programmers',
  'rallit',
  'rocketpunch',
  'indeed',
]);

export const koreanPhoneSchema = z
  .string()
  .regex(/^(\+82|0)?1[016789][-.]?\d{3,4}[-.]?\d{4}$/, 'must be a valid Korean mobile number');

export const emailSchema = z.string().email();
