import { getPool } from '../config/db.js';

const FIELD_TO_COLUMN = {
  company: 'company',
  position: 'position',
  jobUrl: 'job_url',
  status: 'status',
  appliedAt: 'applied_at',
  notes: 'notes',
  nextAction: 'next_action',
  followUpAt: 'follow_up_at',
};

const SELECT_FIELDS = `
  id, company, position, job_url, status, applied_at, notes,
  next_action, follow_up_at, created_at, updated_at, archived_at, version
`;

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
    nextAction: row.next_action,
    followUpAt: row.follow_up_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at,
    version: Number(row.version),
  };
}

function mapHistory(row) {
  return {
    id: String(row.id),
    applicationId: String(row.application_id),
    fromStatus: row.from_status,
    toStatus: row.to_status,
    changedAt: row.changed_at,
  };
}

function addSearchFilter(clauses, values, q) {
  if (!q) return;
  clauses.push("(company LIKE ? ESCAPE '!' OR position LIKE ? ESCAPE '!')");
  const escapedQuery = q.replaceAll('!', '!!').replaceAll('%', '!%').replaceAll('_', '!_');
  const pattern = `%${escapedQuery}%`;
  values.push(pattern, pattern);
}

function buildFilters({ q, status, attention, view, today }, { includeStatus = true } = {}) {
  const clauses = [view === 'archived' ? 'archived_at IS NOT NULL' : 'archived_at IS NULL'];
  const values = [];

  addSearchFilter(clauses, values, q);

  if (includeStatus && status) {
    clauses.push('status = ?');
    values.push(status);
  }

  if (includeStatus && attention === 'overdue') {
    clauses.push('follow_up_at < ?');
    values.push(today);
  } else if (includeStatus && attention === 'today') {
    clauses.push('follow_up_at = ?');
    values.push(today);
  } else if (includeStatus && attention === 'next7') {
    clauses.push('follow_up_at > ? AND follow_up_at <= DATE_ADD(?, INTERVAL 7 DAY)');
    values.push(today, today);
  } else if (includeStatus && attention === 'none') {
    clauses.push('follow_up_at IS NULL');
  }

  return {
    sql: `WHERE ${clauses.join(' AND ')}`,
    values,
  };
}

function buildOrder(sort, direction) {
  const sqlDirection = direction === 'asc' ? 'ASC' : 'DESC';
  if (sort === 'followUpAt') {
    return `follow_up_at IS NULL ASC, follow_up_at ${sqlDirection}, id ${sqlDirection}`;
  }
  if (sort === 'appliedAt') {
    return `applied_at IS NULL ASC, applied_at ${sqlDirection}, id ${sqlDirection}`;
  }
  if (sort === 'company') {
    return `company ${sqlDirection}, position ${sqlDirection}, id ${sqlDirection}`;
  }
  return `updated_at ${sqlDirection}, id ${sqlDirection}`;
}

