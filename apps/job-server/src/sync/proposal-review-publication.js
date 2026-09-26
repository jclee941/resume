import { randomUUID } from 'crypto';
import {
  existsSync,
  linkSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { basename, dirname, join } from 'path';

import { mergeEquivalentProposals, updateProposalStatus } from './proposal-provenance.js';

/**
 * @typedef {import('./proposal-provenance.js').ProvenanceProposal & { filePath: string }} ProposalWithFilePath
 */

/**
 * @param {{
 *   proposal: ProposalWithFilePath;
 *   targetDir: string;
 *   status: string;
 *   rename?: (oldPath: string, newPath: string) => void;
 * }} options
 * @returns {string}
 */
export function publishReviewedProposal({ proposal, targetDir, status, rename = renameSync }) {
  if (!proposal.filePath) throw new Error('proposal file path is required');
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

  const filename = basename(proposal.filePath);
  const destinationPath = join(targetDir, filename);
  const temporaryPath = join(targetDir, `.${filename}.${randomUUID()}.tmp`);
  const destinationBackupPath = join(targetDir, `.${filename}.${randomUUID()}.previous`);
  const pendingBackupPath = join(dirname(proposal.filePath), `.${filename}.${randomUUID()}.moving`);
  let hasDestinationBackup = false;

  try {
    const updated = {
      ...updateProposalStatus(proposal, status),
      reviewedAt: new Date().toISOString(),
    };
    delete (/** @type {{ filePath?: string }} */ (updated).filePath);
    writeFileSync(temporaryPath, `${JSON.stringify(updated, null, 2)}\n`, { flag: 'wx' });

    try {
      linkSync(temporaryPath, destinationPath);
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error)?.code !== 'EEXIST') throw error;
      const existing = JSON.parse(readFileSync(destinationPath, 'utf8'));
      const merged =
        existing.id === updated.id && existing.status === status
          ? mergeEquivalentProposals(existing, updated)
          : null;
      if (!merged) {
        throw new Error(`proposal review destination exists: ${destinationPath}`, { cause: error });
      }
      writeFileSync(temporaryPath, `${JSON.stringify(merged, null, 2)}\n`);
      linkSync(destinationPath, destinationBackupPath);
      hasDestinationBackup = true;
      renameSync(temporaryPath, destinationPath);
    }

    try {
      rename(proposal.filePath, pendingBackupPath);
    } catch (error) {
      rollbackDestination(
        destinationPath,
        destinationBackupPath,
        hasDestinationBackup,
        /** @type {Error} */ (error)
      );
    }

    try {
      unlinkSync(pendingBackupPath);
    } catch (error) {
      restorePending(pendingBackupPath, proposal.filePath, /** @type {Error} */ (error));
      rollbackDestination(
        destinationPath,
        destinationBackupPath,
        hasDestinationBackup,
        /** @type {Error} */ (error)
      );
    }

    if (hasDestinationBackup) unlinkSync(destinationBackupPath);
    return destinationPath;
  } finally {
    rmSync(temporaryPath, { force: true });
  }
}

/**
 * @param {string} destinationPath
 * @param {string} backupPath
 * @param {boolean} hasBackup
 * @param {Error} cause
 */
function rollbackDestination(destinationPath, backupPath, hasBackup, cause) {
  try {
    unlinkSync(destinationPath);
    if (hasBackup) renameSync(backupPath, destinationPath);
  } catch (rollbackError) {
    const rollbackMsg =
      rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
    throw new Error(`${cause.message}; restore review destination: ${rollbackMsg}`, {
      cause: rollbackError,
    });
  }
  throw cause;
}

/**
 * @param {string} backupPath
 * @param {string} pendingPath
 * @param {Error} cause
 */
function restorePending(backupPath, pendingPath, cause) {
  try {
    renameSync(backupPath, pendingPath);
  } catch (restoreError) {
    const restoreMsg = restoreError instanceof Error ? restoreError.message : String(restoreError);
    throw new Error(`${cause.message}; restore pending proposal: ${restoreMsg}`, {
      cause: restoreError,
    });
  }
}
