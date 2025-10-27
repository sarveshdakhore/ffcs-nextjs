'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useFFCS, CourseData } from '@/context/FFCSContext';
import Sortable from 'sortablejs';
import { activateTeachersSortable } from '@/utils/sortableUtils';

type SortColumn = 'slots' | 'courseCode' | 'courseTitle' | 'faculty' | 'venue' | 'credits';
type SortDirection = 'none' | 'ascending' | 'descending';

export default function CourseList() {
  const { state, dispatch } = useFFCS();
  const courses = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;

  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');
  const tbodyRef = useRef<HTMLTableSectionElement>(null);
  const sortableInstance = useRef<Sortable | null>(null);

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
    }
  };

  const handleCourseRowDoubleClick = (course: CourseData) => {
    // Only allow in normal mode (not in attack/live mode)
    if (state.ui.attackMode) {
      return;
    }

    // Find matching subject in state.activeTable.subject
    // Try "CODE-TITLE" format first, then just "TITLE" if no code
    let subjectName = course.courseCode
      ? `${course.courseCode}-${course.courseTitle}`
      : course.courseTitle;
    let subject = state.activeTable.subject[subjectName];

    // If not found with code, try without code
    if (!subject && course.courseCode) {
      subjectName = course.courseTitle;
      subject = state.activeTable.subject[subjectName];
    }

    if (!subject) {
      console.warn(`Subject not found: ${subjectName}`);
      return;
    }

    // Find matching teacher using faculty name
    const teacherName = course.faculty;
    const teacherData = subject.teacher[teacherName];

    if (!teacherData) {
      console.warn(`Teacher not found: ${teacherName} in ${subjectName}`);
      return;
    }

    // Scroll to top of page (to course panel area)
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Dispatch action to enter edit mode with selected teacher
    dispatch({
      type: 'ENTER_EDIT_MODE_WITH_TEACHER',
      payload: {
        courseName: subjectName,
        teacherName: teacherName,
        teacherData: teacherData
      }
    });

    // After a short delay, scroll to and focus on the selected teacher
    setTimeout(() => {
      const teacherKey = `${subjectName}|${teacherName}`;
      const teacherElement = document.querySelector(`[data-teacher="${teacherKey}"]`);
      if (teacherElement) {
        teacherElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add a temporary highlight effect
        teacherElement.classList.add('teacher-focused');
        setTimeout(() => teacherElement.classList.remove('teacher-focused'), 2000);
      }
    }, 500);
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

  // Initialize Sortable for drag-and-drop reordering
  useEffect(() => {
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    if (tbodyRef.current && sortedCourses.length > 0) {
      // Destroy existing instance
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
      }

      // Create new sortable instance
      sortableInstance.current = Sortable.create(tbodyRef.current, {
        animation: 150,
        easing: 'cubic-bezier(1, 0, 0, 1)',
        delay: isMobile ? 170 : 0,
        delayOnTouchOnly: true,
        chosenClass: 'sortable-chosen',
        ghostClass: 'sortable-ghost',
        dragClass: 'sortable-drag',
        forceFallback: true,
        fallbackTolerance: 3,
        scroll: true,
        scrollSensitivity: 30,
        scrollSpeed: 15,
        bubbleScroll: true,
        forceAutoScrollFallback: true,
        onEnd: (evt) => {
          // Remove lingering classes
          if (evt.item) {
            evt.item.classList.remove('sortable-chosen', 'sortable-ghost', 'sortable-drag');
          }

          // Clean up all items
          const allItems = tbodyRef.current?.querySelectorAll('tr');
          allItems?.forEach(item => {
            item.classList.remove('sortable-chosen', 'sortable-ghost', 'sortable-drag');
          });

          // Get new order based on data-course attributes
          const rows = tbodyRef.current?.querySelectorAll('tr[data-course]');
          if (rows) {
            const newOrder: CourseData[] = [];
            rows.forEach(row => {
              const courseName = row.getAttribute('data-course');
              const course = sortedCourses.find(c => `course${c.courseId}` === courseName);
              if (course) {
                newOrder.push(course);
              }
            });

            // Dispatch reorder action
            if (newOrder.length > 0) {
              dispatch({
                type: state.ui.attackMode ? 'REORDER_ATTACK_DATA' : 'REORDER_COURSES_IN_TABLE',
                payload: newOrder
              });
            }
          }
        }
      });
    }

    return () => {
      if (sortableInstance.current) {
        sortableInstance.current.destroy();
        sortableInstance.current = null;
      }
    };
  }, [sortedCourses.length, state.ui.attackMode]);

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
              <tr className="bg-[#141414]/90 border-none rounded-t-[20%]">
                <th
                  onClick={() => handleSort('slots')}
                  className={`cursor-pointer bg-[#141414]/90 text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 rounded-tl-[20px] ${sortColumn === 'slots' ? sortDirection : ''}`}
                >
                  Slot{getSortIcon('slots')}
                </th>
                <th
                  onClick={() => handleSort('courseCode')}
                  className={`cursor-pointer bg-[#141414]/90 text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'courseCode' ? sortDirection : ''}`}
                >
                  Course Code{getSortIcon('courseCode')}
                </th>
                <th
                  onClick={() => handleSort('courseTitle')}
                  className={`cursor-pointer bg-[#141414]/90 text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'courseTitle' ? sortDirection : ''}`}
                >
                  Course Title{getSortIcon('courseTitle')}
                </th>
                <th
                  onClick={() => handleSort('faculty')}
                  className={`cursor-pointer bg-[#141414]/90 text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'faculty' ? sortDirection : ''}`}
                >
                  Faculty{getSortIcon('faculty')}
                </th>
                <th
                  onClick={() => handleSort('venue')}
                  className={`cursor-pointer bg-[#141414]/90 text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'venue' ? sortDirection : ''}`}
                >
                  Venue{getSortIcon('venue')}
                </th>
                <th
                  onClick={() => handleSort('credits')}
                  className={`cursor-pointer bg-[#141414]/90 text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 ${sortColumn === 'credits' ? sortDirection : ''}`}
                >
                  Credits{getSortIcon('credits')}
                </th>
                <th className="bg-[#141414]/90 text-white font-semibold text-[0.85rem] px-6 py-4 border-none uppercase tracking-wide border-b border-white/10 rounded-tr-[20px]"></th>
              </tr>
            </thead>

            <tbody id="courseList-tbody" className="bg-transparent" ref={tbodyRef}>
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
                    className={`bg-transparent text-white ${state.ui.clashingCourseIds?.includes(course.courseId) ? 'table-danger' : ''}`}
                    onDoubleClick={() => handleCourseRowDoubleClick(course)}
                    style={{ cursor: 'pointer' }}
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
                <td colSpan={7} className="bg-transparent text-white font-semibold text-[1.1rem] text-center p-4 border-none rounded-b-[20px]">
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