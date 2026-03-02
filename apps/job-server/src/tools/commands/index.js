import { ExportCommand } from './export-command.js';
import { ImportCommand } from './import-command.js';
import { DiffCommand } from './diff-command.js';
import { SyncCommand } from './sync-command.js';
import { PipelineStatusCommand } from './pipeline-status-command.js';
import { PipelineRunCommand } from './pipeline-run-command.js';
import { PipelineScheduleCommand } from './pipeline-schedule-command.js';
import { SyncSectionCommand } from './sync-section-command.js';

export class CommandRegistry {
  constructor(api) {
    this.api = api;
    this.commands = new Map();
    this._registerCommands();
  }

  _registerCommands() {
    this.commands.set('export', new ExportCommand(this.api));
    this.commands.set('import', new ImportCommand(this.api));
    this.commands.set('diff', new DiffCommand(this.api));
    this.commands.set('sync', new SyncCommand(this.api));
    this.commands.set('pipeline_status', new PipelineStatusCommand(this.api));
    this.commands.set('pipeline_run', new PipelineRunCommand(this.api));
    this.commands.set('pipeline_schedule', new PipelineScheduleCommand(this.api));
    this.commands.set('sync_careers', new SyncSectionCommand(this.api, 'careers'));
    this.commands.set('sync_educations', new SyncSectionCommand(this.api, 'educations'));
    this.commands.set('sync_skills', new SyncSectionCommand(this.api, 'skills'));
    this.commands.set('sync_activities', new SyncSectionCommand(this.api, 'activities'));
    this.commands.set('sync_language_certs', new SyncSectionCommand(this.api, 'language_certs'));
  }

  getCommand(action) {
    return this.commands.get(action);
  }

  getAvailableActions() {
    return Array.from(this.commands.keys());
  }
}

export { BaseCommand } from './base-command.js';
export { ExportCommand } from './export-command.js';
export { ImportCommand } from './import-command.js';
export { DiffCommand } from './diff-command.js';
export { SyncCommand } from './sync-command.js';
export { PipelineStatusCommand } from './pipeline-status-command.js';
export { PipelineRunCommand } from './pipeline-run-command.js';
export { PipelineScheduleCommand } from './pipeline-schedule-command.js';
export { SyncSectionCommand } from './sync-section-command.js';
