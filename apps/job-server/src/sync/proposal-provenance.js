import { createHash } from 'crypto';

/**
 * @typedef {Object} ProposalSource
 * @property {string} crawler
 * @property {string} platform
 * @property {string} jobId
 * @property {string} url
 */

/**
 * @typedef {Object} ProposalTarget
 * @property {string} [resumePath]
 * @property {string} path
 * @property {string} operation
 */

/**
 * @typedef {Object} SourceRef
 * @property {string} type
 * @property {string} crawler
 * @property {string} platform
 * @property {string} jobId
 * @property {string} url
 */

/**
 * @typedef {Object} AllowedChange
 * @property {ProposalTarget} target
 * @property {unknown} proposedValue
 */

/**
 * @typedef {Object} ProposalInput
 * @property {number} version
 * @property {string} id
 * @property {string} status
 * @property {string} createdAt
 * @property {ProposalSource} source
 * @property {ProposalTarget} target
 * @property {unknown} proposedValue
 * @property {unknown} currentValue
 * @property {number} confidence
 * @property {unknown[]} evidence
 * @property {string} notes
 * @property {string} [masterRevision]
 * @property {SourceRef[]} [sourceRefs]
 * @property {AllowedChange[]} [allowedChanges]
 * @property {unknown[]} [rejectedChanges]
 * @property {string} [proposalHash]
 * @property {Record<string, unknown>} [extra]
 * @property {Object.<string, unknown>} [_index]
 */

/**
 * @typedef {ProposalInput & {
 *   sourceRefs: SourceRef[],
 *   allowedChanges: AllowedChange[],
 *   rejectedChanges: unknown[],
 *   masterRevision: string,
 *   proposalHash: string,
 *   [key: string]: unknown,
 * }} ProvenanceProposal
 */

const HASHED_FIELDS = [
  'allowedChanges',
  'confidence',
  'createdAt',
  'currentValue',
  'evidence',
  'id',
  'masterRevision',
  'notes',
  'proposedValue',
  'rejectedChanges',
  'source',
  'sourceRefs',
  'status',
  'target',
  'version',
];

/**
 * @param {ProposalInput} proposal
 * @param {unknown} resume
 * @returns {ProvenanceProposal}
 */
export function buildProposalProvenance(proposal, resume) {
  const sourceRefs = [
    {
      type: 'crawler-job',
      crawler: proposal.source.crawler,
      platform: proposal.source.platform,
      jobId: proposal.source.jobId,
      url: proposal.source.url,
    },
  ];
  const allowedChanges = [
    {
      target: proposal.target,
      proposedValue: proposal.proposedValue,
    },
  ];
  return refreshProposalHash({
    ...proposal,
    masterRevision: hashValue(resume),
    sourceRefs,
    allowedChanges,
    rejectedChanges: [],
  });
}

/**
 * @param {ProposalInput & { [key: string]: unknown }} proposal
 * @returns {ProvenanceProposal}
 */
function refreshProposalHash(proposal) {
  return /** @type {ProvenanceProposal} */ ({
    ...proposal,
    proposalHash: hashValue(hashPayload(proposal)),
  });
}

/**
 * @param {ProvenanceProposal} proposal
 * @param {unknown} proposedValue
 * @returns {ProvenanceProposal}
 */
export function updateProposalValue(proposal, proposedValue) {
  const allowedChanges = proposal.allowedChanges.map((change) =>
    sameTarget(change.target, proposal.target) ? { ...change, proposedValue } : change
  );
  return refreshProposalHash({ ...proposal, proposedValue, allowedChanges });
}

/**
 * @param {ProvenanceProposal} proposal
 * @param {string} status
 * @returns {ProvenanceProposal}
 */
export function updateProposalStatus(proposal, status) {
  return refreshProposalHash({ ...proposal, status });
}

/**
 * @param {ProvenanceProposal} existing
 * @param {ProvenanceProposal} incoming
 * @returns {ProvenanceProposal | null}
 */
export function mergeEquivalentProposals(existing, incoming) {
  if (!sameProposalIdentity(existing, incoming)) return null;
  return refreshProposalHash({
    ...existing,
    evidence: mergeUniqueRecords(existing.evidence, incoming.evidence),
    sourceRefs: mergeUniqueRecords(existing.sourceRefs, incoming.sourceRefs),
  });
}

/**
 * @param {unknown} value
 * @returns {string}
 */
function hashValue(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${stableJson(/** @type {Record<string, unknown>} */ (value)[key])}`
      )
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

/**
 * @param {Record<string, unknown>} proposal
 * @returns {Record<string, unknown>}
 */
function hashPayload(proposal) {
  return Object.fromEntries(HASHED_FIELDS.map((field) => [field, proposal[field]]));
}

/**
 * @param {ProposalTarget} first
 * @param {ProposalTarget} second
 * @returns {boolean}
 */
function sameTarget(first, second) {
  return first.operation === second.operation && first.path === second.path;
}

/**
 * @param {ProvenanceProposal} first
 * @param {ProvenanceProposal} second
 * @returns {boolean}
 */
function sameProposalIdentity(first, second) {
  return (
    first.target.resumePath === second.target.resumePath &&
    sameTarget(first.target, second.target) &&
    stableJson(first.proposedValue) === stableJson(second.proposedValue)
  );
}

/**
 * @template T
 * @param {T[]} [first]
 * @param {T[]} [second]
 * @returns {T[]}
 */
function mergeUniqueRecords(first = [], second = []) {
  return [...new Map([...first, ...second].map((record) => [stableJson(record), record])).values()];
}
