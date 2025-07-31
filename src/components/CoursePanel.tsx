'use client';

import React, { useState, useEffect } from 'react';
import { useFFCS } from '@/context/FFCSContext';
import { activateSortable, deactivateSortable } from '@/utils/sortableUtils';
import { 
  processRawCourseName, 
  parseCreditValue,
  removeDotsLive,
  getCourseCodeAndCourseTitle,
  removeSlotSplCharLive,
  cleanSlotString,
  slotsProcessingForCourseList,
  isSlotExist,
  isMorningTheory,
  isCommonSlot,
  subtractArray,
  updateSlots,
  getSlotsOfCourse
} from '@/utils/timetableHelpers';
import { CourseData } from '@/context/FFCSContext';

export default function CoursePanel() {
  const { state, dispatch } = useFFCS();
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(true);
  const [showEditCourse, setShowEditCourse] = useState(false);
  const [showEditTeacher, setShowEditTeacher] = useState(false);
  
  // Form states
  const [courseName, setCourseName] = useState('');
  const [credits, setCredits] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [slots, setSlots] = useState('');
  const [venue, setVenue] = useState('');
  const [color, setColor] = useState('rgb(255, 228, 135)'); // Default orange
  
  // Edit states
  const [editingCourse, setEditingCourse] = useState('');
  const [editingTeacher, setEditingTeacher] = useState('');
  const [editCourseName, setEditCourseName] = useState('');
  const [editCredits, setEditCredits] = useState('');
  const [editTeacherName, setEditTeacherName] = useState('');
  const [editSlots, setEditSlots] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editColor, setEditColor] = useState('');
  
  // Success/error messages
  const [courseMessage, setCourseMessage] = useState({ text: '', color: '' });
  const [teacherMessage, setTeacherMessage] = useState({ text: '', color: '' });

  const activeTable = state.activeTable;
  const subjects = activeTable.subject || {};

  // Sort teachers by color priority (Green > Orange > Red) and clash status (EXACTLY like vanilla JS)
  const sortTeachersByColor = (teachers: { [key: string]: any }, courseName: string): [string, any][] => {
    const teacherEntries = Object.entries(teachers);
    
    // Get data based on mode (normal vs attack)
    const dataToCheck = state.ui.attackMode ? activeTable.attackData : activeTable.data;
    
    // Following vanilla JS rearrangeTeacherLiInSubjectArea logic EXACTLY
    let slotsOfCourse: string[];
    let activeSlots: string[];
    
    if (state.ui.attackMode) {
      slotsOfCourse = getCourseSlotsAttack(courseName, activeTable.attackData);
      activeSlots = slotsForAttack(activeTable.attackData);
    } else {
      slotsOfCourse = getSlotsOfCourse(courseName, activeTable.data);
      activeSlots = getSlots(activeTable.data);
    }
    
    // This is the KEY: subtract current course slots from all selected slots
    const consideredSlots = subtractArray(slotsOfCourse, activeSlots);
    
    const colorPriority = {
      'rgb(214, 255, 214)': 1, // Green - highest priority
      'rgb(255, 228, 135)': 2, // Orange - medium priority  
      'rgb(255, 205, 205)': 3, // Red - lowest priority
    };
    
    return teacherEntries.sort(([teacherNameA, teacherDataA], [teacherNameB, teacherDataB]) => {
      // Check for slot clashes using EXACT vanilla JS logic
      const teacherSlotsA = slotsProcessingForCourseList(teacherDataA.slots);
      const teacherSlotsB = slotsProcessingForCourseList(teacherDataB.slots);
      
      const hasClashA = isCommonSlot(teacherSlotsA, consideredSlots);
      const hasClashB = isCommonSlot(teacherSlotsB, consideredSlots);
      
      // Non-clashing teachers come first
      if (hasClashA && !hasClashB) return 1;
      if (!hasClashA && hasClashB) return -1;
      
      // If both have same clash status, sort by color priority
      const priorityA = colorPriority[teacherDataA.color as keyof typeof colorPriority] || 4;
      const priorityB = colorPriority[teacherDataB.color as keyof typeof colorPriority] || 4;
      
      return priorityA - priorityB;
    });
  };
  

  // Check if a teacher is selected (in the timetable data or attack data)
  const isTeacherSelected = (courseName: string, teacherName: string): boolean => {
    const dataToCheck = state.ui.attackMode ? activeTable.attackData : activeTable.data;
    return dataToCheck.some((course) => {
      const courseFullName = course.courseCode ? 
        `${course.courseCode}-${course.courseTitle}` : 
        course.courseTitle;
      return courseFullName === courseName && course.faculty === teacherName;
    });
  };

  // Get all selected slots from timetable data (normal or attack mode)
  // Get selected slots (wrapper for vanilla JS functions)
  const getSelectedSlots = (): string[] => {
    const dataToCheck = state.ui.attackMode ? activeTable.attackData : activeTable.data;
    return state.ui.attackMode ? slotsForAttack(dataToCheck) : getSlots(dataToCheck);
  };

  // Refresh clash status for all teachers (like rearrangeTeacherRefresh in vanilla JS)
  const rearrangeTeacherRefresh = () => {
    // This will trigger a re-render which updates clash status for all teachers
    // The sortTeachersByColor function already handles clash detection properly
    triggerUpdate(); // Force component re-render to update clash status
  };

  // Force component update (similar to re-rendering in vanilla JS)
  const [, forceUpdate] = useState({});
  const triggerUpdate = () => forceUpdate({});

  // Handle teacher click for selection/deselection (with radio button integration)
  const handleTeacherClick = (courseName: string, teacherName: string, teacherData: any) => {
    const isSelected = isTeacherSelected(courseName, teacherName);
    
    if (isSelected) {
      // Remove from timetable or attack data (removeRadioFalse logic)
      const dataToCheck = state.ui.attackMode ? activeTable.attackData : activeTable.data;
      const courseToRemove = dataToCheck.find((course) => {
        const courseFullName = course.courseCode ? 
          `${course.courseCode}-${course.courseTitle}` : 
          course.courseTitle;
        return courseFullName === courseName && course.faculty === teacherName;
      });

      if (courseToRemove) {
        if (state.ui.attackMode) {
          dispatch({
            type: 'REMOVE_COURSE_FROM_ATTACK_DATA',
            payload: courseToRemove.courseId
          });
        } else {
          dispatch({
            type: 'REMOVE_COURSE_FROM_TIMETABLE',
            payload: courseToRemove.courseId
          });
        }
        // Refresh clash status after removal
        setTimeout(() => rearrangeTeacherRefresh(), 0);
      }
    } else {
      // First remove any existing selection for this course (only one teacher per course)
      const dataToCheck = state.ui.attackMode ? activeTable.attackData : activeTable.data;
      const existingCourse = dataToCheck.find((course) => {
        const courseFullName = course.courseCode ? 
          `${course.courseCode}-${course.courseTitle}` : 
          course.courseTitle;
        return courseFullName === courseName;
      });
      
      if (existingCourse) {
        if (state.ui.attackMode) {
          dispatch({
            type: 'REMOVE_COURSE_FROM_ATTACK_DATA',
            payload: existingCourse.courseId
          });
        } else {
          dispatch({
            type: 'REMOVE_COURSE_FROM_TIMETABLE',
            payload: existingCourse.courseId
          });
        }
      }

      // Add to timetable (addOnRadioTrue logic)
      const [courseCode, courseTitle] = getCourseCodeAndCourseTitle(courseName);
      const credits = subjects[courseName]?.credits || 0;
      const slots = slotsProcessingForCourseList(teacherData.slots);
      
      // Check for slot clashes only in attack mode (using vanilla JS logic)
      if (state.ui.attackMode) {
        const slotsOfCourse = getCourseSlotsAttack(courseName, activeTable.attackData);
        const activeSlots = slotsForAttack(activeTable.attackData);
        const consideredSlots = subtractArray(slotsOfCourse, activeSlots);
        const hasClash = isCommonSlot(slots, consideredSlots);
        
        if (hasClash) {
          // In attack mode, prevent clash selection
          const clashingSlots = slots.filter(slot => consideredSlots.includes(slot));
          alert(`Slot clash detected! The following slots conflict with your current selection: ${clashingSlots.join(', ')}`);
          return;
        }
      }
      // In normal mode, allow clash selection for visualization

      // Generate courseId
      let courseId = 0;
      const currentData = state.ui.attackMode ? activeTable.attackData : activeTable.data;
      if (currentData.length > 0) {
        const lastCourse = currentData[currentData.length - 1];
        courseId = lastCourse.courseId + 1;
      }

      const courseData: CourseData = {
        courseId,
        courseTitle: courseTitle || courseName,
        faculty: teacherName,
        slots,
        venue: teacherData.venue,
        credits,
        isProject: false,
        courseCode: courseCode || ''
      };

      if (state.ui.attackMode) {
        dispatch({
          type: 'ADD_COURSE_TO_ATTACK_DATA',
          payload: courseData
        });
      } else {
        dispatch({
          type: 'ADD_COURSE_TO_TIMETABLE',
          payload: courseData
        });
      }

      // Refresh clash status after addition (like vanilla JS)
      setTimeout(() => rearrangeTeacherRefresh(), 0);

      // Auto-focus next course if enabled
      if (state.ui.autoFocusEnabled) {
        // Close current dropdown and open next
        const currentDropdown = document.querySelector(`[data-course="${courseName}"]`);
        if (currentDropdown) {
          toggleDropdown(courseName);
          // Find next course dropdown
          const allDropdowns = document.querySelectorAll('[data-course]');
          const currentIndex = Array.from(allDropdowns).indexOf(currentDropdown);
          if (currentIndex < allDropdowns.length - 1) {
            const nextCourseName = allDropdowns[currentIndex + 1].getAttribute('data-course');
            if (nextCourseName) {
              setTimeout(() => toggleDropdown(nextCourseName), 100);
            }
          }
        }
      }
    }
  };

  // Toggle dropdown
  const toggleDropdown = (courseName: string) => {
    if (!state.globalVars.editSub && !state.globalVars.editTeacher) {
      const dropdown = document.querySelector(`[data-course="${courseName}"]`)?.nextElementSibling;
      dropdown?.classList.toggle('show');
      const heading = document.querySelector(`[data-course="${courseName}"]`);
      heading?.classList.toggle('open');
    }
  };

  // Close all dropdowns
  const closeAllDropdowns = () => {
    document.querySelectorAll('.dropdown-list').forEach((list) => {
      list.classList.remove('show');
      list.previousElementSibling?.classList.remove('open');
    });
  };

  // Open all dropdowns
  const openAllDropdowns = () => {
    document.querySelectorAll('.dropdown-list').forEach((list) => {
      list.classList.add('show');
      list.previousElementSibling?.classList.add('open');
    });
  };

  // Handle course add
  const handleAddCourse = (e: React.FormEvent) => {
    e.preventDefault();
    const processedName = processRawCourseName(courseName);
    const creditValue = parseCreditValue(credits);
    
    let spanMsg = '';
    let spanMsgColor = '';

    if (processedName === '' || isNaN(creditValue) || creditValue < 0 || creditValue > 30) {
      if (processedName === '' && isNaN(creditValue)) {
        spanMsg = 'Course Name and Credits are empty';
        spanMsgColor = 'red';
      } else if (processedName === '' || processedName === undefined) {
        spanMsg = 'Course Name is empty';
        spanMsgColor = 'red';
      } else if (isNaN(creditValue)) {
        spanMsg = 'Credits is empty';
        spanMsgColor = 'red';
      } else {
        spanMsg = 'Credits should be between 0 and 30';
        spanMsgColor = 'red';
      }
      setCourseMessage({ text: spanMsg, color: spanMsgColor });
      setTimeout(() => setCourseMessage({ text: '', color: '' }), 4000);
      return;
    }

    if (subjects[processedName]) {
      spanMsg = 'Course already exists';
      spanMsgColor = 'red';
      setCourseMessage({ text: spanMsg, color: spanMsgColor });
      setTimeout(() => setCourseMessage({ text: '', color: '' }), 4000);
      return;
    }

    dispatch({
      type: 'ADD_SUBJECT',
      payload: { courseName: processedName, credits: creditValue }
    });

    spanMsg = 'Course added successfully';
    spanMsgColor = 'green';
    setCourseMessage({ text: spanMsg, color: spanMsgColor });
    setTimeout(() => setCourseMessage({ text: '', color: '' }), 4000);

    setCourseName('');
    setCredits('');
    
    // Update course select dropdown
    showAddTeacherDiv();
  };

  // Show add teacher div and refresh course select
  const showAddTeacherDiv = () => {
    setShowAddCourse(false);
    setShowAddTeacher(true);
    setShowEditCourse(false);
    setShowEditTeacher(false);
    setSlots('');
    setTeacherName('');
    setVenue('');
  };

  // Simple teacher and slots validation (simplified from vanilla JS checkTeacherAndSlotsMatch)
  const checkTeacherAndSlots = (courseName: string, teacherName: string, slotString: string): string | boolean => {
    const courseData = subjects[courseName];
    if (!courseData) return false;
    
    const teachers = courseData.teacher || {};
    const slots = slotString.split('+');
    
    // Helper function to check if slots match exactly  
    const doSlotsMatch = (teacherSlots: string[], inputSlots: string[]): boolean => {
      const lowerTeacherSlots = teacherSlots.map(s => s.toLowerCase());
      const lowerInputSlots = inputSlots.map(s => s.toLowerCase());
      return lowerInputSlots.every(slot => lowerTeacherSlots.includes(slot)) &&
             lowerTeacherSlots.every(slot => lowerInputSlots.includes(slot));
    };
    
    // Generate unique name if teacher already exists
    const generateUniqueName = (baseName: string): string | boolean => {
      let counter = 1;
      let uniqueName = baseName;
      
      while (teachers[uniqueName]) {
        // Check if existing teacher has exactly the same slots
        const existingSlots = teachers[uniqueName].slots.split('+');
        if (doSlotsMatch(existingSlots, slots)) {
          return false; // Exact same teacher and slots exist
        }
        counter++;
        uniqueName = `${baseName} ${counter}`;
      }
      
      return uniqueName;
    };
    
    return generateUniqueName(teacherName);
  };

  // Handle teacher add
  const handleAddTeacher = (e: React.FormEvent) => {
    e.preventDefault();
    
    let spanMsg = '';
    let spanMsgColor = '';

    if (!selectedCourse || selectedCourse === 'Select Course' || selectedCourse === 'You need to add courses') {
      spanMsg = 'Please select a course before adding';
      spanMsgColor = 'red';
      setTeacherMessage({ text: spanMsg, color: spanMsgColor });
      setTimeout(() => setTeacherMessage({ text: '', color: '' }), 5000);
      return;
    }

    let processedTeacherName = teacherName.trim();
    let processedSlots = slots.toUpperCase().trim();
    
    if (!processedTeacherName || processedTeacherName === 'Teacher Name') {
      spanMsg = 'Teacher name is empty';
      spanMsgColor = 'red';
      setTeacherMessage({ text: spanMsg, color: spanMsgColor });
      setTimeout(() => setTeacherMessage({ text: '', color: '' }), 5000);
      return;
    }

    // Check if slot exists
    if (!isSlotExist(processedSlots)) {
      spanMsg = 'Invalid slot(s) entered';
      spanMsgColor = 'red';
      setTeacherMessage({ text: spanMsg, color: spanMsgColor });
      setTimeout(() => setTeacherMessage({ text: '', color: '' }), 5000);
      return;
    }

    // Add (E) suffix for evening theory
    const isMorning = isMorningTheory(processedSlots);
    if (!processedTeacherName.endsWith(' (E)')) {
      if (isMorning === false) {
        processedTeacherName = processedTeacherName + ' (E)';
      }
    }

    // Validate teacher and slots
    const validationResult = checkTeacherAndSlots(selectedCourse, processedTeacherName, processedSlots || 'SLOTS');
    
    if (validationResult === false) {
      spanMsg = 'Teacher with same name and slots already exists';
      spanMsgColor = 'red';
      setTeacherMessage({ text: spanMsg, color: spanMsgColor });
      setTimeout(() => setTeacherMessage({ text: '', color: '' }), 5000);
      return;
    }
    
    // Use the validated unique name
    const finalTeacherName = typeof validationResult === 'string' ? validationResult : processedTeacherName;

    console.log('Adding teacher:', {
      courseName: selectedCourse,
      teacherName: finalTeacherName,
      slots: processedSlots || 'SLOTS',
      venue: venue.toUpperCase().trim() || 'VENUE',
      color: color
    });
    
    dispatch({
      type: 'ADD_TEACHER_TO_SUBJECT',
      payload: {
        courseName: selectedCourse,
        teacherName: finalTeacherName,
        slots: processedSlots || 'SLOTS',
        venue: venue.toUpperCase().trim() || 'VENUE',
        color: color
      }
    });

    spanMsg = 'Teacher added successfully';
    spanMsgColor = 'green';
    setTeacherMessage({ text: spanMsg, color: spanMsgColor });
    setTimeout(() => setTeacherMessage({ text: '', color: '' }), 5000);

    setTeacherName('');
    setSlots('');
    setVenue('');
  };

  // Handle course delete
  const handleDeleteCourse = () => {
    if (!confirm(`Are you sure you want to delete ${editingCourse}?`)) {
      setCourseMessage({ text: 'Course not deleted', color: 'red' });
      setTimeout(() => setCourseMessage({ text: '', color: '' }), 4000);
      return;
    }

    dispatch({
      type: 'REMOVE_SUBJECT',
      payload: editingCourse
    });

    setShowEditCourse(false);
    setEditingCourse('');
    dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'editSub', value: false } });
  };

  // Handle teacher delete
  const handleDeleteTeacher = () => {
    if (!confirm(`Are you sure you want to delete ${editingTeacher}?`)) {
      setTeacherMessage({ text: 'Teacher not deleted', color: 'red' });
      setTimeout(() => setTeacherMessage({ text: '', color: '' }), 4000);
      return;
    }

    dispatch({
      type: 'REMOVE_TEACHER_FROM_SUBJECT',
      payload: {
        courseName: editingCourse,
        teacherName: editingTeacher
      }
    });

    setShowEditTeacher(false);
    setEditingTeacher('');
  };

  // Handle course edit save
  const handleSaveCourseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const processedName = processRawCourseName(editCourseName);
    const creditValue = parseCreditValue(editCredits);
    
    if (!processedName || creditValue <= 0 || creditValue > 30) {
      setCourseMessage({ text: 'Please enter valid course name and credits', color: 'red' });
      setTimeout(() => setCourseMessage({ text: '', color: '' }), 4000);
      return;
    }

    // If name changed, we need to remove old and add new
    if (processedName !== editingCourse) {
      const oldSubject = subjects[editingCourse];
      dispatch({ type: 'REMOVE_SUBJECT', payload: editingCourse });
      dispatch({
        type: 'ADD_SUBJECT',
        payload: { courseName: processedName, credits: creditValue }
      });
      // Re-add all teachers
      Object.entries(oldSubject.teacher).forEach(([teacherName, teacherData]) => {
        dispatch({
          type: 'ADD_TEACHER_TO_SUBJECT',
          payload: {
            courseName: processedName,
            teacherName,
            ...teacherData
          }
        });
      });
    } else {
      // Just update credits
      dispatch({
        type: 'ADD_SUBJECT',
        payload: { courseName: processedName, credits: creditValue }
      });
    }

    setCourseMessage({ text: 'Course updated successfully', color: 'green' });
    setTimeout(() => setCourseMessage({ text: '', color: '' }), 4000);

    setShowEditCourse(false);
    setEditingCourse('');
  };

  // Handle teacher edit save
  const handleSaveTeacherEdit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let processedTeacherName = editTeacherName.trim();
    let processedSlots = editSlots.toUpperCase().trim();
    
    if (!processedTeacherName || !processedSlots) {
      setTeacherMessage({ text: 'Please enter teacher name and slots', color: 'red' });
      setTimeout(() => setTeacherMessage({ text: '', color: '' }), 4000);
      return;
    }

    // Check if slot exists
    if (!isSlotExist(processedSlots)) {
      setTeacherMessage({ text: 'Invalid slot(s) entered', color: 'red' });
      setTimeout(() => setTeacherMessage({ text: '', color: '' }), 4000);
      return;
    }

    // Add (E) suffix for evening theory
    const isMorning = isMorningTheory(processedSlots);
    if (!processedTeacherName.endsWith(' (E)')) {
      if (isMorning === false) {
        processedTeacherName = processedTeacherName + ' (E)';
      }
    }

    // Remove old teacher if name changed
    if (processedTeacherName !== editingTeacher) {
      dispatch({
        type: 'REMOVE_TEACHER_FROM_SUBJECT',
        payload: {
          courseName: editingCourse,
          teacherName: editingTeacher
        }
      });
    }

    // Add/update teacher
    dispatch({
      type: 'UPDATE_TEACHER_IN_SUBJECT',
      payload: {
        courseName: editingCourse,
        teacherName: processedTeacherName,
        slots: processedSlots || 'SLOTS',
        venue: editVenue.toUpperCase().trim() || 'VENUE',
        color: editColor
      }
    });

    setTeacherMessage({ text: 'Teacher updated successfully', color: 'green' });
    setTimeout(() => setTeacherMessage({ text: '', color: '' }), 4000);

    setShowEditTeacher(false);
    setEditingTeacher('');
  };

  // Handle edit button click
  const handleEditClick = () => {
    dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'editTeacher', value: true } });
    dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'sortableIsActive', value: true } });
    openAllDropdowns();
    setShowAddCourse(false);
    setShowAddTeacher(false);
    setShowEditCourse(false);
    setShowEditTeacher(false);
    
    // Activate sortable after DOM updates
    setTimeout(() => {
      activateSortable();
    }, 100);
  };

  // Handle done button click
  const handleDoneClick = () => {
    dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'editSub', value: false } });
    dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'editTeacher', value: false } });
    dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'sortableIsActive', value: false } });
    setShowEditCourse(false);
    setShowEditTeacher(false);
    showAddTeacherDiv();
    
    // Deactivate sortable
    deactivateSortable();
  };

  // Handle course edit switch change
  const handleCourseEditSwitch = (checked: boolean) => {
    dispatch({ type: 'SET_GLOBAL_VAR', payload: { key: 'editSub', value: checked } });
    if (checked) {
      closeAllDropdowns();
      setShowEditTeacher(false);
    } else {
      setShowEditCourse(false);
      setShowEditTeacher(false);
    }
  };

  return (
    <div className="card">
      <div className="card-header text-left fw-bold header-button">
        <div className="c_pref" style={{ width: '28%', alignSelf: 'center' }}>
          Course Preferences
          {state.ui.attackMode && <span className="badge bg-warning text-dark ms-2">Attack Mode</span>}
        </div>
        <div className="text-left header-button-element">
          <button
            id="tt-teacher-add"
            type="button"
            className="btn btn-success"
            onClick={showAddTeacherDiv}
            style={{ display: state.globalVars.editTeacher || state.globalVars.editSub ? 'none' : 'inline-block' }}
          >
            <i className="fas fa-plus"></i> Teachers
          </button>
          <button
            id="tt-subject-add"
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setShowAddCourse(true);
              setShowAddTeacher(false);
              setShowEditCourse(false);
              setShowEditTeacher(false);
            }}
            style={{ display: state.globalVars.editTeacher || state.globalVars.editSub ? 'none' : 'inline-block' }}
          >
            <i className="fas fa-plus"></i> Course
          </button>
          
          {state.globalVars.editSub || state.globalVars.editTeacher ? (
            <>
              <button
                id="tt-subject-done"
                className="btn btn-primary ms-1 me-1"
                type="button"
                onClick={handleDoneClick}
              >
                <span>Done</span>
              </button>
              <button
                id="tt-subject-collapse"
                className="btn btn-outline-secondary ms-1 me-1"
                type="button"
                onClick={closeAllDropdowns}
              >
                <i className="fas fa-chevron-up"></i>
                <span>&nbsp;&nbsp;Collapse All</span>
              </button>
              <div className="form-check form-switch" style={{ marginTop: '7px', display: 'inline-block' }}>
                <label className="form-check-label" htmlFor="tt-sub-edit-switch">
                  Course Edit
                </label>
                <input
                  className="form-check-input"
                  type="checkbox"
                  role="switch"
                  id="tt-sub-edit-switch"
                  checked={state.globalVars.editSub}
                  onChange={(e) => handleCourseEditSwitch(e.target.checked)}
                />
              </div>
            </>
          ) : (
            <button
              id="tt-subject-edit"
              className="btn btn-warning ms-1 me-1"
              type="button"
              onClick={handleEditClick}
            >
              <i className="fas fa-pencil"></i>
              <span>&nbsp;&nbsp;Edit</span>
            </button>
          )}
        </div>
      </div>

      <div style={{ padding: '0%', display: 'flex', flexDirection: 'row', minHeight: '600px', maxHeight: '600px' }} className="card-body">
        {/* Subject Area */}
        <section style={{ height: '600px', overflowY: 'auto' }} className="left-border left-box" id="subjectArea">
          {Object.entries(subjects).map(([subjectName, subjectData]) => {
            return (
            <div key={subjectName} className="dropdown dropdown-teacher">
              <div 
                className="dropdown-heading" 
                data-course={subjectName}
                onClick={() => {
                  if (state.globalVars.editSub) {
                    setEditingCourse(subjectName);
                    setEditCourseName(subjectName);
                    setEditCredits(String(subjectData.credits));
                    setShowEditCourse(true);
                    setShowEditTeacher(false);
                    setShowAddCourse(false);
                    setShowAddTeacher(false);
                  } else {
                    toggleDropdown(subjectName);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                <div className="h2s" style={{ display: 'flex', flexDirection: 'row' }}>
                  <h2>
                    <span className="cname">{subjectName}</span>
                    <span className="arrow"></span>
                  </h2>
                  <h4>[{subjectData.credits}]</h4>
                </div>
              </div>
              <ul className="dropdown-list">
                {sortTeachersByColor(subjectData.teacher, subjectName).map(([teacherName, teacherData]) => {
                  // Check if this teacher has slot clashes (EXACTLY like vanilla JS rearrangeTeacherLiInSubjectArea)
                  const teacherSlots = slotsProcessingForCourseList(teacherData.slots);
                  
                  // Get data based on mode
                  const dataToCheck = state.ui.attackMode ? activeTable.attackData : activeTable.data;
                  
                  let slotsOfCourse: string[];
                  let activeSlots: string[];
                  
                  if (state.ui.attackMode) {
                    slotsOfCourse = getCourseSlotsAttack(subjectName, activeTable.attackData);
                    activeSlots = slotsForAttack(activeTable.attackData);
                  } else {
                    slotsOfCourse = getSlotsOfCourse(subjectName, activeTable.data);
                    activeSlots = getSlots(activeTable.data);
                  }
                  
                  // CRITICAL: This is the vanilla JS pattern - subtract same course slots
                  const consideredSlots = subtractArray(slotsOfCourse, activeSlots);
                  
                  // Check clash against OTHER courses only
                  const hasClash = isCommonSlot(teacherSlots, consideredSlots);
                  
                  return (
                  <li 
                    key={teacherName} 
                    className={hasClash ? 'clashLi' : ''}
                    style={{ 
                      backgroundColor: teacherData.color, 
                      cursor: (() => {
                        if (state.globalVars.editTeacher || (!state.globalVars.editSub && !state.globalVars.editTeacher)) {
                          // In attack mode, disable clicking on clashing teachers
                          if (state.ui.attackMode && hasClash) {
                            return 'not-allowed';
                          }
                          return 'pointer';
                        }
                        return 'default';
                      })()
                    }}
                    onClick={() => {
                      if (state.globalVars.editTeacher && !state.globalVars.editSub) {
                        // Edit mode
                        setEditingCourse(subjectName);
                        setEditingTeacher(teacherName);
                        setEditTeacherName(teacherName);
                        setEditSlots(teacherData.slots);
                        setEditVenue(teacherData.venue === 'VENUE' ? '' : teacherData.venue);
                        setEditColor(teacherData.color);
                        setShowEditTeacher(true);
                        setShowEditCourse(false);
                        setShowAddCourse(false);
                        setShowAddTeacher(false);
                      } else if (!state.globalVars.editSub && !state.globalVars.editTeacher) {
                        // In attack mode, prevent clicking on clashing teachers
                        if (state.ui.attackMode && hasClash) {
                          return; // Don't allow selection of clashing teachers in attack mode
                        }
                        // Normal mode - select/deselect teacher for timetable
                        handleTeacherClick(subjectName, teacherName, teacherData);
                      }
                    }}
                  >
                    <input 
                      type="radio" 
                      name={subjectName} 
                      value={teacherName} 
                      checked={isTeacherSelected(subjectName, teacherName)}
                      onChange={() => {}} // Handled by li click
                      style={{ marginRight: '8px' }} 
                    />
                    <div className={hasClash ? 'clash' : ''} style={{ paddingLeft: '4%', width: '47%' }}>{teacherName}</div>
                    <div style={{ width: '38%', opacity: '70%' }}>{teacherData.slots}</div>
                    <div style={{ width: '15%', opacity: '70%' }}>{teacherData.venue}</div>
                  </li>
                  );
                })}
              </ul>
            </div>
          );
          })}
        </section>

        {/* Right Panel */}
        <section className="left-border right-box">
          {(state.globalVars.editSub || state.globalVars.editTeacher) && (
            <h5 id="edit_msg_" style={{ padding: '4.5%', paddingBottom: 0, display: showEditCourse || showEditTeacher ? 'none' : 'block' }}>
              {state.globalVars.editSub ? 'Click on the Course to edit it.' : 'Click on the Teacher to edit it.'}
            </h5>
          )}

          {/* Add Course Form */}
          {showAddCourse && !state.globalVars.editSub && !state.globalVars.editTeacher && (
            <div id="div-for-add-course">
              <div>
                <h4 style={{ padding: '4.5%', paddingBottom: 0 }}>Add Course</h4>
                <hr />
              </div>
              <form onSubmit={handleAddCourse}>
                <div style={{ margin: '4.5%', paddingTop: '10px', paddingBottom: 0, paddingRight: '0%' }} className="modal-body">
                  <label htmlFor="course-input_remove">Course</label>
                  <input
                    type="text"
                    className="form-control"
                    id="course-input_remove"
                    placeholder="CSE1001 - Problem Solving and Programming"
                    value={courseName}
                    onChange={(e) => setCourseName(removeDotsLive(e.target.value))}
                    autoComplete="off"
                  />
                  <div style={{ color: 'blue', opacity: '50%', marginTop: '-5px' }}>
                    Course Code & Name Separated by '<b style={{ color: 'rgb(255, 0, 0)', fontWeight: 700, fontSize: '20px' }}>-</b>'
                  </div>

                  <label style={{ marginTop: '15px' }} htmlFor="credits-input">Credits</label>
                  <input
                    id="credits-input"
                    className="form-control text-uppercase"
                    type="number"
                    style={{ maxWidth: '25%' }}
                    value={credits}
                    onChange={(e) => setCredits(e.target.value)}
                    autoComplete="off"
                    placeholder="4"
                    min="0"
                    max="30"
                    step="0.5"
                  />
                  <span id="span-course-add" style={{ color: courseMessage.color, fontWeight: 'bold' }}>
                    {courseMessage.text}
                  </span>
                  <br style={{ display: courseMessage.text ? 'none' : 'inline' }} id="hide_br" />
                  <hr />
                </div>
                <div className="modal-footer">
                  <button style={{ width: '30%' }} type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Course Form */}
          {showEditCourse && state.globalVars.editSub && (
            <div id="div-for-edit-course">
              <div>
                <h4 style={{ padding: '4.5%', paddingBottom: 0 }}>Edit Course</h4>
                <hr />
              </div>
              <form onSubmit={handleSaveCourseEdit}>
                <div style={{ margin: '4.5%', paddingTop: '10px', paddingBottom: 0, paddingRight: '0%' }} className="modal-body">
                  <label htmlFor="course-input_edit">Course Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="course-input_edit"
                    value={editCourseName}
                    onChange={(e) => setEditCourseName(removeDotsLive(e.target.value))}
                    autoComplete="off"
                  />

                  <label style={{ marginTop: '15px' }} htmlFor="credits-input-edit">Credits</label>
                  <input
                    id="credits-input-edit"
                    className="form-control text-uppercase"
                    type="number"
                    style={{ maxWidth: '25%' }}
                    value={editCredits}
                    onChange={(e) => setEditCredits(e.target.value)}
                    autoComplete="off"
                    min="0"
                    max="30"
                    step="0.5"
                  />
                  <span id="span-course-edit" style={{ color: courseMessage.color, fontWeight: 'bold' }}>
                    {courseMessage.text}
                  </span>
                  <br style={{ display: courseMessage.text ? 'none' : 'inline' }} id="hide_br-edit" />
                  <hr />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={handleDeleteCourse}>
                    Delete
                  </button>
                  <button style={{ width: '30%' }} type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Teacher Form */}
          {showAddTeacher && !state.globalVars.editSub && !state.globalVars.editTeacher && (
            <div id="div-for-add-teacher">
              <form onSubmit={handleAddTeacher}>
                <div>
                  <h4 style={{ padding: '4.5%', paddingBottom: 0 }}>Add Teachers</h4>
                  <hr />
                </div>
                <div style={{ margin: '4.5%', paddingTop: '10px', paddingBottom: 0, paddingRight: '0%' }}>
                  <label htmlFor="course-select-add-teacher">
                    Course &nbsp;&nbsp;
                    {Object.keys(subjects).length === 0 && (
                      <a href="#" onClick={(e) => { e.preventDefault(); setShowAddCourse(true); setShowAddTeacher(false); }} style={{ color: 'red', fontWeight: 'bold' }}>
                        ⚠ Add Courses First!
                      </a>
                    )}
                  </label>
                  <select
                    id="course-select-add-teacher"
                    className="form-select"
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                  >
                    {Object.keys(subjects).length === 0 ? (
                      <option value="">You need to add courses</option>
                    ) : (
                      <>
                        <option value="">Select Course</option>
                        {Object.keys(subjects).map((courseName) => (
                          <option key={courseName} value={courseName}>
                            {courseName}
                          </option>
                        ))}
                      </>
                    )}
                  </select>
                  <br />

                  <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <div style={{ width: '72%' }}>
                      <label htmlFor="teacher-input_remove">Teacher Name</label>
                      <input
                        type="text"
                        className="form-control"
                        id="teacher-input_remove"
                        placeholder="KIM JONG UN"
                        value={teacherName}
                        onChange={(e) => setTeacherName(removeDotsLive(e.target.value))}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ width: '2%' }}></div>
                    <div style={{ width: '26%' }}>
                      <label htmlFor="color1-select">Color</label>
                      <select
                        id="color1-select"
                        className="form-select"
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                      >
                        <option value="rgb(214, 255, 214)" style={{ backgroundColor: 'rgb(214, 255, 214)' }}>
                          Green
                        </option>
                        <option value="rgb(255, 228, 135)" style={{ backgroundColor: 'rgb(255, 228, 135)' }}>
                          Orange
                        </option>
                        <option value="rgb(255, 205, 205)" style={{ backgroundColor: 'rgb(255, 205, 205)' }}>
                          Red
                        </option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <div style={{ width: '58%' }}>
                      <label style={{ marginTop: '15px' }} htmlFor="slot-input">Slots</label>
                      <input
                        id="slot-input"
                        className="form-control text-uppercase"
                        type="text"
                        style={{ maxWidth: '100%' }}
                        value={slots}
                        onChange={(e) => setSlots(removeSlotSplCharLive(e.target.value))}
                        autoComplete="off"
                        placeholder="A1+TA1"
                      />
                    </div>

                    <div style={{ width: '10%' }}></div>

                    <div style={{ width: '30%' }}>
                      <label style={{ marginTop: '15px' }} htmlFor="venue-input">Venue</label>
                      <input
                        id="venue-input"
                        className="form-control text-uppercase"
                        type="text"
                        style={{ maxWidth: '100%' }}
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        autoComplete="off"
                        placeholder="SJTG01"
                      />
                    </div>
                  </div>
                  <span id="span-teacher-add" style={{ color: teacherMessage.color, fontWeight: 'bold' }}>
                    {teacherMessage.text}
                  </span>
                  <br id="hide_br_teacher" style={{ display: teacherMessage.text ? 'none' : 'inline' }} />
                  <hr />
                </div>
                <div className="modal-footer">
                  <button style={{ width: '30%' }} type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Teacher Form */}
          {showEditTeacher && state.globalVars.editTeacher && !state.globalVars.editSub && (
            <div id="div-for-edit-teacher">
              <form onSubmit={handleSaveTeacherEdit}>
                <div>
                  <h4 style={{ padding: '4.5%', paddingBottom: 0 }}>Edit Teachers</h4>
                  <hr />
                </div>
                <div style={{ margin: '4.5%', paddingTop: '10px', paddingBottom: 0, paddingRight: '0%' }}>
                  <label htmlFor="teacher-edit-course">Course</label>
                  <input
                    disabled
                    type="text"
                    className="form-control"
                    id="teacher-edit-course"
                    value={editingCourse}
                    autoComplete="off"
                  />
                  <br />

                  <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <div style={{ width: '72%' }}>
                      <label htmlFor="teacher-input_remove-edit">Teacher Name</label>
                      <input
                        type="text"
                        className="form-control"
                        id="teacher-input_remove-edit"
                        value={editTeacherName}
                        onChange={(e) => setEditTeacherName(removeDotsLive(e.target.value))}
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ width: '2%' }}></div>
                    <div style={{ width: '26%' }}>
                      <label htmlFor="color1-select-edit">Color</label>
                      <select
                        id="color1-select-edit"
                        className="form-select"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                      >
                        <option value="rgb(214, 255, 214)" style={{ backgroundColor: 'rgb(214, 255, 214)' }}>
                          Green
                        </option>
                        <option value="rgb(255, 228, 135)" style={{ backgroundColor: 'rgb(255, 228, 135)' }}>
                          Orange
                        </option>
                        <option value="rgb(255, 205, 205)" style={{ backgroundColor: 'rgb(255, 205, 205)' }}>
                          Red
                        </option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'row' }}>
                    <div style={{ width: '58%' }}>
                      <label style={{ marginTop: '15px' }} htmlFor="slot-input-edit">Slots</label>
                      <input
                        id="slot-input-edit"
                        className="form-control text-uppercase"
                        type="text"
                        style={{ maxWidth: '100%' }}
                        value={editSlots}
                        onChange={(e) => setEditSlots(removeSlotSplCharLive(e.target.value))}
                        autoComplete="off"
                      />
                    </div>

                    <div style={{ width: '10%' }}></div>

                    <div style={{ width: '30%' }}>
                      <label style={{ marginTop: '15px' }} htmlFor="venue-input-edit">Venue</label>
                      <input
                        id="venue-input-edit"
                        className="form-control text-uppercase"
                        type="text"
                        style={{ maxWidth: '100%' }}
                        value={editVenue}
                        onChange={(e) => setEditVenue(e.target.value)}
                        autoComplete="off"
                      />
                    </div>
                  </div>
                  <span id="span-teacher-edit" style={{ color: teacherMessage.color, fontWeight: 'bold' }}>
                    {teacherMessage.text}
                  </span>
                  <br id="hide_br_teacher-edit" style={{ display: teacherMessage.text ? 'none' : 'inline' }} />
                  <hr />
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-danger" onClick={handleDeleteTeacher}>
                    Delete
                  </button>
                  <button style={{ width: '30%' }} type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </div>

      <div className="card-footer">
        <div className="row align-items-center justify-content-between">
          <div className="col-sm-auto my-1">
            <div className="form-check form-switch attack-toggle" style={{ marginTop: '7px' }}>
              <label className="form-check-label" htmlFor="attack-toggle">
                Live FFCS Mode
              </label>
              <input
                className="form-check-input"
                type="checkbox"
                id="attack-toggle"
                checked={state.ui.attackMode}
                onChange={(e) => dispatch({ type: 'SET_UI_STATE', payload: { attackMode: e.target.checked } })}
              />
            </div>
            <div className="form-check form-switch" style={{ marginTop: '7px' }}>
              <label className="form-check-label" htmlFor="auto-focus-toggle">
                Auto Focus
              </label>
              <input
                className="form-check-input"
                type="checkbox"
                id="auto-focus-toggle"
                checked={state.ui.autoFocusEnabled}
                onChange={(e) => dispatch({ type: 'SET_UI_STATE', payload: { autoFocusEnabled: e.target.checked } })}
              />
            </div>
          </div>
          
          <div className="col-sm-auto my-1">
            <button
              id="save-panel-button"
              type="button"
              className="btn btn-light me-1"
              onClick={() => {
                document.getElementById('download-modal')?.click();
              }}
            >
              Save TT
            </button>
            <button
              id="load-panel-button"
              type="button"
              className="btn btn-light me-1"
              onClick={() => {
                document.getElementById('upload-modal')?.click();
              }}
            >
              Upload TT
            </button>
            <button
              id="clear-course-button"
              type="button"
              className="btn btn-success"
              onClick={() => {
                // Different confirmation messages for normal vs attack mode (like vanilla JS)
                const confirmMessage = state.ui.attackMode 
                  ? 'Are you sure you want to clear the course list and Quick Visualization?'
                  : 'Are you sure you want to clear the course list?';
                
                if (confirm(confirmMessage)) {
                  dispatch({ type: 'RESET_TABLE' });
                }
              }}
            >
              Clear List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}