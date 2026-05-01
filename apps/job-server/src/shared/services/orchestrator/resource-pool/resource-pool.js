/**
 * Generic resource pool with lifecycle management.
 *
 * Manages reusable resources with configurable limits, health checks, and
 * graceful shutdown.
 *
 * @module orchestrator/resource-pool/resource-pool
 * @template T
 */

import { EventEmitter } from 'node:events';
import { removeUnhealthyIdleResources } from './health-check.js';
import { createPooledResource } from './pool-entry.js';
import { normalizePoolOptions, startHealthCheckTimer } from './pool-options.js';
import { rejectAllWaiters, shiftWaiter, waitForResource } from './wait-queue.js';

/**
 * @template T
 */
export class ResourcePool extends EventEmitter {
  /** @type {import('./types.js').ResourcePoolState<T>} */
  _state;

  /**
   * @param {import('./types.js').ResourcePoolOptions<T>} options
   */
  constructor(options) {
    super();
    this.setMaxListeners(20);

    const normalizedOptions = normalizePoolOptions(options);
    this._state = {
      options: normalizedOptions,
      logger: options.logger ?? console,
      idle: [],
      inUse: new Map(),
      waitQueue: [],
      healthCheckTimer: null,
      draining: false,
      totalCreated: 0,
      totalDestroyed: 0,
    };
    this._state.healthCheckTimer = startHealthCheckTimer(
      () => this._runHealthCheck(),
      normalizedOptions.healthCheckIntervalMs
    );
  }

  /** @returns {number} */
  get size() {
    return this._state.idle.length + this._state.inUse.size;
  }

  /** @returns {number} */
  get available() {
    return this._state.idle.length;
  }

  /** @returns {number} */
  get inUse() {
    return this._state.inUse.size;
  }

  /** @returns {number} */
  get waiting() {
    return this._state.waitQueue.length;
  }

  /**
   * Acquire a resource from the pool.
   * @returns {Promise<T>}
   */
  async acquire() {
    if (this._state.draining) {
      throw new Error('Pool is draining, cannot acquire new resources');
    }

    const idleResource = await this._checkoutIdleResource();
    if (idleResource) return idleResource;

    if (this.size < this._state.options.maxSize) {
      return this._createAndCheckout();
    }

    return waitForResource(this._state);
  }

  /**
   * Release a resource back to the pool.
   * @param {T} resource
   */
  async release(resource) {
    const entry = this._findByResource(resource);
    if (!entry) return;

    this._state.inUse.delete(entry.id);
    entry.state = 'idle';
    entry.lastUsedAt = Date.now();

    if (this._state.draining || this._isOverAge(entry)) {
      await this._destroyResource(entry);
      return;
    }

    const waiter = shiftWaiter(this._state);
    if (waiter) {
      this._checkoutEntry(entry);
      waiter.resolve(entry.resource);
      return;
    }

    this._state.idle.push(entry);
    this.emit('release', entry.id);
  }

  /**
   * Destroy a specific resource (for example, after an error).
   * @param {T} resource
   */
  async destroy(resource) {
    const entry = this._findByResource(resource);
    if (!entry) return;
    this._state.inUse.delete(entry.id);
    await this._destroyResource(entry);

    if (this._canReplaceForWaiter()) {
      try {
        const newResource = await this._createAndCheckout();
        const waiter = shiftWaiter(this._state);
        if (waiter) waiter.resolve(newResource);
      } catch (err) {
        this.emit('error', err);
      }
    }
  }

  /**
   * Gracefully drain and shut down the pool.
   * @param {number} [timeoutMs=30000] - Max time to wait for in-flight resources
   * @returns {Promise<void>}
   */
  async drain(timeoutMs = 30000) {
    this._state.draining = true;
    rejectAllWaiters(this._state, new Error('Pool is draining'));

    if (this._state.healthCheckTimer) {
      clearInterval(this._state.healthCheckTimer);
      this._state.healthCheckTimer = null;
    }

    const idleDestroy = this._state.idle.map((r) => this._destroyResource(r));
    this._state.idle = [];
    await Promise.allSettled(idleDestroy);

    if (this._state.inUse.size > 0) {
      await this._waitForInUseRelease(timeoutMs);
      const remaining = [...this._state.inUse.values()];
      this._state.inUse.clear();
      await Promise.allSettled(remaining.map((r) => this._destroyResource(r)));
    }

    this.emit('drain');
    this.removeAllListeners();
  }

