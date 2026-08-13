import { getPool } from '../config/db.js';

function mapUser(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    email: row.email,
    passwordHash: row.password_hash,
    role: row.role,
    createdAt: row.created_at,
  };
}

export async function countUsers(executor = getPool()) {
  const [rows] = await executor.query('SELECT COUNT(*) AS total FROM users');
  return Number(rows[0].total);
}

export async function findUserByEmail(email, executor = getPool()) {
  const [rows] = await executor.execute(
    'SELECT id, email, password_hash, role, created_at FROM users WHERE email = ?',
    [email],
  );
  return mapUser(rows[0]);
}

export async function bootstrapOwner({ email, passwordHash }) {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    const [lockRows] = await connection.query('SELECT id FROM users FOR UPDATE');
    if (lockRows.length) {
      const user = await findUserByEmail(email, connection);
      await connection.rollback();
      return { kind: user ? 'exists' : 'ownerExists', user };
    }
    const [result] = await connection.execute(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'owner')",
      [email, passwordHash],
    );
    await connection.execute('UPDATE applications SET user_id = ? WHERE user_id IS NULL', [result.insertId]);
    const user = await findUserByEmail(email, connection);
    await connection.commit();
    return { kind: 'created', user };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createSession({ tokenHash, csrfToken, userId, expiresAt }) {
  await getPool().execute('DELETE FROM sessions WHERE expires_at <= CURRENT_TIMESTAMP(3)');
  await getPool().execute(
    `INSERT INTO sessions (token_hash, csrf_token, user_id, expires_at)
     VALUES (?, ?, ?, ?)`,
    [tokenHash, csrfToken, userId, expiresAt],
  );
}

export async function findSession(tokenHashValue) {
  const [rows] = await getPool().execute(
    `SELECT s.token_hash, s.csrf_token, s.expires_at,
            u.id AS user_id, u.email, u.role, u.created_at
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP(3)`,
    [tokenHashValue],
  );
  if (!rows[0]) return null;
  return {
    tokenHash: rows[0].token_hash,
    csrfToken: rows[0].csrf_token,
    expiresAt: rows[0].expires_at,
    user: {
      id: String(rows[0].user_id),
      email: rows[0].email,
      role: rows[0].role,
      createdAt: rows[0].created_at,
    },
  };
}

export async function touchSession(tokenHashValue) {
  await getPool().execute(
    'UPDATE sessions SET last_seen_at = CURRENT_TIMESTAMP(3) WHERE token_hash = ?',
    [tokenHashValue],
  );
}

export async function deleteSession(tokenHashValue) {
  await getPool().execute('DELETE FROM sessions WHERE token_hash = ?', [tokenHashValue]);
}
