import { getPool } from '../config/db.js';

const FIELD_TO_COLUMN = {
  company: 'company',
  position: 'position',
  jobUrl: 'job_url',
  status: 'status',
  appliedAt: 'applied_at',
  notes: 'notes',
};

function mapApplication(row) {
  if (!row) return null;

  return {
    id: String(row.id),
    company: row.company,
    position: row.position,
    jobUrl: row.job_url,
    status: row.status,
    appliedAt: row.applied_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildFilters({ q, status }) {
  const clauses = [];
  const values = [];

  if (q) {
    clauses.push("(company LIKE ? ESCAPE '!' OR position LIKE ? ESCAPE '!')");
    const escapedQuery = q.replaceAll('!', '!!').replaceAll('%', '!%').replaceAll('_', '!_');
    const pattern = `%${escapedQuery}%`;
    values.push(pattern, pattern);
  }

  if (status) {
    clauses.push('status = ?');
    values.push(status);
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    values,
  };
}

export async function listApplications({ q, status, page, limit }) {
  const pool = getPool();
  const filters = buildFilters({ q, status });
  const offset = (page - 1) * limit;

  const [rows] = await pool.query(
    `SELECT id, company, position, job_url, status, applied_at, notes, created_at, updated_at
     FROM applications
     ${filters.sql}
     ORDER BY updated_at DESC, id DESC
     LIMIT ? OFFSET ?`,
    [...filters.values, limit, offset],
  );

  const [countRows] = await pool.query(
    `SELECT COUNT(*) AS total FROM applications ${filters.sql}`,
    filters.values,
  );

  return {
    items: rows.map(mapApplication),
    total: Number(countRows[0].total),
  };
}

export async function findApplicationById(id) {
  const [rows] = await getPool().execute(
    `SELECT id, company, position, job_url, status, applied_at, notes, created_at, updated_at
     FROM applications
     WHERE id = ?`,
    [id],
  );

  return mapApplication(rows[0]);
}

export async function createApplication(input) {
  const [result] = await getPool().execute(
    `INSERT INTO applications (company, position, job_url, status, applied_at, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.company,
      input.position,
      input.jobUrl,
      input.status,
      input.appliedAt,
      input.notes,
    ],
  );

  return findApplicationById(result.insertId);
}

export async function updateApplication(id, changes) {
  const entries = Object.entries(changes).filter(([key]) => FIELD_TO_COLUMN[key]);
  const assignments = entries.map(([key]) => `${FIELD_TO_COLUMN[key]} = ?`);
  const values = entries.map(([, value]) => value);

  const [result] = await getPool().execute(
    `UPDATE applications SET ${assignments.join(', ')} WHERE id = ?`,
    [...values, id],
  );

  if (result.affectedRows === 0) return null;
  return findApplicationById(id);
}

export async function deleteApplication(id) {
  const [result] = await getPool().execute('DELETE FROM applications WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

export async function getApplicationStats() {
  const [rows] = await getPool().query(
    'SELECT status, COUNT(*) AS count FROM applications GROUP BY status',
  );

  return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
}
