#!/usr/bin/env node
/**
 * Single Source of Truth: resumes/master/resume_data.json
 *
 * Generates:
 * - web/data.json (portfolio website)
 * - shinhan_filled.pptx (proposal format)
 */

const { runSync } = require('./resume-sync-runner.js');

runSync();
