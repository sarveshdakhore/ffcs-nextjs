'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFFCS } from '@/context/FFCSContext';
import velloreSchema from '@/data/schemas/vellore.json';
import chennaiSchema from '@/data/schemas/chennai.json';

interface TimeSlot {
  start?: string;
  end?: string;
  days?: {
    [key: string]: string;
  };
  lunch?: boolean;
}

interface TimetableSchema {
  theory: TimeSlot[];
  lab: TimeSlot[];
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function Timetable() {
  const { state, dispatch, forceUpdate } = useFFCS();
  const [currentTable, setCurrentTable] = useState(state.currentTableId);
  const [showQuickButtons, setShowQuickButtons] = useState(false);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Create a stable key for React re-rendering based on actual data changes
  const dataKey = useMemo(() => {
    const dataString = JSON.stringify(state.activeTable?.data);
    const subjectString = JSON.stringify(state.activeTable?.subject);
    return `${state.activeTable?.id}-${dataString}-${subjectString}-${state.forceUpdateCounter}`;
  }, [state.activeTable?.id, state.activeTable?.data, state.activeTable?.subject, state.forceUpdateCounter]);

  // Custom modal states
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showRenameTableModal, setShowRenameTableModal] = useState(false);
  const [showDeleteTableModal, setShowDeleteTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [renameTableName, setRenameTableName] = useState('');
  const [tableToRename, setTableToRename] = useState<number | null>(null);
  const [tableToDelete, setTableToDelete] = useState<{ id: number; name: string } | null>(null);

  // Add socket listener for collaboration updates with AGGRESSIVE re-rendering
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
      const socket = (window as any).collaborationSocket;
      
      const handleCollaborationUpdate = (data: any) => {
        console.log('🔄 Timetable: Received collaboration update', data);
        
        // Only trigger update if this is not our own change
        if (data.userId !== (window as any).collaborationUserId) {
          console.log('🚨 Timetable: FORCING AGGRESSIVE UPDATE');
          
          // Multiple immediate updates
          if (forceUpdate) {
            forceUpdate();
            forceUpdate();
            forceUpdate();
          }
          
          // Force state update with timeouts
          setTimeout(() => {
            if (forceUpdate) forceUpdate();
          }, 10);
          
          setTimeout(() => {
            if (forceUpdate) forceUpdate();
          }, 50);
        }
      };

      // Listen for timetable updates
      socket.on('timetable-updated', handleCollaborationUpdate);
      socket.on('user-joined', handleCollaborationUpdate);
      socket.on('joined-room', handleCollaborationUpdate);

      return () => {
        // Cleanup listeners
        socket.off('timetable-updated', handleCollaborationUpdate);
        socket.off('user-joined', handleCollaborationUpdate);
        socket.off('joined-room', handleCollaborationUpdate);
      };
    }
  }, []);

    // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTableDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAddTableModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync local currentTable state with global state
  useEffect(() => {
    setCurrentTable(state.currentTableId);
  }, [state.currentTableId]);

  // Get the appropriate schema based on campus
  const getTimetableSchema = (): TimetableSchema => {
    return state.currentCampus === 'Chennai' ? chennaiSchema as TimetableSchema : velloreSchema as TimetableSchema;
  };

  const handleTableSwitch = (tableId: number) => {
    dispatch({ type: 'SWITCH_TABLE', payload: tableId });
    // No need to manually update currentTable - it will be synced via useEffect
  };

  const handleAddTable = () => {
    setNewTableName('');
    setShowAddTableModal(true);
  };

  const confirmAddTable = () => {
    if (newTableName.trim()) {
      dispatch({ type: 'CREATE_TABLE', payload: newTableName.trim() });
      setShowAddTableModal(false);
      setNewTableName('');
      // No need to manually update currentTable - it will be synced via useEffect
    }
  };

  const handleRenameTable = (tableId: number, currentName: string) => {
    setTableToRename(tableId);
    setRenameTableName(currentName);
    setShowRenameTableModal(true);
    setShowTableDropdown(false);
  };

  const confirmRenameTable = () => {
    if (tableToRename !== null && renameTableName.trim()) {
      dispatch({ type: 'RENAME_TABLE', payload: { id: tableToRename, name: renameTableName.trim() } });
      setShowRenameTableModal(false);
      setRenameTableName('');
      setTableToRename(null);
    }
  };

  const handleDeleteTable = (tableId: number, tableName: string) => {
    if (state.timetableStoragePref.length === 1) {
      // Show a simple alert modal for this case
      alert('Cannot delete the last remaining table.');
      return;
    }
    
    setTableToDelete({ id: tableId, name: tableName });
    setShowDeleteTableModal(true);
    setShowTableDropdown(false);
  };

  const confirmDeleteTable = () => {
    if (tableToDelete) {
      dispatch({ type: 'DELETE_TABLE', payload: tableToDelete.id });
      // The DELETE_TABLE action in context handles switching to another table automatically
      setShowDeleteTableModal(false);
      setTableToDelete(null);
    }
  };

  const handleQuickToggle = () => {
    const newShowState = !showQuickButtons;
    setShowQuickButtons(newShowState);
    
    if (!newShowState) {
      // QV is being closed - remove QV effects but keep individual cell highlights
      dispatch({ type: 'CLEAR_QV_HIGHLIGHTS' });
    }
    
    dispatch({ 
      type: 'SET_UI_STATE', 
      payload: { quickVisualizationEnabled: newShowState } 
    });
  };

  const handleSlotClick = (slot: string) => {
    // Toggle slot highlighting (like the original vanilla JS behavior)
    dispatch({ type: 'TOGGLE_SLOT_HIGHLIGHT', payload: slot });
  };

  // Check if a slot has a clash (simplified version)
  const hasClash = (slot: string): boolean => {
    // This is a simplified clash detection
    // In the original, it checks for time overlaps between theory and lab hours
    // For now, we'll implement a basic version that can be enhanced later
    const timetableSlot = state.timetable[slot];
    if (!timetableSlot?.course) return false;
    
    // Check for overlapping slots in the same time period
    const selectedSlots = Object.values(state.timetable).filter(s => s.isSelected && s.course);
    return selectedSlots.filter(s => s.slot !== slot && s.course?.code !== timetableSlot.course?.code).length > 0;
  };


  const renderTimetableRows = () => {
    const rows: React.ReactElement[] = [];
    
    // EXACT HTML structure matching the provided timetable
    
    // Theory Row - EXACT times from provided HTML
    const theoryRow = [
      <td key="theory-label" className="day">THEORY <br />HOURS</td>,
      <td key="theory-1" className="theory-hour">8:00 AM<br />to<br />8:50 AM</td>,
      <td key="theory-2" className="theory-hour">9:00 AM<br />to<br />9:50 AM</td>,
      <td key="theory-3" className="theory-hour">10:00 AM<br />to<br />10:50 AM</td>,
      <td key="theory-4" className="theory-hour">11:00 AM<br />to<br />11:50 AM</td>,
      <td key="theory-5" className="theory-hour">12:00 PM<br />to<br />12:50 PM</td>,
      <td key="theory-empty" className="theory-hour"></td>,
      <td key="lunch" className="lunch" style={{ width: '8px' }} rowSpan={9}>L<br />U<br />N<br />C<br />H</td>,
      <td key="theory-6" className="theory-hour">2:00 PM<br />to<br />2:50 PM</td>,
      <td key="theory-7" className="theory-hour">3:00 PM<br />to<br />3:50 PM</td>,
      <td key="theory-8" className="theory-hour">4:00 PM<br />to<br />4:50 PM</td>,
      <td key="theory-9" className="theory-hour">5:00 PM<br />to<br />5:50 PM</td>,
      <td key="theory-10" className="theory-hour">6:00 PM<br />to<br />6:50 PM</td>,
      <td key="theory-11" className="theory-hour">6:51 PM<br />to<br />7:00 PM</td>,
      <td key="theory-12" className="theory-hour">7:01 PM<br />to<br />7:50 PM</td>
    ];
    
    // Lab Row - EXACT times from provided HTML
    const labRow = [
      <td key="lab-label" className="day">LAB <br />HOURS</td>,
      <td key="lab-1" className="lab-hour">08:00 AM<br />to<br />08:50 AM</td>,
      <td key="lab-2" className="lab-hour">08:51 AM<br />to<br />09:40 AM</td>,
      <td key="lab-3" className="lab-hour">09:51 AM<br />to<br />10:40 AM</td>,
      <td key="lab-4" className="lab-hour">10:41 AM<br />to<br />11:30 AM</td>,
      <td key="lab-5" className="lab-hour">11:40 AM<br />to<br />12:30 PM</td>,
      <td key="lab-6" className="lab-hour">12:31 PM<br />to<br />1:20 PM</td>,
      // No lunch cell in lab row - it's handled by theory row's rowspan
      <td key="lab-7" className="lab-hour">2:00 PM<br />to<br />2:50 PM</td>,
      <td key="lab-8" className="lab-hour">2:51 PM<br />to<br />3:40 PM</td>,
      <td key="lab-9" className="lab-hour">3:51 PM<br />to<br />4:40 PM</td>,
      <td key="lab-10" className="lab-hour">4:41 PM<br />to<br />5:30 PM</td>,
      <td key="lab-11" className="lab-hour">5:40 PM<br />to<br />6:30 PM</td>,
      <td key="lab-12" className="lab-hour">6:31 PM<br />to<br />7:20 PM</td>,
      <td key="lab-empty" className="lab-hour"></td>
    ];
    
    // Day rows with theory+lab content (format: TheoryCode / LabCode)
    const dayRowsData = {
      mon: ['A1 / L1', 'F1 / L2', 'D1 / L3', 'TB1 / L4', 'TG1 / L5', 'L6', 'A2 / L31', 'F2 / L32', 'D2 / L33', 'TB2 / L34', 'TG2 / L35', 'L36', 'V3'],
      tue: ['B1 / L7', 'G1 / L8', 'E1 / L9', 'TC1 / L10', 'TAA1 / L11', 'L12', 'B2 / L37', 'G2 / L38', 'E2 / L39', 'TC2 / L40', 'TAA2 / L41', 'L42', 'V4'],
      wed: ['C1 / L13', 'A1 / L14', 'F1 / L15', 'V1 / L16', 'V2 / L17', 'L18', 'C2 / L43', 'A2 / L44', 'F2 / L45', 'TD2 / L46', 'TBB2 / L47', 'L48', 'V5'],
      thu: ['D1 / L19', 'B1 / L20', 'G1 / L21', 'TE1 / L22', 'TCC1 / L23', 'L24', 'D2 / L49', 'B2 / L50', 'G2 / L51', 'TE2 / L52', 'TCC2 / L53', 'L54', 'V6'],
      fri: ['E1 / L25', 'C1 / L26', 'TA1 / L27', 'TF1 / L28', 'TD1 / L29', 'L30', 'E2 / L55', 'C2 / L56', 'TA2 / L57', 'TF2 / L58', 'TDD2 / L59', 'L60', 'V7'],
      sat: ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      sun: ['', '', '', '', '', '', '', '', '', '', '', '', '']
    };
    
    const dayRows: { [key: string]: React.ReactElement[] } = {};
    
    DAYS.forEach(day => {
      dayRows[day] = [<td key={`${day}-label`} className="day">{day.toUpperCase()}</td>];
      
      const slots = dayRowsData[day as keyof typeof dayRowsData] || [];
      
      slots.forEach((slotText, index) => {
        if (slotText) {
          // Original logic with theory/lab handling restored
          const parts = slotText.split(' / ');
          const theorySlot = parts[0]?.trim();
          const labSlot = parts[1]?.trim() || null;
          
          // Check for courses in this slot (attack mode or normal mode)
          const dataToCheck = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;
          const coursesInSlot = dataToCheck.filter(course => 
            course.slots.includes(theorySlot)
          );
          
          // Check if this specific cell is highlighted in quick array
          const quickArray = state.ui.attackMode ? state.activeTable.attackQuick : state.activeTable.quick;
          const dayRowMap: { [key: string]: number } = {
            mon: 2, tue: 3, wed: 4, thu: 5, fri: 6, sat: 7, sun: 8
          };
          const currentRow = dayRowMap[day];
          // Calculate actual column in table accounting for lunch column
          // Columns 0-5 in dayRowsData map to columns 1-6 in table
          // Columns 6-12 in dayRowsData map to columns 8-14 in table (skip lunch at column 7)
          const currentCol = index < 6 ? index + 1 : index + 2;
          
          const isQuickHighlighted = quickArray.some((entry: any[]) => {
            if (entry.length === 2) {
              // Individual cell highlight [row, col]
              return entry[0] === currentRow && entry[1] === currentCol;
            } else if (entry.length === 3 && entry[2] === true) {
              // QV tile highlight [row, col, true]
              return entry[0] === currentRow && entry[1] === currentCol;
            }
            return false;
          });
          
          const isHighlighted = isQuickHighlighted || coursesInSlot.length > 0;
          const isClash = coursesInSlot.length > 1; // Multiple courses in same slot
          
          const classNames = ['period', theorySlot].filter(Boolean);
          if (isHighlighted) classNames.push('highlight');
          if (isClash) classNames.push('clash');
          
          dayRows[day].push(
            <td 
              key={`${day}-${index}`} 
              className={classNames.join(' ')}
              onClick={() => {
                // Cell click only works when QV is enabled and cell has no courses
                if (state.ui.quickVisualizationEnabled && coursesInSlot.length === 0 && !isClash) {
                  dispatch({ type: 'TOGGLE_CELL_HIGHLIGHT', payload: { day, index, theorySlot } });
                }
              }}
            >
              {coursesInSlot.length > 0 ? (
                coursesInSlot.map((course, courseIndex) => {
                  // Find the teacher's color from the subject data
                  const subjectName = course.courseCode ? 
                    `${course.courseCode}-${course.courseTitle}` : 
                    course.courseTitle;
                  const teacherData = state.activeTable.subject[subjectName]?.teacher[course.faculty];
                  // const backgroundColor = teacherData?.color || 'rgb(255, 228, 135)';
                  
                  return (
                    <div 
                      key={`${course.courseId}-${courseIndex}`}
                      data-course={`course${course.courseId}`}
                      style={{ 
                        // backgroundColor,
                        marginBottom: courseIndex < coursesInSlot.length - 1 ? '2px' : '0'
                      }}
                    >
                      {course.courseCode || course.courseTitle}
                      {course.venue && course.venue !== 'VENUE' ? `-${course.venue}` : ''}
                    </div>
                  );
                })
              ) : isQuickHighlighted ? (
                // Show empty highlighted slot from quick array
                <div >
                  {slotText}
                </div>
              ) : (
                slotText
              )}
            </td>
          );
        } else {
          dayRows[day].push(
            <td key={`${day}-empty-${index}`} className="period"></td>
          );
        }
      });
    });

    // Build final rows array
    rows.push(
      <tr key="theory" id="theory">{theoryRow}</tr>,
      <tr key="lab" id="lab">{labRow}</tr>
    );

    // Add day rows - hide SAT and SUN
    DAYS.forEach(day => {
      const shouldHide = day === 'sat' || day === 'sun';
      rows.push(
        <tr key={day} id={day} style={shouldHide ? { display: 'none' } : {}}>
          {dayRows[day]}
        </tr>
      );
    });

    return rows;
  };

  const renderQuickButtons = () => {
    const handleQuickButtonClick = (slot: string) => {
      // QV tile click - find ALL cells with this theory slot and highlight them
      // Use the predefined mapping instead of DOM querying for accuracy
      
      // Define where each theory slot appears in the timetable based on dayRowsData
      // Row indices: theory=0, lab=1, mon=2, tue=3, wed=4, thu=5, fri=6, sat=7, sun=8
      // Column mapping: dayRowsData index 0-5 -> table col 1-6, index 6-12 -> table col 8-14 (lunch at col 7)
      const slotPositions: { [key: string]: [number, number][] } = {
        // First period slots (dayRowsData indices 0-5 -> table columns 1-6)
        'A1': [[2, 1], [4, 2]], // MON index 0 -> col 1, WED index 1 -> col 2
        'F1': [[2, 2], [4, 3]], // MON index 1 -> col 2, WED index 2 -> col 3
        'D1': [[2, 3], [5, 1]], // MON index 2 -> col 3, THU index 0 -> col 1
        'TB1': [[2, 4]], // MON index 3 -> col 4
        'TG1': [[2, 5]], // MON index 4 -> col 5
        
        'B1': [[3, 1], [5, 2]], // TUE index 0 -> col 1, THU index 1 -> col 2
        'G1': [[3, 2], [5, 3]], // TUE index 1 -> col 2, THU index 2 -> col 3
        'E1': [[3, 3], [6, 1]], // TUE index 2 -> col 3, FRI index 0 -> col 1
        'TC1': [[3, 4]], // TUE index 3 -> col 4
        'TAA1': [[3, 5]], // TUE index 4 -> col 5
        
        'C1': [[4, 1], [6, 2]], // WED index 0 -> col 1, FRI index 1 -> col 2
        'V1': [[4, 4]], // WED index 3 -> col 4
        'V2': [[4, 5]], // WED index 4 -> col 5
        
        'TE1': [[5, 4]], // THU index 3 -> col 4
        'TCC1': [[5, 5]], // THU index 4 -> col 5
        
        'TA1': [[6, 3]], // FRI index 2 -> col 3
        'TF1': [[6, 4]], // FRI index 3 -> col 4
        'TD1': [[6, 5]], // FRI index 4 -> col 5
        
        // Second period slots (dayRowsData indices 6-12 -> table columns 8-14)
        'A2': [[2, 8], [4, 9]], // MON index 6 -> col 8, WED index 7 -> col 9
        'F2': [[2, 9], [4, 10]], // MON index 7 -> col 9, WED index 8 -> col 10
        'D2': [[2, 10], [5, 8]], // MON index 8 -> col 10, THU index 6 -> col 8
        'TB2': [[2, 11]], // MON index 9 -> col 11
        'TG2': [[2, 12]], // MON index 10 -> col 12
        'V3': [[2, 14]], // MON index 12 -> col 14
        
        'B2': [[3, 8], [5, 9]], // TUE index 6 -> col 8, THU index 7 -> col 9
        'G2': [[3, 9], [5, 10]], // TUE index 7 -> col 9, THU index 8 -> col 10
        'E2': [[3, 10], [6, 8]], // TUE index 8 -> col 10, FRI index 6 -> col 8
        'TC2': [[3, 11]], // TUE index 9 -> col 11
        'TAA2': [[3, 12]], // TUE index 10 -> col 12
        'V4': [[3, 14]], // TUE index 12 -> col 14
        
        'C2': [[4, 8], [6, 9]], // WED index 6 -> col 8, FRI index 7 -> col 9
        'TD2': [[4, 11]], // WED index 9 -> col 11
        'TBB2': [[4, 12]], // WED index 10 -> col 12
        'V5': [[4, 14]], // WED index 12 -> col 14
        
        'TE2': [[5, 11]], // THU index 9 -> col 11
        'TCC2': [[5, 12]], // THU index 10 -> col 12
        'V6': [[5, 14]], // THU index 12 -> col 14
        
        'TA2': [[6, 10]], // FRI index 8 -> col 10
        'TF2': [[6, 11]], // FRI index 9 -> col 11
        'TDD2': [[6, 12]], // FRI index 10 -> col 12
        'V7': [[6, 14]], // FRI index 12 -> col 14
      };
      
      const positions = slotPositions[slot] || [];
      if (positions.length === 0) return; // No positions found for this slot
      
      dispatch({ 
        type: 'PROCESS_QV_SLOT_HIGHLIGHT', 
        payload: { slot, positions } 
      });
    };

    const renderButton = (slot: string) => {
      // Check if this slot is highlighted in quick array (QV tile highlights have third parameter true)
      const quickArray = state.ui.attackMode ? state.activeTable.attackQuick : state.activeTable.quick;
      
      // Define where each theory slot appears in the timetable based on dayRowsData
      // Column mapping: dayRowsData index 0-5 -> table col 1-6, index 6-12 -> table col 8-14 (lunch at col 7)
      const slotPositions: { [key: string]: [number, number][] } = {
        // First period slots
        'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
        'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
        'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
        'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
        // Second period slots
        'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 14]],
        'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 14]],
        'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 14]],
        'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 14]],
        'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 14]],
      };
      
      const cellsWithSlot = slotPositions[slot] || [];
      
      // Check if any of this slot's positions are QV-highlighted
      const isQVHighlighted = cellsWithSlot.some(([r, c]) => 
        quickArray.some((entry: any[]) => {
          return entry.length === 3 && entry[0] === r && entry[1] === c && entry[2] === true;
        })
      );
      
      const dataToCheck = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;
      const hasCoursesInSlot = dataToCheck.some(course => 
        course.slots.includes(slot)
      );
      const shouldHighlight = isQVHighlighted || hasCoursesInSlot;
      
      return (
        <button 
          key={slot}
          type="button"
          className={`${slot}-tile btn quick-button${shouldHighlight ? ' highlight' : ''}`}
          onClick={() => handleQuickButtonClick(slot)}
        >
          {slot}
        </button>
      );
    };

    return (
      <>
        {/* Quick selection tiles - Above the timetable */}
        <div className="container-sm my-2 quick-buttons noselect" style={{ display: showQuickButtons ? 'block' : 'none' }}>
          <div>
            <table>
              <tbody>
                <tr>
                  {renderButton('A1')}
                  {renderButton('B1')}
                  {renderButton('C1')}
                  {renderButton('D1')}
                  {renderButton('E1')}
                  {renderButton('F1')}
                  {renderButton('G1')}
                  {renderButton('V1')}
                  {renderButton('V2')}
                </tr>
                <tr>
                  {renderButton('TA1')}
                  {renderButton('TB1')}
                  {renderButton('TC1')}
                  {renderButton('TE1')}
                  {renderButton('TF1')}
                  {renderButton('TG1')}
                  {renderButton('TD1')}
                </tr>
                <tr>
                  {renderButton('TAA1')}
                  {renderButton('TCC1')}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderQuickButtonsBelow = () => {
    const handleQuickButtonClick = (slot: string) => {
      // QV tile click - find ALL cells with this theory slot and highlight them
      // Use the predefined mapping instead of DOM querying for accuracy
      
      // Define where each theory slot appears in the timetable based on dayRowsData
      // Row indices: theory=0, lab=1, mon=2, tue=3, wed=4, thu=5, fri=6, sat=7, sun=8
      // Column indices: day=0, then periods 1-13 (but lunch column is added after period 6)
      const slotPositions: { [key: string]: [number, number][] } = {
        // First period slots (columns 1-6 in dayRowsData become columns 1-6 in table)
        'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
        'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
        'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
        'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
        // Second period slots (columns 6-12 in dayRowsData become columns 8-14 in table, accounting for lunch)
        'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 13]],
        'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 13]],
        'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 13]],
        'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 13]],
        'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 13]],
      };
      
      const positions = slotPositions[slot] || [];
      if (positions.length === 0) return; // No positions found for this slot
      
      dispatch({ 
        type: 'PROCESS_QV_SLOT_HIGHLIGHT', 
        payload: { slot, positions } 
      });
    };

    const renderButton = (slot: string) => {
      // Check if this slot is highlighted in quick array (QV tile highlights have third parameter true)
      const quickArray = state.ui.attackMode ? state.activeTable.attackQuick : state.activeTable.quick;
      
      // Define where each theory slot appears in the timetable based on dayRowsData
      // Row indices: theory=0, lab=1, mon=2, tue=3, wed=4, thu=5, fri=6, sat=7, sun=8
      // Column mapping: dayRowsData index 0-5 -> table col 1-6, index 6-12 -> table col 8-14 (lunch at col 7)
      const slotPositions: { [key: string]: [number, number][] } = {
        // First period slots
        'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
        'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
        'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
        'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
        // Second period slots
        'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 14]],
        'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 14]],
        'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 14]],
        'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 14]],
        'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 14]],
      };
      
      const cellsWithSlot = slotPositions[slot] || [];
      
      // Check if any of this slot's positions are QV-highlighted
      const isQVHighlighted = cellsWithSlot.some(([r, c]) => 
        quickArray.some((entry: any[]) => {
          return entry.length === 3 && entry[0] === r && entry[1] === c && entry[2] === true;
        })
      );
      
      const dataToCheck = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;
      const hasCoursesInSlot = dataToCheck.some(course => 
        course.slots.includes(slot)
      );
      const shouldHighlight = isQVHighlighted || hasCoursesInSlot;
      
      return (
        <button 
          key={slot}
          type="button"
          className={`${slot}-tile btn quick-button${shouldHighlight ? ' highlight' : ''}`}
          onClick={() => handleQuickButtonClick(slot)}
        >
          {slot}
        </button>
      );
    };

    return (
      <>
        {/* Quick selection tiles - Below the timetable */}
        <div className="container-sm mt-3 quick-buttons noselect" style={{ display: showQuickButtons ? 'block' : 'none' }}>
          <div>
            <table>
              <tbody>
                <tr>
                  {renderButton('A2')}
                  {renderButton('B2')}
                  {renderButton('C2')}
                  {renderButton('D2')}
                  {renderButton('E2')}
                  {renderButton('F2')}
                  {renderButton('G2')}
                  {renderButton('V3')}
                  {renderButton('V4')}
                  {renderButton('V5')}
                  {renderButton('V6')}
                  {renderButton('V7')}
                </tr>
                <tr>
                  {renderButton('TA2')}
                  {renderButton('TB2')}
                  {renderButton('TC2')}
                  {renderButton('TD2')}
                  {renderButton('TE2')}
                  {renderButton('TF2')}
                  {renderButton('TG2')}
                </tr>
                <tr>
                  {renderButton('TAA2')}
                  {renderButton('TBB2')}
                  {renderButton('TCC2')}
                  {renderButton('TDD2')}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  return (
    <div key={`timetable-${dataKey}`}>
      {/* Option buttons for the timetable */}
      <div className="container-sm px-4">
        <div id="option-buttons" className="row justify-content-between">
          <div className="col-auto mb-2 text-center">
            <div className="btn-group" role="group" style={{gap: '0px'}}>
                            <div className="btn-group" ref={dropdownRef}>
                <button
                  id="tt-picker-button"
                  className="btn btn-primary dropdown-toggle"
                  type="button"
                  onClick={() => setShowTableDropdown(!showTableDropdown)}
                  aria-expanded={showTableDropdown}
                >
                  {state.timetableStoragePref.find(t => t.id === currentTable)?.name || 'Default Table'}
                </button>
                {showTableDropdown && (
                  <ul id="tt-picker-dropdown" className="dropdown-menu show" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, minWidth: '250px' }}>
                    {state.timetableStoragePref.map((table) => (
                      <li key={table.id}>
                        <div className="dropdown-item d-flex justify-content-between align-items-center px-3 py-2">
                          <a
                            href="#"
                            className="flex-grow-1 text-start"
                            onClick={(e) => {
                              e.preventDefault();
                              handleTableSwitch(table.id);
                              setShowTableDropdown(false);
                            }}
                            style={{ textDecoration: 'none', color: 'inherit', marginRight: '10px' }}
                          >
                            {table.name}
                          </a>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRenameTable(table.id, table.name);
                              }}
                              title="Rename"
                              style={{ padding: '2px 6px', fontSize: '12px' }}
                            >
                              <i className="fas fa-edit text-white"></i>
                            </button>
                            {state.timetableStoragePref.length > 1 && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteTable(table.id, table.name);
                                }}
                                title="Delete"
                                style={{ padding: '2px 6px', fontSize: '12px' }}
                              >
                                <i className="fas fa-trash text-white"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                id="tt-picker-add"
                type="button"
                className="btn btn-primary"
                title="Add Table"
                onClick={handleAddTable}
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <div className="col-auto mb-2 text-center">
            <button
              className="btn btn-success m-2"
              type="button"
              onClick={() => {
                document.getElementById('download-modal')?.click();
              }}
            >
              <i className="fas fa-download"></i>
              <span>&nbsp;&nbsp;Download Timetable</span>
            </button>
            
            <button
              id="quick-toggle"
              className={`btn ms-1 me-1 btn-warning text-white m-2`}
              type="button"
              onClick={handleQuickToggle}
            >
              <i className="fas fa-eye text-white"></i>
              <span className='text-white'>&nbsp;&nbsp;
                {showQuickButtons ? 'Disable' : 'Enable'} Quick Visualization
              </span>
            </button>
            
            <button
              className="btn btn-danger m-2"
              type="button"
              onClick={() => {
                document.getElementById('reset-modal')?.click();
              }}
            >
              <i className="fas fa-redo"></i>
              <span>&nbsp;&nbsp;Reset Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick selection tiles - Above timetable */}
      {renderQuickButtons()}

      {/* Main Timetable */}
      <div className="container-xxl text-center noselect">
        <div id="timetable" className="table-responsive">
          <table className="mb-0 mt-2 table table-bordered">
            <tbody>
              {renderTimetableRows()}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick selection tiles - Below timetable */}
      {renderQuickButtonsBelow()}

      {/* Custom Modals */}
      
      {/* Add Table Modal */}
      {showAddTableModal && (
        <div 
          className="modal show d-block" 
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddTableModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddTableModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => { e.preventDefault(); confirmAddTable(); }}>
                  <div className="mb-3">
                    <label htmlFor="new-table-name" className="col-form-label">
                      Table Name
                    </label>
                    <input
                      id="new-table-name"
                      className="form-control"
                      type="text"
                      autoComplete="off"
                      placeholder="Enter table name"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddTableModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmAddTable}
                  disabled={!newTableName.trim()}
                >
                  Add Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Table Modal */}
      {showRenameTableModal && (
        <div 
          className="modal show d-block" 
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRenameTableModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Rename Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRenameTableModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => { e.preventDefault(); confirmRenameTable(); }}>
                  <div className="mb-3">
                    <label htmlFor="rename-table-name" className="col-form-label">
                      Table Name
                    </label>
                    <input
                      id="rename-table-name"
                      className="form-control"
                      type="text"
                      autoComplete="off"
                      placeholder="Enter new table name"
                      value={renameTableName}
                      onChange={(e) => setRenameTableName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRenameTableModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={confirmRenameTable}
                  disabled={!renameTableName.trim()}
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Table Modal */}
      {showDeleteTableModal && tableToDelete && (
        <div 
          className="modal show d-block" 
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteTableModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteTableModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete <strong>"{tableToDelete.name}"</strong>? 
                  This action cannot be undone and all data in this table will be lost.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteTableModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDeleteTable}
                >
                  Yes, Delete Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky anchor for scroll button */}
      <a
        href="#course_list11"
        className="sticky"
        id="course_list11"
        title="Go to Course List"
      ></a>
    </div>
  );
}