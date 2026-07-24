import { createHash } from 'crypto';

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

export function refreshProposalHash(proposal) {
  return {
    ...proposal,
    proposalHash: hashValue(hashPayload(proposal)),
  };
}

export function updateProposalValue(proposal, proposedValue) {
  const allowedChanges = proposal.allowedChanges.map((change) =>
    sameTarget(change.target, proposal.target) ? { ...change, proposedValue } : change
  );
  return refreshProposalHash({ ...proposal, proposedValue, allowedChanges });
}

export function updateProposalStatus(proposal, status) {
  return refreshProposalHash({ ...proposal, status });
}

export function mergeEquivalentProposals(existing, incoming) {
  if (!sameProposalIdentity(existing, incoming)) return null;
  return refreshProposalHash({
    ...existing,
    evidence: mergeUniqueRecords(existing.evidence, incoming.evidence),
    sourceRefs: mergeUniqueRecords(existing.sourceRefs, incoming.sourceRefs),
  });
}

export function hashValue(value) {
  return createHash('sha256').update(stableJson(value)).digest('hex');
}

export function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashPayload(proposal) {
  return Object.fromEntries(HASHED_FIELDS.map((field) => [field, proposal[field]]));
}

function sameTarget(first, second) {
  return first.operation === second.operation && first.path === second.path;
}

function sameProposalIdentity(first, second) {
  return (
    first.target.resumePath === second.target.resumePath &&
    sameTarget(first.target, second.target) &&
    stableJson(first.proposedValue) === stableJson(second.proposedValue)
  );
}

function mergeUniqueRecords(first = [], second = []) {
  return [...new Map([...first, ...second].map((record) => [stableJson(record), record])).values()];
}
