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
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [tableNameInput, setTableNameInput] = useState('');
  const [tableToRename, setTableToRename] = useState<number | null>(null);
  const [tableToDelete, setTableToDelete] = useState<number | null>(null);

  const handleDownloadTimetable = () => {
    // Exit edit modes before export (matching vanilla JS behavior)
    if (state.globalVars.editSub || state.globalVars.editTeacher) {
      dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'editSub', value: false } });
      dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'editTeacher', value: false } });
    }

    // Export activeTable matching vanilla JS format
    const activeTable = state.activeTable;
    const jsonStr = JSON.stringify(activeTable);
    const utf8Str = btoa(encodeURIComponent(jsonStr));
    
    const blob = new Blob([utf8Str], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', url);
    linkElement.setAttribute('download', `${activeTable.name}.ffcsplanner`);
    document.body.appendChild(linkElement);
    linkElement.click();
    document.body.removeChild(linkElement);
    URL.revokeObjectURL(url);
    
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

  const handleUploadTimetable = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.ffcsplanner, .txt, .ffcsonthego';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        processFile(file);
      }
    };
    input.click();
    setShowUploadModal(false);
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      try {
        // Extract the data from the file
        const base64Data = event.target.result;
        
        // Decode the base64 string back into a URI-encoded string
        const uriEncodedData = atob(base64Data);
        
        // Decode the URI-encoded string back into a JSON string
        const jsonStr = decodeURIComponent(uriEncodedData);
        
        // Parse the JSON string back into an object
        const activeTableUpdate = JSON.parse(jsonStr);
        
        // Preserve current table ID and name
        activeTableUpdate.id = state.activeTable.id;
        activeTableUpdate.name = state.activeTable.name;
        
        // Update the current table with imported data
        const updatedTables = state.timetableStoragePref.map(table => 
          table.id === state.activeTable.id ? activeTableUpdate : table
        );
        
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            timetableStoragePref: updatedTables,
            activeTable: activeTableUpdate,
            totalCredits: activeTableUpdate.data.reduce((sum: number, course: any) => sum + course.credits, 0)
          }
        });
        
        alert('Timetable imported successfully!');
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error importing timetable. Please check the file format.');
      }
    };
    reader.readAsText(file);
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-sm">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Upload Timetable</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowUploadModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="text-muted mb-3">
                  Upload a previously saved timetable file (.ffcsplanner)
                </p>
                <button
                  type="button"
                  className="btn btn-primary w-100"
                  onClick={handleUploadTimetable}
                >
                  <i className="fas fa-upload"></i>
                  &nbsp;&nbsp;Choose File
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
        <div id="upload-modal" onClick={() => setShowUploadModal(true)}></div>
        <div id="switch-campus-modal" onClick={() => setShowSwitchCampusModal(true)}></div>
      </div>
    </>
  );
}