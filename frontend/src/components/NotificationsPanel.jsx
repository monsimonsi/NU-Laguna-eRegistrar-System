import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../api';

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { res, data } = await apiFetch('/api/me/notifications?limit=20', {
        method: 'GET',
        auth: true,
        json: false,
      });
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const unreadCount = notifications.filter((n) => n.status !== 'read').length;

  const markRead = async (id) => {
    try {
      const { res } = await apiFetch(`/api/me/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        auth: true,
        json: false,
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, status: 'read' } : n))
        );
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="notifications-panel">
      <button
        type="button"
        className="notifications-toggle"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        Notifications
        {unreadCount > 0 && <span className="notifications-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notifications-dropdown">
          {loading && <p className="notifications-empty">Loading…</p>}
          {!loading && notifications.length === 0 && (
            <p className="notifications-empty">No notifications yet.</p>
          )}
          {!loading &&
            notifications.map((n) => (
              <button
                key={n._id}
                type="button"
                className={`notification-item ${n.status === 'read' ? 'read' : 'unread'}`}
                onClick={() => {
                  if (n.status !== 'read') markRead(n._id);
                }}
              >
                <span className="notification-message">{n.message}</span>
                <span className="notification-date">
                  {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