export async function listApplications(filtersInput) {
  const pool = getPool();
  const filters = buildFilters(filtersInput);
  const offset = (filtersInput.page - 1) * filtersInput.limit;
  const order = buildOrder(filtersInput.sort, filtersInput.direction);

  const [rows] = await pool.query(
    `SELECT ${SELECT_FIELDS}
     FROM applications
     ${filters.sql}
     ORDER BY ${order}
     LIMIT ? OFFSET ?`,
    [...filters.values, filtersInput.limit, offset],
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

export async function findApplicationById(id, executor = getPool()) {
  const [rows] = await executor.execute(
    `SELECT ${SELECT_FIELDS} FROM applications WHERE id = ?`,
    [id],
  );
  return mapApplication(rows[0]);
}

async function findApplicationForUpdate(connection, id) {
  const [rows] = await connection.execute(
    `SELECT ${SELECT_FIELDS} FROM applications WHERE id = ? FOR UPDATE`,
    [id],
  );
  return mapApplication(rows[0]);
}

export async function createApplication(input) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [result] = await connection.execute(
      `INSERT INTO applications (
         company, position, job_url, status, applied_at, notes, next_action, follow_up_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.company,
        input.position,
        input.jobUrl,
        input.status,
        input.appliedAt,
        input.notes,
        input.nextAction,
        input.followUpAt,
      ],
    );
    await connection.execute(
      `INSERT INTO application_status_history (application_id, from_status, to_status)
       VALUES (?, NULL, ?)`,
      [result.insertId, input.status],
    );
    const application = await findApplicationById(result.insertId, connection);
    await connection.commit();
    return application;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function updateApplication(id, changes, expectedVersion) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await findApplicationForUpdate(connection, id);
    if (!current) {
      await connection.rollback();
      return { kind: 'missing' };
    }
    if (current.archivedAt) {
      await connection.rollback();
      return { kind: 'unavailable', application: current };
    }
    if (current.version !== expectedVersion) {
      await connection.rollback();
      return { kind: 'conflict', application: current };
    }

    const entries = Object.entries(changes).filter(([key]) => FIELD_TO_COLUMN[key]);
    const assignments = entries.map(([key]) => `${FIELD_TO_COLUMN[key]} = ?`);
    const values = entries.map(([, value]) => value);
    await connection.execute(
      `UPDATE applications
       SET ${assignments.join(', ')}, version = version + 1
       WHERE id = ? AND version = ?`,
      [...values, id, expectedVersion],
    );

    if (Object.hasOwn(changes, 'status') && changes.status !== current.status) {
      await connection.execute(
        `INSERT INTO application_status_history (application_id, from_status, to_status)
         VALUES (?, ?, ?)`,
        [id, current.status, changes.status],
      );
    }

    const application = await findApplicationById(id, connection);
    await connection.commit();
    return { kind: 'updated', application };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function setArchived(id, expectedVersion, archived) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await findApplicationForUpdate(connection, id);
    if (!current) {
      await connection.rollback();
      return { kind: 'missing' };
    }
    if (current.version !== expectedVersion) {
      await connection.rollback();
      return { kind: 'conflict', application: current };
    }
    if (Boolean(current.archivedAt) === archived) {
      await connection.rollback();
      return { kind: 'invalidState', application: current };
    }

    await connection.execute(
      `UPDATE applications
       SET archived_at = ${archived ? 'CURRENT_TIMESTAMP(3)' : 'NULL'}, version = version + 1
       WHERE id = ? AND version = ?`,
      [id, expectedVersion],
    );
    const application = await findApplicationById(id, connection);
    await connection.commit();
    return { kind: archived ? 'archived' : 'restored', application };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function deleteApplication(id, expectedVersion) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const current = await findApplicationForUpdate(connection, id);
    if (!current) {
      await connection.rollback();
      return { kind: 'missing' };
    }
    if (current.version !== expectedVersion) {
      await connection.rollback();
      return { kind: 'conflict', application: current };
    }
    if (!current.archivedAt) {
      await connection.rollback();
      return { kind: 'active', application: current };
    }

    await connection.execute('DELETE FROM applications WHERE id = ? AND version = ?', [id, expectedVersion]);
    await connection.commit();
    return { kind: 'deleted' };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getApplicationStats(filtersInput) {
  const filters = buildFilters(filtersInput, { includeStatus: false });
  const [rows] = await getPool().query(
    `SELECT status, COUNT(*) AS count
     FROM applications
     ${filters.sql}
     GROUP BY status`,
    filters.values,
  );
  return rows.map((row) => ({ status: row.status, count: Number(row.count) }));
}

export async function getApplicationHistory(id) {
  const [rows] = await getPool().execute(
    `SELECT id, application_id, from_status, to_status, changed_at
     FROM application_status_history
     WHERE application_id = ?
     ORDER BY changed_at DESC, id DESC`,
    [id],
  );
  return rows.map(mapHistory);
}
