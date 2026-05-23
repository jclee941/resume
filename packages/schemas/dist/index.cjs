"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  VALID_APPLICATION_STATUSES: () => VALID_APPLICATION_STATUSES,
  VALID_APPLICATION_STATUSES_WIDE: () => VALID_APPLICATION_STATUSES_WIDE,
  adminLoginSchema: () => adminLoginSchema,
  applicationCreateSchema: () => applicationCreateSchema,
  applicationPriorityWideSchema: () => applicationPriorityWideSchema,
  applicationSchema: () => applicationSchema,
  applicationStatusChangePayloadSchema: () => applicationStatusChangePayloadSchema,
  applicationStatusSchema: () => applicationStatusSchema,
  applicationStatusUpdateSchema: () => applicationStatusUpdateSchema,
  applicationStatusWideSchema: () => applicationStatusWideSchema,
  applicationUpdateSchema: () => applicationUpdateSchema,
  dashboardApplicationCreateSchema: () => dashboardApplicationCreateSchema,
  dashboardApplicationUpdateSchema: () => dashboardApplicationUpdateSchema,
  dashboardStatusUpdateSchema: () => dashboardStatusUpdateSchema,
  emailSchema: () => emailSchema,
  idSchema: () => idSchema,
  isoTimestampSchema: () => isoTimestampSchema,
  jobFoundPayloadSchema: () => jobFoundPayloadSchema,
  koreanPhoneSchema: () => koreanPhoneSchema,
  notificationPayloadSchema: () => notificationPayloadSchema,
  platformSchema: () => platformSchema,
  platformSessionSchema: () => platformSessionSchema,
  portfolioDataSchema: () => portfolioDataSchema,
  resumeCareerSchema: () => resumeCareerSchema,
  resumeCertificationSchema: () => resumeCertificationSchema,
  resumeEducationSchema: () => resumeEducationSchema,
  resumePersonalSchema: () => resumePersonalSchema,
  resumeProfileSchema: () => resumeProfileSchema,
  resumeProjectSchema: () => resumeProjectSchema,
  resumeSchema: () => resumeSchema,
  resumeSkillCategorySchema: () => resumeSkillCategorySchema,
  resumeSkillItemSchema: () => resumeSkillItemSchema,
  resumeSkillSchema: () => resumeSkillSchema,
  sessionStateSchema: () => sessionStateSchema,
  validatePortfolioData: () => validatePortfolioData,
  webhookSignatureHeaderSchema: () => webhookSignatureHeaderSchema
});
module.exports = __toCommonJS(index_exports);

// src/common.js
var import_zod = require("zod");
var isoTimestampSchema = import_zod.z.string().regex(
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/,
  "must be ISO-8601 timestamp"
);
var idSchema = import_zod.z.union([import_zod.z.string().min(1), import_zod.z.number().int().positive()]);
var platformSchema = import_zod.z.enum([
  "wanted",
  "jobkorea",
  "saramin",
  "linkedin",
  "remember",
  "jumpit",
  "programmers",
  "rallit",
  "rocketpunch",
  "indeed"
]);
var koreanPhoneSchema = import_zod.z.string().regex(/^(\+82|0)?1[016789][-.]?\d{3,4}[-.]?\d{4}$/, "must be a valid Korean mobile number");
var emailSchema = import_zod.z.string().email();

