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
    <div className="container-xxl mt-12">
      <div className="bg-[#232323]/95 rounded-[20px] backdrop-blur-[20px] border-2 border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.3)] overflow-hidden my-8 mx-auto max-w-[1200px]">
        
        {/* Header */}
        <div className="px-8 py-6">
          <h3 className="text-white font-semibold m-0 text-[1.4rem]">
            Selected Course List
          </h3>
        </div>

        <div className="table-responsive bg-transparent p-5">
          <table
            id="course-list"
            className="table table-hover mb-0 bg-transparent text-white m-0 border-2 border-white/50 rounded-[20px] border-separate border-spacing-0"
          >
            <thead>
              <tr className="bg-[#141414]/80 border-none rounded-t-[20%]">
                <th
                  onClick={() => handleSort('slots')}
                  className={`cursor-pointer bg-transparent text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 rounded-tl-[20px] ${sortColumn === 'slots' ? sortDirection : ''}`}
                >
                  Slot{getSortIcon('slots')}
                </th>
                <th
                  onClick={() => handleSort('courseCode')}
                  className={`cursor-pointer bg-transparent text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'courseCode' ? sortDirection : ''}`}
                >
                  Course Code{getSortIcon('courseCode')}
                </th>
                <th
                  onClick={() => handleSort('courseTitle')}
                  className={`cursor-pointer bg-transparent text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'courseTitle' ? sortDirection : ''}`}
                >
                  Course Title{getSortIcon('courseTitle')}
                </th>
                <th
                  onClick={() => handleSort('faculty')}
                  className={`cursor-pointer bg-transparent text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'faculty' ? sortDirection : ''}`}
                >
                  Faculty{getSortIcon('faculty')}
                </th>
                <th
                  onClick={() => handleSort('venue')}
                  className={`cursor-pointer bg-transparent text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'venue' ? sortDirection : ''}`}
                >
                  Venue{getSortIcon('venue')}
                </th>
                <th
                  onClick={() => handleSort('credits')}
                  className={`cursor-pointer bg-transparent text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'credits' ? sortDirection : ''}`}
                >
                  Credits{getSortIcon('credits')}
                </th>
                <th className="bg-transparent text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 rounded-tr-[20px]"></th>
              </tr>
            </thead>

            <tbody id="courseList-tbody" className="bg-transparent">
              {sortedCourses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center text-white/70 py-4">
                    No courses selected yet. Click on teachers in the Course Preferences panel to add them.
                  </td>
                </tr>
              ) : (
                sortedCourses.map((course) => (
                  <tr
                    key={`course${course.courseId}`}
                    data-course={`course${course.courseId}`}
                    data-is-project={course.isProject}
                    className="bg-transparent text-white"
                  >
                    <td className="px-6 py-4 border-none border-b border-white/5">
                      {course.slots.join('+')}
                    </td>
                    <td className="fw-bold px-6 py-4 border-none border-b border-white/5">
                      {course.courseCode}
                    </td>
                    <td className="px-6 py-4 border-none border-b border-white/5">
                      {course.courseTitle}
                    </td>
                    <td className="px-6 py-4 border-none border-b border-white/5">
                      {course.faculty}
                    </td>
                    <td className="px-6 py-4 border-none border-b border-white/5">
                      {course.venue}
                    </td>
                    <td className="px-6 py-4 border-none border-b border-white/5">
                      {course.credits}
                    </td>
                    <td className="px-6 py-4 border-none border-b border-white/5">
                      <button
                        className="btn btn-sm btn-outline-danger border-danger/50 text-danger bg-transparent"
                        onClick={() => handleRemoveCourse(course.courseId)}
                        title="Remove course"
                      >
                        <i className="fas fa-times"></i>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>

            <tfoot>
              <tr className="bg-[#141414]/90 border-none">
                <td colSpan={7} className="bg-transparent text-white font-semibold text-[1.1rem] text-center p-4 border-none border-t border-white/20 rounded-b-[20px]">
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