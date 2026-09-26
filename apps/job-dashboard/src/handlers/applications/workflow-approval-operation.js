export async function decideWorkflowApprovals(handler, request, decision) {
  const updated = await handler.approvalRequests.decidePendingForWorkflow(
    request.params.instanceId,
    decision,
    'api'
  );
  if (!updated) {
    return handler.jsonResponse({ error: 'No pending approval requests for this workflow' }, 404);
  }
  return handler.jsonResponse({ success: true, approved: decision === 'approved', updated });
}
