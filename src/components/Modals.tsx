'use client';

import { useState } from 'react';
import { useFFCS } from '@/context/FFCSContext';

export default function Modals() {
  const { state, dispatch } = useFFCS();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showSwitchCampusModal, setShowSwitchCampusModal] = useState(false);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableToRename, setTableToRename] = useState<number | null>(null);
  const [tableToDelete, setTableToDelete] = useState<number | null>(null);

  const handleDownloadTimetable = () => {
    // Create a canvas or use html2canvas to capture the timetable
    // For now, we'll create a simple text export
    const timetableData = {
      courses: state.selectedCourses,
      timetable: state.timetable,
      totalCredits: state.totalCredits,
      tableName: state.tables[state.currentTableId]?.name || 'Default Table',
      campus: state.currentCampus,
      exportDate: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(timetableData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ffcs-timetable-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setShowDownloadModal(false);
  };

  const handleDownloadCourseList = () => {
    const courseListData = {
      courses: state.selectedCourses,
      totalCredits: state.totalCredits,
      campus: state.currentCampus,
      exportDate: new Date().toISOString(),
    };

    const dataStr = JSON.stringify(courseListData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `ffcs-course-list-${new Date().toISOString().slice(0, 10)}.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setShowDownloadModal(false);
  };

  const handleRenameTable = () => {
    if (tableToRename !== null && tableNameInput.trim()) {
      dispatch({
        type: 'RENAME_TABLE',
        payload: { id: tableToRename, name: tableNameInput.trim() }
      });
      setShowRenameModal(false);
      setTableNameInput('');
      setTableToRename(null);
    }
  };

  const handleDeleteTable = () => {
    if (tableToDelete !== null) {
      dispatch({ type: 'DELETE_TABLE', payload: tableToDelete });
      setShowDeleteModal(false);
      setTableToDelete(null);
    }
  };

  const handleResetTable = () => {
    dispatch({ type: 'RESET_TABLE' });
    setShowResetModal(false);
  };

  const handleSwitchCampus = () => {
    // Switch campus logic would go here
    setShowSwitchCampusModal(false);
    window.location.reload(); // Reload to refresh data
  };

  return (
    <>
      {/* Update Modal */}
      {showUpdateModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Update Available</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUpdateModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  A new version of FFCS Planner is available! Would you like to
                  reload the page? No data will be lost.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUpdateModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => window.location.reload()}
                >
                  Reload
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Rename Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRenameModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => { e.preventDefault(); handleRenameTable(); }}>
                  <div className="mb-3">
                    <label htmlFor="table-name" className="col-form-label">
                      Table Name
                    </label>
                    <input
                      id="table-name"
                      className="form-control"
                      type="text"
                      autoComplete="off"
                      placeholder="Morning Timetable"
                      value={tableNameInput}
                      onChange={(e) => setTableNameInput(e.target.value)}
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRenameModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={handleRenameTable}
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete this table? This action cannot
                  be undone.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDeleteTable}
                >
                  Yes, I'm sure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {showResetModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Reset Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowResetModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to reset this table? All selected
                  courses will be erased.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowResetModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleResetTable}
                >
                  Yes, I'm sure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Download Timetable</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDownloadModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <button
                  type="button"
                  className="btn btn-success w-100 mb-2"
                  onClick={handleDownloadTimetable}
                >
                  <i className="fas fa-camera"></i>
                  &nbsp;&nbsp;Download Timetable
                </button>
                <button
                  type="button"
                  className="btn btn-success w-100"
                  onClick={handleDownloadCourseList}
                >
                  <i className="fas fa-camera"></i>
                  &nbsp;&nbsp;Download Course List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Switch Campus Modal */}
      {showSwitchCampusModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Switch Campus</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowSwitchCampusModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to switch your campus? All data will be
                  lost.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSwitchCampusModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleSwitchCampus}
                >
                  Yes, I'm sure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global modal trigger elements (hidden) */}
      <div style={{ display: 'none' }}>
        <div id="update-modal" onClick={() => setShowUpdateModal(true)}></div>
        <div id="rename-modal" onClick={() => setShowRenameModal(true)}></div>
        <div id="delete-modal" onClick={() => setShowDeleteModal(true)}></div>
        <div id="reset-modal" onClick={() => setShowResetModal(true)}></div>
        <div id="download-modal" onClick={() => setShowDownloadModal(true)}></div>
        <div id="switch-campus-modal" onClick={() => setShowSwitchCampusModal(true)}></div>
      </div>
    </>
  );
}