// src/application.js
var import_zod2 = require("zod");
var applicationStatusSchema = import_zod2.z.enum([
  "pending",
  "applied",
  "reviewing",
  "interview",
  "offer",
  "rejected",
  "withdrawn"
]);
var applicationStatusWideSchema = import_zod2.z.enum([
  "pending",
  "saved",
  "applied",
  "viewed",
  "in_progress",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
  "expired"
]);
var applicationCreateSchema = import_zod2.z.object({
  jobId: idSchema,
  platform: platformSchema,
  company: import_zod2.z.string().min(1).max(200),
  position: import_zod2.z.string().min(1).max(300),
  status: applicationStatusSchema.optional().default("pending"),
  metadata: import_zod2.z.record(import_zod2.z.unknown()).optional()
});
var applicationUpdateSchema = import_zod2.z.object({
  company: import_zod2.z.string().min(1).max(200).optional(),
  position: import_zod2.z.string().min(1).max(300).optional(),
  status: applicationStatusSchema.optional(),
  metadata: import_zod2.z.record(import_zod2.z.unknown()).optional()
}).refine((d) => Object.keys(d).length > 0, { message: "at least one field required" });
var applicationStatusUpdateSchema = import_zod2.z.object({
  status: applicationStatusSchema
});
var applicationSchema = applicationCreateSchema.extend({
  id: import_zod2.z.string().min(1),
  appliedAt: isoTimestampSchema,
  updatedAt: isoTimestampSchema.optional()
});
var VALID_APPLICATION_STATUSES = applicationStatusSchema.options;
var VALID_APPLICATION_STATUSES_WIDE = applicationStatusWideSchema.options;
var applicationPriorityWideSchema = import_zod2.z.enum(["low", "medium", "high"]);
var dashboardJobBaseSchema = import_zod2.z.object({
  position: import_zod2.z.string().min(1).max(500).optional(),
  title: import_zod2.z.string().min(1).max(500).optional(),
  company: import_zod2.z.string().min(1).max(200).optional(),
  location: import_zod2.z.string().max(1e3).optional(),
  notes: import_zod2.z.string().max(1e3).optional(),
  source: import_zod2.z.string().max(1e3).optional(),
  platform: import_zod2.z.string().max(1e3).optional(),
  sourceUrl: import_zod2.z.string().url().max(2e3).optional(),
  source_url: import_zod2.z.string().url().max(2e3).optional(),
  jobUrl: import_zod2.z.string().url().max(2e3).optional(),
  job_url: import_zod2.z.string().url().max(2e3).optional(),
  priority: applicationPriorityWideSchema.optional(),
  status: applicationStatusWideSchema.optional(),
  matchScore: import_zod2.z.coerce.number().min(0).max(100).optional(),
  match_score: import_zod2.z.coerce.number().min(0).max(100).optional(),
  matchPercentage: import_zod2.z.coerce.number().min(0).max(100).optional(),
  match_percentage: import_zod2.z.coerce.number().min(0).max(100).optional()
});
var dashboardApplicationCreateSchema = import_zod2.z.object({
  job: dashboardJobBaseSchema.optional(),
  options: import_zod2.z.object({
    priority: applicationPriorityWideSchema.optional(),
    status: applicationStatusWideSchema.optional()
  }).passthrough().optional(),
  status: applicationStatusWideSchema.optional()
}).passthrough().superRefine((body, ctx) => {
  const job = body.job ?? body;
  const position = job?.position ?? job?.title;
  if (!position || typeof position !== "string") {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      message: "position/title is required and must be a string",
      path: ["job", "position"]
    });
  } else if (position.length > 500) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      message: "position/title must be 500 characters or less",
      path: ["job", "position"]
    });
  }
  if (!job?.company || typeof job.company !== "string") {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      message: "company is required and must be a string",
      path: ["job", "company"]
    });
  } else if (job.company.length > 200) {
    ctx.addIssue({
      code: import_zod2.z.ZodIssueCode.custom,
      message: "company must be 200 characters or less",
      path: ["job", "company"]
    });
  }
});
var dashboardApplicationUpdateSchema = import_zod2.z.object({
  notes: import_zod2.z.string().max(5e3).optional(),
  priority: applicationPriorityWideSchema.optional(),
  resumeId: import_zod2.z.string().max(100).optional()
}).passthrough();
var dashboardStatusUpdateSchema = import_zod2.z.object({
  status: applicationStatusWideSchema,
  note: import_zod2.z.string().max(1e3).optional()
}).passthrough();

