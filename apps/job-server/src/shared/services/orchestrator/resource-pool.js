/**
 * Generic resource pool with lifecycle management.
 *
 * Manages a pool of reusable resources (browser instances, HTTP connections)
 * with configurable limits, health checks, and graceful shutdown.
 *
 * @module orchestrator/resource-pool
 * @template T
 */

import { EventEmitter } from 'node:events';

/**
 * @template T
 * @typedef {Object} ResourcePoolOptions
 * @property {number} [maxSize=5] - Maximum pool size
 * @property {number} [minSize=0] - Minimum idle resources to maintain
 * @property {number} [acquireTimeoutMs=30000] - Max wait time to acquire a resource
 * @property {number} [idleTimeoutMs=300000] - Max idle time before resource is destroyed
 * @property {number} [maxAge=600000] - Max lifetime of a resource
 * @property {number} [healthCheckIntervalMs=60000] - Interval for health checks
 * @property {() => Promise<T>} create - Factory function to create a resource
 * @property {(resource: T) => Promise<void>} destroy - Cleanup function
 * @property {(resource: T) => Promise<boolean>} [validate] - Health check function
 */

/**
 * @template T
 * @typedef {Object} PooledResource
 * @property {T} resource - The actual resource
 * @property {number} createdAt - Creation timestamp
 * @property {number} lastUsedAt - Last checkout timestamp
 * @property {number} useCount - Times checked out
 * @property {string} id - Unique identifier
 * @property {'idle'|'in_use'|'destroyed'} state - Current state
 */

let poolIdCounter = 0;

/**
 * @template T
 */
export class ResourcePool extends EventEmitter {
  /** @type {ResourcePoolOptions<T>} */
  #options;

  /** @type {PooledResource<T>[]} */
  #idle = [];

  /** @type {Map<string, PooledResource<T>>} */
  #inUse = new Map();

  /** @type {Array<{ resolve: (r: T) => void, reject: (e: Error) => void, timer: ReturnType<typeof setTimeout> }>} */
  #waitQueue = [];

  /** @type {ReturnType<typeof setInterval>|null} */
  #healthCheckTimer = null;

  /** @type {boolean} */
  #draining = false;

  /** @type {number} */
  #totalCreated = 0;

  /** @type {number} */
  #totalDestroyed = 0;

  /**
   * @param {ResourcePoolOptions<T>} options
   */
  constructor(options) {
    super();
    this.#options = {
      maxSize: 5,
      minSize: 0,
      acquireTimeoutMs: 30000,
      idleTimeoutMs: 300000,
      maxAge: 600000,
      healthCheckIntervalMs: 60000,
      ...options,
    };

    if (!this.#options.create || !this.#options.destroy) {
      throw new Error('ResourcePool requires create and destroy functions');
    }

