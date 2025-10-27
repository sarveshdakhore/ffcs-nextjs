'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useFFCS, CourseData } from '@/context/FFCSContext';
import velloreSchema from '@/data/schemas/vellore.json';
import chennaiSchema from '@/data/schemas/chennai.json';

interface TimeSlot {
  start?: string;
  end?: string;
  days?: {
    [key: string]: string;
  };
  lunch?: boolean;
}

interface TimetableSchema {
  theory: TimeSlot[];
  lab: TimeSlot[];
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export default function Timetable() {
  const { state, dispatch, forceUpdate } = useFFCS();
  const [currentTable, setCurrentTable] = useState(state.currentTableId);
  const [showQuickButtons, setShowQuickButtons] = useState(false);
  const [showTableDropdown, setShowTableDropdown] = useState(false);
  const [isLiveModeEnabled, setIsLiveModeEnabled] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Console log all table data for debugging
  useEffect(() => {
    console.log('📊 TIMETABLE DATA:', {
      attackMode: state.ui.attackMode,
      quickVisualizationEnabled: state.ui.quickVisualizationEnabled,
      attackData: state.activeTable.attackData,
      attackQuick: state.activeTable.attackQuick,
      normalData: state.activeTable.data,
      normalQuick: state.activeTable.quick,
      currentTableId: state.currentTableId,
      activeTableId: state.activeTable.id
    });
  }, [state.activeTable.attackData, state.activeTable.attackQuick, state.activeTable.data, state.activeTable.quick, state.ui.attackMode, state.ui.quickVisualizationEnabled]);

  // Create a stable key for React re-rendering based on actual data changes
  const dataKey = useMemo(() => {
    const dataString = JSON.stringify(state.activeTable?.data);
    const subjectString = JSON.stringify(state.activeTable?.subject);
    return `${state.activeTable?.id}-${dataString}-${subjectString}-${state.forceUpdateCounter}`;
  }, [state.activeTable?.id, state.activeTable?.data, state.activeTable?.subject, state.forceUpdateCounter]);

  // Custom modal states
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showRenameTableModal, setShowRenameTableModal] = useState(false);
  const [showDeleteTableModal, setShowDeleteTableModal] = useState(false);
  const [newTableName, setNewTableName] = useState('');
  const [renameTableName, setRenameTableName] = useState('');
  const [tableToRename, setTableToRename] = useState<number | null>(null);
  const [tableToDelete, setTableToDelete] = useState<{ id: number; name: string } | null>(null);

  // Add socket listener for collaboration updates with AGGRESSIVE re-rendering
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
      const socket = (window as any).collaborationSocket;
      
      const handleCollaborationUpdate = (data: any) => {
        console.log('🔄 Timetable: Received collaboration update', data);
        
        // Only trigger update if this is not our own change
        if (data.userId !== (window as any).collaborationUserId) {
          console.log('🚨 Timetable: FORCING AGGRESSIVE UPDATE');
          
          // Multiple immediate updates
          if (forceUpdate) {
            forceUpdate();
            forceUpdate();
            forceUpdate();
          }
          
          // Force state update with timeouts
          setTimeout(() => {
            if (forceUpdate) forceUpdate();
          }, 10);
          
          setTimeout(() => {
            if (forceUpdate) forceUpdate();
          }, 50);
        }
      };

      // Listen for timetable updates
      socket.on('timetable-updated', handleCollaborationUpdate);
      socket.on('user-joined', handleCollaborationUpdate);
      socket.on('joined-room', handleCollaborationUpdate);

