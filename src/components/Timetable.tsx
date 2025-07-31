'use client';

import React, { useState } from 'react';
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
  const { state, dispatch } = useFFCS();
  const [currentTable, setCurrentTable] = useState(state.currentTableId);
  const [showQuickButtons, setShowQuickButtons] = useState(false);

  // Get the appropriate schema based on campus
  const getTimetableSchema = (): TimetableSchema => {
    return state.currentCampus === 'Chennai' ? chennaiSchema as TimetableSchema : velloreSchema as TimetableSchema;
  };

  const handleTableSwitch = (tableId: number) => {
    dispatch({ type: 'SWITCH_TABLE', payload: tableId });
    setCurrentTable(tableId);
  };

  const handleAddTable = () => {
    const tableName = prompt('Enter table name:');
    if (tableName) {
      dispatch({ type: 'CREATE_TABLE', payload: tableName });
    }
  };

  const handleQuickToggle = () => {
    setShowQuickButtons(!showQuickButtons);
    dispatch({ 
      type: 'SET_UI_STATE', 
      payload: { quickVisualizationEnabled: !state.ui.quickVisualizationEnabled } 
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
          const parts = slotText.split('/');
          const theorySlot = parts[0];
          const labSlot = parts[1] ? parts[1].trim() : null;
          
          // Check for highlighting and courses
          const timetableSlot = state.timetable[theorySlot];
          const isHighlighted = timetableSlot?.isSelected || false;
          const isClash = hasClash(theorySlot);
          
          const classNames = ['period', theorySlot].filter(Boolean);
          if (isHighlighted) classNames.push('highlight');
          if (isClash) classNames.push('clash');
          
          dayRows[day].push(
            <td 
              key={`${day}-${index}`} 
              className={classNames.join(' ')}
              onClick={() => handleSlotClick(theorySlot)}
            >
              {timetableSlot?.course && timetableSlot?.teacher ? (
                <div 
                  data-course={`course${timetableSlot.course.code}`}
                  style={{ backgroundColor: timetableSlot.teacher.color }}
                >
                  {timetableSlot.course.code}
                  {timetableSlot.teacher.venue ? `-${timetableSlot.teacher.venue}` : ''}
                  {labSlot ? ` / ${labSlot}` : ''}
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
      dispatch({ type: 'TOGGLE_SLOT_HIGHLIGHT', payload: slot });
    };

    const renderButton = (slot: string) => {
      const isHighlighted = state.timetable[slot]?.isSelected || false;
      return (
        <button 
          key={slot}
          type="button"
          className={`${slot}-tile btn quick-button${isHighlighted ? ' highlight' : ''}`}
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
      dispatch({ type: 'TOGGLE_SLOT_HIGHLIGHT', payload: slot });
    };

    const renderButton = (slot: string) => {
      const isHighlighted = state.timetable[slot]?.isSelected || false;
      return (
        <button 
          key={slot}
          type="button"
          className={`${slot}-tile btn quick-button${isHighlighted ? ' highlight' : ''}`}
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
    <>
      {/* Option buttons for the timetable */}
      <div className="container-sm px-4">
        <div id="option-buttons" className="row justify-content-between">
          <div className="col-auto mb-2 text-center">
            <div className="btn-group" role="group">
              <div className="btn-group">
                <button
                  id="tt-picker-button"
                  className="btn btn-primary dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                >
                  {state.tables[currentTable]?.name || 'Default Table'}
                </button>
                <ul id="tt-picker-dropdown" className="dropdown-menu">
                  {Object.entries(state.tables).map(([id, table]) => (
                    <li key={id}>
                      <div className="dropdown-item d-flex justify-content-between">
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleTableSwitch(Number(id));
                          }}
                        >
                          {table.name}
                        </a>
                        <a
                          className="tt-picker-rename"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            const newName = prompt('Enter new name:', table.name);
                            if (newName) {
                              dispatch({ 
                                type: 'RENAME_TABLE', 
                                payload: { id: Number(id), name: newName } 
                              });
                            }
                          }}
                          title="Rename"
                        >
                          <i className="fas fa-pencil-alt"></i>
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
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
              className="btn btn-success"
              type="button"
              data-bs-toggle="modal"
              data-bs-target="#download-modal"
            >
              <i className="fas fa-download"></i>
              <span>&nbsp;&nbsp;Download Timetable</span>
            </button>
            
            <button
              id="quick-toggle"
              className={`btn ms-1 me-1 ${showQuickButtons ? 'btn-warning' : 'btn-outline-warning'}`}
              type="button"
              onClick={handleQuickToggle}
            >
              <i className="fas fa-eye"></i>
              <span>&nbsp;&nbsp;
                {showQuickButtons ? 'Disable' : 'Enable'} Quick Visualization
              </span>
            </button>
            
            <button
              className="btn btn-danger"
              type="button"
              data-bs-toggle="modal"
              data-bs-target="#reset-modal"
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

      {/* Sticky anchor for scroll button */}
      <a
        href="#course_list11"
        className="sticky"
        id="course_list11"
        title="Go to Course List"
      ></a>
    </>
  );
}