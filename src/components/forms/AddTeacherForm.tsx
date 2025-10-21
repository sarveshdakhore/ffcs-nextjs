'use client';

import { useState, useEffect, useRef } from 'react';
import { useFFCS } from '@/context/FFCSContext';
import { 
  parseTextToListForMultipleAdd, 
  validateTeacherData, 
  processTeacherName 
} from '@/utils/teacherUtils';

export default function AddTeacherForm() {
  const { state, dispatch } = useFFCS();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [slot, setSlot] = useState('');
  const [venue, setVenue] = useState('');
  const [color, setColor] = useState('rgb(255, 228, 135)'); // Default orange
  const [error, setError] = useState('');
  const [multipleTeachersText, setMultipleTeachersText] = useState('');
  const [multipleError, setMultipleError] = useState('');
  const [showModalFallback, setShowModalFallback] = useState(false);
  
  // Ref for the modal element
  const modalRef = useRef<HTMLDivElement>(null);
  const bootstrapModalRef = useRef<any>(null);

  const colors = [
    { value: 'rgb(214, 255, 214)', name: 'Green' },
    { value: 'rgb(255, 228, 135)', name: 'Orange' },
    { value: 'rgb(255, 205, 205)', name: 'Red' },
  ];

  // No modal initialization in useEffect - following original pattern

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate inputs
    if (!selectedCourse) {
      setError('Please select a course');
      return;
    }

    if (!teacherName.trim()) {
      setError('Teacher name is required');
      return;
    }

    if (!slot.trim()) {
      setError('Slot is required');
      return;
    }

    if (!venue.trim()) {
      setError('Venue is required');
      return;
    }

    // Create new teacher
    const newTeacher = {
      name: teacherName.trim().toUpperCase(),
      slot: slot.trim().toUpperCase(),
      venue: venue.trim().toUpperCase(),
      color,
      course: selectedCourse,
    };

    // Add teacher to course
    dispatch({
      type: 'ADD_TEACHER',
      payload: { courseCode: selectedCourse, teacher: newTeacher },
    });

    // Reset form
    setTeacherName('');
    setSlot('');
    setVenue('');
    setColor('rgb(255, 228, 135)');
    setError('');
  };

  const removeDotsLive = (value: string) => {
    return value.replace(/[.]/g, '');
  };

  const removeSlotSplCharLive = (value: string) => {
    // Allow only alphanumeric characters, +, and common slot patterns
    return value.replace(/[^A-Za-z0-9+]/g, '');
  };

  const handleAddMultiple = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('🚀🚀🚀 UPDATED VERSION - Add Multiple button clicked! - VERSION 2.0');
    console.log('📋 Selected course:', selectedCourse);
    console.log('🔗 Modal ref current:', modalRef.current);
    console.log('🌍 Window available:', typeof window !== 'undefined');
    console.log('🌍 Document available:', typeof document !== 'undefined');
    
    // Check if course is selected (exactly like the original)
    if (!selectedCourse || selectedCourse === '' || selectedCourse === 'Select Course') {
      console.log('❌ No course selected, showing error');
      alert('Please select a course first!');
      setError('Please select a course before adding multiple teachers');
      setTimeout(() => setError(''), 5000);
      return;
    }
    
    console.log('✅ Course selected, proceeding with modal...');
    
    // Clear any previous errors
    setMultipleError('');
    
    // FORCE React state modal first to test
    console.log('🔄 FORCING React state fallback modal for testing');
    setShowModalFallback(true);
    
    // Also try Bootstrap approach
    if (modalRef.current && typeof window !== 'undefined') {
      console.log('✅ Creating Bootstrap modal instance on demand (following original pattern)');
      try {
        // @ts-ignore - Bootstrap types not available
        const bootstrap = await import('bootstrap');
        console.log('📦 Bootstrap loaded:', bootstrap);
        console.log('📦 Bootstrap.Modal constructor:', (bootstrap as any).Modal);
        
        // Create modal instance exactly like original: new bootstrap.Modal(document.getElementById('multiple-teacher-modal'))
        const modal = new (bootstrap as any).Modal(modalRef.current);
        console.log('✅ Modal instance created:', modal);
        
        // Show modal exactly like original: modal.show()
        modal.show();
        console.log('📖 Modal show() called successfully');
        
        // Store reference for later cleanup
        bootstrapModalRef.current = modal;
        
        // Hide React fallback if Bootstrap works
        setTimeout(() => setShowModalFallback(false), 500);
        
      } catch (error) {
        console.error('❌ Error with Bootstrap modal:', error);
        console.log('🔄 Bootstrap failed, keeping React state fallback');
      }
    } else {
      console.error('❌ No modal ref or not in browser environment');
      console.log('🔄 Keeping React state fallback');
    }
  };

  const processMultipleTeachers = () => {
    // Validate inputs
    if (!selectedCourse) {
      setMultipleError('Please select a course before adding multiple teachers');
      return;
    }

    if (!multipleTeachersText.trim()) {
      setMultipleError('Please paste the teacher data from VTOP');
      return;
    }

    try {
      // Parse the text input
      const teacherList = parseTextToListForMultipleAdd(multipleTeachersText);
      let addedCount = 0;
      let skippedCount = 0;

      // Process each teacher
      teacherList.forEach((teacherData) => {
        // Validate teacher data
        if (!validateTeacherData(teacherData)) {
          skippedCount++;
          return;
        }

        // Process teacher name (add (E) for evening classes if needed)
        const processedTeacherName = processTeacherName(
          teacherData.faculty.trim().toUpperCase(), 
          teacherData.slots.trim().toUpperCase()
        );

        // Find the course or create a generic name
        const courseObj = state.courses.find(course => course.code === selectedCourse);
        const courseName = courseObj?.name || 'Unknown Course';
        const fullCourseName = `${selectedCourse} - ${courseName}`;

        // Ensure the course exists in subject data (add if it doesn't exist)
        if (!state.activeTable.subject[fullCourseName]) {
          dispatch({
            type: 'ADD_SUBJECT',
            payload: {
              courseName: fullCourseName,
              credits: courseObj?.credits || 0
            }
          });
        }

        // Add teacher to subject data first (this matches vanilla JS structure)
        dispatch({
          type: 'ADD_TEACHER_TO_SUBJECT',
          payload: {
            courseName: fullCourseName,
            teacherName: processedTeacherName,
            slots: teacherData.slots.trim().toUpperCase(),
            venue: teacherData.venue.trim().toUpperCase() || 'VENUE',
            color: color
          }
        });

        // Also add to legacy teacher structure for compatibility
        const newTeacher = {
          name: processedTeacherName,
          slot: teacherData.slots.trim().toUpperCase(),
          venue: teacherData.venue.trim().toUpperCase() || 'VENUE',
          color: color,
          course: selectedCourse,
        };

        dispatch({
          type: 'ADD_TEACHER',
          payload: { courseCode: selectedCourse, teacher: newTeacher }
        });

        addedCount++;
      });

      // Show success/error message
      if (addedCount > 0) {
        setError(`✅ Successfully added ${addedCount} teacher${addedCount > 1 ? 's' : ''}${skippedCount > 0 ? ` (⚠️ ${skippedCount} skipped due to invalid data)` : ''}`);
      } else {
        setMultipleError('❌ No valid teachers found in the provided data. Please check the format.');
      }

      // Close modal and clear form if successful
      if (addedCount > 0) {
        // Close modal using Bootstrap API
        if (bootstrapModalRef.current) {
          bootstrapModalRef.current.hide();
        }
        setMultipleTeachersText('');
        setMultipleError('');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setError('');
        }, 5000);
      }

    } catch (err) {
      console.error('Error processing multiple teachers:', err);
      setMultipleError('Error processing teacher data. Please check the format and try again.');
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div>
          <h4 style={{ padding: '4.5%', paddingBottom: '0' }}>
            Add Teachers
          </h4>
          <hr />
        </div>
        
        <div
          style={{
            margin: '4.5%',
            paddingTop: '10px',
            paddingBottom: '0',
            paddingRight: '0%',
            flex: '1',
          }}
        >
          {/* Course Select */}
          <label htmlFor="course-select-add-teacher">
            &nbsp;Course&nbsp;
            <a
              id="course_link"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Navigate to add course
              }}
            >
              Add Courses
            </a>
          </label>
          <select
            id="course-select-add-teacher"
            className="form-select"
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
          >
            <option value="">Select a course</option>
            {state.courses.map((course) => (
              <option key={course.code} value={course.code}>
                {course.code} - {course.name}
              </option>
            ))}
          </select>
          <br />

          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <div style={{ width: '72%' }}>
              <label htmlFor="teacher-input_remove">
                &nbsp;Teacher Name
              </label>
              <input
                type="text"
                className="form-control"
                id="teacher-input_remove"
                placeholder="KIM JONG UN"
                autoComplete="off"
                value={teacherName}
                onChange={(e) => setTeacherName(removeDotsLive(e.target.value))}
              />
            </div>
            <div style={{ width: '2%' }}></div>
            <div style={{ width: '26%' }}>
              <label htmlFor="color1-select">
                &nbsp;Color
              </label>
              <select
                id="color1-select"
                className="form-select"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                {colors.map((colorOption) => (
                  <option
                    key={colorOption.value}
                    value={colorOption.value}
                    style={{ backgroundColor: colorOption.value }}
                  >
                    {colorOption.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <div style={{ width: '58%' }}>
              <label
                style={{ marginTop: '15px' }}
                htmlFor="slot-input"
              >
                &nbsp;Slots
              </label>
              <input
                id="slot-input"
                className="form-control text-uppercase"
                type="text"
                style={{ maxWidth: '100%' }}
                autoComplete="off"
                placeholder="A1+TA1"
                value={slot}
                onChange={(e) => setSlot(removeSlotSplCharLive(e.target.value))}
              />
            </div>

            <div style={{ width: '10%' }}></div>

            <div style={{ width: '30%' }}>
              <label
                style={{ marginTop: '15px' }}
                htmlFor="venue-input"
              >
                &nbsp;Venue
              </label>
              <input
                id="venue-input"
                className="form-control text-uppercase"
                type="text"
                style={{ maxWidth: '100%' }}
                autoComplete="off"
                placeholder="SJTG01"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className={`alert ${error.includes('✅') ? 'alert-success' : 'alert-danger'} mt-2`} role="alert">
              {error}
            </div>
          )}

          <br />
          <hr />
        </div>
        
        <div className="modal-footer" style={{ marginTop: 'auto' }}>
          <button
            className="btn btn-success"
            type="button"
            onClick={handleAddMultiple}
          >
            <i className="fas fa-plus"></i>
            <span>{  }Add Multiple</span>
          </button>
          &nbsp;
          <button
            style={{ width: '30%' }}
            type="submit"
            className="btn btn-primary"
          >
            Save
          </button>
        </div>
      </form>

      {/* Add Multiple Teachers Modal - Bootstrap Modal */}
      <div 
        ref={modalRef}
        id="multiple-teacher-modal"
        className="modal fade" 
        tabIndex={-1} 
        aria-labelledby="multiple-teacher-modal-label"
        aria-hidden="true"
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="multiple-teacher-modal-label">Add Multiple Teachers</h5>
              <button
                type="button"
                className="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info">
                <strong>How to use this feature:</strong>
                <ol className="mb-0 mt-2">
                  <li>Log in to VTOP</li>
                  <li>
                    Navigate to <strong>Academics</strong> → <strong>Course Registration Allocation</strong>
                  </li>
                  <li>Find the course you want to add teachers for</li>
                  <li>Select and copy the table data (including slots, venue, and faculty columns)</li>
                  <li>Paste it in the text area below</li>
                </ol>
              </div>
              
              <div className="alert alert-warning">
                <strong>Expected format:</strong> Each line should contain slots, venue, and faculty name separated by tabs.
                <br />
                <small>Example: A1+TA1&nbsp;&nbsp;&nbsp;&nbsp;SJTG101&nbsp;&nbsp;&nbsp;&nbsp;JOHN DOE</small>
              </div>
              
              <label htmlFor="teachers-multiple-input"><strong>Paste VTOP Data Here:</strong></label>
              <textarea
                className="form-control"
                id="teachers-multiple-input"
                placeholder="Copy the list from your VTOP course allocation and paste it here. And boom! All added at once."
                autoComplete="off"
                value={multipleTeachersText}
                onChange={(e) => setMultipleTeachersText(e.target.value)}
              ></textarea>

              {multipleError && (
                <div className="alert alert-danger mt-2" role="alert">
                  {multipleError}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                data-bs-dismiss="modal"
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={processMultipleTeachers}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Fallback React State Modal */}
      {showModalFallback && (
        <div 
          className="modal fade show" 
          style={{ 
            display: 'block', 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1055
          }}
          tabIndex={-1} 
          aria-labelledby="fallback-multiple-teacher-modal-label"
          aria-hidden="false"
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="fallback-multiple-teacher-modal-label">Add Multiple Teachers (Fallback)</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModalFallback(false)}
                  aria-label="Close"
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-info">
                  <strong>How to use this feature:</strong>
                  <ol className="mb-0 mt-2">
                    <li>Log in to VTOP</li>
                    <li>
                      Navigate to <strong>Academics</strong> → <strong>Course Registration Allocation</strong>
                    </li>
                    <li>Find the course you want to add teachers for</li>
                    <li>Select and copy the table data (including slots, venue, and faculty columns)</li>
                    <li>Paste it in the text area below</li>
                  </ol>
                </div>
                
                <div className="alert alert-warning">
                  <strong>Expected format:</strong> Each line should contain slots, venue, and faculty name separated by tabs.
                  <br />
                  <small>Example: A1+TA1&nbsp;&nbsp;&nbsp;&nbsp;SJTG101&nbsp;&nbsp;&nbsp;&nbsp;JOHN DOE</small>
                </div>
                
                <label htmlFor="teachers-multiple-input-fallback"><strong>Paste VTOP Data Here:</strong></label>
                <textarea
                  className="form-control"
                  id="teachers-multiple-input-fallback"
                  placeholder="Copy the list from your VTOP course allocation and paste it here. And boom! All added at once."
                  autoComplete="off"
                  value={multipleTeachersText}
                  onChange={(e) => setMultipleTeachersText(e.target.value)}
                ></textarea>

                {multipleError && (
                  <div className="alert alert-danger mt-2" role="alert">
                    {multipleError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModalFallback(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    processMultipleTeachers();
                    setShowModalFallback(false);
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}