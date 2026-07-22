import { z } from 'zod';

const skillItemSchema = z.union([
  z.string().min(1),
  z.object({ name: z.string().min(1), level: z.string().optional() }),
]);

const skillCategorySchema = z.union([
  z.array(skillItemSchema),
  z.object({ items: z.array(skillItemSchema) }),
]);

const resumeItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  stats: z.array(z.string()),
  highlight: z.boolean().optional(),
  completePdfUrl: z.string().optional(),
  pdfUrl: z.string().optional(),
  docxUrl: z.string().optional(),
});

const projectItemSchema = z.object({
  title: z.string().min(1),
  tech: z.string().min(1),
  description: z.string().min(1),
});

const certificationItemSchema = z
  .object({
    name: z.string().min(1),
    issuer: z.string().min(1),
    date: z.string().nullable().optional(),
    status: z.string().nullable().optional(),
  })
  .refine((item) => item.date || item.status, {
    message: 'certification must have at least a date or a status',
  });

const resumeDownloadSchema = z.object({
  pdfUrl: z.string().min(1),
  docxUrl: z.string().min(1),
  mdUrl: z.string().min(1),
});

export const portfolioDataSchema = z.object({
  resumeDownload: resumeDownloadSchema,
  resume: z.array(resumeItemSchema),
  projects: z.array(projectItemSchema),
  certifications: z.array(certificationItemSchema),
  skills: z.record(z.string(), skillCategorySchema),
});

/**
 * Validate portfolio data using the canonical Zod schema.
 * @param {unknown} data
 * @param {{logger?: {log?: Function}}} [options]
 * @returns {z.infer<typeof portfolioDataSchema>}
 */
export function validatePortfolioData(data, options = {}) {
  const result = portfolioDataSchema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );
    throw new Error(`Data validation failed:\n  - ${messages.join('\n  - ')}`);
  }
  options.logger?.log?.('✓ Data validation passed\n');
  return result.data;
}
