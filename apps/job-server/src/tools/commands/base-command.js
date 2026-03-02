import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import {
  masterSchema,
  validateResumeData,
  formatErrorsForMCP,
} from '../../shared/validation/index.js';

const DEFAULT_OPENCODE_DATA_DIR = join(homedir(), '.OpenCode', 'data');
const DEFAULT_CLAUDE_DATA_DIR = join(homedir(), '.claude', 'data');

export const DATA_DIR = join(DEFAULT_OPENCODE_DATA_DIR, 'wanted-resume');
export const LEGACY_DATA_DIR = join(DEFAULT_CLAUDE_DATA_DIR, 'wanted-resume');

export class BaseCommand {
  constructor(api) {
    this.api = api;
  }

  resolveResumeFilePathForRead(resumeId, filePathFromParams) {
    if (filePathFromParams) return filePathFromParams;

    const preferred = join(DATA_DIR, `${resumeId}.json`);
    if (existsSync(preferred) || !resumeId) return preferred;

    const legacy = join(LEGACY_DATA_DIR, `${resumeId}.json`);
    if (existsSync(legacy)) return legacy;

    return preferred;
  }

  resolveResumeFilePathForWrite(resumeId, filePathFromParams) {
    if (filePathFromParams) return filePathFromParams;
    return join(DATA_DIR, `${resumeId}.json`);
  }

  ensureDir(dir) {
    mkdirSync(dir, { recursive: true });
  }

  listResumeFiles() {
    try {
      return readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));
    } catch {
      return [];
    }
  }

  readJsonFile(filePath) {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  }

  writeJsonFile(filePath, data) {
    this.ensureDir(dirname(filePath));
    writeFileSync(filePath, JSON.stringify(data, null, 2));
  }

  validateLocalData(data) {
    const validation = validateResumeData(data, masterSchema);
    if (!validation.valid) {
      return {
        valid: false,
        errors: formatErrorsForMCP(validation.errors),
      };
    }
    return { valid: true };
  }

  compareResume(local, remote) {
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

  async syncResumeSections(resumeId, local, remote, sections) {
    const diff = this.compareResume(local, remote);
    const results = { changes_applied: 0, errors: [] };
    const targetSections = sections || Object.keys(diff);

    for (const section of targetSections) {
      const changes = diff[section] || [];

      for (const change of changes) {
        try {
          await this._applyChange(resumeId, section, change);
          results.changes_applied++;
        } catch (error) {
          results.errors.push({ section, change, error: error.message });
        }
      }
    }

    return results;
  }

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

  async importResumeSections(resumeId, data, sections) {
    const results = { imported: [], errors: [] };
    const targetSections = sections || [
      'careers',
      'educations',
      'skills',
      'activities',
      'language_certs',
    ];

    for (const section of targetSections) {
      const items = data[section] || [];

      for (const item of items) {
        try {
          await this._importItem(resumeId, section, item);
          results.imported.push({ section, id: item.id });
        } catch (error) {
          results.errors.push({ section, id: item.id, error: error.message });
        }
      }
    }

    return results;
  }

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