// src/resume.js
var import_zod3 = require("zod");
var periodStringSchema = import_zod3.z.string().regex(
  /^(\d{4}\.\d{2}|\d{4})\s*[~\-–]\s*(\d{4}\.\d{2}|\d{4}|현재|Present|現在)$/,
  'must be "YYYY.MM ~ YYYY.MM" or "YYYY.MM ~ \uD604\uC7AC/Present/\u73FE\u5728"'
);
var skillLevelSchema = import_zod3.z.enum([
  "beginner",
  "intermediate",
  "advanced",
  "expert"
]);
var resumeSkillItemSchema = import_zod3.z.object({
  name: import_zod3.z.string().min(1),
  level: skillLevelSchema.optional(),
  proficiency: import_zod3.z.number().int().min(0).max(100).optional()
});
var resumeSkillCategorySchema = import_zod3.z.object({
  title: import_zod3.z.string().min(1),
  icon: import_zod3.z.string().optional(),
  items: import_zod3.z.array(resumeSkillItemSchema)
});
var resumeCareerSchema = import_zod3.z.object({
  company: import_zod3.z.string().min(1),
  period: periodStringSchema,
  role: import_zod3.z.string().optional(),
  description: import_zod3.z.string().optional()
});
var resumeProjectSchema = import_zod3.z.object({
  name: import_zod3.z.string().min(1),
  role: import_zod3.z.string().optional(),
  period: periodStringSchema.optional(),
  technologies: import_zod3.z.array(import_zod3.z.string()).optional(),
  description: import_zod3.z.string().optional()
});
var resumeCertificationSchema = import_zod3.z.object({
  name: import_zod3.z.string().min(1),
  issuer: import_zod3.z.string().min(1),
  date: import_zod3.z.string().min(1),
  expirationDate: import_zod3.z.string().nullable().optional()
});
var resumeEducationSchema = import_zod3.z.object({
  school: import_zod3.z.string().min(1),
  major: import_zod3.z.string().min(1),
  startDate: import_zod3.z.string().optional(),
  endDate: import_zod3.z.string().optional(),
  status: import_zod3.z.string().optional()
});
var resumePersonalSchema = import_zod3.z.object({
  name: import_zod3.z.string().min(1),
  email: emailSchema,
  phone: koreanPhoneSchema.optional(),
  github: import_zod3.z.string().url().optional(),
  portfolio: import_zod3.z.string().url().optional()
});
var resumeSchema = import_zod3.z.object({
  personal: resumePersonalSchema,
  careers: import_zod3.z.array(resumeCareerSchema),
  projects: import_zod3.z.array(resumeProjectSchema).optional(),
  skills: import_zod3.z.array(resumeSkillItemSchema).optional(),
  certifications: import_zod3.z.array(resumeCertificationSchema).optional(),
  education: resumeEducationSchema.optional()
});
var resumeProfileSchema = resumePersonalSchema;
var resumeSkillSchema = resumeSkillItemSchema;

// src/auth.js
var import_zod4 = require("zod");
var adminLoginSchema = import_zod4.z.object({
  token: import_zod4.z.string().min(20)
});
var platformSessionSchema = import_zod4.z.object({
  platform: platformSchema,
  cookies: import_zod4.z.string().min(1),
  token: import_zod4.z.string().optional(),
  email: import_zod4.z.string().email().optional(),
  expiresAt: import_zod4.z.number().int().positive(),
  refreshedAt: import_zod4.z.number().int().positive().optional()
});
var sessionStateSchema = import_zod4.z.object({
  userId: import_zod4.z.string().min(1),
  signedAt: isoTimestampSchema,
  expiresAt: import_zod4.z.number().int().positive()
});

// src/webhook.js
var import_zod5 = require("zod");
var webhookSignatureHeaderSchema = import_zod5.z.object({
  "x-webhook-signature": import_zod5.z.string().regex(/^[a-f0-9]{64}$/, "must be 64-char hex HMAC-SHA256"),
  "x-webhook-timestamp": isoTimestampSchema.optional()
});
var notificationPayloadSchema = import_zod5.z.object({
  message: import_zod5.z.string().min(1),
  company: import_zod5.z.string().optional(),
  jobId: idSchema.optional(),
  metadata: import_zod5.z.record(import_zod5.z.unknown()).optional()
});
var jobFoundPayloadSchema = import_zod5.z.object({
  jobId: idSchema,
  title: import_zod5.z.string().min(1),
  score: import_zod5.z.number().min(0).max(100)
});
var applicationStatusChangePayloadSchema = import_zod5.z.object({
  applicationId: import_zod5.z.string().min(1),
  oldStatus: import_zod5.z.string().min(1),
  newStatus: import_zod5.z.string().min(1)
});

