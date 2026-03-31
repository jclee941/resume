/**
 * Barrel export for handlers.
 */
export { tools, handleListTools, handleCallTool, registerToolHandlers } from './tools.js';
export {
  resources,
  handleListResources,
  handleReadResource,
  registerResourceHandlers,
} from './resources.js';
export { prompts, handleListPrompts, handleGetPrompt, registerPromptHandlers } from './prompts.js';
