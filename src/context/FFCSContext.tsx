'use client';

import React, { createContext, useContext, useReducer, useEffect, useRef, ReactNode } from 'react';
import localforage from 'localforage';
import { socketService } from '@/services/socketService';

// Clash map from vanilla JS - used for slot conflict detection
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
  L25: ['E1'], L26: ['C1'], L27: ['TA1'], L28: ['TF1', 'TA1'], L29: ['TD1', 'TF1'], L30: ['TD1']
};
import { slotsExistInNonLectureFormat } from '@/constants/timetableConstants';

// Utility function to process compound slots like L23+L53 (from vanilla JS)
function slotsProcessingForCourseList(slotString: string): string[] {
  const slots: string[] = [];
  const set = new Set<string>();
  
  try {
    slotString.split(/\s*\+\s*/).forEach((slot) => {
      if (slot && slot.trim()) {
        set.add(slot.trim());
      }
    });
  } catch (error) {
    set.clear();
  }
  
  return Array.from(set);
}

// Types
export interface Course {
  code: string;
  name: string;
  credits: number;
  teachers: Teacher[];
}

export interface Teacher {
  name: string;
  slot: string;
  venue: string;
  color: string;
  course: string;
}

export interface TimetableSlot {
  slot: string;
  course?: Course;
  teacher?: Teacher;
  isSelected: boolean;
}

// Match vanilla JS data structure
export interface TeacherData {
  slots: string;
  venue: string;
  color: string;  // Added color field to match vanilla JS
}

export interface SubjectData {
  teacher: {
    [teacherName: string]: TeacherData;
  };
  credits: number;
}

// Course data structure for the data array
export interface CourseData {
  courseId: number;
  courseTitle: string;
  faculty: string;
  slots: string[];
  venue: string;
  credits: number;
  isProject: boolean;
  courseCode: string;
}

export interface TimetableData {
  id: number;
  name: string;
  data: CourseData[];        // Course enrollment data
  subject: {         // Subject/course list - changed from array to object
    [courseName: string]: SubjectData;
  };
  quick: number[][];       // Quick visualization data [[row, column, isHighlighted?]]
  attackData: CourseData[];  // Attack mode data
  attackQuick: number[][]; // Attack mode quick visualization
}

// Global variables from vanilla JS
export interface GlobalVars {
  editSub: boolean;
  editTeacher: boolean;
  sortableIsActive: boolean;
  attackData: CourseData[];
  attackQuick: number[][];
  slotsExistInNonLectureFormat: Set<string>;
  clashMap: { [key: string]: string[] };
}

export interface FFCSState {
  // Array of timetables matching vanilla JS structure
  timetableStoragePref: TimetableData[];
  activeTable: TimetableData;
  currentTableId: number;

  // Backend sync status
  syncStatus: {
    isSynced: boolean;
    isSaving: boolean;
    lastSyncTime: number | null;
    error: string | null;
  };

  // Force update counter for React re-renders
  forceUpdateCounter: number;
  
  // Legacy fields for compatibility
  courses: Course[];
  selectedCourses: Course[];
  timetable: { [key: string]: TimetableSlot };
  currentCampus: 'Vellore' | 'Chennai';
  
  editMode: {
    isEditingCourse: boolean;
    isEditingTeacher: boolean;
    editingCourseId?: string;
    editingTeacherId?: string;
  };
  ui: {
    quickVisualizationEnabled: boolean;
    autoFocusEnabled: boolean;
    courseEditEnabled: boolean;
    liveFFCSMode: boolean;
    liveModeEnabled: boolean;
    attackMode: boolean;
    attackModeEnabled: boolean;
    pendingQVSlot?: string;
  };
  totalCredits: number;
  
  // Global variables from vanilla JS
  globalVars: GlobalVars;
}

// Action types
type FFCSAction =
  | { type: 'ADD_COURSE'; payload: Course }
  | { type: 'REMOVE_COURSE'; payload: string }
  | { type: 'UPDATE_COURSE'; payload: Course }
  | { type: 'ADD_TEACHER'; payload: { courseCode: string; teacher: Teacher } }
  | { type: 'REMOVE_TEACHER'; payload: { courseCode: string; teacherName: string } }
  | { type: 'UPDATE_TEACHER'; payload: { courseCode: string; teacher: Teacher } }
  | { type: 'SELECT_SLOT'; payload: { slot: string; course?: Course; teacher?: Teacher } }
  | { type: 'DESELECT_SLOT'; payload: string }
  | { type: 'TOGGLE_SLOT_HIGHLIGHT'; payload: string }
  | { type: 'TOGGLE_CELL_HIGHLIGHT'; payload: { day: string; index: number; theorySlot: string } }
  | { type: 'TOGGLE_QV_SLOT_HIGHLIGHT'; payload: string }
  | { type: 'PROCESS_QV_SLOT_HIGHLIGHT'; payload: { slot: string; positions: [number, number][] } }
  | { type: 'PROCESS_CELL_CLICK'; payload: { row: number; col: number; slotText: string } }
  | { type: 'CLEANUP_QUICK_ON_TEACHER_SELECT'; payload: { teacherSlots: string[] } }
  | { type: 'CLEAR_QV_HIGHLIGHTS' }
  | { type: 'SWITCH_CAMPUS'; payload: 'Vellore' | 'Chennai' }
  | { type: 'CREATE_TABLE'; payload: string }
  | { type: 'SWITCH_TABLE'; payload: number }
  | { type: 'RENAME_TABLE'; payload: { id: number; name: string } }
  | { type: 'DELETE_TABLE'; payload: number }
  | { type: 'RESET_TABLE' }
  | { type: 'CLEAR_LIST' }
  | { type: 'SET_EDIT_MODE'; payload: Partial<FFCSState['editMode']> }
  | { type: 'SET_UI_STATE'; payload: Partial<FFCSState['ui']> }
  | { type: 'LOAD_DATA'; payload: Partial<FFCSState> }
  | { type: 'CLEAR_ALL' }
  | { type: 'ADD_SUBJECT'; payload: { courseName: string; credits: number } }
  | { type: 'REMOVE_SUBJECT'; payload: string }
  | { type: 'ADD_TEACHER_TO_SUBJECT'; payload: { courseName: string; teacherName: string; slots: string; venue: string; color: string } }
  | { type: 'UPDATE_TEACHER_IN_SUBJECT'; payload: { courseName: string; teacherName: string; slots: string; venue: string; color: string } }
  | { type: 'REMOVE_TEACHER_FROM_SUBJECT'; payload: { courseName: string; teacherName: string } }
  | { type: 'UPDATE_LOCALFORAGE' }
  | { type: 'SET_GLOBAL_VAR'; payload: { key: keyof GlobalVars; value: any } }
  | { type: 'ADD_COURSE_TO_TIMETABLE'; payload: CourseData }
  | { type: 'REMOVE_COURSE_FROM_TIMETABLE'; payload: number }
  | { type: 'ADD_COURSE_TO_ATTACK_DATA'; payload: CourseData }
  | { type: 'REMOVE_COURSE_FROM_ATTACK_DATA'; payload: number }
  | { type: 'SET_ATTACK_MODE'; payload: { enabled: boolean } }
  | { type: 'CLEAR_TIMETABLE' }
  | { type: 'REGENERATE_TIMETABLE' }
  | { type: 'FORCE_UPDATE' }
  | { type: 'LOAD_FROM_BACKEND'; payload: { timetables: { [name: string]: TimetableData }; activeTimetable: string } }
  | { type: 'SAVE_TO_BACKEND_START' }
  | { type: 'SAVE_TO_BACKEND_SUCCESS' }
  | { type: 'SAVE_TO_BACKEND_ERROR'; payload: string }
  | { type: 'SET_SYNC_STATUS'; payload: { isSynced: boolean; lastSyncTime?: number; error?: string } };

