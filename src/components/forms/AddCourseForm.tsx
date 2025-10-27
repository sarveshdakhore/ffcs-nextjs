'use client';

import { useState } from 'react';
import { useFFCS } from '@/context/FFCSContext';

interface AddCourseFormProps {
  onSuccess: () => void;
}

export default function AddCourseForm({ onSuccess }: AddCourseFormProps) {
  const { dispatch } = useFFCS();
  const [courseInput, setCourseInput] = useState('');
  const [creditsInput, setCreditsInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
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

    // Create new course
    const newCourse = {
      code,
      name,
      credits: Number(creditsInput),
      teachers: [],
    };

    // Add course to state
    dispatch({ type: 'ADD_COURSE', payload: newCourse });

    // Reset form
    setCourseInput('');
    setCreditsInput('');
    setError('');
    
    // Call success callback
    onSuccess();
  };

  const removeDotsLive = (value: string) => {
    // Remove dots and other unwanted characters
    return value.replace(/[.]/g, '');
  };

  return (
    <form onSubmit={handleSubmit} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ color: 'white', fontWeight: '600', margin: 0, fontSize: '1.25rem' }}>
          Add Course
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
          <label htmlFor="course-input_remove" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
            Course
          </label>
          <input
            type="text"
            className="form-control"
            id="course-input_remove"
            placeholder="CSE1001 - Problem Solving and Programming"
            autoComplete="off"
            value={courseInput}
            onChange={(e) => setCourseInput(removeDotsLive(e.target.value))}
          />
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.85rem', marginTop: '0.25rem' }}>
            Course Code & Name Separated by <b style={{ color: '#ff6b6b' }}>-</b>
          </div>
        </div>

        <div>
          <label htmlFor="credits-input" style={{ color: 'white', fontWeight: '500', marginBottom: '0.25rem', display: 'block' }}>
            Credits
          </label>
          <input
            id="credits-input"
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
          type="submit"
          className="btn btn-primary btn-sm"
        >
          Save
        </button>
      </div>
    </form>
  );
}