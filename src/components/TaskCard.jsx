import React, { useState } from "react";

function getInitials(email) {
  return email ? email[0].toUpperCase() : "?";
}

export default function TaskCard({ task, onDragStart, onAssign, users, onEdit, onDelete, onSmartAssign }) {
  const [flipped, setFlipped] = useState(false);
  const [editingSwipeAssigned, setEditingSwipeAssigned] = useState(false);
  const [swipeAssignedValue, setSwipeAssignedValue] = useState(task.assignedTo || "");

  const handleSwipeAssignedSave = () => {
    setEditingSwipeAssigned(false);
    if (swipeAssignedValue !== task.assignedTo) {
      onAssign(task, swipeAssignedValue);
    }
  };

  const handleSwipeAssignedKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSwipeAssignedSave();
    } else if (e.key === 'Escape') {
      setEditingSwipeAssigned(false);
      setSwipeAssignedValue(task.assignedTo || "");
    }
  };

  return (
    <div
      className={`task-card${flipped ? " flipped" : ""}`}
      draggable
      onDragStart={onDragStart}
      onClick={() => setFlipped(f => !f)}
    >
      <div className="task-card-inner">
        <div className="task-card-front">
          <div className="task-card-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 'bold', fontSize: '1.1em', flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.title}</span>
            <span style={{ display: 'flex', gap: 4, marginRight: 8 }} onClick={e => e.stopPropagation()}>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer' }} title="Edit" onClick={onEdit}>
                ✏️
              </button>
              <button style={{ border: 'none', background: 'none', cursor: 'pointer' }} title="Delete" onClick={onDelete}>
                🗑️
              </button>
              {onSmartAssign && (
                <button className="smart-assign-btn" title="Smart Assign" onClick={e => { e.stopPropagation(); onSmartAssign(task); }}>
                  🤖
                </button>
              )}
            </span>
            <span className="avatar" title={task.assignedBy}>
              {getInitials(task.assignedBy)}
            </span>
          </div>
          <p className="task-desc" style={{ marginBottom: 4 }}>{task.description}</p>
          <div className="task-assigned">
            Assigned: {typeof task.assignedBy === 'string' && task.assignedBy.trim() !== '' ? task.assignedBy : '""'}
          </div>
        </div>
        <div className="task-card-back creative-card-back">
          <div className={`swipe-status-badge swipe-status-${task.status.replace(/\s/g, '').toLowerCase()}`}>{task.status}</div>
          <div className="swipe-assign-label" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            Assigned to:
            {editingSwipeAssigned ? (
              <input
                type="text"
                value={swipeAssignedValue}
                autoFocus
                onChange={e => setSwipeAssignedValue(e.target.value)}
                onBlur={handleSwipeAssignedSave}
                onKeyDown={handleSwipeAssignedKeyDown}
                style={{ marginLeft: 4, fontSize: '1em', minWidth: 60 }}
              />
            ) : (
              <span
                style={{ marginLeft: 4, cursor: 'pointer', fontWeight: 500, borderBottom: '1px dashed #888' }}
                title="Click to edit"
                onClick={e => { e.stopPropagation(); setEditingSwipeAssigned(true); }}
              >
                {task.assignedTo || <span style={{ color: '#aaa' }}>Unassigned</span>}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
