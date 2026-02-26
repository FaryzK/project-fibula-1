const { ensureSchema, query } = require('./postgres');

function toIsoString(value) {
  if (!value) {
    return new Date().toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

function normalizeRow(row, extras = {}) {
  const data = row?.data && typeof row.data === 'object' ? row.data : {};

  return {
    id: row.id,
    userId: row.user_id,
    ...data,
    ...extras,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at)
  };
}

async function listEntities(table, userId, options = {}) {
  await ensureSchema();

  const extraSelect = options.extraSelect ? `, ${options.extraSelect}` : '';
  const whereClause = options.where ? ` AND ${options.where}` : '';
  const params = [userId, ...(options.params || [])];
  const sql = `SELECT id, user_id, data, created_at, updated_at${extraSelect} FROM ${table} WHERE user_id = $1${whereClause} ORDER BY created_at`;

  const { rows } = await query(sql, params);
  return rows.map((row) => normalizeRow(row, options.rowExtras ? options.rowExtras(row) : {}));
}

async function getEntity(table, userId, id, options = {}) {
  await ensureSchema();

  const extraSelect = options.extraSelect ? `, ${options.extraSelect}` : '';
  const sql = `SELECT id, user_id, data, created_at, updated_at${extraSelect} FROM ${table} WHERE id = $1 AND user_id = $2`;
  const { rows } = await query(sql, [id, userId]);

  if (!rows[0]) {
    return null;
  }

  return normalizeRow(rows[0], options.rowExtras ? options.rowExtras(rows[0]) : {});
}

async function insertEntity(table, entity, options = {}) {
  await ensureSchema();

  const columns = ['id', 'user_id', 'data', 'created_at', 'updated_at'];
  const values = [entity.id, entity.userId, entity.data, entity.createdAt, entity.updatedAt];

  if (options.extraColumns?.length) {
    columns.push(...options.extraColumns);
    values.push(...options.extraValues);
  }

  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  const extraSelect = options.extraSelect ? `, ${options.extraSelect}` : '';
  const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING id, user_id, data, created_at, updated_at${extraSelect}`;

  const { rows } = await query(sql, values);
  return normalizeRow(rows[0], options.rowExtras ? options.rowExtras(rows[0]) : {});
}

async function updateEntity(table, userId, id, data, updatedAt, options = {}) {
  await ensureSchema();

  const setClauses = ['data = $1', 'updated_at = $2'];
  const values = [data, updatedAt];
  let index = 3;

  if (options.extraUpdates) {
    Object.entries(options.extraUpdates).forEach(([column, value]) => {
      setClauses.push(`${column} = $${index}`);
      values.push(value);
      index += 1;
    });
  }

  const idParam = index;
  const userParam = index + 1;
  values.push(id, userId);

  const extraSelect = options.extraSelect ? `, ${options.extraSelect}` : '';
  const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE id = $${idParam} AND user_id = $${userParam} RETURNING id, user_id, data, created_at, updated_at${extraSelect}`;

  const { rows } = await query(sql, values);

  if (!rows[0]) {
    return null;
  }

  return normalizeRow(rows[0], options.rowExtras ? options.rowExtras(rows[0]) : {});
}

async function deleteEntity(table, userId, id) {
  await ensureSchema();

  const { rowCount } = await query(`DELETE FROM ${table} WHERE id = $1 AND user_id = $2`, [
    id,
    userId
  ]);

  return rowCount > 0;
}

module.exports = {
  deleteEntity,
  getEntity,
  insertEntity,
  listEntities,
  updateEntity
};
