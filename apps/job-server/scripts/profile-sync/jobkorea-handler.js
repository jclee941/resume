import { loadJobKoreaSession, saveJobKoreaSession } from './jobkorea-handler/session.js';
import {
  computeChangesForJobKorea,
  describeJobKoreaField,
} from './jobkorea-handler/change-detection.js';
import {
  readJobKoreaSectionIndices,
  createJobKoreaEntrySlots,
} from './jobkorea-handler/section-slots.js';
import { syncJobKoreaProfile } from './jobkorea-handler/sync.js';

export default class JobKoreaHandler {
  loadSession() {
    return loadJobKoreaSession();
  }

  saveSession(cookies) {
    saveJobKoreaSession(cookies);
  }

  computeChanges(currentFields, targetFields) {
    return computeChangesForJobKorea(currentFields, targetFields, this.describeField.bind(this));
  }

  describeField(name) {
    return describeJobKoreaField(name);
  }

  async readSectionIndices(page, prefix) {
    return readJobKoreaSectionIndices(page, prefix);
  }

  async createEntrySlots(page, ssot) {
    return createJobKoreaEntrySlots(this, page, ssot);
  }

  async sync(ssot) {
    return syncJobKoreaProfile(this, ssot);
  }
}