  /**
   * Get pool metrics.
   * @returns {{ size: number, idle: number, inUse: number, waiting: number, totalCreated: number, totalDestroyed: number, draining: boolean }}
   */
  getMetrics() {
    return {
      size: this.size,
      idle: this.available,
      inUse: this.inUse,
      waiting: this.waiting,
      totalCreated: this._state.totalCreated,
      totalDestroyed: this._state.totalDestroyed,
      draining: this._state.draining,
    };
  }

  /** @returns {Promise<T|undefined>} */
  async _checkoutIdleResource() {
    while (this._state.idle.length > 0) {
      const pooled = this._state.idle.pop();
      if (this._isOverAge(pooled) || !(await this._isValid(pooled))) {
        await this._destroyResource(pooled);
        continue;
      }
      this._checkoutEntry(pooled);
      this.emit('acquire', pooled.id);
      return pooled.resource;
    }
    return undefined;
  }

  /** @returns {Promise<T>} */
  async _createAndCheckout() {
    const resource = await this._state.options.create();
    this._state.totalCreated++;
    const pooled = createPooledResource(resource);
    this._state.inUse.set(pooled.id, pooled);
    this.emit('create', pooled.id);
    return resource;
  }

  /** @param {import('./types.js').PooledResource<T>} entry */
  _checkoutEntry(entry) {
    entry.state = 'in_use';
    entry.lastUsedAt = Date.now();
    entry.useCount++;
    this._state.inUse.set(entry.id, entry);
  }

  /** @param {import('./types.js').PooledResource<T>} pooled */
  async _destroyResource(pooled) {
    if (pooled.state === 'destroyed') return;
    pooled.state = 'destroyed';
    this._state.totalDestroyed++;
    try {
      await this._state.options.destroy(pooled.resource);
    } catch (err) {
      this.emit('error', err);
    }
    this.emit('destroy', pooled.id);
  }

  /** @param {T} resource @returns {import('./types.js').PooledResource<T>|undefined} */
  _findByResource(resource) {
    for (const entry of this._state.inUse.values()) {
      if (entry.resource === resource) return entry;
    }
    return undefined;
  }

  async _runHealthCheck() {
    const removed = await removeUnhealthyIdleResources(this._state, (pooled) =>
      this._destroyResource(pooled)
    );
    this.emit('healthCheck', { removed, remaining: this._state.idle.length });
  }

  /** @param {import('./types.js').PooledResource<T>} pooled @returns {boolean} */
  _isOverAge(pooled) {
    return Date.now() - pooled.createdAt > this._state.options.maxAge;
  }

  /** @param {import('./types.js').PooledResource<T>} pooled @returns {Promise<boolean>} */
  async _isValid(pooled) {
    if (!this._state.options.validate) return true;
    try {
      return await this._state.options.validate(pooled.resource);
    } catch (error) {
      this._state.logger.error('[ResourcePool.acquire] Validation failed:', error.message);
      return false;
    }
  }

  /** @returns {boolean} */
  _canReplaceForWaiter() {
    return (
      this._state.waitQueue.length > 0 &&
      this.size < this._state.options.maxSize &&
      !this._state.draining
    );
  }

  /** @param {number} timeoutMs */
  _waitForInUseRelease(timeoutMs) {
    return Promise.race([
      new Promise((resolve) => {
        const check = setInterval(() => {
          if (this._state.inUse.size === 0) {
            clearInterval(check);
            resolve(undefined);
          }
        }, 100);
      }),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }
}