// src/portfolio.js
var import_zod6 = require("zod");
var skillItemSchema = import_zod6.z.union([
  import_zod6.z.string().min(1),
  import_zod6.z.object({ name: import_zod6.z.string().min(1), level: import_zod6.z.string().optional() })
]);
var skillCategorySchema = import_zod6.z.union([
  import_zod6.z.array(skillItemSchema),
  import_zod6.z.object({ items: import_zod6.z.array(skillItemSchema) })
]);
var resumeItemSchema = import_zod6.z.object({
  title: import_zod6.z.string().min(1),
  description: import_zod6.z.string().min(1),
  stats: import_zod6.z.array(import_zod6.z.string()),
  highlight: import_zod6.z.boolean().optional(),
  completePdfUrl: import_zod6.z.string().optional(),
  pdfUrl: import_zod6.z.string().optional(),
  docxUrl: import_zod6.z.string().optional()
});
var projectItemSchema = import_zod6.z.object({
  title: import_zod6.z.string().min(1),
  tech: import_zod6.z.string().min(1),
  description: import_zod6.z.string().min(1)
});
var certificationItemSchema = import_zod6.z.object({
  name: import_zod6.z.string().min(1),
  issuer: import_zod6.z.string().min(1),
  date: import_zod6.z.string().nullable().optional(),
  status: import_zod6.z.string().nullable().optional()
}).refine((item) => item.date || item.status, {
  message: "certification must have at least a date or a status"
});
var resumeDownloadSchema = import_zod6.z.object({
  pdfUrl: import_zod6.z.string().min(1),
  docxUrl: import_zod6.z.string().min(1),
  mdUrl: import_zod6.z.string().min(1)
});
var portfolioDataSchema = import_zod6.z.object({
  resumeDownload: resumeDownloadSchema,
  resume: import_zod6.z.array(resumeItemSchema),
  projects: import_zod6.z.array(projectItemSchema),
  certifications: import_zod6.z.array(certificationItemSchema),
  skills: import_zod6.z.record(skillCategorySchema)
});
function validatePortfolioData(data, options = {}) {
  const result = portfolioDataSchema.safeParse(data);
  if (!result.success) {
    const messages = result.error.issues.map(
      (issue) => `${issue.path.join(".")}: ${issue.message}`
    );
    throw new Error(`Data validation failed:
  - ${messages.join("\n  - ")}`);
  }
  options.logger?.log?.("\u2713 Data validation passed\n");
  return result.data;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VALID_APPLICATION_STATUSES,
  VALID_APPLICATION_STATUSES_WIDE,
  adminLoginSchema,
  applicationCreateSchema,
  applicationPriorityWideSchema,
  applicationSchema,
  applicationStatusChangePayloadSchema,
  applicationStatusSchema,
  applicationStatusUpdateSchema,
  applicationStatusWideSchema,
  applicationUpdateSchema,
  dashboardApplicationCreateSchema,
  dashboardApplicationUpdateSchema,
  dashboardStatusUpdateSchema,
  emailSchema,
  idSchema,
  isoTimestampSchema,
  jobFoundPayloadSchema,
  koreanPhoneSchema,
  notificationPayloadSchema,
  platformSchema,
  platformSessionSchema,
  portfolioDataSchema,
  resumeCareerSchema,
  resumeCertificationSchema,
  resumeEducationSchema,
  resumePersonalSchema,
  resumeProfileSchema,
  resumeProjectSchema,
  resumeSchema,
  resumeSkillCategorySchema,
  resumeSkillItemSchema,
  resumeSkillSchema,
  sessionStateSchema,
  validatePortfolioData,
  webhookSignatureHeaderSchema
});