// Initial state matching vanilla JS structure
const defaultTable: TimetableData = {
  id: 0,
  name: 'Default Table',
  data: [],
  subject: {},  // Changed from array to object
  quick: [],
  attackData: [],
  attackQuick: [],
};

const initialState: FFCSState = {
  timetableStoragePref: [defaultTable],
  activeTable: defaultTable,
  currentTableId: 0,

  // Backend sync status
  syncStatus: {
    isSynced: true,
    isSaving: false,
    lastSyncTime: null,
    error: null,
  },

  // Force update counter
  forceUpdateCounter: 0,

  // Legacy fields
  courses: [],
  selectedCourses: [],
  timetable: {},
  currentCampus: 'Vellore',
  
  editMode: {
    isEditingCourse: false,
    isEditingTeacher: false,
  },
  ui: {
    quickVisualizationEnabled: false,
    autoFocusEnabled: true,
    courseEditEnabled: false,
    liveFFCSMode: false,
    liveModeEnabled: false,
    attackMode: false,
    attackModeEnabled: false,
  },
  totalCredits: 0,
  
  // Global variables from vanilla JS
  globalVars: {
    editSub: false,
    editTeacher: false,
    sortableIsActive: false,
    attackData: [],
    attackQuick: [],
    slotsExistInNonLectureFormat: slotsExistInNonLectureFormat,
    clashMap: clashMap,
  },
};