    if (this.#options.healthCheckIntervalMs > 0) {
      this.#healthCheckTimer = setInterval(
        () => this.#runHealthCheck(),
        this.#options.healthCheckIntervalMs
      );
      // Don't keep process alive just for health checks
      if (this.#healthCheckTimer.unref) {
        this.#healthCheckTimer.unref();
      }
    }
  }

  /** @returns {number} */
  get size() {
    return this.#idle.length + this.#inUse.size;
  }

  /** @returns {number} */
  get available() {
    return this.#idle.length;
  }

  /** @returns {number} */
  get inUse() {
    return this.#inUse.size;
  }

  /** @returns {number} */
  get waiting() {
    return this.#waitQueue.length;
  }

  /**
   * Acquire a resource from the pool.
   * Creates a new resource if pool isn't full, otherwise waits.
   * @returns {Promise<T>}
   */
  async acquire() {
    if (this.#draining) {
      throw new Error('Pool is draining, cannot acquire new resources');
    }

    // Try to get an idle resource
    while (this.#idle.length > 0) {
      const pooled = /** @type {PooledResource<T>} */ (this.#idle.pop());

      // Check if resource is too old
      if (Date.now() - pooled.createdAt > this.#options.maxAge) {
        await this.#destroyResource(pooled);
        continue;
      }

      // Validate if validator exists
      if (this.#options.validate) {
        try {
          const valid = await this.#options.validate(pooled.resource);
          if (!valid) {
            await this.#destroyResource(pooled);
            continue;
          }
        } catch {
          await this.#destroyResource(pooled);
          continue;
        }
      }

      pooled.state = 'in_use';
      pooled.lastUsedAt = Date.now();
      pooled.useCount++;
      this.#inUse.set(pooled.id, pooled);
      this.emit('acquire', pooled.id);
      return pooled.resource;
    }

    // Try to create a new resource
    if (this.size < this.#options.maxSize) {
      return this.#createAndCheckout();
    }

    // Pool is full, wait for a resource to become available
    return this.#waitForResource();
  }

  /**
   * Release a resource back to the pool.
   * @param {T} resource
   */
  async release(resource) {
    const entry = this.#findByResource(resource);
    if (!entry) return;

    this.#inUse.delete(entry.id);
    entry.state = 'idle';
    entry.lastUsedAt = Date.now();

    // If draining or too old, destroy instead of returning to pool
    if (this.#draining || Date.now() - entry.createdAt > this.#options.maxAge) {
      await this.#destroyResource(entry);
      return;
    }

    // If someone is waiting, hand off directly
    if (this.#waitQueue.length > 0) {
      const waiter =
        /** @type {{ resolve: (r: T) => void, timer: ReturnType<typeof setTimeout> }} */ (
          this.#waitQueue.shift()
        );
      clearTimeout(waiter.timer);
      entry.state = 'in_use';
      entry.lastUsedAt = Date.now();
      entry.useCount++;
      this.#inUse.set(entry.id, entry);
      waiter.resolve(entry.resource);
      return;
    }

    this.#idle.push(entry);
    this.emit('release', entry.id);
  }

  /**
   * Destroy a specific resource (e.g., after error).
   * @param {T} resource
   */
  async destroy(resource) {
    const entry = this.#findByResource(resource);
    if (!entry) return;
    this.#inUse.delete(entry.id);
    await this.#destroyResource(entry);

    // If someone is waiting and we have room, create a replacement
    if (this.#waitQueue.length > 0 && this.size < this.#options.maxSize && !this.#draining) {
      try {
        const newResource = await this.#createAndCheckout();
        const waiter =
          /** @type {{ resolve: (r: T) => void, timer: ReturnType<typeof setTimeout> }} */ (
            this.#waitQueue.shift()
          );
        clearTimeout(waiter.timer);
        waiter.resolve(newResource);
      } catch (err) {
        // Let the waiter keep waiting
        this.emit('error', err);
      }
    }
  }

  /**
   * Gracefully drain and shut down the pool.
   * Waits for all in-use resources to be released, then destroys everything.
   * @param {number} [timeoutMs=30000] - Max time to wait for in-flight resources
   * @returns {Promise<void>}
   */
  async drain(timeoutMs = 30000) {
    this.#draining = true;

    // Reject all waiters
    for (const waiter of this.#waitQueue) {
      clearTimeout(waiter.timer);
      waiter.reject(new Error('Pool is draining'));
    }
    this.#waitQueue = [];

    // Stop health checks
    if (this.#healthCheckTimer) {
      clearInterval(this.#healthCheckTimer);
      this.#healthCheckTimer = null;
    }

    // Destroy idle resources immediately
    const idleDestroy = this.#idle.map((r) => this.#destroyResource(r));
    this.#idle = [];
    await Promise.allSettled(idleDestroy);

    // Wait for in-use resources with timeout
    if (this.#inUse.size > 0) {
      await Promise.race([
        new Promise((resolve) => {
          const check = setInterval(() => {
            if (this.#inUse.size === 0) {
              clearInterval(check);
              resolve(undefined);
            }
          }, 100);
        }),
        new Promise((resolve) => setTimeout(resolve, timeoutMs)),
      ]);

      // Force-destroy any remaining
      const remaining = [...this.#inUse.values()];
      this.#inUse.clear();
      await Promise.allSettled(remaining.map((r) => this.#destroyResource(r)));
    }

    this.emit('drain');
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
      totalCreated: this.#totalCreated,
      totalDestroyed: this.#totalDestroyed,
      draining: this.#draining,
    };
  }

  /**
   * Create a new resource and check it out.
   * @returns {Promise<T>}
   */
  async #createAndCheckout() {
    const id = `pool-${++poolIdCounter}`;
    const resource = await this.#options.create();
    this.#totalCreated++;

    /** @type {PooledResource<T>} */
    const pooled = {
      resource,
      createdAt: Date.now(),
      lastUsedAt: Date.now(),
      useCount: 1,
      id,
      state: 'in_use',
    };

    this.#inUse.set(id, pooled);
    this.emit('create', id);
    return resource;
  }

  /**
   * Wait for a resource to become available.
   * @returns {Promise<T>}
   */
  #waitForResource() {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        const index = this.#waitQueue.findIndex((w) => w.resolve === resolve);
        if (index !== -1) {
          this.#waitQueue.splice(index, 1);
        }
        reject(new Error(`Acquire timeout after ${this.#options.acquireTimeoutMs}ms`));
      }, this.#options.acquireTimeoutMs);

      this.#waitQueue.push({ resolve, reject, timer });
    });
  }

  /**
   * Destroy a pooled resource.
   * @param {PooledResource<T>} pooled
   */
  async #destroyResource(pooled) {
    if (pooled.state === 'destroyed') return;
    pooled.state = 'destroyed';
    this.#totalDestroyed++;

    try {
      await this.#options.destroy(pooled.resource);
    } catch (err) {
      this.emit('error', err);
    }

    this.emit('destroy', pooled.id);
  }

  /**
   * Find a pooled resource entry by its underlying resource reference.
   * @param {T} resource
   * @returns {PooledResource<T>|undefined}
   */
  #findByResource(resource) {
    for (const entry of this.#inUse.values()) {
      if (entry.resource === resource) return entry;
    }
    return undefined;
  }

  /**
   * Run periodic health checks on idle resources.
   */
  async #runHealthCheck() {
    const now = Date.now();
    const toRemove = [];

    for (let i = this.#idle.length - 1; i >= 0; i--) {
      const pooled = this.#idle[i];

      // Remove expired idle resources (keep minSize)
      if (
        now - pooled.lastUsedAt > this.#options.idleTimeoutMs &&
        this.#idle.length - toRemove.length > this.#options.minSize
      ) {
        toRemove.push(i);
        continue;
      }

      // Remove over-age resources
      if (now - pooled.createdAt > this.#options.maxAge) {
        toRemove.push(i);
        continue;
      }

      // Validate health
      if (this.#options.validate) {
        try {
          const valid = await this.#options.validate(pooled.resource);
          if (!valid) toRemove.push(i);
        } catch {
          toRemove.push(i);
        }
      }
    }

    // Remove in reverse order to maintain indices
    for (const idx of toRemove) {
      const [pooled] = this.#idle.splice(idx, 1);
      await this.#destroyResource(pooled);
    }

    this.emit('healthCheck', { removed: toRemove.length, remaining: this.#idle.length });
  }
}
