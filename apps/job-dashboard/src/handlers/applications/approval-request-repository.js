/**
 * @typedef {Object} D1Database
 * @property {(query: string) => { bind(...values: unknown[]): { run(): Promise<{ meta?: { changes?: number } }> } }} prepare
 */

export class ApprovalRequestRepository {
  /**
   * @param {D1Database} db
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * @param {string} workflowId
   * @param {string} decision
   * @param {string} reviewer
   * @returns {Promise<number>}
   */
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
