'use client';

import { useFFCS } from '@/context/FFCSContext';

export default function CourseList() {
  const { state, dispatch } = useFFCS();

  const handleCourseDoubleClick = (course: any) => {
    // Load course back into the course panel for editing
    dispatch({ 
      type: 'SET_EDIT_MODE', 
      payload: { 
        isEditingCourse: true, 
        editingCourseId: course.code 
      } 
    });
  };

  const handleRemoveCourse = (courseCode: string) => {
    if (confirm('Are you sure you want to remove this course?')) {
      dispatch({ type: 'REMOVE_COURSE', payload: courseCode });
    }
  };

  const getSelectedTeachersForCourse = (course: any) => {
    // Get teachers that are selected in the timetable for this course
    const selectedTeachers: any[] = [];
    
    Object.values(state.timetable).forEach((slot: any) => {
      if (slot.course?.code === course.code && slot.teacher) {
        if (!selectedTeachers.find(t => t.name === slot.teacher.name)) {
          selectedTeachers.push(slot.teacher);
        }
      }
    });
    
    return selectedTeachers;
  };

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
              <th>Slot</th>
              <th>Course Code</th>
              <th>Course Title</th>
              <th>Faculty</th>
              <th>Venue</th>
              <th>Credits</th>
              <th></th>
            </tr>
          </thead>

          <tbody id="courseList-tbody">
            {state.selectedCourses.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-muted py-4">
                  No courses selected yet. Add courses and select teachers to see them here.
                </td>
              </tr>
            ) : (
              state.selectedCourses.map((course) => {
                const selectedTeachers = getSelectedTeachersForCourse(course);
                
                if (selectedTeachers.length === 0) {
                  // Show course without selected teachers
                  return (
                    <tr 
                      key={`${course.code}-empty`}
                      onDoubleClick={() => handleCourseDoubleClick(course)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="text-muted">-</td>
                      <td className="fw-bold">{course.code}</td>
                      <td>{course.name}</td>
                      <td className="text-muted">No teacher selected</td>
                      <td className="text-muted">-</td>
                      <td>{course.credits}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveCourse(course.code)}
                          title="Remove course"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      </td>
                    </tr>
                  );
                }
                
                // Show each selected teacher as a separate row
                return selectedTeachers.map((teacher, index) => (
                  <tr 
                    key={`${course.code}-${teacher.name}-${index}`}
                    onDoubleClick={() => handleCourseDoubleClick(course)}
                    style={{ cursor: 'pointer', backgroundColor: teacher.color }}
                  >
                    <td className="fw-bold">{teacher.slot}</td>
                    <td className="fw-bold">{course.code}</td>
                    <td>{course.name}</td>
                    <td>{teacher.name}</td>
                    <td>{teacher.venue}</td>
                    <td>{index === 0 ? course.credits : ''}</td>
                    <td>
                      {index === 0 && (
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveCourse(course.code)}
                          title="Remove course"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ));
              })
            )}
          </tbody>

          <tfoot>
            <tr className="table-active">
              <td colSpan={7}>
                <strong>
                  Total Credits:{' '}
                  <span id="total-credits">{state.totalCredits}</span>
                </strong>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}