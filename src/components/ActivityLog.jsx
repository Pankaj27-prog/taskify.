import React from "react";

export default function ActivityLog({ logs }) {
  // Map action types to emojis
  const actionIcons = {
    Created: '🟢',
    Deleted: '🗑️',
    Edited: '✏️',
    'Resolved Conflict': '🤝',
    'Smart Assigned': '🤖',
    Assigned: '👤',
    Moved: '➡️',
    default: '🔔'
  };
  return (
    <div className="activity-log creative-log" style={{ background: 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ef 100%)' }}>
      <h4>Recent Activity</h4>
      <ul>
        {logs.slice(0, 20).map((log, i) => (
          <li key={i} className="log-entry fade-in">
            <span style={{ fontSize: '1.3em', marginRight: 8 }}>
              {actionIcons[log.actionType] || actionIcons.default}
            </span>
            <span className="log-user">{log.user}</span>
            <hr style={{ border: 'none', height: '1.5px', background: '#3b82f6', borderRadius: '0.75px', margin: '0.3em 0 0.7em 0', width: '100%' }} />
            <span className="log-action">{log.actionType}</span>
            <span className="log-desc">{log.description}</span>
            {log.timestamp && (() => {
              const dateObj = new Date(log.timestamp);
              const date = dateObj.toLocaleDateString();
              const time = dateObj.toLocaleTimeString();
              return (
                <span style={{ marginTop: '0.5em', color: '#888', fontSize: '0.92em', display: 'block' }}>
                  <span style={{ fontWeight: 600 }}>{date}</span>{' '}
                  <span style={{ fontStyle: 'italic' }}>{time}</span>
                </span>
              );
            })()}
          </li>
        ))}
      </ul>
    </div>
  );
}
