'use client';

import { useState, useEffect } from 'react';
import { useFFCS } from '@/context/FFCSContext';

interface EditTeacherFormProps {
  onSuccess: () => void;
}

export default function EditTeacherForm({ onSuccess }: EditTeacherFormProps) {
  const { state, dispatch } = useFFCS();
  const [courseName, setCourseName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [slot, setSlot] = useState('');
  const [venue, setVenue] = useState('');
  const [color, setColor] = useState('rgb(255, 228, 135)');
  const [error, setError] = useState('');
  const [currentTeacher, setCurrentTeacher] = useState<any>(null);
  const [currentCourse, setCurrentCourse] = useState<any>(null);

  const colors = [
    { value: 'rgb(214, 255, 214)', name: 'Green' },
    { value: 'rgb(255, 228, 135)', name: 'Orange' },
    { value: 'rgb(255, 205, 205)', name: 'Red' },
  ];

  useEffect(() => {
    // Find the teacher being edited
    if (state.editMode.editingTeacherId) {
      const [courseCode, teacherNameToFind] = state.editMode.editingTeacherId.split('-');
      const course = state.courses.find(c => c.code === courseCode);
      if (course) {
        const teacher = course.teachers.find(t => t.name === teacherNameToFind);
        if (teacher) {
          setCurrentCourse(course);
          setCurrentTeacher(teacher);
          setCourseName(`${course.code} - ${course.name}`);
          setTeacherName(teacher.name);
          setSlot(teacher.slot);
          setVenue(teacher.venue);
          setColor(teacher.color);
        }
      }
    }
  }, [state.editMode.editingTeacherId, state.courses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentTeacher || !currentCourse) return;

    // Validate inputs
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

    // Update teacher
    const updatedTeacher = {
      ...currentTeacher,
      name: teacherName.trim().toUpperCase(),
      slot: slot.trim().toUpperCase(),
      venue: venue.trim().toUpperCase(),
      color,
    };

    // Remove old teacher and add updated one
    dispatch({
      type: 'REMOVE_TEACHER',
      payload: { courseCode: currentCourse.code, teacherName: currentTeacher.name },
    });
    
    dispatch({
      type: 'ADD_TEACHER',
      payload: { courseCode: currentCourse.code, teacher: updatedTeacher },
    });

    // Reset form and exit edit mode
    setTeacherName('');
    setSlot('');
    setVenue('');
    setColor('rgb(255, 228, 135)');
    setError('');
    dispatch({ 
      type: 'SET_EDIT_MODE', 
      payload: { isEditingTeacher: false, editingTeacherId: undefined } 
    });
    
    onSuccess();
  };

  const handleDelete = () => {
    if (!currentTeacher || !currentCourse) return;
    
    if (confirm(`Are you sure you want to delete the teacher "${currentTeacher.name}"?`)) {
      dispatch({
        type: 'REMOVE_TEACHER',
        payload: { courseCode: currentCourse.code, teacherName: currentTeacher.name },
      });
      dispatch({ 
        type: 'SET_EDIT_MODE', 
        payload: { isEditingTeacher: false, editingTeacherId: undefined } 
      });
      onSuccess();
    }
  };

  const removeDotsLive = (value: string) => {
    return value.replace(/[.]/g, '');
  };

  const removeSlotSplCharLive = (value: string) => {
    return value.replace(/[^A-Za-z0-9+]/g, '');
  };

  if (!currentTeacher || !currentCourse) {
    return (
      <div>
        <h4 style={{ padding: '4.5%', paddingBottom: '0' }}>
          Edit Teachers
        </h4>
        <hr />
        <div className="text-center p-4">
          <p className="text-muted">No teacher selected for editing.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <h4 style={{ padding: '4.5%', paddingBottom: '0' }}>
          Edit Teachers
        </h4>
        <hr />
      </div>
      
      <div
        style={{
          margin: '4.5%',
          paddingTop: '10px',
          paddingBottom: '0',
          paddingRight: '0%',
        }}
      >
        <label htmlFor="teacher-edit-course">Course</label>
        <input
          disabled
          type="text"
          className="form-control"
          id="teacher-edit-course"
          value={courseName}
          autoComplete="off"
        />
        <br />

        <div style={{ display: 'flex', flexDirection: 'row' }}>
          <div style={{ width: '72%' }}>
            <label htmlFor="teacher-input_remove-edit">
              &nbsp;Teacher Name
            </label>
            <input
              type="text"
              className="form-control"
              id="teacher-input_remove-edit"
              placeholder="Teacher's Name"
              autoComplete="off"
              value={teacherName}
              onChange={(e) => setTeacherName(removeDotsLive(e.target.value))}
            />
          </div>
          <div style={{ width: '2%' }}></div>
          <div style={{ width: '26%' }}>
            <label htmlFor="color1-select-edit">
              &nbsp;Color
            </label>
            <select
              id="color1-select-edit"
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
              htmlFor="slot-input-edit"
            >
              &nbsp;Slots
            </label>
            <input
              id="slot-input-edit"
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
              htmlFor="venue-input-edit"
            >
              &nbsp;Venue
            </label>
            <input
              id="venue-input-edit"
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
      
      <div className="modal-footer">
        <button
          type="button"
          className="btn btn-danger"
          onClick={handleDelete}
        >
          Delete
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
  );
}