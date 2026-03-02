/**
 * AI cost tracking and budget monitoring.
 * Tracks token usage and estimated costs per provider/model.
 * Persists usage data to KV for cross-request aggregation.
 *
 * @module ai/cost-tracker
 */

const _COST_PREFIX = 'ai-cost:';
const DAILY_KEY_FORMAT = 'ai-cost:daily:';
const MONTHLY_KEY_FORMAT = 'ai-cost:monthly:';

/** Default budget thresholds in USD */
const DEFAULT_BUDGETS = {
  dailyLimit: 5.0,
  monthlyLimit: 50.0,
  alertThreshold: 0.8, // Alert at 80% of budget
};

export class CostTracker {
  /**
   * @param {object} options
   * @param {object} [options.kv] - KV namespace for persisting usage data
   * @param {object} [options.budgets] - Budget configuration
   * @param {number} [options.budgets.dailyLimit=5.0] - Daily spending limit (USD)
   * @param {number} [options.budgets.monthlyLimit=50.0] - Monthly spending limit (USD)
   * @param {number} [options.budgets.alertThreshold=0.8] - Alert at this fraction of budget
   */
  constructor({ kv, budgets = {} } = {}) {
    this.kv = kv;
    this.budgets = { ...DEFAULT_BUDGETS, ...budgets };

    // In-memory accumulator for the current request lifecycle
    this.session = {
      totalTokens: 0,
      totalCost: 0,
      requests: 0,
      byProvider: {},
    };
  }

  /**
   * Record token usage from an AI response.
   * @param {object} response - AI provider response
   * @param {string} response.provider - Provider name
   * @param {string} response.model - Model identifier
   * @param {object} response.usage - Token usage {prompt_tokens, completion_tokens, total_tokens}
   * @param {number} costPer1kTokens - Cost per 1000 tokens for this model
   * @returns {Promise<{cost: number, alert: string|null}>}
   */
  async recordUsage(response, costPer1kTokens = 0) {
    const { provider, model, usage } = response;

    const totalTokens =
      usage?.total_tokens || (usage?.prompt_tokens ?? 0) + (usage?.completion_tokens ?? 0);
    const cost = (totalTokens / 1000) * costPer1kTokens;

    this.session.totalTokens += totalTokens;
    this.session.totalCost += cost;
    this.session.requests++;

    if (!this.session.byProvider[provider]) {
      this.session.byProvider[provider] = { tokens: 0, cost: 0, requests: 0 };
    }
    this.session.byProvider[provider].tokens += totalTokens;
    this.session.byProvider[provider].cost += cost;
    this.session.byProvider[provider].requests++;

    let alert = null;
    if (this.kv && cost > 0) {
      alert = await this._persistAndCheck(cost, totalTokens, provider, model);
    }

    return { cost, totalTokens, alert };
  }

  /**
   * Persist usage to KV and check budget alerts.
   * @private
   */
  async _persistAndCheck(cost, tokens, provider, _model) {
    const now = new Date();
    const dailyKey = `${DAILY_KEY_FORMAT}${now.toISOString().slice(0, 10)}`;
    const monthlyKey = `${MONTHLY_KEY_FORMAT}${now.toISOString().slice(0, 7)}`;

    try {
      const dailyData = (await this.kv.get(dailyKey, 'json')) || {
        totalCost: 0,
        totalTokens: 0,
        requests: 0,
        byProvider: {},
      };
      dailyData.totalCost += cost;
      dailyData.totalTokens += tokens;
      dailyData.requests++;
      if (!dailyData.byProvider[provider]) {
        dailyData.byProvider[provider] = { cost: 0, tokens: 0 };
      }
      dailyData.byProvider[provider].cost += cost;
      dailyData.byProvider[provider].tokens += tokens;

      await this.kv.put(dailyKey, JSON.stringify(dailyData), {
        expirationTtl: 86400 * 7, // Keep 7 days
      });

      const monthlyData = (await this.kv.get(monthlyKey, 'json')) || {
        totalCost: 0,
        totalTokens: 0,
        requests: 0,
      };
      monthlyData.totalCost += cost;
      monthlyData.totalTokens += tokens;
      monthlyData.requests++;

      await this.kv.put(monthlyKey, JSON.stringify(monthlyData), {
        expirationTtl: 86400 * 35, // Keep 35 days
      });

      if (dailyData.totalCost >= this.budgets.dailyLimit) {
        return `BUDGET_EXCEEDED: Daily limit $${this.budgets.dailyLimit} reached ($${dailyData.totalCost.toFixed(4)})`;
      }
      if (dailyData.totalCost >= this.budgets.dailyLimit * this.budgets.alertThreshold) {
        return `BUDGET_WARNING: Daily spend at ${Math.round((dailyData.totalCost / this.budgets.dailyLimit) * 100)}% ($${dailyData.totalCost.toFixed(4)}/$${this.budgets.dailyLimit})`;
      }
      if (monthlyData.totalCost >= this.budgets.monthlyLimit * this.budgets.alertThreshold) {
        return `BUDGET_WARNING: Monthly spend at ${Math.round((monthlyData.totalCost / this.budgets.monthlyLimit) * 100)}% ($${monthlyData.totalCost.toFixed(4)}/$${this.budgets.monthlyLimit})`;
      }
    } catch (err) {
      console.warn(`[CostTracker] Persistence error: ${err.message}`);
    }

    return null;
  }

  /**
   * Get daily usage summary.
   * @param {string} [date] - ISO date string (YYYY-MM-DD), defaults to today
   * @returns {Promise<object>}
   */
  async getDailyUsage(date) {
    if (!this.kv) return this.session;
    const key = `${DAILY_KEY_FORMAT}${date ?? new Date().toISOString().slice(0, 10)}`;
    return (await this.kv.get(key, 'json')) || { totalCost: 0, totalTokens: 0, requests: 0 };
  }

  /**
   * Get monthly usage summary.
   * @param {string} [month] - ISO month string (YYYY-MM), defaults to current month
   * @returns {Promise<object>}
   */
  async getMonthlyUsage(month) {
    if (!this.kv) return this.session;
    const key = `${MONTHLY_KEY_FORMAT}${month ?? new Date().toISOString().slice(0, 7)}`;
    return (await this.kv.get(key, 'json')) || { totalCost: 0, totalTokens: 0, requests: 0 };
  }

  /**
   * Check if the daily budget has been exceeded.
   * @returns {Promise<boolean>}
   */
  async isBudgetExceeded() {
    const daily = await this.getDailyUsage();
    return daily.totalCost >= this.budgets.dailyLimit;
  }

  /** Get current session statistics. */
  getSessionStats() {
    return { ...this.session };
  }
}
