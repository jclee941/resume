const VALID_SORT_COLUMNS = ['created_at', 'updated_at', 'company', 'status', 'match_score'];

export async function listApplications(handler, request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const source = url.searchParams.get('source');
  const company = url.searchParams.get('company');
  const sortBy = url.searchParams.get('sortBy') || 'created_at';
  const sortOrder = url.searchParams.get('sortOrder') || 'desc';
  const limit = parseInt(url.searchParams.get('limit') || '100', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  let sql = 'SELECT * FROM applications WHERE 1=1';
  const params = [];

  if (status) {
    sql += ' AND status = ?';
    params.push(status);
  }
  if (source) {
    sql += ' AND source = ?';
    params.push(source);
  }
  if (company) {
    sql += ' AND company LIKE ?';
    params.push(`%${company}%`);
  }

  const sortCol = VALID_SORT_COLUMNS.includes(sortBy) ? sortBy : 'created_at';
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  sql += ` ORDER BY ${sortCol} ${order} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), parseInt(offset));

  const result = await handler.db
    .prepare(sql)
    .bind(...params)
    .all();

  const countResult = await handler.db
    .prepare('SELECT COUNT(*) as total FROM applications')
    .first();

  return handler.jsonResponse({
    applications: result.results,
    total: countResult?.total || 0,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
}
