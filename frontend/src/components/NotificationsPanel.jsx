import { useCallback, useEffect, useState } from 'react';
import { IoIosNotifications } from 'react-icons/io';
import { apiFetch, getStoredToken } from '../api';

export default function NotificationsPanel() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    if (!getStoredToken()) {
      setLoading(false);
      setNotifications([]);
      setError('Not authenticated');
      return;
    }
    try {
      const { res, data } = await apiFetch('/api/me/notifications?limit=20', {
        method: 'GET',
        auth: true
      });
      if (res.ok) {
        setNotifications(data.notifications || []);
      } else if (res.status === 401) {
        setError('Session expired. Please log in again.');
        setNotifications([]);
      } else {
        setError(data.message || 'Failed to load notifications');
      }
    } catch {
      setNotifications([]);
      setError('Cannot connect to server');
    } finally {
      setLoading(false);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      const { res } = await apiFetch('/api/me/notifications/read-all', {
        method: 'PATCH',
        auth: true
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
      }
    } catch (err) {
      console.error('[notifications] markAllRead failed:', err);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (open) return undefined;
    const interval = setInterval(() => {
      load();
    }, 30000);
    return () => clearInterval(interval);
  }, [open, load]);

  const unreadCount = notifications.filter((n) => n.status !== 'read').length;

  const markRead = async (id) => {
    try {
      const { res } = await apiFetch(`/api/me/notifications/${encodeURIComponent(id)}/read`, {
        method: 'PATCH',
        auth: true
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, status: 'read' } : n))
        );
      }
    } catch {
      console.error('[notifications] markRead failed for', id);
    }
  };

  const handleToggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    await load();
    await markAllRead();
  };

  return (
    <div className="notifications-panel">
      <button
        type="button"
        className="notifications-toggle"
        onClick={handleToggle}
        aria-expanded={open}
        aria-label="Notifications"
      >
        <IoIosNotifications className="notifications-icon" aria-hidden="true" />
        <span className="notifications-label">Notifications</span>
        {!open && unreadCount > 0 && (
          <span className="notifications-badge">{unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notifications-dropdown">
          {loading && <p className="notifications-empty">Loading…</p>}
          {!loading && error && <p className="notifications-empty">{error}</p>}
          {!loading && !error && notifications.length === 0 && (
            <p className="notifications-empty">No notifications yet.</p>
          )}
          {!loading && !error &&
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