      return () => {
        // Cleanup listeners
        socket.off('timetable-updated', handleCollaborationUpdate);
        socket.off('user-joined', handleCollaborationUpdate);
        socket.off('joined-room', handleCollaborationUpdate);
      };
    }
  }, []);

    // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowTableDropdown(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAddTableModal(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync local currentTable state with global state
  useEffect(() => {
    setCurrentTable(state.currentTableId);
  }, [state.currentTableId]);

  // Sync live mode state
  useEffect(() => {
    setIsLiveModeEnabled(state.ui.attackModeEnabled || false);
  }, [state.ui.attackModeEnabled]);

  // Get the appropriate schema based on campus
  const getTimetableSchema = (): TimetableSchema => {
    return state.currentCampus === 'Chennai' ? chennaiSchema as TimetableSchema : velloreSchema as TimetableSchema;
  };

  const handleTableSwitch = (tableId: number) => {
    dispatch({ type: 'SWITCH_TABLE', payload: tableId });
    // No need to manually update currentTable - it will be synced via useEffect
  };

  const handleAddTable = () => {
    setNewTableName('');
    setShowAddTableModal(true);
  };

  const confirmAddTable = () => {
    if (newTableName.trim()) {
      dispatch({ type: 'CREATE_TABLE', payload: newTableName.trim() });
      setShowAddTableModal(false);
      setNewTableName('');
      // No need to manually update currentTable - it will be synced via useEffect
    }
  };

  const handleRenameTable = (tableId: number, currentName: string) => {
    setTableToRename(tableId);
    setRenameTableName(currentName);
    setShowRenameTableModal(true);
    setShowTableDropdown(false);
  };

  const confirmRenameTable = () => {
    if (tableToRename !== null && renameTableName.trim()) {
      dispatch({ type: 'RENAME_TABLE', payload: { id: tableToRename, name: renameTableName.trim() } });
      setShowRenameTableModal(false);
      setRenameTableName('');
      setTableToRename(null);
    }
  };

  const handleDeleteTable = (tableId: number, tableName: string) => {
    if (state.timetableStoragePref.length === 1) {
      // Show a simple alert modal for this case
      alert('Cannot delete the last remaining table.');
      return;
    }
    
    setTableToDelete({ id: tableId, name: tableName });
    setShowDeleteTableModal(true);
    setShowTableDropdown(false);
  };

  const confirmDeleteTable = () => {
    if (tableToDelete) {
      dispatch({ type: 'DELETE_TABLE', payload: tableToDelete.id });
      // The DELETE_TABLE action in context handles switching to another table automatically
      setShowDeleteTableModal(false);
      setTableToDelete(null);
    }
  };

  const handleQuickToggle = () => {
    const newShowState = !showQuickButtons;
    setShowQuickButtons(newShowState);

    // Don't clear data when toggling off - just hide visually
    // The cells already check quickVisualizationEnabled before showing highlights
    // This allows toggling QV on/off without losing highlight data

    dispatch({
      type: 'SET_UI_STATE',
      payload: { quickVisualizationEnabled: newShowState }
    });
  };

  const handleLiveModeToggle = () => {
    const newLiveModeState = !isLiveModeEnabled;
    setIsLiveModeEnabled(newLiveModeState);
    
    dispatch({ 
      type: 'SET_ATTACK_MODE', 
      payload: { enabled: newLiveModeState } 
    });
  };

  const handleSlotClick = (slot: string) => {
    // Toggle slot highlighting (like the original vanilla JS behavior)
    dispatch({ type: 'TOGGLE_SLOT_HIGHLIGHT', payload: slot });
  };

  // Check if a slot has a clash (simplified version)
  const hasClash = (slot: string): boolean => {
    // This is a simplified clash detection
    // In the original, it checks for time overlaps between theory and lab hours
    // For now, we'll implement a basic version that can be enhanced later
    const timetableSlot = state.timetable[slot];
    if (!timetableSlot?.course) return false;
    
    // Check for overlapping slots in the same time period
    const selectedSlots = Object.values(state.timetable).filter(s => s.isSelected && s.course);
    return selectedSlots.filter(s => s.slot !== slot && s.course?.code !== timetableSlot.course?.code).length > 0;
  };

  // ==================== CLASHING SYSTEM UTILITIES ====================
  
  // Parse slot string like "A1+B2+L3" into array, matching FFCSonTheGo logic
  const slotsProcessingForCourseList = (slotString: string): string[] => {
    const slots: string[] = [];
    const set = new Set<string>();
    
    try {
      slotString.split(/\s*\+\s*/).forEach((slot) => {
        if (slot && slot.trim()) {
          // In React, we don't have jQuery DOM check, so we'll validate against known slots
          const trimmedSlot = slot.trim();
          if (trimmedSlot !== '' && trimmedSlot !== 'SLOTS') {
            set.add(trimmedSlot);
          }
        }
      });
    } catch (error) {
      set.clear();
    }
    
    return Array.from(set);
  };

  // Expand slots using clashMap (exact replica of FFCSonTheGo updateSlots function)
  const updateSlotsWithClashMap = (inputSlots: string[]): string[] => {
    const clashMap: { [key: string]: string[] } = {
      A1: ['L1', 'L14'], B1: ['L7', 'L20'], C1: ['L13', 'L26'], D1: ['L3', 'L19', 'L4'],
      E1: ['L9', 'L25', 'L10'], F1: ['L2', 'L15', 'L16'], G1: ['L8', 'L21', 'L22'],
      TA1: ['L27', 'L28'], TB1: ['L4', 'L5'], TC1: ['L10', 'L11'], TD1: ['L29', 'L30'],
      TE1: ['L22', 'L23'], TF1: ['L28', 'L29'], TG1: ['L5', 'L6'], TAA1: ['L11', 'L12'],
      TCC1: ['L23', 'L24'], A2: ['L31', 'L44'], B2: ['L37', 'L50'], C2: ['L43', 'L56'],
      D2: ['L33', 'L49', 'L34'], E2: ['L39', 'L55', 'L40'], F2: ['L32', 'L45', 'L46'],
      G2: ['L38', 'L51', 'L52'], TA2: ['L57', 'L58'], TB2: ['L34', 'L35'], TC2: ['L40', 'L41'],
      TD2: ['L46', 'L47'], TE2: ['L52', 'L53'], TF2: ['L58', 'L59'], TG2: ['L35', 'L36'],
      TAA2: ['L41', 'L42'], TBB2: ['L47', 'L48'], TCC2: ['L53', 'L54'], TDD2: ['L59', 'L60'],
      L1: ['A1'], L2: ['F1'], L3: ['D1'], L4: ['TB1', 'D1'], L5: ['TG1', 'TB1'], L6: ['TG1'],
      L7: ['B1'], L8: ['G1'], L9: ['E1'], L10: ['TC1', 'E1'], L11: ['TAA1', 'TC1'], L12: ['TAA1'],
      L13: ['C1'], L14: ['A1'], L15: ['F1'], L16: ['V1', 'F1'], L17: ['V2', 'V1'], L18: ['V2'],
      L19: ['D1'], L20: ['B1'], L21: ['G1'], L22: ['TE1', 'G1'], L23: ['TCC1', 'TE1'], L24: ['TCC1'],
      L25: ['E1'], L26: ['C1'], L27: ['TA1'], L28: ['TF1', 'TA1'], L29: ['TD1', 'TF1'], L30: ['TD1'],
      L31: ['A2'], L32: ['F2'], L33: ['D2'], L34: ['TB2', 'D2'], L35: ['TG2', 'TB2'], L36: ['V3', 'TG2'],
      L37: ['B2'], L38: ['G2'], L39: ['E2'], L40: ['TC2', 'E2'], L41: ['TAA2', 'TC2'], L42: ['V4', 'TAA2'],
      L43: ['C2'], L44: ['A2'], L45: ['F2'], L46: ['TD2', 'F2'], L47: ['TBB2', 'TD2'], L48: ['V5', 'TBB2'],
      L49: ['D2'], L50: ['B2'], L51: ['G2'], L52: ['TE2', 'G2'], L53: ['TCC2', 'TE2'], L54: ['V6', 'TCC2'],
      L55: ['E2'], L56: ['C2'], L57: ['TA2'], L58: ['TF2', 'TA2'], L59: ['TDD2', 'TF2'], L60: ['V7', 'TDD2'],
      V1: ['L16', 'L17'], V2: ['L17', 'L18'], V3: ['L36'], V4: ['L42'], V5: ['L48'], V6: ['L54'], V7: ['L60'],
    };

    const allSlots = [...inputSlots];
    const thSlots: string[] = [];
    const labSlots: string[] = [];
    
    allSlots.forEach((slot) => {
      if (clashMap[slot]) {
        if (slot.includes('L')) {
          labSlots.push(slot);
        } else {
          thSlots.push(slot);
        }
        
        for (let i = 0; i < clashMap[slot].length; i++) {
          if (clashMap[slot][i].includes('L')) {
            labSlots.push(clashMap[slot][i]);
          } else {
            thSlots.push(clashMap[slot][i]);
          }
        }
      }
    });
    
    return thSlots.concat(labSlots);
  };

  // Get slots used by a specific course (equivalent to getSlotsOfCourse)
  const getSlotsOfCourse = (courseName: string, dataSource: any[]): string[] => {
    const slots: string[] = [];
    
    dataSource.forEach((courseData) => {
      const courseNameFromData = courseData.courseCode ? 
        `${courseData.courseCode}-${courseData.courseTitle}` : 
        courseData.courseTitle;
        
      if (courseNameFromData.toLowerCase() === courseName.toLowerCase()) {
        courseData.slots.forEach((slot: string) => {
          if (slot !== '' && slot !== 'SLOTS' && !slots.includes(slot)) {
            slots.push(slot);
          }
        });
      }
    });
    
    return updateSlotsWithClashMap(slots);
  };

  // Get all occupied slots from data source (equivalent to getSlots)
  const getAllOccupiedSlots = (dataSource: any[]): string[] => {
    const slots: string[] = [];
    
    dataSource.forEach((courseData) => {
      courseData.slots.forEach((slot: string) => {
        if (slot !== '' && slot !== 'SLOTS') {
          slots.push(slot);
        }
      });
    });
    
    return updateSlotsWithClashMap(slots);
  };

  // Subtract arr1 from arr2 (equivalent to subtractArray) - MODIFIES arr2
  const subtractSlotsArray = (slotsToRemove: string[], allSlots: string[]): string[] => {
    const result = [...allSlots]; // Work on a copy to avoid mutation
    
    slotsToRemove.forEach((slot) => {
      if (result.includes(slot)) {
        const index = result.indexOf(slot);
        if (index !== -1) {
          result.splice(index, 1);
        }
      }
    });
    
    return result;
  };

  // Check if two slot arrays have common elements (equivalent to isCommonSlot)
  const isCommonSlot = (slots1: string[], slots2: string[]): boolean => {
    return slots1.some(slot => slots2.includes(slot));
  };

  // ==================== CLASH DETECTION ENGINE ====================
  
  // Core clash detection function - replicates rearrangeTeacherLiInSubjectArea logic
  const getClashInfoForCourse = (courseName: string): {
    clashingTeachers: string[];
    nonClashingTeachers: string[];
    consideredSlots: string[];
  } => {
    // Determine data source based on mode
    const dataSource = isLiveModeEnabled ? state.activeTable.attackData : state.activeTable.data;
    
    // Step 1: Get slots used by THIS specific course (getSlotsOfCourse equivalent)
    const slotsOfCourse = getSlotsOfCourse(courseName, dataSource);
    
    // Step 2: Get ALL occupied slots across all courses (getSlots equivalent)
    const allOccupiedSlots = getAllOccupiedSlots(dataSource);
    
    // Step 3: THE CRITICAL EXCLUSION LOGIC - subtract this course's slots from global slots
    // This ensures a course doesn't clash with itself, only with OTHER courses
    const consideredSlots = subtractSlotsArray(slotsOfCourse, allOccupiedSlots);
    
    // Step 4: Get teacher information for this course from subject data
    const subjectData = state.activeTable.subject[courseName];
    if (!subjectData) {
      return { clashingTeachers: [], nonClashingTeachers: [], consideredSlots };
    }
    
    const clashingTeachers: string[] = [];
    const nonClashingTeachers: string[] = [];
    
    // Step 5: Check each teacher against considered slots
    Object.keys(subjectData.teacher).forEach((teacherName) => {
      const teacherSlotString = subjectData.teacher[teacherName].slots;
      
      // Parse teacher's slots using our utility
      const teacherSlots = slotsProcessingForCourseList(teacherSlotString);
      
      // Check if teacher's slots clash with considered slots (other courses' slots)
      if (isCommonSlot(teacherSlots, consideredSlots)) {
        clashingTeachers.push(teacherName);
      } else {
        nonClashingTeachers.push(teacherName);
      }
    });
    
    return { clashingTeachers, nonClashingTeachers, consideredSlots };
  };

  // Helper function to check if a specific teacher is clashing
  const isTeacherClashing = (courseName: string, teacherName: string): boolean => {
    const clashInfo = getClashInfoForCourse(courseName);
    return clashInfo.clashingTeachers.includes(teacherName);
  };


  // Calculate occupied slots from attack data (live mode) - Exact FFCSonTheGo logic
  const getOccupiedSlots = () => {
    const attackData = state.activeTable.attackData || [];
    const attackQuick = state.activeTable.attackQuick || [];

    // ClashMap for slot expansion (matching FFCSonTheGo exactly)
    const clashMap: { [key: string]: string[] } = {
      A1: ['L1', 'L14'], B1: ['L7', 'L20'], C1: ['L13', 'L26'], D1: ['L3', 'L19', 'L4'],
      E1: ['L9', 'L25', 'L10'], F1: ['L2', 'L15', 'L16'], G1: ['L8', 'L21', 'L22'],
      TA1: ['L27', 'L28'], TB1: ['L4', 'L5'], TC1: ['L10', 'L11'], TD1: ['L29', 'L30'],
      TE1: ['L22', 'L23'], TF1: ['L28', 'L29'], TG1: ['L5', 'L6'], TAA1: ['L11', 'L12'],
      TCC1: ['L23', 'L24'], A2: ['L31', 'L44'], B2: ['L37', 'L50'], C2: ['L43', 'L56'],
      D2: ['L33', 'L49', 'L34'], E2: ['L39', 'L55', 'L40'], F2: ['L32', 'L45', 'L46'],
      G2: ['L38', 'L51', 'L52'], TA2: ['L57', 'L58'], TB2: ['L34', 'L35'], TC2: ['L40', 'L41'],
      TD2: ['L46', 'L47'], TE2: ['L52', 'L53'], TF2: ['L58', 'L59'], TG2: ['L35', 'L36'],
      TAA2: ['L41', 'L42'], TBB2: ['L47', 'L48'], TCC2: ['L53', 'L54'], TDD2: ['L59', 'L60'],
      L1: ['A1'], L2: ['F1'], L3: ['D1'], L4: ['TB1', 'D1'], L5: ['TG1', 'TB1'], L6: ['TG1'],
      L7: ['B1'], L8: ['G1'], L9: ['E1'], L10: ['TC1', 'E1'], L11: ['TAA1', 'TC1'], L12: ['TAA1'],
      L13: ['C1'], L14: ['A1'], L15: ['F1'], L16: ['V1', 'F1'], L17: ['V2', 'V1'], L18: ['V2'],
      L19: ['D1'], L20: ['B1'], L21: ['G1'], L22: ['TE1', 'G1'], L23: ['TCC1', 'TE1'], L24: ['TCC1'],
      L25: ['E1'], L26: ['C1'], L27: ['TA1'], L28: ['TF1', 'TA1'], L29: ['TD1', 'TF1'], L30: ['TD1'],
      L31: ['A2'], L32: ['F2'], L33: ['D2'], L34: ['TB2', 'D2'], L35: ['TG2', 'TB2'], L36: ['V3', 'TG2'],
      L37: ['B2'], L38: ['G2'], L39: ['E2'], L40: ['TC2', 'E2'], L41: ['TAA2', 'TC2'], L42: ['V4', 'TAA2'],
      L43: ['C2'], L44: ['A2'], L45: ['F2'], L46: ['TD2', 'F2'], L47: ['TBB2', 'TD2'], L48: ['V5', 'TBB2'],
      L49: ['D2'], L50: ['B2'], L51: ['G2'], L52: ['TE2', 'G2'], L53: ['TCC2', 'TE2'], L54: ['V6', 'TCC2'],
      L55: ['E2'], L56: ['C2'], L57: ['TA2'], L58: ['TF2', 'TA2'], L59: ['TDD2', 'TF2'], L60: ['V7', 'TDD2'],
      V1: ['L16', 'L17'], V2: ['L17', 'L18'], V3: ['L36'], V4: ['L42'], V5: ['L48'], V6: ['L54'], V7: ['L60'],
    };

    // Step 1: Collect all raw slots from attackData
    const allSlots: string[] = [];
    attackData.forEach((course) => {
      allSlots.push(...course.slots);
    });

    const thSlots = new Set<string>();
    const labSlots = new Set<string>();

    // Step 2: Process each slot with clashMap expansion (EXACT FFCSonTheGo logic)
    allSlots.forEach((slot) => {
      if (slot.includes('L')) {
        // Lab slot
        labSlots.add(slot);
        if (clashMap[slot]) {
          clashMap[slot].forEach((relatedSlot) => {
            thSlots.add(relatedSlot);
          });
        }
      } else {
        // Theory slot
        thSlots.add(slot);
        if (clashMap[slot]) {
          clashMap[slot].forEach((relatedSlot) => {
            labSlots.add(relatedSlot);
          });
        }
      }
    });

    // Step 3: Process quick visualization slots if enabled
    if (state.ui.quickVisualizationEnabled && attackQuick.length > 0) {
      attackQuick.forEach((quickEntry: any[]) => {
        if (quickEntry.length === 3) {
          // QV tile highlight with [row, col, true]
          // We would need to map back to slot names from row/col positions
          // For now, skipping this as it's complex and rarely used
        }
      });
    }

    return {
      theory: Array.from(thSlots).sort(),
      lab: Array.from(labSlots).sort()
    };
  };

  // Helper function to get slotsForAttack (includes attackData + attackQuick if QV enabled)
  const getSlotsForAttack = () => {
    const attackData = state.activeTable.attackData || [];
    const attackQuick = state.activeTable.attackQuick || [];
    const clashMap: { [key: string]: string[] } = {
      A1: ['L1', 'L14'], B1: ['L7', 'L20'], C1: ['L13', 'L26'], D1: ['L3', 'L19', 'L4'], E1: ['L9', 'L25', 'L10'],
      F1: ['L2', 'L15', 'L16'], G1: ['L8', 'L21', 'L22'], TA1: ['L27', 'L28'], TB1: ['L4', 'L5'], TC1: ['L10', 'L11'],
      TD1: ['L29', 'L30'], TE1: ['L22', 'L23'], TF1: ['L28', 'L29'], TG1: ['L5', 'L6'], TAA1: ['L11', 'L12'], TCC1: ['L23', 'L24'],
      A2: ['L31', 'L44'], B2: ['L37', 'L50'], C2: ['L43', 'L56'], D2: ['L33', 'L49', 'L34'], E2: ['L39', 'L55', 'L40'],
      F2: ['L32', 'L45', 'L46'], G2: ['L38', 'L51', 'L52'], TA2: ['L57', 'L58'], TB2: ['L34', 'L35'], TC2: ['L40', 'L41'],
      TD2: ['L46', 'L47'], TE2: ['L52', 'L53'], TF2: ['L58', 'L59'], TG2: ['L35', 'L36'], TAA2: ['L41', 'L42'],
      TBB2: ['L47', 'L48'], TCC2: ['L53', 'L54'], TDD2: ['L59', 'L60'],
      L1: ['A1'], L2: ['F1'], L3: ['D1'], L4: ['TB1', 'D1'], L5: ['TG1', 'TB1'], L6: ['TG1'],
      L7: ['B1'], L8: ['G1'], L9: ['E1'], L10: ['TC1', 'E1'], L11: ['TAA1', 'TC1'], L12: ['TAA1'],
      L13: ['C1'], L14: ['A1'], L15: ['F1'], L16: ['F1'], L19: ['D1'], L20: ['B1'], L21: ['G1'],
      L22: ['TE1', 'G1'], L23: ['TCC1', 'TE1'], L24: ['TCC1'], L25: ['E1'], L26: ['C1'], L27: ['TA1'],
      L28: ['TF1', 'TA1'], L29: ['TD1', 'TF1'], L30: ['TD1'],
      L31: ['A2'], L32: ['F2'], L33: ['D2'], L34: ['TB2', 'D2'], L35: ['TG2', 'TB2'], L36: ['TG2'],
      L37: ['B2'], L38: ['G2'], L39: ['E2'], L40: ['TC2', 'E2'], L41: ['TAA2', 'TC2'], L42: ['TAA2'],
      L43: ['C2'], L44: ['A2'], L45: ['F2'], L46: ['TD2', 'F2'], L47: ['TBB2', 'TD2'], L49: ['D2'],
      L50: ['B2'], L51: ['G2'], L52: ['TE2', 'G2'], L53: ['TCC2', 'TE2'], L55: ['E2'], L56: ['C2'],
      L57: ['TA2'], L58: ['TF2', 'TA2'], L59: ['TDD2', 'TF2'], L60: ['TDD2']
    };

    // Get all slots from attackData
    let allSlots: string[] = [];
    attackData.forEach(course => {
      allSlots = allSlots.concat(course.slots);
    });

    // Expand using clashMap
    const thSlots = new Set<string>();
    const labSlots = new Set<string>();

    allSlots.forEach(slot => {
      if (slot.includes('L')) {
        labSlots.add(slot);
        if (clashMap[slot]) {
          clashMap[slot].forEach(relatedSlot => {
            thSlots.add(relatedSlot);
          });
        }
      } else {
        thSlots.add(slot);
        if (clashMap[slot]) {
          clashMap[slot].forEach(relatedSlot => {
            labSlots.add(relatedSlot);
          });
        }
      }
    });

    // If QV is enabled, process attackQuick
    if (state.ui.quickVisualizationEnabled) {
      // Note: In React, we can't query DOM cells like vanilla JS
      // We'll need to use the slot text directly from our quick array entries
      // For now, skip this as it requires passing additional context
    }

    const combinedSlots = Array.from(thSlots).concat(Array.from(labSlots));
    return combinedSlots;
  };

  // Handle cell click following FFCSonTheGo logic
  const handleCellClick = (row: number, col: number, slotText: string) => {
    const activeQuick = state.ui.attackMode ? state.activeTable.attackQuick : state.activeTable.quick;

    // Parse cell text to get lab slots
    const parts = slotText.split(' / ');
    const labSlots = parts.filter(slot => slot.trim().startsWith('L')).map(s => s.trim());

    // Check if cell is currently highlighted
    const isHighlighted = activeQuick.some((entry: any[]) =>
      entry[0] === row && entry[1] === col
    );

    // Block click in attack mode if lab slots are already in slotsForAttack
    if (state.ui.attackMode && labSlots.length > 0 && !isHighlighted) {
      const occupied = getSlotsForAttack();
      if (isCommonSlot(labSlots, occupied)) {
        return; // Block the click
      }
    }

    // Only process if QV is enabled
    if (!state.ui.quickVisualizationEnabled) {
      return;
    }

    // Check if cell has courses (don't allow click if it has courses)
    const dataToCheck = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;
    const theorySlot = parts[0]?.trim();
    const labSlot = parts[1]?.trim() || null;
    const hasCourses = dataToCheck.some(course =>
      course.slots.includes(theorySlot) || (labSlot && course.slots.includes(labSlot))
    );

    if (hasCourses) {
      return; // Don't allow click on cells with courses
    }

    // Dispatch the cell click action
    // The yellow tile state will automatically update based on the quick array
    dispatch({
      type: 'PROCESS_CELL_CLICK',
      payload: { row, col, slotText }
    });
  };

  const renderTimetableRows = () => {
    const rows: React.ReactElement[] = [];
    
    // EXACT HTML structure matching the provided timetable
    
    // Theory Row - EXACT times from provided HTML
    const theoryRow = [
      <td key="theory-label" className="day">THEORY <br />HOURS</td>,
      <td key="theory-1" className="theory-hour">8:00 AM<br />to<br />8:50 AM</td>,
      <td key="theory-2" className="theory-hour">9:00 AM<br />to<br />9:50 AM</td>,
      <td key="theory-3" className="theory-hour">10:00 AM<br />to<br />10:50 AM</td>,
      <td key="theory-4" className="theory-hour">11:00 AM<br />to<br />11:50 AM</td>,
      <td key="theory-5" className="theory-hour">12:00 PM<br />to<br />12:50 PM</td>,
      <td key="theory-empty" className="theory-hour"></td>,
      <td key="lunch" className="lunch" style={{ width: '8px' }} rowSpan={9}>L<br />U<br />N<br />C<br />H</td>,
      <td key="theory-6" className="theory-hour">2:00 PM<br />to<br />2:50 PM</td>,
      <td key="theory-7" className="theory-hour">3:00 PM<br />to<br />3:50 PM</td>,
      <td key="theory-8" className="theory-hour">4:00 PM<br />to<br />4:50 PM</td>,
      <td key="theory-9" className="theory-hour">5:00 PM<br />to<br />5:50 PM</td>,
      <td key="theory-10" className="theory-hour">6:00 PM<br />to<br />6:50 PM</td>,
      <td key="theory-11" className="theory-hour">6:51 PM<br />to<br />7:00 PM</td>,
      <td key="theory-12" className="theory-hour">7:01 PM<br />to<br />7:50 PM</td>
    ];
    
    // Lab Row - EXACT times from provided HTML
    const labRow = [
      <td key="lab-label" className="day">LAB <br />HOURS</td>,
      <td key="lab-1" className="lab-hour">08:00 AM<br />to<br />08:50 AM</td>,
      <td key="lab-2" className="lab-hour">08:51 AM<br />to<br />09:40 AM</td>,
      <td key="lab-3" className="lab-hour">09:51 AM<br />to<br />10:40 AM</td>,
      <td key="lab-4" className="lab-hour">10:41 AM<br />to<br />11:30 AM</td>,
      <td key="lab-5" className="lab-hour">11:40 AM<br />to<br />12:30 PM</td>,
      <td key="lab-6" className="lab-hour">12:31 PM<br />to<br />1:20 PM</td>,
      // No lunch cell in lab row - it's handled by theory row's rowspan
      <td key="lab-7" className="lab-hour">2:00 PM<br />to<br />2:50 PM</td>,
      <td key="lab-8" className="lab-hour">2:51 PM<br />to<br />3:40 PM</td>,
      <td key="lab-9" className="lab-hour">3:51 PM<br />to<br />4:40 PM</td>,
      <td key="lab-10" className="lab-hour">4:41 PM<br />to<br />5:30 PM</td>,
      <td key="lab-11" className="lab-hour">5:40 PM<br />to<br />6:30 PM</td>,
      <td key="lab-12" className="lab-hour">6:31 PM<br />to<br />7:20 PM</td>,
      <td key="lab-empty" className="lab-hour"></td>
    ];
    
    // Day rows with theory+lab content (format: TheoryCode / LabCode)
    const dayRowsData = {
      mon: ['A1 / L1', 'F1 / L2', 'D1 / L3', 'TB1 / L4', 'TG1 / L5', 'L6', 'A2 / L31', 'F2 / L32', 'D2 / L33', 'TB2 / L34', 'TG2 / L35', 'L36', 'V3'],
      tue: ['B1 / L7', 'G1 / L8', 'E1 / L9', 'TC1 / L10', 'TAA1 / L11', 'L12', 'B2 / L37', 'G2 / L38', 'E2 / L39', 'TC2 / L40', 'TAA2 / L41', 'L42', 'V4'],
      wed: ['C1 / L13', 'A1 / L14', 'F1 / L15', 'V1 / L16', 'V2 / L17', 'L18', 'C2 / L43', 'A2 / L44', 'F2 / L45', 'TD2 / L46', 'TBB2 / L47', 'L48', 'V5'],
      thu: ['D1 / L19', 'B1 / L20', 'G1 / L21', 'TE1 / L22', 'TCC1 / L23', 'L24', 'D2 / L49', 'B2 / L50', 'G2 / L51', 'TE2 / L52', 'TCC2 / L53', 'L54', 'V6'],
      fri: ['E1 / L25', 'C1 / L26', 'TA1 / L27', 'TF1 / L28', 'TD1 / L29', 'L30', 'E2 / L55', 'C2 / L56', 'TA2 / L57', 'TF2 / L58', 'TDD2 / L59', 'L60', 'V7'],
      sat: ['', '', '', '', '', '', '', '', '', '', '', '', ''],
      sun: ['', '', '', '', '', '', '', '', '', '', '', '', '']
    };
    
    // Time slots for each column index - separate for theory and lab
    const theoryTimes = [
      { start: '08:00', end: '08:50' },  // index 0
      { start: '09:00', end: '09:50' },  // index 1
      { start: '10:00', end: '10:50' },  // index 2
      { start: '11:00', end: '11:50' },  // index 3
      { start: '12:00', end: '12:50' },  // index 4
      null,                               // index 5 (no theory slot)
      { start: '14:00', end: '14:50' },  // index 6
      { start: '15:00', end: '15:50' },  // index 7
      { start: '16:00', end: '16:50' },  // index 8
      { start: '17:00', end: '17:50' },  // index 9
      { start: '18:00', end: '18:50' },  // index 10
      { start: '18:51', end: '19:00' },  // index 11
      { start: '19:01', end: '19:50' },  // index 12
    ];

    const labTimes = [
      { start: '08:00', end: '08:50' },  // index 0
      { start: '08:51', end: '09:40' },  // index 1
      { start: '09:51', end: '10:40' },  // index 2
      { start: '10:41', end: '11:30' },  // index 3
      { start: '11:40', end: '12:30' },  // index 4
      { start: '12:31', end: '13:20' },  // index 5
      { start: '14:00', end: '14:50' },  // index 6
      { start: '14:51', end: '15:40' },  // index 7
      { start: '15:51', end: '16:40' },  // index 8
      { start: '16:41', end: '17:30' },  // index 9
      { start: '17:40', end: '18:30' },  // index 10
      { start: '18:31', end: '19:20' },  // index 11
      null,                               // index 12 (no lab slot)
    ];

    // Helper: Convert time string to minutes since midnight
    const timeToMinutes = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Collect clashing courseIds during render (FFCSonTheGo pattern)
    const clashingCourseIds: number[] = [];

    // Track cells that should have 'clash' class due to time overlap
    const timeOverlapCells = new Set<string>(); // Format: "day-index"

    // Store cell data for time overlap checking (Scenario B)
    type CellData = {
      day: string;
      index: number;
      coursesInSlot: CourseData[];
      startTime: number;
      endTime: number;
    };
    const allCells: CellData[] = [];

    // FIRST PASS: Collect all cell data
    const dataToCheck = isLiveModeEnabled ? state.activeTable.attackData : state.activeTable.data;

    DAYS.forEach(day => {
      const slots = dayRowsData[day as keyof typeof dayRowsData] || [];

      slots.forEach((slotText, index) => {
        if (slotText) {
          const parts = slotText.split(' / ');
          const theorySlot = parts[0]?.trim();
          const labSlot = parts[1]?.trim() || null;

          // Check for courses in theory slot
          const theoryCoursesInSlot = dataToCheck.filter(course =>
            theorySlot && course.slots.includes(theorySlot)
          );

          // Check for courses in lab slot
          const labCoursesInSlot = dataToCheck.filter(course =>
            labSlot && course.slots.includes(labSlot)
          );

          // Add theory slot cell if it has courses and valid time
          if (theoryCoursesInSlot.length > 0 && index < theoryTimes.length && theoryTimes[index]) {
            const timeSlot = theoryTimes[index]!;
            allCells.push({
              day,
              index,
              coursesInSlot: theoryCoursesInSlot,
              startTime: timeToMinutes(timeSlot.start),
              endTime: timeToMinutes(timeSlot.end)
            });
          }

          // Add lab slot cell if it has courses and valid time
          if (labCoursesInSlot.length > 0 && index < labTimes.length && labTimes[index]) {
            const timeSlot = labTimes[index]!;
            allCells.push({
              day,
              index,
              coursesInSlot: labCoursesInSlot,
              startTime: timeToMinutes(timeSlot.start),
              endTime: timeToMinutes(timeSlot.end)
            });
          }
        }
      });
    });

    // SECOND PASS: Check for time overlaps and mark clashing cells
    // Need to check ALL pairs of cells on the same day, not just adjacent ones
    for (let i = 0; i < allCells.length; i++) {
      for (let j = i + 1; j < allCells.length; j++) {
        const cell1 = allCells[i];
        const cell2 = allCells[j];

        // Only check cells on the same day
        if (cell1.day === cell2.day) {
          // Check if time ranges overlap
          // Two ranges overlap if: start1 < end2 AND start2 < end1
          const overlaps = cell1.startTime < cell2.endTime && cell2.startTime < cell1.endTime;

          if (overlaps) {
            // Mark both cells with time overlap
            timeOverlapCells.add(`${cell1.day}-${cell1.index}`);
            timeOverlapCells.add(`${cell2.day}-${cell2.index}`);

            // Mark courses in BOTH cells as clashing
            cell1.coursesInSlot.forEach(course => {
              if (!clashingCourseIds.includes(course.courseId)) {
                clashingCourseIds.push(course.courseId);
              }
            });

            cell2.coursesInSlot.forEach(course => {
              if (!clashingCourseIds.includes(course.courseId)) {
                clashingCourseIds.push(course.courseId);
              }
            });
          }
        }
      }
    }

    // THIRD PASS: Render cells with correct classes
    const dayRows: { [key: string]: React.ReactElement[] } = {};

    DAYS.forEach(day => {
      dayRows[day] = [<td key={`${day}-label`} className="day">{day.toUpperCase()}</td>];

      const slots = dayRowsData[day as keyof typeof dayRowsData] || [];

      slots.forEach((slotText, index) => {
        if (slotText) {
          // Original logic with theory/lab handling restored
          const parts = slotText.split(' / ');
          const theorySlot = parts[0]?.trim();
          const labSlot = parts[1]?.trim() || null;

          // Check for courses in this slot (live mode or normal mode)
          const dataToCheck = isLiveModeEnabled ? state.activeTable.attackData : state.activeTable.data;
          const coursesInSlot = dataToCheck.filter(course =>
            course.slots.includes(theorySlot) || (labSlot && course.slots.includes(labSlot))
          );

          // Check if this specific cell is highlighted in quick array
          const quickArray = isLiveModeEnabled ? state.activeTable.attackQuick : state.activeTable.quick;
          const dayRowMap: { [key: string]: number } = {
            mon: 2, tue: 3, wed: 4, thu: 5, fri: 6, sat: 7, sun: 8
          };
          const currentRow = dayRowMap[day];
          // Calculate actual column in table accounting for lunch column
          // Columns 0-5 in dayRowsData map to columns 1-6 in table
          // Columns 6-12 in dayRowsData map to columns 8-14 in table (skip lunch at column 7)
          const currentCol = index < 6 ? index + 1 : index + 2;

          const isQuickHighlighted = quickArray.some((entry: any[]) => {
            if (entry.length === 2) {
              // Individual cell highlight [row, col]
              return entry[0] === currentRow && entry[1] === currentCol;
            } else if (entry.length === 3 && entry[2] === true) {
              // QV tile highlight [row, col, true]
              return entry[0] === currentRow && entry[1] === currentCol;
            }
            return false;
          });

          // Only apply quick highlighting when quickVisualizationEnabled is true (like vanilla JS)
          const isHighlighted = (state.ui.quickVisualizationEnabled && isQuickHighlighted) || coursesInSlot.length > 0;

          const classNames = ['period', theorySlot].filter(Boolean);
          if (isHighlighted) classNames.push('highlight');

          // FFCSonTheGo Scenario A: Multiple courses in same cell
          if (coursesInSlot.length > 1) {
            classNames.push('clash');

            // Mark all courses in this cell as clashing
            coursesInSlot.forEach(course => {
              if (!clashingCourseIds.includes(course.courseId)) {
                clashingCourseIds.push(course.courseId);
              }
            });
          }

          // FFCSonTheGo Scenario B: Time overlap with adjacent cells
          if (timeOverlapCells.has(`${day}-${index}`)) {
            classNames.push('clash');
          }

          dayRows[day].push(
            <td
              key={`${day}-${index}`}
              className={classNames.join(' ')}
              onClick={() => {
                // Implement FFCSonTheGo cell click logic
                handleCellClick(currentRow, currentCol, slotText);
              }}
            >
              {/* Always show slot label (A1 / L1) at the top */}
              <div className="slot-label" style={{ fontSize: '0.75em', color: '#e0e0e0', marginBottom: '2px' }}>
                {slotText}
              </div>

              {/* Show course codes below the slot label */}
              {coursesInSlot.length > 0 && (
                coursesInSlot.map((course, courseIndex) => {
                  // Find the teacher's color from the subject data
                  const subjectName = course.courseCode ?
                    `${course.courseCode}-${course.courseTitle}` :
                    course.courseTitle;
                  const teacherData = state.activeTable.subject[subjectName]?.teacher[course.faculty];

                  return (
                    <div
                      key={`${course.courseId}-${courseIndex}`}
                      data-course={`course${course.courseId}`}
                      className="course-code"
                      style={{
                        marginBottom: courseIndex < coursesInSlot.length - 1 ? '2px' : '0',
                        fontSize: '0.85em',
                        fontWeight: '500'
                      }}
                    >
                      {course.courseCode || course.courseTitle}
                      {course.venue && course.venue !== 'VENUE' ? `-${course.venue}` : ''}
                    </div>
                  );
                })
              )}
            </td>
          );
        } else {
          dayRows[day].push(
            <td key={`${day}-empty-${index}`} className="period"></td>
          );
        }
      });
    });

    // Build final rows array
    rows.push(
      <tr key="theory" id="theory">{theoryRow}</tr>,
      <tr key="lab" id="lab">{labRow}</tr>
    );

    // Add day rows - hide SAT and SUN
    DAYS.forEach(day => {
      const shouldHide = day === 'sat' || day === 'sun';
      rows.push(
        <tr key={day} id={day} style={shouldHide ? { display: 'none' } : {}}>
          {dayRows[day]}
        </tr>
      );
    });

    return { rows, clashingCourseIds };
  };

  // Compute timetable rendering result (rows + clashing course IDs)
  const timetableResult = useMemo(() => {
    return renderTimetableRows();
  }, [dataKey, state.activeTable.data, state.activeTable.attackData, state.ui.attackMode]);

  // Dispatch clashing course IDs to context
  useEffect(() => {
    dispatch({ type: 'SET_CLASHING_COURSES', payload: timetableResult.clashingCourseIds });
  }, [timetableResult.clashingCourseIds, dispatch]);

  const renderQuickButtons = () => {
    const handleQuickButtonClick = (slot: string) => {
      // FFCSonTheGo QV tile click logic

      // Define where each theory slot appears in the timetable
      const slotPositions: { [key: string]: [number, number][] } = {
        'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
        'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
        'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
        'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
        'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 14]],
        'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 14]],
        'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 14]],
        'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 14]],
        'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 14]]
      };

      const positions = slotPositions[slot] || [];
      if (positions.length === 0) return;

      // Check if tile is visually highlighted (ALL cells highlighted, either 2-element OR 3-element)
      const quickArray = state.ui.attackMode ? state.activeTable.attackQuick : state.activeTable.quick;
      const isHighlighted = positions.every(([r, c]) =>
        quickArray.some((entry: any[]) => entry[0] === r && entry[1] === c)
      );

      // FFCSonTheGo logic: Prevent click in attack mode if slot is in slotsForAttack and NOT highlighted
      // This blocks clicks when the tile is not fully highlighted AND the slot clashes with existing selections
      if (state.ui.attackMode && !isHighlighted) {
        const occupied = getSlotsForAttack();
        if (occupied.includes(slot)) {
          console.log(`🚫 Blocking ${slot} tile click in attack mode: slot is in slotsForAttack but tile not highlighted`);
          return; // Block the click
        }
      }

      // Check if all cells are empty (no courses) and no clash class
      const dataToCheck = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;
      const hasCourses = dataToCheck.some(course => course.slots.includes(slot));

      if (hasCourses) {
        return; // Don't allow highlighting slots with courses
      }

      // Dispatch the action to toggle highlight
      dispatch({
        type: 'PROCESS_QV_SLOT_HIGHLIGHT',
        payload: { slot, positions }
      });
    };

    const renderButton = (slot: string) => {
      // Check if this slot is highlighted in quick array (QV tile highlights have third parameter true)
      const quickArray = isLiveModeEnabled ? state.activeTable.attackQuick : state.activeTable.quick;
      
      // Define where each theory slot appears in the timetable based on dayRowsData
      // Column mapping: dayRowsData index 0-5 -> table col 1-6, index 6-12 -> table col 8-14 (lunch at col 7)
      const slotPositions: { [key: string]: [number, number][] } = {
        // First period slots
        'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
        'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
        'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
        'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
        // Second period slots
        'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 14]],
        'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 14]],
        'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 14]],
        'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 14]],
        'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 14]],
      };
      
      const cellsWithSlot = slotPositions[slot] || [];

      // FFCSonTheGo logic (line 3640): Check if ALL cells with this slot are highlighted
      // This includes both QV tile clicks (3-element) AND individual cell clicks (2-element)
      const allCellsHighlighted = cellsWithSlot.length > 0 && cellsWithSlot.every(([r, c]) =>
        quickArray.some((entry: any[]) => {
          // Match if row and col match (either 2-element or 3-element entry)
          return entry[0] === r && entry[1] === c;
        })
      );

      const dataToCheck = isLiveModeEnabled ? state.activeTable.attackData : state.activeTable.data;
      const hasCoursesInSlot = dataToCheck.some(course =>
        course.slots.includes(slot)
      );
      const shouldHighlight = allCellsHighlighted || hasCoursesInSlot;
      
      return (
        <td key={slot}>
          <button 
            type="button"
            className={`${slot}-tile btn quick-button${shouldHighlight ? ' highlight' : ''}`}
            onClick={() => handleQuickButtonClick(slot)}
          >
            {slot}
          </button>
        </td>
      );
    };

    return (
      <>
        {/* Quick selection tiles - Above the timetable */}
        <div className="container-sm my-2 quick-buttons noselect" style={{ display: showQuickButtons ? 'block' : 'none' }}>
          <div>
            <table>
              <tbody>
                <tr>
                  {renderButton('A1')}
                  {renderButton('B1')}
                  {renderButton('C1')}
                  {renderButton('D1')}
                  {renderButton('E1')}
                  {renderButton('F1')}
                  {renderButton('G1')}
                  {renderButton('V1')}
                  {renderButton('V2')}
                </tr>
                <tr>
                  {renderButton('TA1')}
                  {renderButton('TB1')}
                  {renderButton('TC1')}
                  {renderButton('TE1')}
                  {renderButton('TF1')}
                  {renderButton('TG1')}
                  {renderButton('TD1')}
                </tr>
                <tr>
                  {renderButton('TAA1')}
                  {renderButton('TCC1')}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const renderQuickButtonsBelow = () => {
    const handleQuickButtonClick = (slot: string) => {
      // QV tile click - find ALL cells with this theory slot and highlight them
      // Use the predefined mapping instead of DOM querying for accuracy
      
      // Define where each theory slot appears in the timetable based on dayRowsData
      // Row indices: theory=0, lab=1, mon=2, tue=3, wed=4, thu=5, fri=6, sat=7, sun=8
      // Column indices: day=0, then periods 1-13 (but lunch column is added after period 6)
      const slotPositions: { [key: string]: [number, number][] } = {
        // First period slots (columns 1-6 in dayRowsData become columns 1-6 in table)
        'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
        'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
        'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
        'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
        // Second period slots (columns 6-12 in dayRowsData become columns 8-14 in table, accounting for lunch)
        'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 13]],
        'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 13]],
        'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 13]],
        'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 13]],
        'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 13]],
      };
      
      const positions = slotPositions[slot] || [];
      if (positions.length === 0) return;

      // Check if tile is visually highlighted (ALL cells highlighted, either 2-element OR 3-element)
      const quickArray = state.ui.attackMode ? state.activeTable.attackQuick : state.activeTable.quick;
      const isHighlighted = positions.every(([r, c]) =>
        quickArray.some((entry: any[]) => entry[0] === r && entry[1] === c)
      );

      // FFCSonTheGo logic: Prevent click in attack mode if slot is in slotsForAttack and NOT highlighted
      // This blocks clicks when the tile is not fully highlighted AND the slot clashes with existing selections
      if (state.ui.attackMode && !isHighlighted) {
        const occupied = getSlotsForAttack();
        if (occupied.includes(slot)) {
          console.log(`🚫 Blocking ${slot} tile click in attack mode: slot is in slotsForAttack but tile not highlighted`);
          return; // Block the click
        }
      }

      // Check if all cells are empty (no courses) and no clash class
      const dataToCheck = state.ui.attackMode ? state.activeTable.attackData : state.activeTable.data;
      const hasCourses = dataToCheck.some(course => course.slots.includes(slot));

      if (hasCourses) {
        return; // Don't allow highlighting slots with courses
      }

      // Dispatch the action to toggle highlight
      dispatch({
        type: 'PROCESS_QV_SLOT_HIGHLIGHT',
        payload: { slot, positions }
      });
    };

    const renderButton = (slot: string) => {
      // Check if this slot is highlighted in quick array (QV tile highlights have third parameter true)
      const quickArray = isLiveModeEnabled ? state.activeTable.attackQuick : state.activeTable.quick;
      
      // Define where each theory slot appears in the timetable based on dayRowsData
      // Row indices: theory=0, lab=1, mon=2, tue=3, wed=4, thu=5, fri=6, sat=7, sun=8
      // Column mapping: dayRowsData index 0-5 -> table col 1-6, index 6-12 -> table col 8-14 (lunch at col 7)
      const slotPositions: { [key: string]: [number, number][] } = {
        // First period slots
        'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
        'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
        'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
        'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
        // Second period slots
        'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 14]],
        'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 14]],
        'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 14]],
        'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 14]],
        'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 14]],
      };
      
      const cellsWithSlot = slotPositions[slot] || [];

      // FFCSonTheGo logic (line 3640): Check if ALL cells with this slot are highlighted
      // This includes both QV tile clicks (3-element) AND individual cell clicks (2-element)
      const allCellsHighlighted = cellsWithSlot.length > 0 && cellsWithSlot.every(([r, c]) =>
        quickArray.some((entry: any[]) => {
          // Match if row and col match (either 2-element or 3-element entry)
          return entry[0] === r && entry[1] === c;
        })
      );

      const dataToCheck = isLiveModeEnabled ? state.activeTable.attackData : state.activeTable.data;
      const hasCoursesInSlot = dataToCheck.some(course =>
        course.slots.includes(slot)
      );
      const shouldHighlight = allCellsHighlighted || hasCoursesInSlot;
      
      return (
        <td key={slot}>
          <button 
            type="button"
            className={`${slot}-tile btn quick-button${shouldHighlight ? ' highlight' : ''}`}
            onClick={() => handleQuickButtonClick(slot)}
          >
            {slot}
          </button>
        </td>
      );
    };

    return (
      <>
        {/* Quick selection tiles - Below the timetable */}
        <div className="container-sm mt-3 quick-buttons noselect" style={{ display: showQuickButtons ? 'block' : 'none' }}>
          <div>
            <table>
              <tbody>
                <tr>
                  {renderButton('A2')}
                  {renderButton('B2')}
                  {renderButton('C2')}
                  {renderButton('D2')}
                  {renderButton('E2')}
                  {renderButton('F2')}
                  {renderButton('G2')}
                  {renderButton('V3')}
                  {renderButton('V4')}
                  {renderButton('V5')}
                  {renderButton('V6')}
                  {renderButton('V7')}
                </tr>
                <tr>
                  {renderButton('TA2')}
                  {renderButton('TB2')}
                  {renderButton('TC2')}
                  {renderButton('TD2')}
                  {renderButton('TE2')}
                  {renderButton('TF2')}
                  {renderButton('TG2')}
                </tr>
                <tr>
                  {renderButton('TAA2')}
                  {renderButton('TBB2')}
                  {renderButton('TCC2')}
                  {renderButton('TDD2')}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  return (
    <div key={`timetable-${dataKey}`}>
      {/* Option buttons for the timetable */}
      <div className="container-sm px-4">
        <div id="option-buttons" className="row justify-content-between">
          <div className="col-auto mb-2 text-center">
            <div className="btn-group" role="group" style={{gap: '0px'}}>
                            <div className="btn-group" ref={dropdownRef}>
                <button
                  id="tt-picker-button"
                  className="btn btn-primary dropdown-toggle"
                  type="button"
                  onClick={() => setShowTableDropdown(!showTableDropdown)}
                  aria-expanded={showTableDropdown}
                >
                  {state.timetableStoragePref.find(t => t.id === currentTable)?.name || 'Default Table'}
                </button>
                {showTableDropdown && (
                  <ul id="tt-picker-dropdown" className="dropdown-menu show" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 1000, minWidth: '250px' }}>
                    {state.timetableStoragePref.map((table) => (
                      <li key={table.id}>
                        <div className="dropdown-item d-flex justify-content-between align-items-center px-3 py-2">
                          <a
                            href="#"
                            className="flex-grow-1 text-start"
                            onClick={(e) => {
                              e.preventDefault();
                              handleTableSwitch(table.id);
                              setShowTableDropdown(false);
                            }}
                            style={{ textDecoration: 'none', color: 'inherit', marginRight: '10px' }}
                          >
                            {table.name}
                          </a>
                          <div className="d-flex gap-1">
                            <button
                              className="btn btn-sm btn-outline-secondary"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRenameTable(table.id, table.name);
                              }}
                              title="Rename"
                              style={{ padding: '2px 6px', fontSize: '12px' }}
                            >
                              <i className="fas fa-edit text-white"></i>
                            </button>
                            {state.timetableStoragePref.length > 1 && (
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleDeleteTable(table.id, table.name);
                                }}
                                title="Delete"
                                style={{ padding: '2px 6px', fontSize: '12px' }}
                              >
                                <i className="fas fa-trash text-white"></i>
                              </button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <button
                id="tt-picker-add"
                type="button"
                className="btn btn-primary"
                title="Add Table"
                onClick={handleAddTable}
              >
                <i className="fas fa-plus"></i>
              </button>
            </div>
          </div>

          <div className="col-auto mb-2 text-center">
            <button
              className="btn btn-success m-2"
              type="button"
              onClick={() => {
                document.getElementById('download-modal')?.click();
              }}
            >
              <i className="fas fa-download"></i>
              <span>&nbsp;&nbsp;Download Timetable</span>
            </button>

            <button
              id="quick-toggle"
              className={`btn ms-1 me-1 btn-warning text-white m-2`}
              type="button"
              onClick={handleQuickToggle}
            >
              <i className="fas fa-eye text-white"></i>
              <span className='text-white'>&nbsp;&nbsp;
                {showQuickButtons ? 'Disable' : 'Enable'} Quick Visualization
              </span>
            </button>

            <button
              className="btn btn-danger m-2"
              type="button"
              onClick={() => {
                document.getElementById('reset-modal')?.click();
              }}
            >
              <i className="fas fa-redo"></i>
              <span>&nbsp;&nbsp;Reset Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Quick selection tiles - Above timetable */}
      {renderQuickButtons()}

      {/* Main Timetable */}
      <div className="container-xxl text-center noselect">
        <div id="timetable" className="table-responsive">
          <table className="mb-0 mt-2 table table-bordered">
            <tbody>
              {timetableResult.rows}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick selection tiles - Below timetable */}
      {renderQuickButtonsBelow()}

      {/* Custom Modals */}
      
      {/* Add Table Modal */}
      {showAddTableModal && (
        <div 
          className="modal show d-block" 
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddTableModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowAddTableModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => { e.preventDefault(); confirmAddTable(); }}>
                  <div className="mb-3">
                    <label htmlFor="new-table-name" className="col-form-label">
                      Table Name
                    </label>
                    <input
                      id="new-table-name"
                      className="form-control"
                      type="text"
                      autoComplete="off"
                      placeholder="Enter table name"
                      value={newTableName}
                      onChange={(e) => setNewTableName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddTableModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={confirmAddTable}
                  disabled={!newTableName.trim()}
                >
                  Add Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rename Table Modal */}
      {showRenameTableModal && (
        <div 
          className="modal show d-block" 
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowRenameTableModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Rename Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowRenameTableModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form onSubmit={(e) => { e.preventDefault(); confirmRenameTable(); }}>
                  <div className="mb-3">
                    <label htmlFor="rename-table-name" className="col-form-label">
                      Table Name
                    </label>
                    <input
                      id="rename-table-name"
                      className="form-control"
                      type="text"
                      autoComplete="off"
                      placeholder="Enter new table name"
                      value={renameTableName}
                      onChange={(e) => setRenameTableName(e.target.value)}
                      autoFocus
                    />
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowRenameTableModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={confirmRenameTable}
                  disabled={!renameTableName.trim()}
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Table Modal */}
      {showDeleteTableModal && tableToDelete && (
        <div 
          className="modal show d-block" 
          tabIndex={-1}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDeleteTableModal(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Table</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteTableModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete <strong>"{tableToDelete.name}"</strong>? 
                  This action cannot be undone and all data in this table will be lost.
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteTableModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDeleteTable}
                >
                  Yes, Delete Table
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sticky anchor for scroll button */}
      <a
        href="#course_list11"
        className="sticky"
        id="course_list11"
        title="Go to Course List"
      ></a>
    </div>
  );
}