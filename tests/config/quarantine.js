/** Flaky test quarantine registry.
 * Tests listed here are auto-retried and tracked for stability.
 * Format: { testId: string, reason: string, addedDate: string, retryCount: number }
 */
module.exports = {
  quarantinedTests: [],
  maxRetries: 3,
  isQuarantined(testId) {
    return this.quarantinedTests.some((t) => t.testId === testId);
  },
  getRetryCount(testId) {
    const test = this.quarantinedTests.find((t) => t.testId === testId);
    return test ? test.retryCount : 0;
  },
};
