'use client';

import React, { useState, useEffect } from 'react';
import { useFFCS, CourseData } from '@/context/FFCSContext';

type SortColumn = 'slots' | 'courseCode' | 'courseTitle' | 'faculty' | 'venue' | 'credits';
type SortDirection = 'none' | 'ascending' | 'descending';

export default function CourseList() {
  const { state, dispatch } = useFFCS();
  const courses = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;
  
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');

  // Add socket listener for collaboration updates with loop prevention
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
      const socket = (window as any).collaborationSocket;
      let lastUpdateTime = 0;
      const DEBOUNCE_DELAY = 500; // 500ms debounce
      
      const handleCollaborationUpdate = (data: any) => {
        const now = Date.now();
        
        // Prevent rapid successive updates (debouncing)
        if (now - lastUpdateTime < DEBOUNCE_DELAY) {
          return;
        }
        
        lastUpdateTime = now;
        console.log('🔄 CourseList: Received collaboration update (debounced)', data);
        
        // Only trigger update if this is not our own change
        if (data.userId !== (window as any).collaborationUserId) {
          // Don't force dispatch here, just let natural updates happen
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
  }, [dispatch]);

  const handleRemoveCourse = (courseId: number) => {
    if (confirm('Are you sure you want to remove this course?')) {
      if (state.ui.attackMode) {
        dispatch({ 
          type: 'REMOVE_COURSE_FROM_ATTACK_DATA', 
          payload: courseId 
        });
      } else {
        dispatch({ 
          type: 'REMOVE_COURSE_FROM_TIMETABLE', 
          payload: courseId 
        });
      }
      
      // Trigger collaboration sync after course removal (debounced)
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
          console.log('🔄 Syncing course removal to collaboration room');
          // Force an auto-sync by triggering a state update
          dispatch({ type: 'FORCE_UPDATE' });
        }
      }, 100);
    }
  };

  const handleSort = (column: SortColumn) => {
    let newDirection: SortDirection = 'ascending';
    
    if (sortColumn === column) {
      if (sortDirection === 'none') {
        newDirection = 'ascending';
      } else if (sortDirection === 'ascending') {
        newDirection = 'descending';
      } else {
        newDirection = 'none';
      }
    }
    
    setSortColumn(column);
    setSortDirection(newDirection);
  };

  const getSortedCourses = (): CourseData[] => {
    if (sortDirection === 'none' || !sortColumn) {
      // Return in original order (by courseId)
      return [...courses].sort((a, b) => a.courseId - b.courseId);
    }

    const sortedCourses = [...courses].sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortColumn) {
        case 'slots':
          aValue = a.slots.join('+');
          bValue = b.slots.join('+');
          break;
        case 'courseCode':
          aValue = a.courseCode || '';
          bValue = b.courseCode || '';
          break;
        case 'courseTitle':
          aValue = a.courseTitle;
          bValue = b.courseTitle;
          break;
        case 'faculty':
          aValue = a.faculty;
          bValue = b.faculty;
          break;
        case 'venue':
          aValue = a.venue;
          bValue = b.venue;
          break;
        case 'credits':
          aValue = a.credits;
          bValue = b.credits;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (sortDirection === 'ascending') {
          return aValue.localeCompare(bValue);
        } else {
          return bValue.localeCompare(aValue);
        }
      } else {
        if (sortDirection === 'ascending') {
          return (aValue as number) - (bValue as number);
        } else {
          return (bValue as number) - (aValue as number);
        }
      }
    });

    return sortedCourses;
  };

  const getSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) return null;
    
    switch (sortDirection) {
      case 'ascending':
        return ' ↑';
      case 'descending':
        return ' ↓';
      default:
        return null;
    }
  };

  const sortedCourses = getSortedCourses();

  return (
    <div className="container-xxl" style={{ marginTop: '3rem', position: 'relative' }}>
      {/* Decorative pins for Course List */}
      <img 
        src="./images/doodles/yellowpin.svg" 
        alt="" 
        style={{ 
          position: 'absolute', 
          top: '45px', 
          left: '100px', 
          width: '40px', 
          height: '40px', 
          opacity: 1.0, 
          zIndex: 100, 
          transform: 'rotate(18deg)', 
          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' 
        }} 
      />
      <img 
        src="./images/doodles/redpin.svg" 
        alt="" 
        style={{ 
          position: 'absolute', 
          top: '50px', 
          right: '100px', 
          width: '36px', 
          height: '36px', 
          opacity: 1.0, 
          zIndex: 100, 
          transform: 'rotate(-28deg)', 
          filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.4))' 
        }} 
      />
      
      <div style={{
        background: 'rgba(35, 35, 35, 0.95)',
        borderRadius: '20px',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '2px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        margin: '2rem auto',
        maxWidth: '1200px'
      }}>
        
        {/* Header */}
        <div style={{ padding: '1.5rem 2rem' }}>
          <h3 style={{
            color: 'white',
            fontWeight: 600,
            margin: 0,
            fontSize: '1.4rem'
          }}>
            Selected Course List
          </h3>
        </div>

        <div className="table-responsive" style={{ background: 'transparent', padding: '20px' }}>
          <table 
            id="course-list" 
            className="table table-hover mb-0" 
            style={{
              background: 'transparent',
              color: 'white',
              margin: 0,
              border: '2px solid rgba(255, 255, 255, 0.5)',
              borderRadius: '20px',
              borderCollapse: 'separate',
              borderSpacing: 0
            }}
          >
            <thead>
              <tr style={{
                background: 'rgba(20, 20, 20, 0.8)',
                border: 'none',
                borderTopLeftRadius: '20%',
                borderTopRightRadius: '20%'
              }}>
                <th 
                  onClick={() => handleSort('slots')}
                  style={{ 
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '1rem 1.5rem',
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    borderTopLeftRadius: '20px'
                  }}
                  className={sortColumn === 'slots' ? sortDirection : ''}
                >
                  Slot{getSortIcon('slots')}
                </th>
                <th 
                  onClick={() => handleSort('courseCode')}
                  style={{ 
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '1rem 1.5rem',
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  className={sortColumn === 'courseCode' ? sortDirection : ''}
                >
                  Course Code{getSortIcon('courseCode')}
                </th>
                <th 
                  onClick={() => handleSort('courseTitle')}
                  style={{ 
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '1rem 1.5rem',
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  className={sortColumn === 'courseTitle' ? sortDirection : ''}
                >
                  Course Title{getSortIcon('courseTitle')}
                </th>
                <th 
                  onClick={() => handleSort('faculty')}
                  style={{ 
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '1rem 1.5rem',
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  className={sortColumn === 'faculty' ? sortDirection : ''}
                >
                  Faculty{getSortIcon('faculty')}
                </th>
                <th 
                  onClick={() => handleSort('venue')}
                  style={{ 
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '1rem 1.5rem',
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  className={sortColumn === 'venue' ? sortDirection : ''}
                >
                  Venue{getSortIcon('venue')}
                </th>
                <th 
                  onClick={() => handleSort('credits')}
                  style={{ 
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    padding: '1rem 1.5rem',
                    border: 'none',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                  }}
                  className={sortColumn === 'credits' ? sortDirection : ''}
                >
                  Credits{getSortIcon('credits')}
                </th>
                <th style={{
                  background: 'transparent',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  padding: '1rem 1.5rem',
                  border: 'none',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                  borderTopRightRadius: '20px'
                }}></th>
              </tr>
            </thead>

            <tbody id="courseList-tbody" style={{ background: 'transparent' }}>
              {sortedCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-muted py-4" style={{ color: 'rgba(255, 255, 255, 0.7) !important' }}>
                    No courses selected yet. Click on teachers in the Course Preferences panel to add them.
                  </td>
                </tr>
              ) : (
                sortedCourses.map((course) => (
                  <tr 
                    key={`course${course.courseId}`}
                    data-course={`course${course.courseId}`}
                    data-is-project={course.isProject}
                    style={{
                      background: 'transparent',
                      color: 'white'
                    }}
                  >
                    <td style={{ padding: '1rem 1.5rem', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {course.slots.join('+')}
                    </td>
                    <td className="fw-bold" style={{ padding: '1rem 1.5rem', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {course.courseCode}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {course.courseTitle}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {course.faculty}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {course.venue}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      {course.credits}
                    </td>
                    <td style={{ padding: '1rem 1.5rem', border: 'none', borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleRemoveCourse(course.courseId)}
                        title="Remove course"
                        style={{
                          borderColor: 'rgba(220, 53, 69, 0.5)',
                          color: '#dc3545',
                          background: 'transparent'
                        }}
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr style={{ background: 'rgba(20, 20, 20, 0.9)', border: 'none' }}>
                <td colSpan={7} style={{
                  background: 'transparent',
                  color: 'white',
                  fontWeight: 600,
                  fontSize: '1.1rem',
                  textAlign: 'center',
                  padding: '1rem',
                  border: 'none',
                  borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                  borderBottomLeftRadius: '20px',
                  borderBottomRightRadius: '20px'
                }}>
                  <strong>
                    Total Credits:{' '}
                    <span id="total-credits">
                      {state.ui.attackMode
                        ? state.activeTable.attackData.reduce((sum, course) => sum + course.credits, 0)
                        : state.totalCredits
                      }
                    </span>
                  </strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}