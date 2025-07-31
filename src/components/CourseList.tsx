'use client';

import { useState } from 'react';
import { useFFCS, CourseData } from '@/context/FFCSContext';

type SortColumn = 'slots' | 'courseCode' | 'courseTitle' | 'faculty' | 'venue' | 'credits';
type SortDirection = 'none' | 'ascending' | 'descending';

export default function CourseList() {
  const { state, dispatch } = useFFCS();
  const courses = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;
  
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');

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
    <div className="container-xxl">
      <blockquote>
        <p className="text-black-50 px-3 fs-6 fw-light">
          Double click a course in the list below to load it back into
          the course panel.
        </p>
      </blockquote>

      <div id="course-list" className="table-responsive">
        <table className="table table-hover mb-0">
          <thead>
            <tr className="table-success noselect">
              <th 
                onClick={() => handleSort('slots')}
                style={{ cursor: 'pointer' }}
                className={sortColumn === 'slots' ? sortDirection : ''}
              >
                Slot{getSortIcon('slots')}
              </th>
              <th 
                onClick={() => handleSort('courseCode')}
                style={{ cursor: 'pointer' }}
                className={sortColumn === 'courseCode' ? sortDirection : ''}
              >
                Course Code{getSortIcon('courseCode')}
              </th>
              <th 
                onClick={() => handleSort('courseTitle')}
                style={{ cursor: 'pointer' }}
                className={sortColumn === 'courseTitle' ? sortDirection : ''}
              >
                Course Title{getSortIcon('courseTitle')}
              </th>
              <th 
                onClick={() => handleSort('faculty')}
                style={{ cursor: 'pointer' }}
                className={sortColumn === 'faculty' ? sortDirection : ''}
              >
                Faculty{getSortIcon('faculty')}
              </th>
              <th 
                onClick={() => handleSort('venue')}
                style={{ cursor: 'pointer' }}
                className={sortColumn === 'venue' ? sortDirection : ''}
              >
                Venue{getSortIcon('venue')}
              </th>
              <th 
                onClick={() => handleSort('credits')}
                style={{ cursor: 'pointer' }}
                className={sortColumn === 'credits' ? sortDirection : ''}
              >
                Credits{getSortIcon('credits')}
              </th>
              <th></th>
            </tr>
          </thead>

          <tbody id="courseList-tbody">
            {sortedCourses.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No courses selected yet. Click on teachers in the Course Preferences panel to add them.
                </td>
              </tr>
            ) : (
              sortedCourses.map((course) => (
                <tr 
                  key={`course${course.courseId}`}
                  data-course={`course${course.courseId}`}
                  data-is-project={course.isProject}
                >
                  <td>{course.slots.join('+')}</td>
                  <td className="fw-bold">{course.courseCode}</td>
                  <td>{course.courseTitle}</td>
                  <td>{course.faculty}</td>
                  <td>{course.venue}</td>
                  <td>{course.credits}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-danger"
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
            <tr className="table-active">
              <td colSpan={7}>
                <strong>
                  Total Credits:{' '}
                  <span id="total-credits">
                    {state.ui.attackMode 
                      ? state.activeTable.attackData.reduce((sum, course) => sum + course.credits, 0)
                      : state.totalCredits
                    }
                  </span>
                  {state.ui.attackMode && <span className="text-warning"> (Attack Mode)</span>}
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}