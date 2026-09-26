export class ApprovalRequestRepository {
  constructor(db) {
    this.db = db;
  }

  async decidePendingForWorkflow(workflowId, decision, reviewer) {
    const result = await this.db
      .prepare(
        `
        UPDATE approval_requests
        SET status = ?, reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
        WHERE workflow_id = ? AND status = 'pending'
      `
      )
      .bind(decision, reviewer, workflowId)
      .run();
    return result.meta?.changes || 0;
  }
}
