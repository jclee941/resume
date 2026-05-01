/**
 * Resource pool shared type definitions.
 *
 * @module orchestrator/resource-pool/types
 * @template T
 */

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
 * @property {{ error: (...args: unknown[]) => void }} [logger] - Logger for validation failures
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

/**
 * @template T
 * @typedef {Object} ResourcePoolState
 * @property {ResourcePoolOptions<T>} options
 * @property {{ error: (...args: unknown[]) => void }} logger
 * @property {PooledResource<T>[]} idle
 * @property {Map<string, PooledResource<T>>} inUse
 * @property {Array<{ resolve: (r: T) => void, reject: (e: Error) => void, timer: ReturnType<typeof setTimeout> }>} waitQueue
 * @property {ReturnType<typeof setInterval>|null} healthCheckTimer
 * @property {boolean} draining
 * @property {number} totalCreated
 * @property {number} totalDestroyed
 */
