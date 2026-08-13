import { useCallback, useEffect, useState } from 'react';
import { Bell, CheckCircle } from '@phosphor-icons/react';
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  subscribeToNotifications,
} from '../api/applications.js';

function relativeDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export function NotificationCenter({ onNotification }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await getNotifications();
      setNotifications(response.data);
      setUnread(response.meta.unread);
      setError('');
    } catch (loadError) {
      setError(loadError.message);
    }
  }, []);

  useEffect(() => {
    load();
    return subscribeToNotifications(() => {
      load();
      onNotification?.();
    });
  }, [load, onNotification]);

  async function readOne(notification) {
    if (notification.readAt) return;
    setBusy(true);
    try {
      await markNotificationRead(notification.id);
      await load();
    } catch (readError) {
      setError(readError.message);
    } finally {
      setBusy(false);
    }
  }

  async function readAll() {
    setBusy(true);
    try {
      await markAllNotificationsRead();
      await load();
    } catch (readError) {
      setError(readError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <details className="notification-center relative">
      <summary className="icon-button relative list-none" aria-label={`${unread} unread notifications`} title="Notifications">
        <Bell size={20} weight={unread ? 'fill' : 'regular'} />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-emerald-700 px-1 text-[10px] font-bold leading-4 text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </summary>
      <div className="absolute right-0 z-40 mt-2 w-[min(23rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl shadow-stone-950/10">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-stone-950">Follow-up reminders</p>
            <p className="text-xs text-stone-500">{unread} unread</p>
          </div>
          {unread > 0 && <button className="text-xs font-semibold text-emerald-700 hover:text-emerald-900" disabled={busy} onClick={readAll}>Mark all read</button>}
        </div>
        {error && <div className="m-3 error-banner" role="alert">{error} <button className="font-semibold underline" onClick={load}>Retry</button></div>}
        {!error && notifications.length === 0 && (
          <div className="px-5 py-9 text-center">
            <CheckCircle className="mx-auto text-emerald-700" size={28} />
            <p className="mt-2 text-sm font-semibold text-stone-800">You are all caught up</p>
            <p className="mt-1 text-xs leading-5 text-stone-500">Due follow-ups will appear here.</p>
          </div>
        )}
        {notifications.length > 0 && (
          <ul className="max-h-96 divide-y divide-stone-100 overflow-y-auto">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  className={`w-full px-4 py-3 text-left transition hover:bg-stone-50 ${notification.readAt ? 'bg-white' : 'bg-emerald-50/60'}`}
                  disabled={busy}
                  onClick={() => readOne(notification)}
                >
                  <span className="block text-sm font-medium leading-5 text-stone-900">{notification.message}</span>
                  <span className="mt-1 block text-xs text-stone-500">{relativeDate(notification.createdAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
