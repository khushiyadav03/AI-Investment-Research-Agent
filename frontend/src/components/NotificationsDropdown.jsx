import React, { useEffect, useRef } from 'react';
import Icon from './Icon';

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    const diff = Date.now() - d.getTime();
    if (diff < 60000)  return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

export default function NotificationsDropdown({ type, items, unread, onMarkRead, onMarkAllRead, onClose }) {
  const ref = useRef(null);
  const title = type === 'notification' ? 'Notifications' : 'Messages';
  const emptyMsg = type === 'notification' ? 'No notifications yet.' : 'No messages yet.';

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="notif-dropdown" ref={ref}>
      <div className="notif-dropdown-header">
        <span className="notif-dropdown-title">{title}</span>
        {unread > 0 && (
          <button className="notif-mark-all" onClick={onMarkAllRead}>Mark all read</button>
        )}
      </div>
      <div className="notif-list">
        {items.length === 0 ? (
          <div className="notif-empty">{emptyMsg}</div>
        ) : (
          items.map(item => (
            <div
              key={item.id}
              className={`notif-item${item.read ? '' : ' notif-unread'}`}
              onClick={() => onMarkRead(item.id)}
            >
              <div className="notif-item-dot" style={{ background: item.read ? 'transparent' : 'var(--color-brand)' }} />
              <div className="notif-item-body">
                <div className="notif-item-title">{item.title}</div>
                <div className="notif-item-msg">{item.message}</div>
                <div className="notif-item-time">{fmtTime(item.timestamp)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
