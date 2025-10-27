'use client';

import { useState, useEffect } from 'react';
import { useFFCS } from '@/context/FFCSContext';

interface EditCourseFormProps {
  onSuccess: () => void;
}

export default function EditCourseForm({ onSuccess }: EditCourseFormProps) {
  const { state, dispatch } = useFFCS();
  const [courseInput, setCourseInput] = useState('');
  const [creditsInput, setCreditsInput] = useState('');
  const [error, setError] = useState('');
  const [currentCourse, setCurrentCourse] = useState<any>(null);

  useEffect(() => {
    // Find the course being edited
    if (state.editMode.editingCourseId) {
      const course = state.courses.find(c => c.code === state.editMode.editingCourseId);
      if (course) {
        setCurrentCourse(course);
        setCourseInput(`${course.code} - ${course.name}`);
        setCreditsInput(course.credits.toString());
      }
    }
  }, [state.editMode.editingCourseId, state.courses]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!currentCourse) return;

    // Validate inputs
    if (!courseInput.trim()) {
      setError('Course name is required');
      return;
    }

    if (!creditsInput.trim() || isNaN(Number(creditsInput)) || Number(creditsInput) <= 0) {
      setError('Valid credits value is required');
      return;
    }

    // Parse course input (format: "CSE1001 - Problem Solving and Programming")
    const parts = courseInput.split(' - ');
    if (parts.length !== 2) {
      setError('Course format should be: CODE - NAME (e.g., CSE1001 - Problem Solving)');
      return;
    }

    const [code, name] = parts.map(part => part.trim());

    if (!code || !name) {
      setError('Both course code and name are required');
      return;
    }

    // Update course
    const updatedCourse = {
      ...currentCourse,
      code,
      name,
      credits: Number(creditsInput),
    };

    dispatch({ type: 'UPDATE_COURSE', payload: updatedCourse });

    // Reset form and exit edit mode
    setCourseInput('');
    setCreditsInput('');
    setError('');
    dispatch({ type: 'SET_EDIT_MODE', payload: { isEditingCourse: false, editingCourseId: undefined } });
    
    onSuccess();
  };

  const handleDelete = () => {
    if (!currentCourse) return;
    
    if (confirm(`Are you sure you want to delete the course "${currentCourse.name}"?`)) {
      dispatch({ type: 'REMOVE_COURSE', payload: currentCourse.code });
      dispatch({ type: 'SET_EDIT_MODE', payload: { isEditingCourse: false, editingCourseId: undefined } });
      onSuccess();
    }
  };

  const removeDotsLive = (value: string) => {
    return value.replace(/[.]/g, '');
  };

  if (!currentCourse) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ color: 'white', fontWeight: '600', margin: 0, fontSize: '1.25rem' }}>
            Edit Course
          </h4>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)' }}>No course selected for editing.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ color: 'white', fontWeight: '600', margin: 0, fontSize: '1.25rem' }}>
          Edit Course
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
        <div>
          <label htmlFor="course-input_edit" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
            Course Name
          </label>
          <input
            type="text"
            className="form-control"
            id="course-input_edit"
            placeholder="CSE1001 - Problem Solving and Programming"
            autoComplete="off"
            value={courseInput}
            onChange={(e) => setCourseInput(removeDotsLive(e.target.value))}
          />
        </div>

        <div>
          <label htmlFor="credits-input-edit" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
            Credits
          </label>
          <input
            id="credits-input-edit"
            className="form-control"
            type="number"
            style={{ maxWidth: '150px' }}
            autoComplete="off"
            placeholder="4"
            min="0"
            max="30"
            step="0.5"
            value={creditsInput}
            onChange={(e) => setCreditsInput(e.target.value)}
          />
        </div>

        {error && (
          <div className="alert alert-danger mt-2" role="alert">
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={handleDelete}
        >
          Delete
        </button>
        <button
          type="submit"
          className="btn btn-primary btn-sm"
        >
          Save
        </button>
      </div>
    </form>
  );
}