/**
 * @typedef {Object} ApplicationListHandler
 * @property {{ findAll(options: Record<string, unknown>): Promise<unknown[]>, countAll(): Promise<number> }} repository
 * @property {(data: unknown, status?: number) => Response} jsonResponse
 */

/**
 * @param {ApplicationListHandler} handler
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function listApplications(handler, request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const source = url.searchParams.get('source');
  const company = url.searchParams.get('company');
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  const applications = await handler.repository.findAll({
    status,
    source,
    company,
    sortBy,
    sortOrder,
    limit,
    offset,
  });
  const total = await handler.repository.countAll();

  return handler.jsonResponse({
    applications,
    total,
    limit: parseInt(String(limit), 10),
    offset: parseInt(String(offset), 10),
  });
}
