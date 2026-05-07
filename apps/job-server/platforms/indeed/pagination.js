/** Indeed search pagination helpers. */

/**
 * Add Indeed pagination parameters to a search query.
 *
 * Indeed uses a 0-indexed `start` parameter that increments by page size.
 * The `limit` parameter is retained for compatibility with the previous
 * crawler behavior, even though Indeed does not directly honor it.
 *
 * @param {URLSearchParams} query - Query parameters being built
 * @param {object} params - Search parameters
 * @param {number} [params.limit] - Requested client-side limit
 * @param {number} [params.offset] - Indeed start offset
 * @returns {URLSearchParams} The same query instance for chaining
 */
export function applyPaginationParams(query, params) {
  const offset = params.offset || 0;
  if (offset > 0) {
    query.set('start', String(offset));
  }

  query.set('limit', String(Math.min(params.limit || 15, 50)));
  return query;
}

/**
 * Build pagination metadata from parsed Indeed result cards.
 *
 * @param {object[]} jobs - Parsed normalized jobs
 * @param {object} params - Search parameters
 * @param {number} [params.offset] - Current Indeed start offset
 * @returns {{hasMore: boolean, nextOffset: number}}
 */
export function buildPaginationResult(jobs, params) {
  return {
    hasMore: jobs.length >= 10,
    nextOffset: (params.offset || 0) + jobs.length,
  };
}
