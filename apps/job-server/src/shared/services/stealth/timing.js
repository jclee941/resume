/**
 * @fileoverview Humanized request timing with natural variance.
 *
 * Simulates human browsing patterns: normal delays, occasional bursts
 * (quick successive clicks), and long pauses (reading/thinking).
 *
 * @module shared/services/stealth/timing
 */

/**
 * @typedef {object} TimingConfig
 * @property {number} minDelay - Minimum delay ms (default: 800)
 * @property {number} maxDelay - Maximum delay ms (default: 3000)
 * @property {number} burstProbability - Chance of quick succession (default: 0.15)
 * @property {number} burstMinDelay - Min delay during burst (default: 200)
 * @property {number} burstMaxDelay - Max delay during burst (default: 500)
 * @property {number} longPauseProbability - Chance of long pause (default: 0.08)
 * @property {number} longPauseMin - Min long pause ms (default: 5000)
 * @property {number} longPauseMax - Max long pause ms (default: 15000)
 */

/** @type {TimingConfig} */
const DEFAULT_TIMING_CONFIG = {
  minDelay: 800,
  maxDelay: 3000,
  burstProbability: 0.15,
  burstMinDelay: 200,
  burstMaxDelay: 500,
  longPauseProbability: 0.08,
  longPauseMin: 5000,
  longPauseMax: 15000,
};

/**
 * Gaussian-like random using sum of 3 uniform randoms (central limit approx).
 * Returns value in [0, 1] biased toward 0.5.
 * @returns {number}
 */
function gaussianRandom() {
  return (Math.random() + Math.random() + Math.random()) / 3;
}

/**
 * Humanized timer that simulates natural browsing delay patterns.
 */
export class HumanizedTimer {
  /**
   * @param {Partial<TimingConfig>} config
   */
  constructor(config = {}) {
    /** @type {TimingConfig} */
    this.config = { ...DEFAULT_TIMING_CONFIG, ...config };

    /** @type {number} */
    this._lastDelay = 0;
  }

  /**
   * Wait a humanized delay before continuing.
   * Rolls random to decide between burst (fast), long pause, or normal delay.
   * @returns {Promise<void>}
   */
  async wait() {
    const roll = Math.random();
    const { config } = this;
    let delay;

    if (roll < config.burstProbability) {
      // Quick succession — simulates rapid clicking
      delay = config.burstMinDelay + Math.random() * (config.burstMaxDelay - config.burstMinDelay);
    } else if (roll < config.burstProbability + config.longPauseProbability) {
      // Long pause — simulates reading or thinking
      delay = config.longPauseMin + Math.random() * (config.longPauseMax - config.longPauseMin);
    } else {
      // Normal browsing — gaussian-biased toward middle of range
      const range = config.maxDelay - config.minDelay;
      delay = config.minDelay + gaussianRandom() * range;
    }

    this._lastDelay = Math.round(delay);
    await new Promise((resolve) => setTimeout(resolve, this._lastDelay));
  }

  /**
   * Wait a longer humanized delay for page navigations (2x-4x normal range).
   * @returns {Promise<void>}
   */
  async waitBetweenPages() {
    const multiplier = 2 + Math.random() * 2; // 2x to 4x
    const { config } = this;
    const range = config.maxDelay - config.minDelay;
    const baseDelay = config.minDelay + gaussianRandom() * range;
    this._lastDelay = Math.round(baseDelay * multiplier);
    await new Promise((resolve) => setTimeout(resolve, this._lastDelay));
  }

  /**
   * Get the last delay that was used.
   * @returns {number} Last delay in milliseconds
   */
  getLastDelay() {
    return this._lastDelay;
  }

  /**
   * Reset internal state.
   */
  reset() {
    this._lastDelay = 0;
  }
}

/**
 * Simple random delay between min and max milliseconds.
 * @param {number} min - Minimum delay ms
 * @param {number} max - Maximum delay ms
 * @returns {Promise<void>}
 */
export function randomDelay(min, max) {
  const delay = min + Math.random() * (max - min);
  return new Promise((resolve) => setTimeout(resolve, Math.round(delay)));
}