// Reducer
function ffcsReducer(state: FFCSState, action: FFCSAction): FFCSState {
  switch (action.type) {
    case 'FORCE_UPDATE':
      return {
        ...state,
        forceUpdateCounter: state.forceUpdateCounter + 1
      };

    case 'ADD_COURSE':
      const newCourses = [...state.courses, action.payload];
      return {
        ...state,
        courses: newCourses,
        totalCredits: newCourses.reduce((sum, course) => sum + course.credits, 0),
      };

    case 'REMOVE_COURSE':
      const filteredCourses = state.courses.filter(course => course.code !== action.payload);
      return {
        ...state,
        courses: filteredCourses,
        selectedCourses: state.selectedCourses.filter(course => course.code !== action.payload),
        totalCredits: filteredCourses.reduce((sum, course) => sum + course.credits, 0),
      };

    case 'UPDATE_COURSE':
      const updatedCourses = state.courses.map(course =>
        course.code === action.payload.code ? action.payload : course
      );
      return {
        ...state,
        courses: updatedCourses,
        totalCredits: updatedCourses.reduce((sum, course) => sum + course.credits, 0),
      };

    case 'ADD_TEACHER':
      return {
        ...state,
        courses: state.courses.map(course =>
          course.code === action.payload.courseCode
            ? { ...course, teachers: [...course.teachers, action.payload.teacher] }
            : course
        ),
      };

    case 'REMOVE_TEACHER':
      return {
        ...state,
        courses: state.courses.map(course =>
          course.code === action.payload.courseCode
            ? {
                ...course,
                teachers: course.teachers.filter(teacher => teacher.name !== action.payload.teacherName)
              }
            : course
        ),
      };

    case 'SELECT_SLOT':
      return {
        ...state,
        timetable: {
          ...state.timetable,
          [action.payload.slot]: {
            slot: action.payload.slot,
            course: action.payload.course,
            teacher: action.payload.teacher,
            isSelected: true,
          }
        },
        selectedCourses: action.payload.course && !state.selectedCourses.find(c => c.code === action.payload.course!.code)
          ? [...state.selectedCourses, action.payload.course]
          : state.selectedCourses
      };

    case 'DESELECT_SLOT':
      const newTimetable = { ...state.timetable };
      delete newTimetable[action.payload];
      return {
        ...state,
        timetable: newTimetable,
      };

    case 'TOGGLE_SLOT_HIGHLIGHT':
      // Handle compound slots like L23+L53 by processing individual slots
      const allSlots = slotsProcessingForCourseList(action.payload);
      let updatedTimetable = { ...state.timetable };
      
      // Check if any of the slots exist (to determine if we're toggling on or off)
      const anySlotExists = allSlots.some(slot => updatedTimetable[slot]);
      
      if (anySlotExists) {
        // If any slot exists, remove all slots (deselect)
        allSlots.forEach(slot => {
          delete updatedTimetable[slot];
        });
      } else {
        // If no slots exist, add all slots as highlighted (empty slots)
        allSlots.forEach(slot => {
          updatedTimetable[slot] = {
            slot: slot,
            isSelected: true,
          };
        });
      }
      
      return {
        ...state,
        timetable: updatedTimetable,
      };

    case 'SWITCH_CAMPUS':
      return {
        ...state,
        currentCampus: action.payload,
      };

    case 'CREATE_TABLE':
      const newTableId = state.timetableStoragePref[state.timetableStoragePref.length - 1].id + 1;
      const newTable: TimetableData = {
        id: newTableId,
        name: action.payload || `Table ${newTableId}`,
        data: [],
        subject: {},  // Changed from array to object
        quick: [],
        attackData: [],
        attackQuick: [],
      };
      const updatedTables = [...state.timetableStoragePref, newTable];
      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: newTable,
        currentTableId: newTableId,
        totalCredits: 0, // New table starts with 0 credits
      };

    case 'SWITCH_TABLE': {
      const selectedTable = state.timetableStoragePref.find(t => t.id === action.payload);
      if (!selectedTable) return state;
      
      // Recalculate totalCredits based on the selected table's data
      const totalCredits = selectedTable.data.reduce((sum, course) => sum + course.credits, 0);
      
      return {
        ...state,
        activeTable: selectedTable,
        currentTableId: action.payload,
        totalCredits
      };
    }

    case 'RENAME_TABLE':
      const renamedTables = state.timetableStoragePref.map(table =>
        table.id === action.payload.id
          ? { ...table, name: action.payload.name }
          : table
      );
      const renamedActive = state.activeTable.id === action.payload.id
        ? { ...state.activeTable, name: action.payload.name }
        : state.activeTable;
      return {
        ...state,
        timetableStoragePref: renamedTables,
        activeTable: renamedActive,
      };

    case 'DELETE_TABLE': {
      if (state.timetableStoragePref.length === 1) return state; // Can't delete last table
      const filteredTables = state.timetableStoragePref.filter(t => t.id !== action.payload);
      const newCurrentTable = action.payload === state.currentTableId 
        ? filteredTables[0] 
        : state.activeTable;
      
      // Recalculate totalCredits for the new active table
      const totalCredits = newCurrentTable.data.reduce((sum, course) => sum + course.credits, 0);
      
      return {
        ...state,
        timetableStoragePref: filteredTables,
        activeTable: newCurrentTable,
        currentTableId: newCurrentTable.id,
        totalCredits
      };
    }

    case 'CLEAR_LIST':
      // Clear only selections (data, quick, attackData, attackQuick) - PRESERVE subject definitions
      const clearTables = state.timetableStoragePref.map(table =>
        table.id === state.currentTableId
          ? { ...table, data: [], quick: [], attackData: [], attackQuick: [] }
          : table
      );
      const clearActive = { ...state.activeTable, data: [], quick: [], attackData: [], attackQuick: [] };
      return {
        ...state,
        timetableStoragePref: clearTables,
        activeTable: clearActive,
        selectedCourses: [],
        timetable: {},
        courses: [],
        totalCredits: 0,
      };

    case 'RESET_TABLE':
      // Reset EVERYTHING including subjects (complete table reset)
      const resetTables = state.timetableStoragePref.map(table =>
        table.id === state.currentTableId
          ? { ...table, data: [], quick: [], attackData: [], attackQuick: [], subject: {} }
          : table
      );
      const resetActive = { ...state.activeTable, data: [], quick: [], attackData: [], attackQuick: [], subject: {} };
      return {
        ...state,
        timetableStoragePref: resetTables,
        activeTable: resetActive,
        selectedCourses: [],
        timetable: {},
        courses: [],
        totalCredits: 0,
      };

    case 'SET_EDIT_MODE':
      return {
        ...state,
        editMode: { ...state.editMode, ...action.payload },
      };

    case 'SET_UI_STATE':
      return {
        ...state,
        ui: { ...state.ui, ...action.payload },
      };

    case 'LOAD_DATA': {
      let newState = {
        ...state,
        ...action.payload,
        // Always increment forceUpdateCounter when loading data to trigger component re-renders
        forceUpdateCounter: state.forceUpdateCounter + 1
      };
      
      // Process loaded quick data to ensure proper tile synchronization
      if (newState.activeTable) {
        const slotPositions: { [key: string]: [number, number][] } = {
          'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
          'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
          'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
          'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
          'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 14]],
          'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 14]],
          'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 14]],
          'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 14]],
          'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 14]],
        };
        
        // Process quick and attackQuick arrays to add QV highlights where all slots of a type are selected
        const processQuickArray = (quickArray: any[]) => {
          let processedQuick = [...quickArray];
          
          // Check each slot to see if all its positions are highlighted
          Object.entries(slotPositions).forEach(([slot, positions]) => {
            const allPositionsHighlighted = positions.every(([r, c]) =>
              processedQuick.some((entry: any[]) => {
                // Check both individual highlights [r, c] and QV highlights [r, c, true]
                return (entry.length === 2 && entry[0] === r && entry[1] === c) ||
                       (entry.length === 3 && entry[0] === r && entry[1] === c);
              })
            );
            
            // Remove any existing QV highlights for this slot
            processedQuick = processedQuick.filter((entry: any[]) => {
              if (entry.length === 3 && entry[2] === true) {
                return !positions.some(([r, c]) => entry[0] === r && entry[1] === c);
              }
              return true;
            });
            
            // If all positions are highlighted, add QV highlights for tile synchronization
            if (allPositionsHighlighted) {
              const qvHighlights = positions.map(([r, c]) => [r, c, true] as [number, number, boolean]);
              processedQuick = [...processedQuick, ...qvHighlights];
            }
          });
          
          return processedQuick;
        };
        
        // Update the activeTable with processed quick arrays
        newState.activeTable = {
          ...newState.activeTable,
          quick: processQuickArray(newState.activeTable.quick || []),
          attackQuick: processQuickArray(newState.activeTable.attackQuick || [])
        };
        
        // Also update in timetableStoragePref
        if (newState.timetableStoragePref) {
          newState.timetableStoragePref = newState.timetableStoragePref.map(table => 
            table.id === newState.activeTable.id ? newState.activeTable : table
          );
        }
      }
      
      // Recalculate totalCredits based on the loaded activeTable data
      const totalCredits = newState.activeTable?.data?.reduce((sum, course) => sum + course.credits, 0) || 0;
      
      return {
        ...newState,
        totalCredits
      };
    }

    case 'CLEAR_ALL':
      return initialState;

    case 'ADD_SUBJECT': {
      const updatedTable = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          return {
            ...table,
            subject: {
              ...table.subject,
              [action.payload.courseName]: {
                teacher: {},
                credits: action.payload.credits
              }
            }
          };
        }
        return table;
      });
      
      const updatedActive = {
        ...state.activeTable,
        subject: {
          ...state.activeTable.subject,
          [action.payload.courseName]: {
            teacher: {},
            credits: action.payload.credits
          }
        }
      };
      
      return {
        ...state,
        timetableStoragePref: updatedTable,
        activeTable: updatedActive
      };
    }

    case 'REMOVE_SUBJECT': {
      const updatedTable = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          const { [action.payload]: removed, ...remainingSubjects } = table.subject;
          return {
            ...table,
            subject: remainingSubjects
          };
        }
        return table;
      });
      
      const { [action.payload]: removed, ...remainingSubjects } = state.activeTable.subject;
      const updatedActive = {
        ...state.activeTable,
        subject: remainingSubjects
      };
      
      return {
        ...state,
        timetableStoragePref: updatedTable,
        activeTable: updatedActive
      };
    }

    case 'ADD_TEACHER_TO_SUBJECT': {
      
      const updatedTable = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          const currentSubject = table.subject[action.payload.courseName] || { teacher: {}, credits: 0 };
          const updatedSubject = {
            ...currentSubject,
            teacher: {
              ...currentSubject.teacher,
              [action.payload.teacherName]: {
                slots: action.payload.slots,
                venue: action.payload.venue,
                color: action.payload.color
              }
            }
          };
          
          
          return {
            ...table,
            subject: {
              ...table.subject,
              [action.payload.courseName]: updatedSubject
            }
          };
        }
        return table;
      });
      
      const currentActiveSubject = state.activeTable.subject[action.payload.courseName] || { teacher: {}, credits: 0 };
      const updatedActiveSubject = {
        ...currentActiveSubject,
        teacher: {
          ...currentActiveSubject.teacher,
          [action.payload.teacherName]: {
            slots: action.payload.slots,
            venue: action.payload.venue,
            color: action.payload.color
          }
        }
      };
      
      const updatedActive = {
        ...state.activeTable,
        subject: {
          ...state.activeTable.subject,
          [action.payload.courseName]: updatedActiveSubject
        }
      };
      
      
      return {
        ...state,
        timetableStoragePref: updatedTable,
        activeTable: updatedActive
      };
    }

    case 'UPDATE_TEACHER_IN_SUBJECT': {
      return {
        ...state,
        // Same implementation as ADD_TEACHER_TO_SUBJECT since it's an update
        ...ffcsReducer(state, { 
          type: 'ADD_TEACHER_TO_SUBJECT', 
          payload: action.payload 
        })
      };
    }

    case 'REMOVE_TEACHER_FROM_SUBJECT': {
      const updatedTable = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId && table.subject[action.payload.courseName]) {
          const { [action.payload.teacherName]: removed, ...remainingTeachers } = 
            table.subject[action.payload.courseName].teacher;
          return {
            ...table,
            subject: {
              ...table.subject,
              [action.payload.courseName]: {
                ...table.subject[action.payload.courseName],
                teacher: remainingTeachers
              }
            }
          };
        }
        return table;
      });
      
      if (state.activeTable.subject[action.payload.courseName]) {
        const { [action.payload.teacherName]: removed, ...remainingTeachers } = 
          state.activeTable.subject[action.payload.courseName].teacher;
        const updatedActive = {
          ...state.activeTable,
          subject: {
            ...state.activeTable.subject,
            [action.payload.courseName]: {
              ...state.activeTable.subject[action.payload.courseName],
              teacher: remainingTeachers
            }
          }
        };
        
        return {
          ...state,
          timetableStoragePref: updatedTable,
          activeTable: updatedActive
        };
      }
      
      return state;
    }

    case 'TOGGLE_CELL_HIGHLIGHT': {
      // Handle individual cell highlight (only works when QV is enabled)
      // This highlights only the specific clicked cell, matching vanilla JS behavior
      if (!state.ui.quickVisualizationEnabled) {
        return state; // No cell highlighting when QV is disabled
      }
      
      const { day, index, theorySlot } = action.payload;
      const activeTableToUpdate = state.ui.attackMode ? 'attackQuick' : 'quick';
      
      // Calculate row index: mon=2, tue=3, wed=4, thu=5, fri=6
      const dayRowMap: { [key: string]: number } = {
        mon: 2, tue: 3, wed: 4, thu: 5, fri: 6, sat: 7, sun: 8
      };
      const row = dayRowMap[day];
      // Calculate actual column in table accounting for lunch column
      // Columns 0-5 in dayRowsData map to columns 1-6 in table
      // Columns 6-12 in dayRowsData map to columns 8-14 in table (skip lunch at column 7)
      const column = index < 6 ? index + 1 : index + 2;
      
      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          const currentQuick = table[activeTableToUpdate] || [];
          
          // Check if this specific cell [row, column] is already highlighted
          const existingIndex = currentQuick.findIndex(([r, c]) => r === row && c === column);
          
          let newQuick;
          if (existingIndex >= 0) {
            // Remove highlighting from this specific cell
            newQuick = currentQuick.filter((_, i) => i !== existingIndex);
          } else {
            // Add highlighting to this specific cell [row, column] (no third parameter for individual cell)
            newQuick = [...currentQuick, [row, column]];
          }
          
          // After updating individual cell highlight, check if all cells of this theory slot are now highlighted
          // and add/remove QV-level highlights accordingly for tile synchronization
          const slotPositions: { [key: string]: [number, number][] } = {
            'A1': [[2, 1], [4, 2]], 'F1': [[2, 2], [4, 3]], 'D1': [[2, 3], [5, 1]], 'TB1': [[2, 4]], 'TG1': [[2, 5]],
            'B1': [[3, 1], [5, 2]], 'G1': [[3, 2], [5, 3]], 'E1': [[3, 3], [6, 1]], 'TC1': [[3, 4]], 'TAA1': [[3, 5]],
            'C1': [[4, 1], [6, 2]], 'V1': [[4, 4]], 'V2': [[4, 5]], 'TE1': [[5, 4]], 'TCC1': [[5, 5]],
            'TA1': [[6, 3]], 'TF1': [[6, 4]], 'TD1': [[6, 5]],
            'A2': [[2, 8], [4, 9]], 'F2': [[2, 9], [4, 10]], 'D2': [[2, 10], [5, 8]], 'TB2': [[2, 11]], 'TG2': [[2, 12]], 'V3': [[2, 14]],
            'B2': [[3, 8], [5, 9]], 'G2': [[3, 9], [5, 10]], 'E2': [[3, 10], [6, 8]], 'TC2': [[3, 11]], 'TAA2': [[3, 12]], 'V4': [[3, 14]],
            'C2': [[4, 8], [6, 9]], 'TD2': [[4, 11]], 'TBB2': [[4, 12]], 'V5': [[4, 14]],
            'TE2': [[5, 11]], 'TCC2': [[5, 12]], 'V6': [[5, 14]],
            'TA2': [[6, 10]], 'TF2': [[6, 11]], 'TDD2': [[6, 12]], 'V7': [[6, 14]],
          };
          
          // Check each slot to see if all its positions are now highlighted
          Object.entries(slotPositions).forEach(([slot, positions]) => {
            const allPositionsHighlighted = positions.every(([r, c]) =>
              newQuick.some((entry: any[]) => {
                // Check both individual highlights [r, c] and QV highlights [r, c, true]
                return (entry.length === 2 && entry[0] === r && entry[1] === c) ||
                       (entry.length === 3 && entry[0] === r && entry[1] === c);
              })
            );
            
            // Remove any existing highlights for this slot's positions (both individual and QV)
            newQuick = newQuick.filter((entry: any[]) => {
              if (entry.length >= 2) {
                return !positions.some(([r, c]) => entry[0] === r && entry[1] === c);
              }
              return true;
            });
            
            // If all positions were highlighted, add only QV highlights (replace individual ones)
            if (allPositionsHighlighted) {
              const qvHighlights = positions.map(([r, c]) => [r, c, true] as [number, number, boolean]);
              newQuick = [...newQuick, ...qvHighlights];
            }
          });
          
          return {
            ...table,
            [activeTableToUpdate]: newQuick
          };
        }
        return table;
      });
      
      const updatedActive = {
        ...state.activeTable,
        [activeTableToUpdate]: updatedTables.find(t => t.id === state.currentTableId)?.[activeTableToUpdate] || []
      };
      
      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive
      };
    }

    case 'TOGGLE_QV_SLOT_HIGHLIGHT': {
      // Handle quick visualization tile click (highlights ALL cells with this theory slot)
      // This matches the vanilla JS behavior where QV tile clicks highlight all occurrences
      const slot = action.payload;
      const activeTableToUpdate = state.ui.attackMode ? 'attackQuick' : 'quick';
      
      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          const currentQuick = table[activeTableToUpdate] || [];
          
          // Define where each theory slot appears in the timetable
          // Row indices: theory=0, lab=1, mon=2, tue=3, wed=4, thu=5, fri=6
          // Column mapping based on the timetable structure
          const slotPositions: { [key: string]: [number, number][] } = {
            'A1': [[2, 1], [4, 2]], // A1 appears on MON col 1, WED col 2
            'F1': [[2, 2], [4, 3]], // F1 appears on MON col 2, WED col 3
            'D1': [[2, 3], [5, 1]], // D1 appears on MON col 3, THU col 1
            'TB1': [[2, 4]], // TB1 appears on MON col 4
            'TG1': [[2, 5]], // TG1 appears on MON col 5
            'A2': [[2, 8], [4, 9]], // A2 appears on MON col 8, WED col 9
            'F2': [[2, 9], [4, 10]], // F2 appears on MON col 9, WED col 10
            'D2': [[2, 10], [5, 9]], // D2 appears on MON col 10, THU col 9
            'TB2': [[2, 11]], // TB2 appears on MON col 11
            'TG2': [[2, 12]], // TG2 appears on MON col 12
            'B1': [[3, 1], [5, 2]], // B1 appears on TUE col 1, THU col 2
            'G1': [[3, 2], [5, 3]], // G1 appears on TUE col 2, THU col 3
            'E1': [[3, 3], [6, 1]], // E1 appears on TUE col 3, FRI col 1
            'TC1': [[3, 4]], // TC1 appears on TUE col 4
            'TAA1': [[3, 5]], // TAA1 appears on TUE col 5
            'B2': [[3, 8], [5, 10]], // B2 appears on TUE col 8, THU col 10
            'G2': [[3, 9], [5, 11]], // G2 appears on TUE col 9, THU col 11
            'E2': [[3, 10], [6, 9]], // E2 appears on TUE col 10, FRI col 9
            'TC2': [[3, 11]], // TC2 appears on TUE col 11
            'TAA2': [[3, 12]], // TAA2 appears on TUE col 12
            'C1': [[4, 1], [6, 2]], // C1 appears on WED col 1, FRI col 2
            'C2': [[4, 8], [6, 10]], // C2 appears on WED col 8, FRI col 10
            // Add more slots as needed based on the actual timetable structure
          };
          
          const slotsToToggle = slotPositions[slot] || [];
          
          // Check if any of these slots are currently highlighted (with third parameter true)
          const hasHighlighted = slotsToToggle.some(([r, c]) => 
            currentQuick.some((entry: any[]) => {
              if (entry.length === 3) {
                // Entry with third parameter [row, col, true] from QV tile
                return entry[0] === r && entry[1] === c && entry[2] === true;
              }
              return false;
            })
          );
          
          let newQuick;
          if (hasHighlighted) {
            // Remove all QV-highlighted slots with this theory slot
            newQuick = currentQuick.filter((entry: any[]) => {
              if (entry.length === 3 && entry[2] === true) {
                // This is a QV highlight, check if it matches our slot
                return !slotsToToggle.some(([r, c]) => entry[0] === r && entry[1] === c);
              }
              // Keep individual cell highlights (length 2)
              return true;
            });
          } else {
            // Add all slots with this theory slot (with third parameter true)
            const newSlots = slotsToToggle.map(([r, c]) => [r, c, true] as [number, number, boolean]);
            newQuick = [...currentQuick, ...newSlots];
          }
          
          return {
            ...table,
            [activeTableToUpdate]: newQuick
          };
        }
        return table;
      });
      
      const updatedActive = {
        ...state.activeTable,
        [activeTableToUpdate]: updatedTables.find(t => t.id === state.currentTableId)?.[activeTableToUpdate] || []
      };
      
      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive
      };
    }

    case 'PROCESS_QV_SLOT_HIGHLIGHT': {
      // Process the actual QV slot highlighting with DOM positions
      const { slot, positions } = action.payload;
      const activeTableToUpdate = state.ui.attackMode ? 'attackQuick' : 'quick';

      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          const currentQuick = table[activeTableToUpdate] || [];

          // CRITICAL FIX: Check if ALL positions are highlighted (either 2-element OR 3-element)
          // This detects if the tile is visually highlighted
          const allHighlighted = positions.every(([r, c]) =>
            currentQuick.some((entry: any[]) =>
              // Match any entry (2-element or 3-element) at this position
              entry[0] === r && entry[1] === c
            )
          );

          let newQuick;
          if (allHighlighted) {
            // Remove ALL entries (both 2-element and 3-element) at these positions
            console.log(`🗑️ Removing all highlights for ${slot} at positions:`, positions);
            newQuick = currentQuick.filter((entry: any[]) => {
              // Remove if this entry matches any of our positions
              return !positions.some(([r, c]) => entry[0] === r && entry[1] === c);
            });
          } else {
            // Add all positions with this theory slot (with third parameter true)
            // But only add if they don't already exist (prevent duplicates)
            const newSlots = positions
              .filter(([r, c]) => !currentQuick.some(entry => entry[0] === r && entry[1] === c))
              .map(([r, c]) => [r, c, true] as [number, number, boolean]);
            console.log(`➕ Adding QV highlights for ${slot}:`, newSlots);
            newQuick = [...currentQuick, ...newSlots];
          }

          return {
            ...table,
            [activeTableToUpdate]: newQuick
          };
        }
        return table;
      });

      const updatedActive = {
        ...state.activeTable,
        [activeTableToUpdate]: updatedTables.find(t => t.id === state.currentTableId)?.[activeTableToUpdate] || []
      };

      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive
      };
    }

    case 'CLEAR_QV_HIGHLIGHTS': {
      // Clear QV highlights (entries with third parameter true) but keep individual cell highlights
      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          // Filter out QV highlights (length 3 with third parameter true), keep individual highlights (length 2)
          const newQuick = (table.quick || []).filter((entry: any[]) => {
            return entry.length === 2; // Keep individual cell highlights
          });
          const newAttackQuick = (table.attackQuick || []).filter((entry: any[]) => {
            return entry.length === 2; // Keep individual cell highlights
          });

          return {
            ...table,
            quick: newQuick,
            attackQuick: newAttackQuick
          };
        }
        return table;
      });

      const updatedActive = {
        ...state.activeTable,
        quick: updatedTables.find(t => t.id === state.currentTableId)?.quick || [],
        attackQuick: updatedTables.find(t => t.id === state.currentTableId)?.attackQuick || []
      };

      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive
      };
    }

    case 'PROCESS_CELL_CLICK': {
      // Handle individual cell clicks (toggle [row, col] in quick array)
      const { row, col, slotText } = action.payload;
      const activeTableToUpdate = state.ui.attackMode ? 'attackQuick' : 'quick';

      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          const currentQuick = table[activeTableToUpdate] || [];

          // Check if this cell is currently highlighted
          const existingIndex = currentQuick.findIndex((entry: any[]) =>
            entry[0] === row && entry[1] === col
          );

          let newQuick;
          if (existingIndex !== -1) {
            // Remove the highlight (it exists)
            newQuick = currentQuick.filter((_: any, index: number) => index !== existingIndex);
          } else {
            // Add the highlight (push [row, col] - 2 elements, NOT 3)
            newQuick = [...currentQuick, [row, col]];
          }

          return {
            ...table,
            [activeTableToUpdate]: newQuick
          };
        }
        return table;
      });

      const updatedActive = {
        ...state.activeTable,
        [activeTableToUpdate]: updatedTables.find(t => t.id === state.currentTableId)?.[activeTableToUpdate] || []
      };

      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive
      };
    }

    case 'CLEANUP_QUICK_ON_TEACHER_SELECT': {
      // When teacher is selected, remove conflicting quick slots
      // Teacher slots become part of slotsForAttack, so we don't need complex cleanup
      // The cell/tile click handlers will prevent clicking conflicting slots
      // This action is mainly for future use if needed
      return state;
    }

    case 'UPDATE_LOCALFORAGE': {
      // Trigger a save to localforage (handled by useEffect)
      return state;
    }

    case 'SET_GLOBAL_VAR': {
      return {
        ...state,
        globalVars: {
          ...state.globalVars,
          [action.payload.key]: action.payload.value
        }
      };
    }

    case 'ADD_COURSE_TO_TIMETABLE': {
      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          return {
            ...table,
            data: [...table.data, action.payload]
          };
        }
        return table;
      });
      
      const updatedActive = {
        ...state.activeTable,
        data: [...state.activeTable.data, action.payload]
      };
      
      // Update total credits
      const newTotalCredits = updatedActive.data.reduce((sum, course) => sum + course.credits, 0);
      
      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive,
        totalCredits: newTotalCredits
      };
    }

    case 'REMOVE_COURSE_FROM_TIMETABLE': {
      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          return {
            ...table,
            data: table.data.filter(course => course.courseId !== action.payload)
          };
        }
        return table;
      });
      
      const updatedActive = {
        ...state.activeTable,
        data: state.activeTable.data.filter(course => course.courseId !== action.payload)
      };
      
      // Update total credits
      const newTotalCredits = updatedActive.data.reduce((sum, course) => sum + course.credits, 0);
      
      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive,
        totalCredits: newTotalCredits
      };
    }

    case 'ADD_COURSE_TO_ATTACK_DATA': {
      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          return {
            ...table,
            attackData: [...table.attackData, action.payload]
          };
        }
        return table;
      });
      
      const updatedActive = {
        ...state.activeTable,
        attackData: [...state.activeTable.attackData, action.payload]
      };
      
      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive,
        globalVars: {
          ...state.globalVars,
          attackData: [...state.globalVars.attackData, action.payload]
        }
      };
    }

    case 'REMOVE_COURSE_FROM_ATTACK_DATA': {
      const updatedTables = state.timetableStoragePref.map(table => {
        if (table.id === state.currentTableId) {
          return {
            ...table,
            attackData: table.attackData.filter(course => course.courseId !== action.payload)
          };
        }
        return table;
      });
      
      const updatedActive = {
        ...state.activeTable,
        attackData: state.activeTable.attackData.filter(course => course.courseId !== action.payload)
      };
      
      return {
        ...state,
        timetableStoragePref: updatedTables,
        activeTable: updatedActive,
        globalVars: {
          ...state.globalVars,
          attackData: state.globalVars.attackData.filter(course => course.courseId !== action.payload)
        }
      };
    }

    case 'SET_ATTACK_MODE': {
      // Update UI state and ensure activeTable is synced from timetableStoragePref
      const currentTable = state.timetableStoragePref.find(t => t.id === state.currentTableId) || state.activeTable;

      return {
        ...state,
        ui: {
          ...state.ui,
          attackMode: action.payload.enabled,
          attackModeEnabled: action.payload.enabled
        },
        activeTable: currentTable // Sync activeTable from storage to preserve attackQuick data
      };
    }

    case 'CLEAR_TIMETABLE': {
      // Clear the timetable visual data but keep course and teacher data
      // Also clear courses and selectedCourses to show slot occupancy in live mode
      return {
        ...state,
        activeTable: {
          ...state.activeTable,
          quick: [], // Clear quick visualization data
          attackQuick: [] // Clear attack mode visualization data
        },
        courses: [],
        selectedCourses: [],
        timetable: {},
        totalCredits: 0
      };
    }

    case 'REGENERATE_TIMETABLE': {
      // Regenerate timetable from current data based on attack mode
      const activeData = state.ui.attackModeEnabled ? state.activeTable.attackData : state.activeTable.data;
      const activeQuick = state.ui.attackModeEnabled ? state.activeTable.attackQuick : state.activeTable.quick;
      
      // Convert activeData back to courses and selectedCourses
      const regeneratedCourses: Course[] = [];
      const regeneratedSelected: Course[] = [];
      const regeneratedTimetable: { [key: string]: TimetableSlot } = {};
      let totalCredits = 0;
      
      activeData.forEach((courseData: CourseData) => {
        const course: Course = {
          code: courseData.courseCode,
          name: courseData.courseTitle,
          credits: courseData.credits,
          teachers: [{
            name: courseData.faculty,
            slot: courseData.slots.join('+'),
            venue: courseData.venue,
            color: '#3b82f6', // Default color
            course: courseData.courseCode
          }]
        };
        
        regeneratedCourses.push(course);
        regeneratedSelected.push(course);
        totalCredits += courseData.credits;
        
        // Add to timetable slots
        courseData.slots.forEach(slot => {
          regeneratedTimetable[slot] = {
            slot,
            course,
            teacher: course.teachers[0],
            isSelected: true
          };
        });
      });
      
      return {
        ...state,
        courses: regeneratedCourses,
        selectedCourses: regeneratedSelected,
        timetable: regeneratedTimetable,
        totalCredits,
        forceUpdateCounter: state.forceUpdateCounter + 1
      };
    }

    // Backend sync actions
    case 'LOAD_FROM_BACKEND': {
      const { timetables, activeTimetable } = action.payload;

      // Convert backend timetables object to array
      const timetablesArray: TimetableData[] = Object.entries(timetables).map(([name, tt], index) => ({
        ...(tt as TimetableData),
        id: index,
        name: name
      }));

      // Find active table
      const activeIndex = timetablesArray.findIndex(tt => tt.name === activeTimetable);
      const activeTable = activeIndex >= 0 ? timetablesArray[activeIndex] : timetablesArray[0];

      console.log('📥 [REDUCER] LOAD_FROM_BACKEND:', {
        timetablesCount: timetablesArray.length,
        activeTable: activeTable.name
      });

      return {
        ...state,
        timetableStoragePref: timetablesArray,
        activeTable: activeTable,
        currentTableId: activeTable.id,
        syncStatus: {
          isSynced: true,
          isSaving: false,
          lastSyncTime: Date.now(),
          error: null
        },
        forceUpdateCounter: state.forceUpdateCounter + 1
      };
    }

    case 'SAVE_TO_BACKEND_START':
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          isSaving: true,
          error: null
        }
      };

    case 'SAVE_TO_BACKEND_SUCCESS':
      return {
        ...state,
        syncStatus: {
          isSynced: true,
          isSaving: false,
          lastSyncTime: Date.now(),
          error: null
        }
      };

    case 'SAVE_TO_BACKEND_ERROR':
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          isSaving: false,
          error: action.payload
        }
      };

    case 'SET_SYNC_STATUS':
      return {
        ...state,
        syncStatus: {
          ...state.syncStatus,
          ...action.payload
        }
      };

    default:
      return state;
  }
}

