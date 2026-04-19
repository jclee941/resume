/**
 * MCP Tool: Auto Apply (자동 지원)
 *
 * Automatically apply to jobs based on search criteria and match score.
 * Delegates to UnifiedApplySystem for core logic.
 *
 * @module tools/auto-apply
 */
import { executeAutoApplyAction } from './auto-apply/actions.js';
import { AUTO_APPLY_DESCRIPTION, AUTO_APPLY_INPUT_SCHEMA } from './auto-apply/constants.js';
import { getSessionState } from './auto-apply/state.js';

export const autoApplyTool = {
  name: 'wanted_auto_apply',
  description: AUTO_APPLY_DESCRIPTION,
  inputSchema: AUTO_APPLY_INPUT_SCHEMA,

  async execute(params) {
    return executeAutoApplyAction(params, getSessionState());
  },
};

export default autoApplyTool;
