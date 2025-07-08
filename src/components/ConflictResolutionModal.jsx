import React, { useState, useContext } from "react";
import { BoardContext } from "../context/BoardContext";
import { UserContext } from "../context/UserContext";

export default function ConflictResolutionModal({ 
  isOpen, 
  onClose, 
  conflict, 
  onResolve 
}) {
  const { resolveConflict } = useContext(BoardContext);
  const { user } = useContext(UserContext);
  const [resolution, setResolution] = useState('merge');
  const [mergedData, setMergedData] = useState({});

  // Initialize merged data with current version
  React.useEffect(() => {
    if (conflict && conflict.currentVersion) {
      setMergedData({
        title: conflict.currentVersion.title,
        description: conflict.currentVersion.description,
        assignedTo: conflict.currentVersion.assignedTo,
        status: conflict.currentVersion.status,
        priority: conflict.currentVersion.priority,
        version: conflict.currentVersion.version
      });
    }
  }, [conflict]);

  if (!isOpen || !conflict) return null;

  const { currentVersion, clientVersion } = conflict;

  const handleResolve = async () => {
    try {
      const resolvedTask = await resolveConflict(
        currentVersion._id, 
        resolution, 
        mergedData
      );
      
      if (resolvedTask) {
        onResolve(resolvedTask);
        onClose();
      }
    } catch (error) {
      console.error('Error resolving conflict:', error);
    }
  };

  const handleFieldChange = (field, value) => {
    setMergedData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const getFieldValue = (field) => {
    if (resolution === 'merge') {
      return mergedData[field] || currentVersion[field];
    } else if (resolution === 'overwrite') {
      return clientVersion[field];
    }
    return currentVersion[field];
  };

  const isFieldDifferent = (field) => {
    return currentVersion[field] !== clientVersion[field];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="conflict-modal" onClick={e => e.stopPropagation()}>
        <div className="conflict-header">
          <h2>⚠️ Conflict Detected</h2>
          <p>Another user has modified this task while you were editing it.</p>
        </div>

        <div className="conflict-resolution-options">
          <div className="resolution-option">
            <input
              type="radio"
              id="merge"
              name="resolution"
              value="merge"
              checked={resolution === 'merge'}
              onChange={(e) => setResolution(e.target.value)}
            />
            <label htmlFor="merge">
              <strong>Merge Changes</strong> - Combine both versions
            </label>
          </div>
          <div className="resolution-option">
            <input
              type="radio"
              id="overwrite"
              name="resolution"
              value="overwrite"
              checked={resolution === 'overwrite'}
              onChange={(e) => setResolution(e.target.value)}
            />
            <label htmlFor="overwrite">
              <strong>Overwrite</strong> - Use your version
            </label>
          </div>
        </div>

        <div className="conflict-comparison">
          <div className="version-column">
            <h3>Current Version (Server)</h3>
            <div className="version-info">
              <small>Modified by: {currentVersion.lastModifiedBy}</small>
              <small>Version: {currentVersion.version}</small>
            </div>
            <div className="version-fields">
              <div className={`field ${isFieldDifferent('title') ? 'different' : ''}`}>
                <label>Title:</label>
                <span>{currentVersion.title}</span>
              </div>
              <div className={`field ${isFieldDifferent('description') ? 'different' : ''}`}>
                <label>Description:</label>
                <span>{currentVersion.description}</span>
              </div>
              <div className={`field ${isFieldDifferent('assignedTo') ? 'different' : ''}`}>
                <label>Assigned To:</label>
                <span>{currentVersion.assignedTo}</span>
              </div>
              <div className={`field ${isFieldDifferent('status') ? 'different' : ''}`}>
                <label>Status:</label>
                <span>{currentVersion.status}</span>
              </div>
              <div className={`field ${isFieldDifferent('priority') ? 'different' : ''}`}>
                <label>Priority:</label>
                <span>{currentVersion.priority}</span>
              </div>
            </div>
          </div>

          <div className="version-column">
            <h3>Your Version (Client)</h3>
            <div className="version-info">
              <small>Modified by: {user?.email}</small>
              <small>Version: {clientVersion.version}</small>
            </div>
            <div className="version-fields">
              <div className={`field ${isFieldDifferent('title') ? 'different' : ''}`}>
                <label>Title:</label>
                <span>{clientVersion.title}</span>
              </div>
              <div className={`field ${isFieldDifferent('description') ? 'different' : ''}`}>
                <label>Description:</label>
                <span>{clientVersion.description}</span>
              </div>
              <div className={`field ${isFieldDifferent('assignedTo') ? 'different' : ''}`}>
                <label>Assigned To:</label>
                <span>{clientVersion.assignedTo}</span>
              </div>
              <div className={`field ${isFieldDifferent('status') ? 'different' : ''}`}>
                <label>Status:</label>
                <span>{clientVersion.status}</span>
              </div>
              <div className={`field ${isFieldDifferent('priority') ? 'different' : ''}`}>
                <label>Priority:</label>
                <span>{clientVersion.priority}</span>
              </div>
            </div>
          </div>

          {resolution === 'merge' && (
            <div className="version-column">
              <h3>Merged Result</h3>
              <div className="version-info">
                <small>Preview of merged version</small>
              </div>
              <div className="version-fields">
                <div className="field">
                  <label>Title:</label>
                  <input
                    type="text"
                    value={getFieldValue('title')}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Description:</label>
                  <textarea
                    value={getFieldValue('description')}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Assigned To:</label>
                  <input
                    type="text"
                    value={getFieldValue('assignedTo')}
                    onChange={(e) => handleFieldChange('assignedTo', e.target.value)}
                  />
                </div>
                <div className="field">
                  <label>Status:</label>
                  <select
                    value={getFieldValue('status')}
                    onChange={(e) => handleFieldChange('status', e.target.value)}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className="field">
                  <label>Priority:</label>
                  <select
                    value={getFieldValue('priority')}
                    onChange={(e) => handleFieldChange('priority', e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="conflict-actions">
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn-primary" onClick={handleResolve}>
            {resolution === 'merge' ? 'Merge Changes' : 'Overwrite'}
          </button>
        </div>
      </div>
    </div>
  );
} 