// Context
const FFCSContext = createContext<{
  state: FFCSState;
  dispatch: React.Dispatch<FFCSAction>;
  loadFromBackend: () => Promise<void>;
  saveToBackend: () => Promise<void>;
} | undefined>(undefined);

// Provider component
export function FFCSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(ffcsReducer, initialState);
  
  // Track if we're currently receiving collaboration data to prevent sync loops
  const isReceivingCollaboration = useRef(false);

  // Helper function to trigger collaboration sync
  const triggerCollaborationSync = () => {
    // Don't sync if we're currently receiving collaboration data
    if (isReceivingCollaboration.current) {
      console.log('🔄 Skipping auto-sync - receiving collaboration data');
      return;
    }
    
    // Small delay to ensure state is updated before syncing
    setTimeout(() => {
      try {
        if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
          const socket = (window as any).collaborationSocket;
          
          // Send the current user's timetable data to other room members
          const timetableData = {
            data: state.activeTable.data || [],
            subject: state.activeTable.subject || {},
            quick: state.activeTable.quick || [],
            attackData: state.activeTable.attackData || [],
            attackQuick: state.activeTable.attackQuick || []
          };
          
          console.log('📤 Auto-syncing timetable update:', timetableData);
          socket.emit('update-timetable', timetableData);
        }
      } catch (error) {
        console.error('❌ Auto-sync failed:', error);
      }
    }, 100);
  };

  // Store isReceivingCollaboration flag globally for CollaborationRoom to use
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).ffcsCollaborationState = { isReceivingCollaboration };
    }
  }, []);

  // Listen for personal timetables load event from AuthContext
  useEffect(() => {
    const handleLoadPersonalTimetables = (event: any) => {
      console.log('🎯 [EVENT] load-personal-timetables received:', event.detail);

      const { timetables, activeTimetable } = event.detail;

      if (timetables && activeTimetable) {
        dispatch({
          type: 'LOAD_FROM_BACKEND',
          payload: {
            timetables,
            activeTimetable
          }
        });
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('load-personal-timetables', handleLoadPersonalTimetables);

      return () => {
        window.removeEventListener('load-personal-timetables', handleLoadPersonalTimetables);
      };
    }
  }, []);

  // Load data from localforage on mount
  useEffect(() => {
    localforage.getItem('timetableStoragePref')
      .then((storedValue: any) => {
        if (storedValue && Array.isArray(storedValue)) {
          const activeTable = storedValue[0] || defaultTable;
          dispatch({ 
            type: 'LOAD_DATA', 
            payload: { 
              timetableStoragePref: storedValue,
              activeTable: activeTable,
              currentTableId: activeTable.id
            } 
          });
        }
      })
      .catch((error) => {
        console.error('Error loading saved data from localforage:', error);
      });
  }, []);

  // Save data to localforage whenever state changes
  useEffect(() => {
    // Only save timetableStoragePref to match vanilla JS behavior
    if (state.timetableStoragePref && state.timetableStoragePref.length > 0) {
      localforage.setItem('timetableStoragePref', state.timetableStoragePref)
        .then(() => {
          console.log('Timetable data saved to localforage');
        })
        .catch((error) => {
          console.error('Error saving data to localforage:', error);
        });
      
      // Also save to localStorage for immediate access
      try {
        localStorage.setItem('ffcs-timetables', JSON.stringify(state.timetableStoragePref));
        console.log('Timetable data saved to localStorage');
      } catch (error) {
        console.error('Failed to save to localStorage:', error);
      }
    }
  }, [state.timetableStoragePref, state.activeTable]);

  // Auto-sync with collaboration when important data changes
  useEffect(() => {
    // Don't auto-sync from context if we're in a collaboration room
    // (CollaborationRoom component handles its own sync)
    if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
      console.log('🔄 Skipping context auto-sync - in collaboration room');
      return;
    }
    
    // Only sync when we have meaningful data changes (not just loading)
    if (state.activeTable.data.length > 0 || Object.keys(state.activeTable.subject).length > 0) {
      triggerCollaborationSync();
    }
  }, [
    state.activeTable.data,
    state.activeTable.subject,
    state.activeTable.attackData,
    state.forceUpdateCounter // Sync on manual updates too
  ]);

  // Load timetables from backend
  const loadFromBackend = async () => {
    try {
      console.log('📥 Loading timetables from backend...');

      if (!socketService.isConnected()) {
        throw new Error('Socket not connected. Please login first.');
      }

      const response = await socketService.getPersonalTimetables();

      if (response.success && response.timetables) {
        console.log('✅ Loaded from backend:', response);

        dispatch({
          type: 'LOAD_FROM_BACKEND',
          payload: {
            timetables: response.timetables,
            activeTimetable: response.activeTimetable || 'Default'
          }
        });
      } else {
        throw new Error(response.error || 'Failed to load timetables');
      }
    } catch (error) {
      console.error('❌ Error loading from backend:', error);
      dispatch({
        type: 'SAVE_TO_BACKEND_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load'
      });
      throw error;
    }
  };

  // Save current timetables to backend
  const saveToBackend = async () => {
    try {
      console.log('💾 Saving timetables to backend...');
      dispatch({ type: 'SAVE_TO_BACKEND_START' });

      if (!socketService.isConnected()) {
        throw new Error('Socket not connected. Please login first.');
      }

      // Save all timetables
      for (const table of state.timetableStoragePref) {
        console.log(`💾 Saving timetable: ${table.name}`);

        const response = await socketService.updatePersonalTimetable(table.name, table);

        if (!response.success) {
          // If timetable doesn't exist, create it first
          if (response.error?.includes('not found')) {
            console.log(`📝 Creating new timetable: ${table.name}`);
            const createResponse = await socketService.createPersonalTimetable(table.name);

            if (createResponse.success) {
              // Now update it with actual data
              await socketService.updatePersonalTimetable(table.name, table);
            }
          } else {
            throw new Error(response.error || `Failed to save ${table.name}`);
          }
        }
      }

      // Set active timetable
      if (state.activeTable) {
        await socketService.setActiveTimetable(state.activeTable.name);
      }

      console.log('✅ All timetables saved successfully');
      dispatch({ type: 'SAVE_TO_BACKEND_SUCCESS' });
    } catch (error) {
      console.error('❌ Error saving to backend:', error);
      dispatch({
        type: 'SAVE_TO_BACKEND_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to save'
      });
      throw error;
    }
  };

  return (
    <FFCSContext.Provider value={{ state, dispatch, loadFromBackend, saveToBackend }}>
      {children}
    </FFCSContext.Provider>
  );
}

