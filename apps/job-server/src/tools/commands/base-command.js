import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { masterSchema, validateResumeData, formatErrorsForMCP } from '@resume/shared/validation';

const DEFAULT_OPENCODE_DATA_DIR = join(homedir(), '.opencode', 'data');

export const DATA_DIR = join(DEFAULT_OPENCODE_DATA_DIR, 'wanted-resume');

/**
 * @typedef {{
 *   add(resumeId: string, data: unknown): Promise<unknown>;
 *   update(resumeId: string, id: unknown, data: unknown): Promise<unknown>;
 *   delete(resumeId: string, id: unknown): Promise<unknown>;
 * }} SectionSubApi
 */

/**
 * @typedef {{
 *   addResumeCareer(resumeId: string, data: unknown): Promise<unknown>;
 *   updateResumeCareer(resumeId: string, id: unknown, data: unknown): Promise<unknown>;
 *   deleteResumeCareer(resumeId: string, id: unknown): Promise<unknown>;
 *   addResumeSkill(resumeId: string, tagId: unknown): Promise<unknown>;
 *   deleteResumeSkill(resumeId: string, id: unknown): Promise<unknown>;
 *   addResumeEducation(resumeId: string, data: unknown): Promise<unknown>;
 *   addResumeActivity(resumeId: string, data: unknown): Promise<unknown>;
 *   addResumeLanguageCert(resumeId: string, data: unknown): Promise<unknown>;
 *   resumeEducation: SectionSubApi;
 *   resumeActivity: SectionSubApi;
 *   resumeLanguageCert: SectionSubApi;
 *   [key: string]: unknown;
 * }} BaseCommandApi
 */

/**
 * @typedef {Object} DiffChange
 * @property {string} type
 * @property {unknown} [id]
 * @property {unknown} [data]
 * @property {unknown} [local]
 * @property {unknown} [remote]
 * @property {unknown} [tag_type_id]
 */

/**
 * @typedef {Record<string, unknown> & { id: unknown }} ResumeItem
 * @typedef {{ id?: unknown, tag_type_id?: unknown }} ResumeSkillItem
 * @typedef {{
 *   careers?: ResumeItem[];
 *   educations?: ResumeItem[];
 *   activities?: ResumeItem[];
 *   language_certs?: ResumeItem[];
 *   skills?: ResumeSkillItem[];
 * }} ResumeSections
 */

/**
 * @typedef {{
 *   careers: DiffChange[];
 *   educations: DiffChange[];
 *   skills: DiffChange[];
 *   activities: DiffChange[];
 *   language_certs: DiffChange[];
 *   [key: string]: DiffChange[];
 * }} ResumeDiff
 */

export class BaseCommand {
  /**
   * @param {BaseCommandApi} api
   * @param {{ logger?: Pick<Console, 'info' | 'warn' | 'error'> }} [options]
   */
  constructor(api, { logger = console } = {}) {
    this.api = api;
    this.logger = logger;
  }

  /**
   * @param {string} resumeId
   * @param {string} [filePathFromParams]
   * @returns {string}
   */
  resolveResumeFilePathForRead(resumeId, filePathFromParams) {
    if (filePathFromParams) return filePathFromParams;

    return join(DATA_DIR, `${resumeId}.json`);
  }

  /**
   * @param {string} resumeId
   * @param {string} [filePathFromParams]
   * @returns {string}
   */
  resolveResumeFilePathForWrite(resumeId, filePathFromParams) {
    if (filePathFromParams) return filePathFromParams;
    return join(DATA_DIR, `${resumeId}.json`);
  }

  /**
   * @param {string} dir
   * @returns {void}
   */
  ensureDir(dir) {
    mkdirSync(dir, { recursive: true });
  }

  listResumeFiles() {
    try {
      return readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
    } catch (e) {
      this.logger.error('Failed to list resume files:', e);
      return [];
    }
  }

