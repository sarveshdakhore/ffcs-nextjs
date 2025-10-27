'use client';

import { useState, useEffect, useRef } from 'react';
import { useFFCS } from '@/context/FFCSContext';
import {
  parseTextToListForMultipleAdd,
  validateTeacherData,
  processTeacherName,
  checkTeacherAndSlotsMatch
} from '@/utils/teacherUtils';

export default function AddTeacherForm() {
  const { state, dispatch } = useFFCS();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [slot, setSlot] = useState('');
  const [venue, setVenue] = useState('');
  const [color, setColor] = useState('#4a2c0f'); // Default very dark orange (better contrast)
  const [error, setError] = useState('');
  const [multipleTeachersText, setMultipleTeachersText] = useState('');
  const [multipleError, setMultipleError] = useState('');
  const [showModalFallback, setShowModalFallback] = useState(false);
  
  // Ref for the modal element
  const modalRef = useRef<HTMLDivElement>(null);
  const bootstrapModalRef = useRef<any>(null);

  const colors = [
    { value: '#0d3320', name: 'Green' },
    { value: '#4a2c0f', name: 'Orange' },
    { value: '#3d1a1a', name: 'Red' },
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
    setColor('#4a2c0f');
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
      let mergedCount = 0;

      // Find the course or create a generic name
      const courseObj = state.courses.find(course => course.code === selectedCourse);
      const courseName = courseObj?.name || 'Unknown Course';

      // IMPORTANT: Check if subject already exists with exact key to avoid duplicates
      // Subjects could be stored in various formats:
      // 1. "CODE-Name" (with code)
      // 2. "CODE - Name" (with code and spaces)
      // 3. "Name" (without code - manually added courses)
      // 4. Just "CODE" (edge case)
      let fullCourseName = '';
      const possibleKeys = [
        `${selectedCourse}-${courseName}`,     // "BMAT202L-Probability"
        `${selectedCourse} - ${courseName}`,   // "BMAT202L - Probability"
        courseName,                             // "Probability" (no code)
        selectedCourse,                         // "BMAT202L" (just code)
        `${courseName}-${selectedCourse}`,     // "Probability-BMAT202L" (reversed)
      ];

      // Find existing subject key
      for (const key of possibleKeys) {
        if (state.activeTable.subject[key]) {
          fullCourseName = key;
          break;
        }
      }

      // If not found, use standard format based on what we have
      if (!fullCourseName) {
        if (selectedCourse && courseName && selectedCourse !== courseName) {
          // Have both code and name: use "CODE-Name" format
          fullCourseName = `${selectedCourse}-${courseName}`;
        } else if (courseName) {
          // Only have name: use just the name
          fullCourseName = courseName;
        } else {
          // Fallback: use code
          fullCourseName = selectedCourse;
        }
      }

      console.log(`\n📚 [ADD MULTIPLE] Processing for course: "${fullCourseName}"`);
      console.log(`   - Selected course code: ${selectedCourse}`);
      console.log(`   - Course name: ${courseName}`);
      console.log(`   - Already exists: ${!!state.activeTable.subject[fullCourseName]}`);

      // Get current teachers for the course (for smart slot matching)
      // IMPORTANT: Must read BEFORE dispatching ADD_SUBJECT to handle state sync correctly
      let currentTeachers = state.activeTable.subject[fullCourseName]?.teacher || {};

      // Ensure the course exists in subject data (add if it doesn't exist)
      if (!state.activeTable.subject[fullCourseName]) {
        console.log(`   ➕ Adding new subject to state`);
        dispatch({
          type: 'ADD_SUBJECT',
          payload: {
            courseName: fullCourseName,
            credits: courseObj?.credits || 0
          }
        });
        // Initialize empty teachers object for local tracking since state won't update until next render
        currentTeachers = {};
        console.log(`   🔧 Initialized local currentTeachers tracking object`);
      }

      console.log(`   - Existing teachers: ${Object.keys(currentTeachers).length}`);

      // Process each teacher
      teacherList.forEach((teacherData, index) => {
        console.log(`\n👤 [TEACHER ${index + 1}] Processing: ${teacherData.faculty}`);
        console.log(`   - Slots: ${teacherData.slots}`);
        console.log(`   - Venue: ${teacherData.venue}`);

        // Validate teacher data
        if (!validateTeacherData(teacherData)) {
          console.log(`   ❌ Validation failed - skipping`);
          skippedCount++;
          return;
        }

        // Process teacher name (add (E) for evening classes if needed)
        let processedTeacherName = processTeacherName(
          teacherData.faculty.trim().toUpperCase(),
          teacherData.slots.trim().toUpperCase()
        );

        const slotString = teacherData.slots.trim().toUpperCase();
        console.log(`   - Processed name: ${processedTeacherName}`);
        console.log(`   - Processed slots: ${slotString}`);

        // Create update callback for slot merging
        const updateCallback = (courseName: string, teacherName: string, newSlots: string) => {
          console.log(`   🔄 [UPDATE CALLBACK] Merging slots for ${teacherName}: ${newSlots}`);
          dispatch({
            type: 'UPDATE_TEACHER_SLOTS',
            payload: {
              courseName,
              teacherName,
              newSlots
            }
          });

          // CRITICAL: Update currentTeachers object for next iteration
          // This ensures the next teacher can see the merged slots
          currentTeachers[teacherName] = {
            ...currentTeachers[teacherName],
            slots: newSlots
          };
          console.log(`   🔄 Updated currentTeachers[${teacherName}].slots = "${newSlots}"`);

          mergedCount++;
        };

        console.log(`   🔍 Checking for duplicates/merge opportunities...`);
        console.log(`   📋 Current teachers: ${Object.keys(currentTeachers).join(', ')}`);

        // Smart teacher and slot matching logic
        const matchResult = checkTeacherAndSlotsMatch(
          fullCourseName,
          processedTeacherName,
          slotString,
          currentTeachers,
          updateCallback
        );

        console.log(`   📊 Match result:`, matchResult);

        // Handle the result
        if (matchResult === false) {
          // Duplicate - skip
          console.log(`   ⏭️  Duplicate detected - skipping`);
          skippedCount++;
          return;
        } else if (matchResult === true) {
          // Merged successfully - already handled by updateCallback
          console.log(`   ✅ Merged successfully (currentTeachers updated in callback)`);
          return;
        } else {
          // Use unique name (could be "Teacher 2", "Teacher 3", etc.)
          console.log(`   📝 Using unique name: ${matchResult}`);
          processedTeacherName = matchResult;
        }

        // Add new teacher with unique name
        console.log(`   ➕ Adding new teacher to subject...`);
        dispatch({
          type: 'ADD_TEACHER_TO_SUBJECT',
          payload: {
            courseName: fullCourseName,
            teacherName: processedTeacherName,
            slots: slotString,
            venue: teacherData.venue.trim().toUpperCase() || 'VENUE',
            color: color
          }
        });

        // Also add to legacy teacher structure for compatibility
        const newTeacher = {
          name: processedTeacherName,
          slot: slotString,
          venue: teacherData.venue.trim().toUpperCase() || 'VENUE',
          color: color,
          course: selectedCourse,
        };

        dispatch({
          type: 'ADD_TEACHER',
          payload: { courseCode: selectedCourse, teacher: newTeacher }
        });

        // CRITICAL: Update currentTeachers object for next iteration
        // This ensures subsequent teachers can see this newly added teacher
        currentTeachers[processedTeacherName] = {
          slots: slotString,
          venue: teacherData.venue.trim().toUpperCase() || 'VENUE',
          color: color
        };
        console.log(`   🔄 Updated currentTeachers[${processedTeacherName}].slots = "${slotString}"`);

        addedCount++;
        console.log(`   ✅ Teacher added successfully (total added: ${addedCount})`);
      });

      // Show success/error message
      const totalProcessed = addedCount + mergedCount;
      if (totalProcessed > 0) {
        let message = `✅ Successfully processed ${totalProcessed} teacher${totalProcessed > 1 ? 's' : ''}`;
        if (addedCount > 0) {
          message += ` (${addedCount} added`;
          if (mergedCount > 0) {
            message += `, ${mergedCount} merged`;
          }
          message += ')';
        } else if (mergedCount > 0) {
          message = `✅ Successfully merged ${mergedCount} teacher${mergedCount > 1 ? 's' : ''}`;
        }
        if (skippedCount > 0) {
          message += ` ⚠️ ${skippedCount} skipped (duplicate or invalid data)`;
        }
        setError(message);
      } else {
        setMultipleError('❌ No valid teachers found in the provided data. Please check the format.');
      }

      // Close modal and clear form if successful
      if (totalProcessed > 0) {
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
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ color: 'white', fontWeight: '600', margin: 0, fontSize: '1.25rem' }}>
            Add Teachers
          </h4>
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            flex: '1',
          }}
        >
          {/* Course Select */}
          <div>
            <label htmlFor="course-select-add-teacher" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
              Course
            </label>
            <select
              id="course-select-add-teacher"
              className="form-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">Select Course</option>
              {state.courses.map((course) => (
                <option key={course.code} value={course.code}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row' }}>
            <div style={{ width: '72%' }}>
              <label htmlFor="teacher-input_remove" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                Teacher Name
              </label>
              <input
                type="text"
                className="form-control"
                id="teacher-input_remove"
                placeholder="Teacher's Name"
                autoComplete="off"
                value={teacherName}
                onChange={(e) => setTeacherName(removeDotsLive(e.target.value))}
              />
            </div>
            <div style={{ width: '2%' }}></div>
            <div style={{ width: '26%' }}>
              <label htmlFor="color1-select" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                Color
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
                  >
                    {colorOption.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <div style={{ flex: '1' }}>
              <label htmlFor="slot-input" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                Slots
              </label>
              <input
                id="slot-input"
                className="form-control text-uppercase"
                type="text"
                autoComplete="off"
                placeholder="A1+TA1"
                value={slot}
                onChange={(e) => setSlot(removeSlotSplCharLive(e.target.value))}
              />
            </div>

            <div style={{ flex: '0 0 200px' }}>
              <label htmlFor="venue-input" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
                Venue
              </label>
              <input
                id="venue-input"
                className="form-control text-uppercase"
                type="text"
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

        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <button
            className="btn btn-success btn-sm"
            type="button"
            onClick={handleAddMultiple}
          >
            <i className="fas fa-plus"></i>
            <span>&nbsp;&nbsp;Add Multiple</span>
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
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
