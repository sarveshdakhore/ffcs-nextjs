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
    <div>
      <h4 style={{ padding: '4.5%', paddingBottom: '0' }}>
        Add Course
      </h4>
      <hr />
      
      <form onSubmit={handleSubmit}>
        <div
          style={{
            margin: '4.5%',
            paddingTop: '10px',
            paddingBottom: '0',
            paddingRight: '0%',
          }}
          className="modal-body"
        >
          <label htmlFor="course-input_remove">
            &nbsp;Course
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
          <div
            style={{
              color: 'blue',
              opacity: '50%',
              marginTop: '-5px',
            }}
          >
            &nbsp;Course Code & Name Separated by&nbsp;
            <b
              style={{
                color: 'rgb(255, 0, 0)',
                fontWeight: '700',
                fontSize: '20px',
                marginTop: '100px',
              }}
            >
              -
            </b>
          </div>

          <label
            style={{ marginTop: '15px' }}
            htmlFor="credits-input"
          >
            &nbsp;Credits
          </label>
          <input
            id="credits-input"
            className="form-control text-uppercase"
            type="number"
            style={{ maxWidth: '25%' }}
            autoComplete="off"
            placeholder="4"
            min="0"
            max="30"
            step="0.5"
            value={creditsInput}
            onChange={(e) => setCreditsInput(e.target.value)}
          />
          
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
            style={{ width: '30%' }}
            type="submit"
            className="btn btn-primary"
          >
            Save
          </button>
        </div>
      </form>
    </div>
  );
}