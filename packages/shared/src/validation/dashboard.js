import { z } from 'zod';
import {
  applicationPriorityWideSchema,
  applicationStatusWideSchema,
  VALID_APPLICATION_STATUSES_WIDE,
} from '@resume/schemas';

const URL_FIELDS = ['sourceUrl', 'source_url', 'jobUrl', 'job_url'];
const STRING_FIELDS = ['location', 'notes', 'source', 'platform'];
const PRIORITIES = applicationPriorityWideSchema.options;

function addIssue(ctx, message, path = []) {
  ctx.addIssue({ code: z.ZodIssueCode.custom, message, path });
}

function validateUrlField(ctx, field, value) {
  if (value === undefined || value === null || value === '') return;
  if (typeof value !== 'string') {
    addIssue(ctx, `${field} must be a string`, [field]);
    return;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('bad protocol');
  } catch {
    addIssue(ctx, `${field} must be a valid URL`, [field]);
    return;
  }
  if (value.length > 2000) {
    addIssue(ctx, `${field} must be 2000 characters or less`, [field]);
  }
}

export const dashboardCreateCompatSchema = z
  .object({})
  .passthrough()
  .superRefine((body, ctx) => {
    const job = body.job ?? body;
    const options = body.options ?? {};
    const position = job.position ?? job.title;

    if (!position || typeof position !== 'string') {
      addIssue(ctx, 'position/title is required and must be a string', ['job', 'position']);
    } else if (position.length > 500) {
      addIssue(ctx, 'position/title must be 500 characters or less', ['job', 'position']);
    }

    if (!job.company || typeof job.company !== 'string') {
      addIssue(ctx, 'company is required and must be a string', ['job', 'company']);
    } else if (job.company.length > 200) {
      addIssue(ctx, 'company must be 200 characters or less', ['job', 'company']);
    }

    for (const field of STRING_FIELDS) {
      const value = job[field];
      if (value !== undefined && value !== null) {
        if (typeof value !== 'string') addIssue(ctx, `${field} must be a string`, [field]);
        else if (value.length > 1000)
          addIssue(ctx, `${field} must be 1000 characters or less`, [field]);
      }
    }

    for (const field of URL_FIELDS) validateUrlField(ctx, field, job[field] ?? body[field]);

    const status = body.status ?? job.status ?? options.status;
    if (status !== undefined && !VALID_APPLICATION_STATUSES_WIDE.includes(status)) {
      addIssue(ctx, `status must be one of: ${VALID_APPLICATION_STATUSES_WIDE.join(', ')}`, [
        'status',
      ]);
    }

    const priority = job.priority ?? options.priority;
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      addIssue(ctx, `priority must be one of: ${PRIORITIES.join(', ')}`, ['priority']);
    }

    const score = job.matchScore ?? job.match_score ?? job.matchPercentage ?? job.match_percentage;
    if (score !== undefined && score !== null) {
      const numberScore = Number(score);
      if (Number.isNaN(numberScore) || numberScore < 0 || numberScore > 100) {
        addIssue(ctx, 'matchScore must be a number between 0 and 100', ['matchScore']);
      }
    }
  });

export const dashboardUpdateCompatSchema = z
  .object({})
  .passthrough()
  .superRefine((body, ctx) => {
    if (body.notes !== undefined) {
      if (typeof body.notes !== 'string') addIssue(ctx, 'notes must be a string', ['notes']);
      else if (body.notes.length > 5000)
        addIssue(ctx, 'notes must be 5000 characters or less', ['notes']);
    }
    if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) {
      addIssue(ctx, `priority must be one of: ${PRIORITIES.join(', ')}`, ['priority']);
    }
    if (body.resumeId !== undefined && body.resumeId !== null) {
      if (typeof body.resumeId !== 'string')
        addIssue(ctx, 'resumeId must be a string', ['resumeId']);
      else if (body.resumeId.length > 100)
        addIssue(ctx, 'resumeId must be 100 characters or less', ['resumeId']);
    }
  });

export const dashboardStatusCompatSchema = z
  .object({})
  .passthrough()
  .superRefine((body, ctx) => {
    if (!body.status) {
      addIssue(ctx, 'status is required', ['status']);
    } else if (!applicationStatusWideSchema.options.includes(body.status)) {
      addIssue(ctx, `status must be one of: ${VALID_APPLICATION_STATUSES_WIDE.join(', ')}`, [
        'status',
      ]);
    }
    if (body.note !== undefined && typeof body.note !== 'string') {
      addIssue(ctx, 'note must be a string', ['note']);
    } else if (body.note && body.note.length > 1000) {
      addIssue(ctx, 'note must be 1000 characters or less', ['note']);
    }
  });

function parseDashboardSchema(body, schema) {
  if (!body || typeof body !== 'object')
    return { valid: false, errors: ['Request body must be an object'] };
  const result = schema.safeParse(body);
  if (result.success) return { valid: true, data: body };
  return { valid: false, errors: result.error.issues.map((issue) => issue.message) };
}

export function validateApplicationCreate(body) {
  return parseDashboardSchema(body, dashboardCreateCompatSchema);
}

export function validateApplicationUpdate(body) {
  return parseDashboardSchema(body, dashboardUpdateCompatSchema);
}

export function validateStatusUpdate(body) {
  return parseDashboardSchema(body, dashboardStatusCompatSchema);
}
