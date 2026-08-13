import { AppError } from '../errors/AppError.js';
import * as repository from '../repositories/notificationRepository.js';

function parseId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new AppError(400, 'INVALID_NOTIFICATION_ID', 'Notification id must be a positive integer.');
  }
  return value;
}

export async function list(req, res) {
  const result = await repository.listForUser(req.auth.user.id);
  res.json({ data: result.notifications, meta: { unread: result.unread } });
}

export async function markRead(req, res) {
  const found = await repository.markRead(req.auth.user.id, parseId(req.params.id));
  if (!found) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notification not found.');
  res.status(204).end();
}

export async function markAllRead(req, res) {
  const updated = await repository.markAllRead(req.auth.user.id);
  res.json({ data: { updated } });
}
