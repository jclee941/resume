/**
 * Compatibility adapter for the job crawling workflow.
 *
 * Focused implementation modules live in `./job-crawling/`; this file remains
 * so existing imports from `workflows/job-crawling.js` keep working.
 */
export { JobCrawlingWorkflow } from './job-crawling/index.js';
