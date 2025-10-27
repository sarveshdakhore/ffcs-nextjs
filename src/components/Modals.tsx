'use client';

import { useState } from 'react';
import { useFFCS } from '@/context/FFCSContext';
import html2canvas from 'html2canvas';

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

  // Helper function to create branded header
  const appendHeader = (container: HTMLElement, tableName: string) => {
    const header = document.createElement('div');
    header.style.padding = '20px 30px';
    header.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)';
    header.style.borderBottom = '1px solid rgba(255, 255, 255, 0.1)';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.justifyContent = 'space-between';

    // Left side - GDG Logo and Text
    const leftDiv = document.createElement('div');
    leftDiv.style.display = 'flex';
    leftDiv.style.alignItems = 'center';
    leftDiv.style.gap = '15px';

    const logo = document.createElement('img');
    logo.src = './images/icons/gdsc.png';
    logo.alt = 'GDG Logo';
    logo.style.width = '50px';
    logo.style.height = 'auto';

    const textDiv = document.createElement('div');
    textDiv.style.display = 'flex';
    textDiv.style.flexDirection = 'column';

    const gdgText = document.createElement('span');
    gdgText.textContent = 'Google Developer Group';
    gdgText.style.color = '#ffffff';
    gdgText.style.fontSize = '16px';
    gdgText.style.fontWeight = '600';
    gdgText.style.lineHeight = '1.2';

    const vitText = document.createElement('span');
    vitText.textContent = 'Vellore Institute of Technology';
    vitText.style.color = '#bdc3c7';
    vitText.style.fontSize = '13px';
    vitText.style.fontWeight = '400';
    vitText.style.lineHeight = '1.2';

    textDiv.appendChild(gdgText);
    textDiv.appendChild(vitText);
    leftDiv.appendChild(logo);
    leftDiv.appendChild(textDiv);

    // Center - FFCS PLANNER
    const centerDiv = document.createElement('div');
    centerDiv.style.flex = '1';
    centerDiv.style.textAlign = 'center';

    const title = document.createElement('h1');
    title.textContent = 'FFCS PLANNER';
    title.style.color = '#ffffff';
    title.style.fontSize = '28px';
    title.style.fontWeight = '700';
    title.style.margin = '0';
    title.style.letterSpacing = '2px';
    title.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';

    centerDiv.appendChild(title);

    // Right side - Table Name
    const rightDiv = document.createElement('div');
    rightDiv.style.textAlign = 'right';

    const tableNameDiv = document.createElement('div');
    tableNameDiv.textContent = tableName;
    tableNameDiv.style.color = '#4ECDCC';
    tableNameDiv.style.fontSize = '16px';
    tableNameDiv.style.fontWeight = '600';

    rightDiv.appendChild(tableNameDiv);

    header.appendChild(leftDiv);
    header.appendChild(centerDiv);
    header.appendChild(rightDiv);
    container.appendChild(header);
  };

  // Download timetable as image
  const handleDownloadTimetableAsImage = async () => {
    const timetableElement = document.getElementById('timetable');
    if (!timetableElement) {
      alert('Timetable not found');
      return;
    }

    // Create off-screen container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)';
    container.style.padding = '0';
    document.body.appendChild(container);

    try {
      // Add header
      appendHeader(container, state.activeTable.name);

      // Clone and style timetable
      const clone = timetableElement.cloneNode(true) as HTMLElement;
      clone.style.margin = '20px';
      clone.style.backgroundColor = '#232323';

      // Apply dark theme to table cells
      const cells = clone.querySelectorAll('td, th');
      cells.forEach(cell => {
        (cell as HTMLElement).style.backgroundColor = '#232323';
        (cell as HTMLElement).style.color = '#ffffff';
        (cell as HTMLElement).style.borderColor = '#dee2e6';
      });

      container.appendChild(clone);

      // Render with html2canvas
      const canvas = await html2canvas(container, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        logging: false
      } as any);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `FFCS Planner ${state.activeTable.name} (Timetable).jpg`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/jpeg', 0.95);

      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error generating timetable image:', error);
      alert('Failed to generate timetable image');
    } finally {
      document.body.removeChild(container);
    }
  };

  // Download course list as image
  const handleDownloadCourseListAsImage = async () => {
    const courseListElement = document.getElementById('course-list');
    if (!courseListElement) {
      alert('Course list not found');
      return;
    }

    // Create off-screen container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.background = 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)';
    container.style.padding = '0';
    document.body.appendChild(container);

    try {
      // Add header
      appendHeader(container, state.activeTable.name);

      // Clone and style course list
      const clone = courseListElement.cloneNode(true) as HTMLElement;
      clone.style.margin = '20px';
      clone.style.backgroundColor = '#232323';

      // Remove action column (last column) from thead and tbody only, not tfoot
      const theadRows = clone.querySelectorAll('thead tr');
      theadRows.forEach(row => {
        const cells = row.querySelectorAll('th');
        if (cells.length > 0) {
          cells[cells.length - 1].remove();
        }
      });

      const tbodyRows = clone.querySelectorAll('tbody tr');
      tbodyRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length > 0) {
          cells[cells.length - 1].remove();
        }
      });

      // Update tfoot colspan to match new column count (6 instead of 7)
      const tfootCell = clone.querySelector('tfoot td');
      if (tfootCell) {
        tfootCell.setAttribute('colspan', '6');
      }

      // Apply dark theme to table cells
      const cells = clone.querySelectorAll('td, th');
      cells.forEach(cell => {
        (cell as HTMLElement).style.backgroundColor = '#232323';
        (cell as HTMLElement).style.color = '#ffffff';
        (cell as HTMLElement).style.borderColor = '#dee2e6';
      });

      container.appendChild(clone);

      // Render with html2canvas
      const canvas = await html2canvas(container, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        logging: false
      } as any);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.download = `FFCS Planner ${state.activeTable.name} (Course List).jpg`;
          link.href = url;
          link.click();
          URL.revokeObjectURL(url);
        }
      }, 'image/jpeg', 0.95);

      setShowDownloadModal(false);
    } catch (error) {
      console.error('Error generating course list image:', error);
      alert('Failed to generate course list image');
    } finally {
      document.body.removeChild(container);
    }
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

  // Normalize teacher colors to valid hex values, default to red for unknown
  const normalizeTeacherColor = (color: any): string => {
    if (!color || typeof color !== 'string') {
      return '#3d1a1a'; // Default to red
    }

    // Map old colors to new colors
    const colorMap: { [key: string]: string } = {
      // Green variants
      'rgb(214, 255, 214)': '#0d3320',
      '#1a4d2e': '#0d3320',
      '#0d3320': '#0d3320',
      // Orange variants
      'rgb(255, 228, 135)': '#4a2c0f',
      '#8b4513': '#4a2c0f',
      '#4a2c0f': '#4a2c0f',
      // Red variants
      'rgb(255, 205, 205)': '#3d1a1a',
      '#7a1a1a': '#3d1a1a',
      '#3d1a1a': '#3d1a1a',
    };

    const normalizedColor = colorMap[color.trim()];
    return normalizedColor || '#3d1a1a'; // Default to red if not found
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

        // Normalize all teacher colors in subject data
        if (activeTableUpdate.subject) {
          Object.keys(activeTableUpdate.subject).forEach((courseName) => {
            const courseData = activeTableUpdate.subject[courseName];
            if (courseData.teacher) {
              Object.keys(courseData.teacher).forEach((teacherName) => {
                const teacher = courseData.teacher[teacherName];
                if (teacher.color) {
                  teacher.color = normalizeTeacherColor(teacher.color);
                }
              });
            }
          });
        }

        // Preserve current table ID and name
        activeTableUpdate.id = state.activeTable.id;
        activeTableUpdate.name = state.activeTable.name;
        
        // Update the current table with imported data
        const updatedTables = state.timetableStoragePref.map(table => 
          table.id === state.activeTable.id ? activeTableUpdate : table
        );
        
        // First disable attack mode if it's on (like vanilla JS switchTable)
        if (state.ui.attackModeEnabled) {
          dispatch({ type: 'SET_ATTACK_MODE', payload: { enabled: false } });
        }
        
        // Clear current state (like vanilla JS resetPage)
        dispatch({ type: 'CLEAR_TIMETABLE' });
        
        // Load the new data
        dispatch({
          type: 'LOAD_DATA',
          payload: {
            timetableStoragePref: updatedTables,
            activeTable: activeTableUpdate,
            totalCredits: activeTableUpdate.data.reduce((sum: number, course: any) => sum + course.credits, 0)
          }
        });
        
        // Regenerate timetable from loaded data (like vanilla JS fillPage)
        dispatch({ type: 'REGENERATE_TIMETABLE' });
        
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
                <h5 className="modal-title">Erase Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowResetModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to erase this table? All selected
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
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Download Options</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDownloadModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    className="btn btn-success"
                    style={{ flex: 1 }}
                    onClick={handleDownloadTimetableAsImage}
                  >
                    <i className="fas fa-image"></i>
                    &nbsp;&nbsp;Timetable
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    style={{ flex: 1 }}
                    onClick={handleDownloadCourseListAsImage}
                  >
                    <i className="fas fa-image"></i>
                    &nbsp;&nbsp;Course List
                  </button>
                </div>
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
                <p className="mb-3" style={{ color: 'white' }}>
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