  /**
   * @param {string} filePath
   * @returns {unknown}
   */
  readJsonFile(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  /**
   * @param {string} filePath
   * @param {unknown} data
   * @returns {void}
   */
  writeJsonFile(filePath, data) {
    this.ensureDir(dirname(filePath));
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  /**
   * @param {unknown} data
   * @param {string} [sourceFile]
   * @returns {{ valid: boolean, errors?: unknown }}
   */
  validateLocalData(data, sourceFile) {
    const validation = validateResumeData(data, masterSchema, sourceFile);
    if (!validation.valid) {
      return {
        valid: false,
        errors: formatErrorsForMCP(validation.errors),
      };
    }
    return { valid: true };
  }

  /**
   * @param {ResumeSections} local
   * @param {ResumeSections} remote
   * @returns {ResumeDiff}
   */
  compareResume(local, remote) {
    /** @type {ResumeDiff} */
    const diff = {
      careers: [],
      educations: [],
      skills: [],
      activities: [],
      language_certs: [],
    };

    this._compareById(local.careers, remote.careers, diff.careers);
    this._compareById(local.educations, remote.educations, diff.educations);
    this._compareById(local.activities, remote.activities, diff.activities);
    this._compareById(local.language_certs, remote.language_certs, diff.language_certs);
    this._compareSkills(local.skills, remote.skills, diff.skills);

    return diff;
  }

  /**
   * @param {ResumeItem[] | undefined} localItems
   * @param {ResumeItem[] | undefined} remoteItems
   * @param {DiffChange[]} diffArray
   */
  _compareById(localItems, remoteItems, diffArray) {
    const localMap = new Map((localItems || []).map((item) => [item.id, item]));
    const remoteMap = new Map((remoteItems || []).map((item) => [item.id, item]));

    for (const [id, localItem] of localMap) {
      const remoteItem = remoteMap.get(id);
      if (!remoteItem) {
        diffArray.push({ type: 'add', data: localItem });
      } else if (JSON.stringify(localItem) !== JSON.stringify(remoteItem)) {
        diffArray.push({ type: 'update', id, local: localItem, remote: remoteItem });
      }
    }

    for (const [id] of remoteMap) {
      if (!localMap.has(id)) {
        diffArray.push({ type: 'delete', id });
      }
    }
  }

  /**
   * @param {ResumeSkillItem[] | undefined} localSkills
   * @param {ResumeSkillItem[] | undefined} remoteSkills
   * @param {DiffChange[]} diffArray
   */
  _compareSkills(localSkills, remoteSkills, diffArray) {
    const localSet = new Set((localSkills || []).map((s) => s.tag_type_id));
    const remoteSet = new Set((remoteSkills || []).map((s) => s.tag_type_id));

    for (const tagId of localSet) {
      if (!remoteSet.has(tagId)) {
        diffArray.push({ type: 'add', tag_type_id: tagId });
      }
    }

    for (const skill of remoteSkills || []) {
      if (!localSet.has(skill.tag_type_id)) {
        diffArray.push({ type: 'delete', id: skill.id, tag_type_id: skill.tag_type_id });
      }
    }
  }

  /**
   * @param {string} resumeId
   * @param {ResumeSections} local
   * @param {ResumeSections} remote
   * @param {string[]} [sections]
   * @returns {Promise<{ changes_applied: number, errors: Array<{ section: string, change: DiffChange, error: string }> }>}
   */
  async syncResumeSections(resumeId, local, remote, sections) {
    const diff = this.compareResume(local, remote);
    /** @type {{ changes_applied: number, errors: Array<{ section: string, change: DiffChange, error: string }> }} */
    const results = { changes_applied: 0, errors: [] };
    const targetSections = sections || Object.keys(diff);

    for (const section of targetSections) {
      const changes = diff[section] || [];

      for (const change of changes) {
        try {
          await this._applyChange(resumeId, section, change);
          results.changes_applied++;
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          results.errors.push({ section, change, error: message });
        }
      }
    }

    return results;
  }

  /**
   * @param {string} resumeId
   * @param {string} section
   * @param {DiffChange} change
   * @returns {Promise<void>}
   */
  async _applyChange(resumeId, section, change) {
    const api = this.api;

    switch (section) {
      case 'careers':
        if (change.type === 'add') await api.addResumeCareer(resumeId, change.data);
        else if (change.type === 'update')
          await api.updateResumeCareer(resumeId, change.id, change.local);
        else if (change.type === 'delete') await api.deleteResumeCareer(resumeId, change.id);
        break;
      case 'skills':
        if (change.type === 'add') await api.addResumeSkill(resumeId, change.tag_type_id);
        else if (change.type === 'delete') await api.deleteResumeSkill(resumeId, change.id);
        break;
      case 'educations':
        if (change.type === 'add') await api.resumeEducation.add(resumeId, change.data);
        else if (change.type === 'update')
          await api.resumeEducation.update(resumeId, change.id, change.local);
        else if (change.type === 'delete') await api.resumeEducation.delete(resumeId, change.id);
        break;
      case 'activities':
        if (change.type === 'add') await api.resumeActivity.add(resumeId, change.data);
        else if (change.type === 'update')
          await api.resumeActivity.update(resumeId, change.id, change.local);
        else if (change.type === 'delete') await api.resumeActivity.delete(resumeId, change.id);
        break;
      case 'language_certs':
        if (change.type === 'add') await api.resumeLanguageCert.add(resumeId, change.data);
        else if (change.type === 'update')
          await api.resumeLanguageCert.update(resumeId, change.id, change.local);
        else if (change.type === 'delete') await api.resumeLanguageCert.delete(resumeId, change.id);
        break;
    }
  }

  /**
   * @param {string} resumeId
   * @param {Record<string, unknown>} data
   * @param {string[]} [sections]
   * @returns {Promise<{ imported: Array<{ section: string, id: unknown }>, errors: Array<{ section: string, id: unknown, error: string }> }>}
   */
  async importResumeSections(resumeId, data, sections) {
    /** @type {{ imported: Array<{ section: string, id: unknown }>, errors: Array<{ section: string, id: unknown, error: string }> }} */
    const results = { imported: [], errors: [] };
    const targetSections = sections || [
      'careers',
      'educations',
      'skills',
      'activities',
      'language_certs',
    ];

    for (const section of targetSections) {
      const items = /** @type {Array<Record<string, unknown>>} */ (data[section] || []);

      for (const item of items) {
        try {
          await this._importItem(resumeId, section, item);
          results.imported.push({ section, id: item.id });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          results.errors.push({ section, id: item.id, error: message });
        }
      }
    }

    return results;
  }

  /**
   * @param {string} resumeId
   * @param {string} section
   * @param {Record<string, unknown> & { tag_type_id?: unknown }} item
   * @returns {Promise<void>}
   */
  async _importItem(resumeId, section, item) {
    const api = this.api;

    switch (section) {
      case 'careers':
        await api.addResumeCareer(resumeId, item);
        break;
      case 'educations':
        await api.addResumeEducation(resumeId, item);
        break;
      case 'skills':
        await api.addResumeSkill(resumeId, item.tag_type_id);
        break;
      case 'activities':
        await api.addResumeActivity(resumeId, item);
        break;
      case 'language_certs':
        await api.addResumeLanguageCert(resumeId, item);
        break;
    }
  }
}
