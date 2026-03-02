#!/usr/bin/env node
/**
 * Single Source of Truth:
 * - resumes/master/resume_data.json
 * - resumes/master/resume_data_en.json
 * - resumes/master/resume_data_ja.json
 *
 * Generates:
 * - apps/portfolio/data.json (Korean portfolio data)
 * - apps/portfolio/data_en.json (English portfolio data)
 * - apps/portfolio/data_ja.json (Japanese portfolio data)
 * - shinhan_filled.pptx (proposal format)
 */

const { runSync } = require('./resume-sync-runner.js');

runSync();