// Custom hook to use the context
export function useFFCS() {
  const context = useContext(FFCSContext);
  if (context === undefined) {
    throw new Error('useFFCS must be used within a FFCSProvider');
  }
  
  // Helper function to force component updates
  const forceUpdate = () => {
    context.dispatch({ type: 'FORCE_UPDATE' });
  };

  // Collaboration sync function - sends timetable updates to other users
  const sendTimetableUpdate = () => {
    try {
      // Check if we're in a browser environment and have a global socket
      if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
        const socket = (window as any).collaborationSocket;
        
        // Send the current user's timetable data to other room members
        const timetableData = {
          data: context.state.activeTable.data || [],
          subject: context.state.activeTable.subject || {},
          quick: context.state.activeTable.quick || [],
          attackData: context.state.activeTable.attackData || [],
          attackQuick: context.state.activeTable.attackQuick || []
        };
        
        console.log('📤 Sending timetable update:', timetableData);
        socket.emit('update-timetable', timetableData);
      } else {
        console.log('⚠️ No collaboration socket available for sync');
      }
    } catch (error) {
      console.error('❌ Failed to send timetable update:', error);
    }
  };
  
  // Add to window for debugging
  if (typeof window !== 'undefined') {
    (window as any).ffcsDebug = {
      state: context.state,
      dispatch: context.dispatch,
      activeTable: context.state.activeTable,
      timetableStoragePref: context.state.timetableStoragePref,
      forceUpdate,
      sendTimetableUpdate
    };
  }
  
  return { ...context, forceUpdate, sendTimetableUpdate };
}

// Export clashMap for use in other components
export { clashMap };