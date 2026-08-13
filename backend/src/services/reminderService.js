import { createDueFollowUpNotifications } from '../repositories/notificationRepository.js';
import { todayInApplicationTimezone } from '../utils/date.js';

export async function scanDueFollowUps(publisher) {
  const result = await createDueFollowUpNotifications(todayInApplicationTimezone());
  await Promise.all(result.userIds.map((userId) => publisher.publish(
    `notifications:${userId}`,
    JSON.stringify({ type: 'follow_up_due' }),
  )));
  await publisher.set('tracker:reminder-worker:heartbeat', String(Date.now()), 'EX', 180);
  return result;
}
