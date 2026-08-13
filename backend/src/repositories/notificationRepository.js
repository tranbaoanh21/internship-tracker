import { getPool } from '../config/db.js';

function toNotification(row) {
  return {
    id: row.id,
    applicationId: row.application_id,
    kind: row.kind,
    message: row.message,
    readAt: row.read_at,
    createdAt: row.created_at,
  };
}

export async function listForUser(userId, limit = 30) {
  const [rows] = await getPool().query(
    `SELECT id, application_id, kind, message, read_at, created_at
       FROM notifications
      WHERE user_id = ?
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
    [userId, limit],
  );
  const [[count]] = await getPool().execute(
    'SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND read_at IS NULL',
    [userId],
  );
  return { notifications: rows.map(toNotification), unread: Number(count.unread) };
}

export async function markRead(userId, id) {
  const [result] = await getPool().execute(
    `UPDATE notifications
        SET read_at = COALESCE(read_at, CURRENT_TIMESTAMP(3))
      WHERE id = ? AND user_id = ?`,
    [id, userId],
  );
  return result.affectedRows > 0;
}

export async function markAllRead(userId) {
  const [result] = await getPool().execute(
    `UPDATE notifications
        SET read_at = CURRENT_TIMESTAMP(3)
      WHERE user_id = ? AND read_at IS NULL`,
    [userId],
  );
  return result.affectedRows;
}

export async function createDueFollowUpNotifications(today) {
  const connection = await getPool().getConnection();
  const affectedUsers = new Set();
  let created = 0;
  try {
    await connection.beginTransaction();
    const [applications] = await connection.execute(
      `SELECT id, user_id, company, position, follow_up_at
         FROM applications
        WHERE user_id IS NOT NULL
          AND archived_at IS NULL
          AND follow_up_at IS NOT NULL
          AND follow_up_at <= ?
        ORDER BY follow_up_at, id
        FOR UPDATE`,
      [today],
    );

    for (const application of applications) {
      const dedupeKey = `follow-up:${application.id}:${application.follow_up_at}`;
      const [result] = await connection.execute(
        `INSERT IGNORE INTO notifications
          (user_id, application_id, kind, dedupe_key, message)
         VALUES (?, ?, 'follow_up_due', ?, ?)`,
        [
          application.user_id,
          application.id,
          dedupeKey,
          `Follow up with ${application.company} about ${application.position}.`,
        ],
      );
      if (result.affectedRows === 1) {
        created += 1;
        affectedUsers.add(String(application.user_id));
      }
    }
    await connection.commit();
    return { created, userIds: [...affectedUsers] };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
