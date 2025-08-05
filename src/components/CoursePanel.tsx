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
  getSlotsOfCourse,
  getCourseSlotsAttack,
  slotsForAttack,
  getSlots
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

  // Course data and autocomplete states
  const [coursesData, setCoursesData] = useState<{ courses: any[]; all_data: any[] }>({ 
    courses: [], 
    all_data: [] 
  });
  const [slotButtons, setSlotButtons] = useState<Array<{
    code: string;
    title: string;
    slot: string;
    faculty: string;
    type: string;
    venue: string;
    credits: string;
  }>>([]);

  // Slot filter states
  const [slotFilter, setSlotFilter] = useState<string[]>([]);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [selectedSlotButton, setSelectedSlotButton] = useState<string | null>(null);

  // Panel input states (advanced options)
  const [panelSlot, setPanelSlot] = useState('');
  const [panelFaculty, setPanelFaculty] = useState('');
  const [panelVenue, setPanelVenue] = useState('');
  const [panelCredits, setPanelCredits] = useState('');
  const [panelIsProject, setPanelIsProject] = useState(false);

  const activeTable = state.activeTable;
  const subjects = activeTable.subject || {};

  // Load courses data on component mount (like getCourses in vanilla JS)
  useEffect(() => {
    const loadCoursesData = async () => {
      try {
        // Load course data based on campus selection
        let coursesModule;
        
        if (state.currentCampus === 'Chennai') {
          coursesModule = await import('@/data/schemas/chennai.json');
        } else {
          coursesModule = await import('@/data/schemas/vellore.json');
        }
        
        // Extract courses data from the imported JSON
        const data = coursesModule.default || coursesModule;
        
        // Handle different possible data structures
        let courses: any[] = [];
        let all_data: any[] = [];
        
        if (Array.isArray(data)) {
          courses = data;
          all_data = data;
        } else if (data && typeof data === 'object') {
          // Handle nested structure if needed
          courses = data.courses || data.theory || [];
          all_data = data.all_data || data.theory || [];
        }
        
        setCoursesData({
          courses,
          all_data
        });
      } catch (error) {
        console.error('Error loading courses data:', error);
        setCoursesData({ courses: [], all_data: [] });
      }
    };

    loadCoursesData();
  }, [state.currentCampus]);

  // Get courses based on selected campus (like getCourses in vanilla JS)
  const getCourses = () => {
    // This is now handled by the useEffect above
    return coursesData;
  };

  // Add slot buttons functionality (like addSlotButtons in vanilla JS)
  const addSlotButtons = (courseCode: string) => {
    const newSlotButtons: typeof slotButtons = [];
    const theorySlotGroup: string[] = [];
    const labSlotGroup: string[] = [];

    coursesData.all_data.forEach((courseData: any) => {
      if (courseData.CODE === courseCode) {
        const slotButton = {
          code: courseData.CODE,
          title: courseData.TITLE,
          slot: courseData.SLOT,
          faculty: courseData.FACULTY,
          type: courseData.TYPE,
          venue: courseData.VENUE,
          credits: courseData.CREDITS || '0'
        };

        // Check if slot belongs to lab or theory
        if (courseData.SLOT && courseData.SLOT[0] === 'L') {
          if (labSlotGroup.indexOf(courseData.SLOT) === -1) {
            labSlotGroup.push(courseData.SLOT);
          }
        } else {
          if (theorySlotGroup.indexOf(courseData.SLOT) === -1) {
            theorySlotGroup.push(courseData.SLOT);
          }
        }

        newSlotButtons.push(slotButton);
      }
    });

    setSlotButtons(newSlotButtons);
    
    // Update slot filter options
    const allSlots = [...theorySlotGroup, ...labSlotGroup];
    setSlotFilter(allSlots);
  };

  // Build slot button (like buildSlotButton in vanilla JS)
  const buildSlotButton = (courseData: any) => {
    return {
      code: courseData.CODE,
      title: courseData.TITLE,
      slot: courseData.SLOT,
      faculty: courseData.FACULTY,
      type: courseData.TYPE,
      venue: courseData.VENUE,
      credits: courseData.CREDITS || '0'
    };
  };

  // Clear panel functionality (like clearPanel in vanilla JS)
  const clearPanel = () => {
    setCourseName('');
    setCredits('');
    setSelectedCourse('');
    setTeacherName('');
    setSlots('');
    setVenue('');
    setPanelSlot('');
    setPanelFaculty('');
    setPanelVenue('');
    setPanelCredits('');
    setPanelIsProject(false);
    setSlotButtons([]);
    setSlotFilter([]);
    setSelectedSlotButton(null);
    setCourseMessage({ text: '', color: '' });
    setTeacherMessage({ text: '', color: '' });
  };

  // Handle slot button click
  const handleSlotButtonClick = (buttonData: typeof slotButtons[0]) => {
    setSelectedSlotButton(buttonData.slot);
    setPanelSlot(buttonData.slot);
    setPanelFaculty(buttonData.faculty);
    setPanelVenue(buttonData.venue);
    setPanelCredits(buttonData.credits);
    setPanelIsProject(buttonData.type === 'EPJ');
    
    // Update form fields
    setSlots(buttonData.slot);
    setVenue(buttonData.venue);
  };

  // Handle advanced options toggle
  const toggleAdvancedOptions = () => {
    setShowAdvancedOptions(!showAdvancedOptions);
  };

  // Handle course selection from autocomplete
  const handleCourseSelect = (selectedCourse: any) => {
    const courseString = `${selectedCourse.CODE} - ${selectedCourse.TITLE}`;
    setCourseName(courseString);
    
    // Clear other fields when new course is selected
    setSlots('');
    setVenue('');
    setPanelSlot('');
    setPanelFaculty('');
    setPanelVenue('');
    setPanelCredits('');
    setPanelIsProject(false);
    setSelectedSlotButton(null);
    
    // Load slot buttons for the selected course
    addSlotButtons(selectedCourse.CODE);
  };

  // Add course functionality from advanced panel
  const handleAddCourseFromPanel = () => {
    const courseArray = courseName.trim().split('-');
    const faculty = panelFaculty.trim();
    const slotString = panelSlot.toUpperCase().trim();
    const venue = panelVenue.trim();
    const credits = panelCredits.trim();
    const isProject = panelIsProject;

    if (courseArray[0] === '') {
      // Focus course input if available
      const courseInput = document.getElementById('course-input');
      if (courseInput) courseInput.focus();
      return;
    }

    if (slotString === '') {
      if (!showAdvancedOptions) {
        toggleAdvancedOptions();
      }
      // Focus slot input if available
      const slotInput = document.getElementById('panel-slot-input');
      if (slotInput) slotInput.focus();
      return;
    }

    const slots = slotString.split(/\s*\+\s*/).filter(slot => slot);
    
    // Generate courseId
    let courseId = 0;
    if (activeTable.data.length > 0) {
      const lastAddedCourse = activeTable.data[activeTable.data.length - 1];
      courseId = lastAddedCourse.courseId + 1;
    }

    const courseCode = courseArray[0].trim();
    const courseTitle = courseArray.slice(1).join('-').trim();

    const courseData: CourseData = {
      courseId,
      courseTitle,
      faculty,
      slots,
      venue,
      credits: parseFloat(credits) || 0,
      isProject,
      courseCode
    };

    dispatch({
      type: 'ADD_COURSE_TO_TIMETABLE',
      payload: courseData
    });

    // Clear form after adding
    clearPanel();
  };

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
          
          <button
            id="tt-subject-edit"
            className="btn btn-warning ms-1 me-1"
            type="button"
            onClick={handleEditClick}
            style={{ display: state.globalVars.editTeacher || state.globalVars.editSub ? 'none' : 'inline-block' }}
          >
            <i className="fas fa-pencil"></i>
            <span>&nbsp;&nbsp;Edit</span>
          </button>
          
          <button
            id="tt-subject-done"
            className="btn btn-primary"
            type="button"
            onClick={handleDoneClick}
            style={{ 
              display: state.globalVars.editSub || state.globalVars.editTeacher ? 'inline-block' : 'none',
              marginLeft: '0.25rem',
              marginRight: '0.25rem'
            }}
          >
            <span>Done</span>
          </button>
          <button
            id="tt-subject-collapse"
            className="btn btn-secondary"
            type="button"
            onClick={closeAllDropdowns}
            style={{ 
              display: state.globalVars.editSub || state.globalVars.editTeacher ? 'inline-block' : 'none',
              marginLeft: '0.25rem',
              marginRight: '0.25rem'
            }}
          >
            <i className="fas fa-chevron-up"></i>
            <span>&nbsp;&nbsp;Collapse All</span>
          </button>
          <div 
            className="form-check form-switch" 
            style={{ 
              marginTop: '7px', 
              display: state.globalVars.editSub || state.globalVars.editTeacher ? 'inline-block' : 'none',
              color: 'white'
            }}
            id="div-auto-focus"
          >
            <label className="form-check-label" htmlFor="tt-auto-focus-switch" style={{ color: 'white' }}>
              Auto Focus
            </label>
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="tt-auto-focus-switch"
              checked={state.ui.autoFocusEnabled}
              onChange={(e) => dispatch({ type: 'SET_UI_STATE', payload: { autoFocusEnabled: e.target.checked } })}
              style={{ marginLeft: '0.5rem' }}
            />
          </div>
          <div 
            className="form-check form-switch" 
            style={{ 
              marginTop: '7px', 
              display: state.globalVars.editSub || state.globalVars.editTeacher ? 'inline-block' : 'none',
              color: 'white'
            }}
            id="tt-sub-edit-switch-div"
          >
            <label className="form-check-label" htmlFor="tt-sub-edit-switch" style={{ color: 'white' }}>
              Course Edit
            </label>
            <input
              className="form-check-input"
              type="checkbox"
              role="switch"
              id="tt-sub-edit-switch"
              checked={state.globalVars.editSub}
              onChange={(e) => handleCourseEditSwitch(e.target.checked)}
              style={{ marginLeft: '0.5rem' }}
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '0%', display: 'flex', flexDirection: 'row', minHeight: '400px', maxHeight: 'none', borderRadius: '0 0 20px 20px' }} className="card-body">
        {/* Subject Area */}
        <section style={{ flex: 1, minHeight: '400px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="left-border left-box" id="subjectArea">
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
              <ul className="dropdown-list bg-[#0b0b0b]" >
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
        <section className="left-border right-box" style={{ flex: 1, minHeight: '400px', overflowY: 'auto', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          <h5 
            id="edit_msg_" 
            style={{ 
              padding: '4.5%', 
              paddingBottom: 0, 
              display: (showEditCourse || showEditTeacher) ? 'none' : (state.globalVars.editSub || state.globalVars.editTeacher) ? 'block' : 'none',
              color: 'white'
            }}
          >
            {state.globalVars.editSub ? 'Click on the Course to edit it.' : 'Click on the Teacher to edit it.'}
          </h5>

          {/* Add Course Form */}
          {showAddCourse && !state.globalVars.editSub && !state.globalVars.editTeacher && (
            <div id="div-for-add-course" style={{ display: 'block', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '2rem', margin: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: 'white', fontWeight: '600', margin: '0', fontSize: '1.25rem' }}>
                  Add Course
                </h4>
              </div>
              <form id="courseSaveForm" onSubmit={handleAddCourse}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label htmlFor="course-input_remove" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                      Course
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="course-input_remove"
                      placeholder="CSE1001 - Problem Solving and Programming"
                      value={courseName}
                      onChange={(e) => setCourseName(removeDotsLive(e.target.value))}
                      autoComplete="off"
                    />
                    <div style={{ color: 'rgba(78, 205, 196, 0.8)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                      Course Code & Name separated by '-'
                    </div>
                  </div>

                  <div style={{ maxWidth: '200px' }}>
                    <label htmlFor="credits-input" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                      Credits
                    </label>
                    <input
                      id="credits-input"
                      className="form-control"
                      type="number"
                      value={credits}
                      onChange={(e) => setCredits(e.target.value)}
                      autoComplete="off"
                      placeholder="4"
                      min="0"
                      max="30"
                      step="0.5"
                    />
                  </div>
                  <span id="span-course-add" style={{ color: '#4ECDCC', fontWeight: '500' }}>
                    {courseMessage.text}
                  </span>
                  <br style={{ display: courseMessage.text ? 'none' : 'inline' }} id="hide_br" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    id="saveSubjectModal"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Course Form */}
          {showEditCourse && state.globalVars.editSub && (
            <div id="div-for-edit-course" style={{ display: 'block', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '2rem', margin: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: 'white', fontWeight: '600', margin: '0', fontSize: '1.25rem' }}>
                  Edit Course
                </h4>
              </div>
              <form id="courseEditSaveForm-1" onSubmit={handleSaveCourseEdit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label htmlFor="course-input_edit" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                      Course Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="course-input_edit"
                      placeholder="CSE1001 Problem Solving and Programming"
                      value={editCourseName}
                      onChange={(e) => setEditCourseName(removeDotsLive(e.target.value))}
                      autoComplete="off"
                    />
                  </div>

                  <div style={{ maxWidth: '200px' }}>
                    <label htmlFor="credits-input-edit" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                      Credits
                    </label>
                    <div hidden id="course-input-edit-pre"></div>
                    <div hidden id="credit-input-edit-pre"></div>
                    <input
                      id="credits-input-edit"
                      className="form-control"
                      type="number"
                      value={editCredits}
                      onChange={(e) => setEditCredits(e.target.value)}
                      autoComplete="off"
                      placeholder="4"
                      min="0"
                      max="30"
                      step="0.5"
                    />
                  </div>

                  <span id="span-course-edit" style={{ color: '#4ECDCC', fontWeight: '500' }}>
                    {courseMessage.text}
                  </span>
                  <br style={{ display: courseMessage.text ? 'none' : 'inline' }} id="hide_br-edit" />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    id="deleteSubjectEdit"
                    onClick={handleDeleteCourse}
                  >
                    Delete
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    id="saveSubjectEditModal"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Teacher Form */}
          {showAddTeacher && !state.globalVars.editSub && !state.globalVars.editTeacher && (
            <div id="div-for-add-teacher" style={{ background: '#1f1f1f', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '2rem', margin: '1rem' }}>
              <form id="teacherSaveForm" onSubmit={handleAddTeacher}>
                <div style={{ marginBottom: '1rem' }}>
                  <h4 style={{ color: 'white', fontWeight: '600', margin: '0', fontSize: '1.25rem' }}>
                    Add Teachers
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Course select option dropdown input */}
                  <div>
                    <label htmlFor="course-select-add-teacher" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                      Course 
                      {Object.keys(subjects).length === 0 && (
                        <a 
                          id="course_link" 
                          href="#" 
                          onClick={(e) => { e.preventDefault(); setShowAddCourse(true); setShowAddTeacher(false); }} 
                          style={{ color: '#4ECDCC', textDecoration: 'none', marginLeft: '1rem', fontSize: '0.9rem' }}
                        >
                          Add Courses
                        </a>
                      )}
                    </label>
                    <select
                      id="course-select-add-teacher"
                      className="form-select"
                      aria-label="Select Course"
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
                  </div>

                  <div>
                    <label htmlFor="teacher-input_remove" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                      Teacher Name
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      id="teacher-input_remove"
                      placeholder="KIM JONG UN"
                      value={teacherName}
                      onChange={(e) => setTeacherName(removeDotsLive(e.target.value))}
                      autoComplete="off"
                    />
                    {/* Hidden color field for JavaScript compatibility */}
                    <select
                      id="color1-select"
                      className="form-select"
                      style={{ display: 'none' }}
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                    >
                      <option value="rgb(255, 228, 135)">Orange</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="slot-input" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                        Slots
                      </label>
                      <input
                        id="slot-input"
                        className="form-control text-uppercase"
                        type="text"
                        value={slots}
                        onChange={(e) => setSlots(removeSlotSplCharLive(e.target.value))}
                        autoComplete="off"
                        placeholder="A1+TA1"
                      />
                    </div>
                    <div style={{ flex: '0 0 200px' }}>
                      <label htmlFor="venue-input" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                        Venue
                      </label>
                      <input
                        id="venue-input"
                        className="form-control text-uppercase"
                        type="text"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        autoComplete="off"
                        placeholder="SJTG01"
                      />
                    </div>
                  </div>

                  <span id="span-teacher-add" style={{ color: '#4ECDCC', fontWeight: '500' }}>
                    {teacherMessage.text}
                  </span>
                  <br id="hide_br_teacher" style={{ display: teacherMessage.text ? 'none' : 'inline' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  <button
                    className="btn btn-success btn-sm"
                    type="button"
                    id="addMultipleTeacher"
                    onClick={() => {
                      // Add functionality for multiple teachers if needed
                      console.log('Add Multiple Teachers clicked');
                    }}
                  >
                    <i className="fas fa-plus"></i>
                    <span>&nbsp;&nbsp;Add Multiple</span>
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    id="saveTeacherModal"
                  >
                    Save
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Teacher Form */}
          {showEditTeacher && state.globalVars.editTeacher && !state.globalVars.editSub && (
            <div id="div-for-edit-teacher" style={{ display: 'block', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(15px)', borderRadius: '20px', padding: '2rem', margin: '1rem' }}>
              <form id="teacherSaveFormEdit" onSubmit={handleSaveTeacherEdit}>
                <div style={{ marginBottom: '2rem' }}>
                  <h4 style={{ color: 'white', fontWeight: '600', margin: '0', fontSize: '1.5rem' }}>
                    Edit Teachers
                  </h4>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* Course select option dropdown input */}
                  <div>
                    <label htmlFor="teacher-edit-course" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                      Course
                    </label>
                    <input
                      disabled
                      type="text"
                      className="form-control"
                      id="teacher-edit-course"
                      placeholder="Course"
                      value={editingCourse}
                      autoComplete="off"
                      style={{ 
                        background: 'rgba(255, 255, 255, 0.05)', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        borderRadius: '15px', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        padding: '0.75rem 1rem', 
                        backdropFilter: 'blur(10px)' 
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'end' }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="teacher-input_remove-edit" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                        Teacher Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="teacher-input_remove-edit"
                        placeholder="KIM JONG UN"
                        value={editTeacherName}
                        onChange={(e) => setEditTeacherName(removeDotsLive(e.target.value))}
                        autoComplete="off"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          borderRadius: '15px', 
                          color: 'white', 
                          padding: '0.75rem 1rem', 
                          backdropFilter: 'blur(10px)' 
                        }}
                      />
                      <input
                        hidden
                        disabled
                        type="text"
                        className="form-control"
                        id="teacher-input_remove-edit-pre"
                        placeholder="KIM JONG UN"
                        autoComplete="off"
                      />
                    </div>
                    <div style={{ flex: '0 0 140px' }}>
                      <label htmlFor="color1-select-edit" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                        Color
                      </label>
                      <select
                        id="color1-select-edit"
                        className="form-select"
                        value={editColor}
                        onChange={(e) => setEditColor(e.target.value)}
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          borderRadius: '15px', 
                          color: 'white', 
                          padding: '0.75rem 1rem', 
                          backdropFilter: 'blur(10px)' 
                        }}
                      >
                        <option value="rgb(214, 255, 214)" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white' }}>
                          Green
                        </option>
                        <option value="rgb(255, 228, 135)" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white' }}>
                          Orange
                        </option>
                        <option value="rgb(255, 205, 205)" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', color: 'white' }}>
                          Red
                        </option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <label htmlFor="slot-input-edit" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                        Slots
                      </label>
                      <input
                        id="slot-input-edit"
                        className="form-control text-uppercase"
                        type="text"
                        value={editSlots}
                        onChange={(e) => setEditSlots(removeSlotSplCharLive(e.target.value))}
                        autoComplete="off"
                        placeholder="A1+TA1"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          borderRadius: '15px', 
                          color: 'white', 
                          padding: '0.75rem 1rem', 
                          backdropFilter: 'blur(10px)' 
                        }}
                      />
                    </div>
                    <div style={{ flex: '0 0 200px' }}>
                      <label htmlFor="venue-input-edit" style={{ color: 'white', fontWeight: '500', marginBottom: '0.5rem', display: 'block' }}>
                        Venue
                      </label>
                      <input
                        id="venue-input-edit"
                        className="form-control text-uppercase"
                        type="text"
                        value={editVenue}
                        onChange={(e) => setEditVenue(e.target.value)}
                        autoComplete="off"
                        placeholder="SJTG01"
                        style={{ 
                          background: 'rgba(255, 255, 255, 0.1)', 
                          border: '1px solid rgba(255, 255, 255, 0.2)', 
                          borderRadius: '15px', 
                          color: 'white', 
                          padding: '0.75rem 1rem', 
                          backdropFilter: 'blur(10px)' 
                        }}
                      />
                    </div>
                  </div>

                  <span id="span-teacher-edit" style={{ color: '#4ECDCC', fontWeight: '500' }}>
                    {teacherMessage.text}
                  </span>
                  <br id="hide_br_teacher-edit" style={{ display: teacherMessage.text ? 'none' : 'inline' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    id="deleteTeacherEdit"
                    onClick={handleDeleteTeacher}
                  >
                    Delete
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    id="saveTeacherEdit"
                  >
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