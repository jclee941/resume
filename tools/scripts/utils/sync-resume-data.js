#!/usr/bin/env node
/**
 * Single Source of Truth:
 * - resumes/master/resume_data.json
 * - resumes/master/resume_data_en.json
 * - resumes/master/resume_data_ja.json
 *
 * Generates:
 * - web/data.json (Korean portfolio data)
 * - web/data_en.json (English portfolio data)
 * - web/data_ja.json (Japanese portfolio data)
 * - shinhan_filled.pptx (proposal format)
 */

const { runSync } = require('./resume-sync-runner.js');

runSync();
