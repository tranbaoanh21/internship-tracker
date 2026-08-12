import { getServerConfig } from '../config/env.js';

export function todayInApplicationTimezone(now = new Date()) {
  const formatter = new Intl.DateTimeFormat('en', {
    timeZone: getServerConfig().applicationTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(now).map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
