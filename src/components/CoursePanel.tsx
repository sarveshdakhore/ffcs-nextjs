'use client';

import { useState } from 'react';
import { useFFCS } from '@/context/FFCSContext';
import AddCourseForm from './forms/AddCourseForm';
import EditCourseForm from './forms/EditCourseForm';
import AddTeacherForm from './forms/AddTeacherForm';
import EditTeacherForm from './forms/EditTeacherForm';

export default function CoursePanel() {
  const { state, dispatch } = useFFCS();
  const [currentView, setCurrentView] = useState<'teacher' | 'course' | 'edit-course' | 'edit-teacher'>('teacher');

  const handleAddTeacher = () => {
    setCurrentView('teacher');
    dispatch({ type: 'SET_EDIT_MODE', payload: { isEditingCourse: false, isEditingTeacher: false } });
  };

  const handleAddCourse = () => {
    setCurrentView('course');
    dispatch({ type: 'SET_EDIT_MODE', payload: { isEditingCourse: false, isEditingTeacher: false } });
  };

  const handleEditMode = () => {
    dispatch({ 
      type: 'SET_UI_STATE', 
      payload: { courseEditEnabled: !state.ui.courseEditEnabled } 
    });
  };

  const handleDoneEdit = () => {
    dispatch({ type: 'SET_EDIT_MODE', payload: { isEditingCourse: false, isEditingTeacher: false } });
    dispatch({ type: 'SET_UI_STATE', payload: { courseEditEnabled: false } });
    setCurrentView('teacher');
  };

  const handleCollapseAll = () => {
    // Collapse all course dropdowns - implementation would depend on how courses are displayed
    console.log('Collapse all courses');
  };

  const handleSaveTT = () => {
    // Save timetable to local storage or cloud
    const dataToSave = {
      courses: state.courses,
      selectedCourses: state.selectedCourses,
      timetable: state.timetable,
      currentCampus: state.currentCampus,
      tables: state.tables,
      currentTableId: state.currentTableId,
    };
    
    const blob = new Blob([JSON.stringify(dataToSave, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ffcs-timetable-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLoadTT = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const data = JSON.parse(e.target?.result as string);
            dispatch({ type: 'LOAD_DATA', payload: data });
          } catch (error) {
            alert('Error loading file. Please check the file format.');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleClearList = () => {
    if (confirm('Are you sure you want to clear all courses?')) {
      dispatch({ type: 'CLEAR_ALL' });
    }
  };

  return (
    <div className="card">
      <div className="card-header text-left fw-bold header-button">
        <div className="c_pref" style={{ width: '28%', alignSelf: 'center' }}>
          Course Preferences
        </div>
        <div className="text-left header-button-element">
          <button
            id="tt-teacher-add"
            type="button"
            className="btn btn-success"
            onClick={handleAddTeacher}
          >
            <i className="fas fa-plus"></i>&nbsp;Teachers
          </button>
          
          <button
            id="tt-subject-add"
            type="button"
            className="btn btn-primary"
            onClick={handleAddCourse}
          >
            <i className="fas fa-plus"></i>&nbsp;Course
          </button>
          
          <button
            id="tt-subject-edit"
            className="btn btn-warning ms-1 me-1"
            type="button"
            onClick={handleEditMode}
          >
            <i className="fas fa-pencil"></i>
            <span>&nbsp;&nbsp;Edit</span>
          </button>

          {state.ui.courseEditEnabled && (
            <>
              <button
                id="tt-subject-done"
                className="btn btn-primary ms-1 me-1"
                type="button"
                onClick={handleDoneEdit}
              >
                <span>{ }Done</span>
              </button>
              
              <button
                id="tt-subject-collapse"
                className="btn btn-outline-secondary ms-1 me-1"
                type="button"
                onClick={handleCollapseAll}
              >
                <i className="fas fa-chevron-up"></i>
                <span>{  }Collapse All</span>
              </button>
              
              <div
                className="form-check form-switch"
                style={{ marginTop: '7px', display: 'inline-block' }}
                id="div-auto-focus"
              >
                &nbsp;
                <label
                  className="form-check-label"
                  htmlFor="tt-auto-focus-switch"
                >
                  Auto Focus
                </label>
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="tt-auto-focus-switch"
                  checked={state.ui.autoFocusEnabled}
                  onChange={(e) => dispatch({ 
                    type: 'SET_UI_STATE', 
                    payload: { autoFocusEnabled: e.target.checked } 
                  })}
                />
              </div>
              
              <div
                className="form-check form-switch"
                style={{ marginTop: '7px', display: 'inline-block' }}
                id="tt-sub-edit-switch-div"
              >
                &nbsp;
                <label
                  className="form-check-label"
                  htmlFor="tt-sub-edit-switch"
                >
                  Course Edit
                </label>
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="tt-sub-edit-switch"
                  checked={state.ui.courseEditEnabled}
                  onChange={(e) => dispatch({ 
                    type: 'SET_UI_STATE', 
                    payload: { courseEditEnabled: e.target.checked } 
                  })}
                />
              </div>
            </>
          )}
          
        </div>
      </div>

      <div
        style={{
          padding: '0%',
          display: 'flex',
          flexDirection: 'row',
          minHeight: '440px',
          maxHeight: '440px',
        }}
        className="card-body"
      >
        <section
          style={{ height: '440px' }}
          className="left-border left-box"
          id="subjectArea"
        >
          {/* Course list will be rendered here */}
          <div className="course-list-container">
            {state.courses.length === 0 ? (
              <div className="text-center p-4">
                <p className="text-muted">No courses added yet. Add a course to get started!</p>
              </div>
            ) : (
              state.courses.map((course) => (
                <div key={course.code} className="course-item mb-3">
                  <div className="course-header">
                    <h6 className="course-title">{course.code} - {course.name}</h6>
                    <small className="text-muted">{course.credits} credits</small>
                  </div>
                  <div className="teachers-list">
                    {course.teachers.map((teacher, index) => (
                      <div
                        key={index}
                        className="teacher-item"
                        style={{ backgroundColor: teacher.color }}
                        onClick={() => {
                          if (state.ui.courseEditEnabled) {
                            setCurrentView('edit-teacher');
                            dispatch({ 
                              type: 'SET_EDIT_MODE', 
                              payload: { 
                                isEditingTeacher: true, 
                                editingTeacherId: `${course.code}-${teacher.name}` 
                              } 
                            });
                          }
                        }}
                      >
                        <div className="teacher-name">{teacher.name}</div>
                        <div className="teacher-details">
                          <span className="slot">{teacher.slot}</span>
                          <span className="venue">{teacher.venue}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section 
          style={{ height: '440px' }}
          className="left-border right-box"
        >
          {state.ui.courseEditEnabled && (
            <h5
              id="edit_msg_"
              style={{
                padding: '4.5%',
                paddingBottom: '0',
                display: 'block',
              }}
            >
              Click on the Teacher to edit it.
            </h5>
          )}

          {/* Render appropriate form based on current view */}
          {currentView === 'course' && (
            <div 
              id="div-for-add-course" 
              style={{ 
                height: state.ui.courseEditEnabled ? 'calc(100% - 120px)' : 'calc(100% - 60px)', 
                overflowY: 'auto' 
              }}
            >
              <AddCourseForm onSuccess={() => setCurrentView('teacher')} />
            </div>
          )}

          {currentView === 'edit-course' && (
            <div 
              id="div-for-edit-course" 
              style={{ 
                height: state.ui.courseEditEnabled ? 'calc(100% - 120px)' : 'calc(100% - 60px)', 
                overflowY: 'auto' 
              }}
            >
              <EditCourseForm onSuccess={() => setCurrentView('teacher')} />
            </div>
          )}

          {currentView === 'teacher' && (
            <div 
              id="div-for-add-teacher" 
              style={{ 
                height: state.ui.courseEditEnabled ? 'calc(100% - 120px)' : 'calc(100% - 60px)'
              }}
            >
              <AddTeacherForm />
            </div>
          )}

          {currentView === 'edit-teacher' && (
            <div 
              id="div-for-edit-teacher" 
              style={{ 
                height: state.ui.courseEditEnabled ? 'calc(100% - 120px)' : 'calc(100% - 60px)', 
                overflowY: 'auto' 
              }}
            >
              <EditTeacherForm onSuccess={() => setCurrentView('teacher')} />
            </div>
          )}
        </section>
      </div>

      <div className="card-footer">
        <div className="row align-items-center justify-content-between">
          <div className="col-sm-auto my-1">
            <span id="last-update_remove" className="fw-bold">
              <div
                className="form-check form-switch attack-toggle"
                style={{ marginTop: '7px' }}
              >
                &nbsp;
                <label
                  className="form-check-label"
                  htmlFor="attack-toggle"
                >
                  Live FFCS Mode
                </label>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="attack-toggle"
                  checked={state.ui.liveFFCSMode}
                  onChange={(e) => dispatch({ 
                    type: 'SET_UI_STATE', 
                    payload: { liveFFCSMode: e.target.checked } 
                  })}
                />
              </div>
            </span>
          </div>

          <div className="col-sm-auto my-1">
            <button
              id="save-panel-button"
              type="button"
              className="btn btn-light me-1"
              onClick={handleSaveTT}
            >
              Save TT
            </button>
            
            <button
              id="load-panel-button"
              type="button"
              className="btn btn-light me-1"
              onClick={handleLoadTT}
            >
              Upload TT
            </button>

            <button
              id="clear-course-button"
              type="button"
              className="btn btn-success"
              onClick={handleClearList}
            >
              Clear List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}