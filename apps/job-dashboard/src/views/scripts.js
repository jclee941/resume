import { DASHBOARD_SCRIPT_STATE } from './scripts/state.js';
import { DASHBOARD_SCRIPT_CORE } from './scripts/core.js';
import { DASHBOARD_SCRIPT_RESUME_SYNC } from './scripts/resume-sync.js';
import { DASHBOARD_SCRIPT_APPLICATIONS } from './scripts/applications.js';
import { DASHBOARD_SCRIPT_AUTOMATION } from './scripts/automation.js';

export const DASHBOARD_SCRIPTS = `${DASHBOARD_SCRIPT_STATE}
${DASHBOARD_SCRIPT_CORE}
${DASHBOARD_SCRIPT_RESUME_SYNC}
${DASHBOARD_SCRIPT_APPLICATIONS}
${DASHBOARD_SCRIPT_AUTOMATION}`;
