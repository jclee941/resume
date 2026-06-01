function toIso(value = Date.now()) {
  return new Date(value).toISOString();
}

export async function approveRequest(context, applicationId, reviewer = 'unknown') {
  const request = await context.getApprovalRequestById(applicationId);
  context.assertPendingRequest(request, applicationId);

  const now = toIso();
  const notesState = context.parseApprovalNotes(request.notes);
  notesState.events.push({ type: 'approved', at: now, reviewer });

  await context.updateApprovalRequest(applicationId, {
    status: 'approved',
    reviewed_by: reviewer,
    reviewed_at: now,
    notes: context.stringifyApprovalNotes(notesState),
    updated_at: now,
  });

  await context.applicationRepository.updateStatus(
    applicationId,
    'can_apply',
    `Approved by ${reviewer}`
  );
  await context.applicationRepository.update(applicationId, {
    approved_at: now,
    rejected_at: null,
  });

  return {
    applicationId,
    status: 'approved',
    nextStatus: 'can_apply',
    reviewer,
    reviewedAt: now,
  };
}

export async function rejectRequest(
  context,
  applicationId,
  reviewer = 'unknown',
  reason = 'Rejected by reviewer'
) {
  const request = await context.getApprovalRequestById(applicationId);
  context.assertPendingRequest(request, applicationId);

  const now = toIso();
  const notesState = context.parseApprovalNotes(request.notes);
  notesState.reason = reason;
  notesState.events.push({ type: 'rejected', at: now, reviewer, reason });

  await context.updateApprovalRequest(applicationId, {
    status: 'rejected',
    reviewed_by: reviewer,
    reviewed_at: now,
    notes: context.stringifyApprovalNotes(notesState),
    updated_at: now,
  });

  await context.applicationRepository.updateStatus(
    applicationId,
    'skip',
    `Rejected by ${reviewer}: ${reason}`
  );
  await context.applicationRepository.update(applicationId, { rejected_at: now });

  return {
    applicationId,
    status: 'rejected',
    nextStatus: 'skip',
    reviewer,
    reason,
    reviewedAt: now,
  };
}

export async function cancelApproval(context, applicationId) {
  const request = await context.getApprovalRequestById(applicationId);
  context.assertPendingRequest(request, applicationId);

  const now = toIso();
  const notesState = context.parseApprovalNotes(request.notes);
  notesState.events.push({ type: 'cancelled', at: now });

  await context.updateApprovalRequest(applicationId, {
    status: 'rejected',
    reviewed_by: 'system:cancelled',
    reviewed_at: now,
    notes: context.stringifyApprovalNotes(notesState),
    updated_at: now,
  });

  await context.applicationRepository.updateStatus(
    applicationId,
    'skip',
    'Approval request cancelled before review'
  );

  return {
    applicationId,
    status: 'cancelled',
    nextStatus: 'skip',
    cancelledAt: now,
  };
}
