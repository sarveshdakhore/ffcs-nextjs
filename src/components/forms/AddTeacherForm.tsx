'use client';

import { useState } from 'react';
import { useFFCS } from '@/context/FFCSContext';

export default function AddTeacherForm() {
  const { state, dispatch } = useFFCS();
  const [selectedCourse, setSelectedCourse] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [slot, setSlot] = useState('');
  const [venue, setVenue] = useState('');
  const [color, setColor] = useState('rgb(255, 228, 135)'); // Default orange
  const [error, setError] = useState('');
  const [showMultipleModal, setShowMultipleModal] = useState(false);

  const colors = [
    { value: 'rgb(214, 255, 214)', name: 'Green' },
    { value: 'rgb(255, 228, 135)', name: 'Orange' },
    { value: 'rgb(255, 205, 205)', name: 'Red' },
  ];

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

  const handleAddMultiple = () => {
    setShowMultipleModal(true);
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
            <div className="alert alert-danger mt-2" role="alert">
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

      {/* Add Multiple Teachers Modal */}
      {showMultipleModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Multiple Teachers</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowMultipleModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <ol>
                  <li>Log in to VTOP.</li>
                  <li>
                    Click <strong>Academics</strong> &gt;&nbsp;
                    <strong>Course Registration Allocation</strong>.
                  </li>
                  <li>Highlight and copy the list of teachers.</li>
                  <li>Paste the list here.</li>
                </ol>
                <label htmlFor="teachers-multiple-input">Paste Here</label>
                <textarea
                  className="form-control"
                  id="teachers-multiple-input"
                  placeholder="Copy the list from your VTOP course allocation and paste it here. And boom! All added at once."
                  autoComplete="off"
                ></textarea>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMultipleModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    // Process multiple teachers
                    const textarea = document.getElementById('teachers-multiple-input') as HTMLTextAreaElement;
                    const text = textarea?.value;
                    if (text) {
                      // Parse the VTOP data and create teachers
                      // This would need proper parsing logic based on VTOP format
                      console.log('Processing multiple teachers:', text);
                    }
                    setShowMultipleModal(false);
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