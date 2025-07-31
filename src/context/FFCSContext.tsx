'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';

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

export interface FFCSState {
  courses: Course[];
  selectedCourses: Course[];
  timetable: { [key: string]: TimetableSlot };
  currentCampus: 'Vellore' | 'Chennai';
  currentTableId: number;
  tables: { [key: number]: { name: string; courses: Course[] } };
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
  };
  totalCredits: number;
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
  | { type: 'SWITCH_CAMPUS'; payload: 'Vellore' | 'Chennai' }
  | { type: 'CREATE_TABLE'; payload: string }
  | { type: 'SWITCH_TABLE'; payload: number }
  | { type: 'RENAME_TABLE'; payload: { id: number; name: string } }
  | { type: 'DELETE_TABLE'; payload: number }
  | { type: 'RESET_TABLE' }
  | { type: 'SET_EDIT_MODE'; payload: Partial<FFCSState['editMode']> }
  | { type: 'SET_UI_STATE'; payload: Partial<FFCSState['ui']> }
  | { type: 'LOAD_DATA'; payload: Partial<FFCSState> }
  | { type: 'CLEAR_ALL' };

// Initial state
const initialState: FFCSState = {
  courses: [],
  selectedCourses: [],
  timetable: {},
  currentCampus: 'Vellore',
  currentTableId: 0,
  tables: {
    0: { name: 'Default Table', courses: [] }
  },
  editMode: {
    isEditingCourse: false,
    isEditingTeacher: false,
  },
  ui: {
    quickVisualizationEnabled: false,
    autoFocusEnabled: true,
    courseEditEnabled: false,
    liveFFCSMode: false,
  },
  totalCredits: 0,
};

// Reducer
function ffcsReducer(state: FFCSState, action: FFCSAction): FFCSState {
  switch (action.type) {
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
      const existingSlot = state.timetable[action.payload];
      if (existingSlot) {
        // If slot exists, remove it (deselect)
        const updatedTimetable = { ...state.timetable };
        delete updatedTimetable[action.payload];
        return {
          ...state,
          timetable: updatedTimetable,
        };
      } else {
        // If slot doesn't exist, add it as highlighted (empty slot)
        return {
          ...state,
          timetable: {
            ...state.timetable,
            [action.payload]: {
              slot: action.payload,
              isSelected: true,
            }
          }
        };
      }

    case 'SWITCH_CAMPUS':
      return {
        ...state,
        currentCampus: action.payload,
      };

    case 'CREATE_TABLE':
      const newTableId = Math.max(...Object.keys(state.tables).map(Number)) + 1;
      return {
        ...state,
        tables: {
          ...state.tables,
          [newTableId]: { name: action.payload, courses: [] }
        },
        currentTableId: newTableId,
      };

    case 'SWITCH_TABLE':
      return {
        ...state,
        currentTableId: action.payload,
      };

    case 'RENAME_TABLE':
      return {
        ...state,
        tables: {
          ...state.tables,
          [action.payload.id]: {
            ...state.tables[action.payload.id],
            name: action.payload.name
          }
        },
      };

    case 'DELETE_TABLE':
      const newTables = { ...state.tables };
      delete newTables[action.payload];
      return {
        ...state,
        tables: newTables,
        currentTableId: action.payload === state.currentTableId ? 0 : state.currentTableId,
      };

    case 'RESET_TABLE':
      return {
        ...state,
        selectedCourses: [],
        timetable: {},
        tables: {
          ...state.tables,
          [state.currentTableId]: {
            ...state.tables[state.currentTableId],
            courses: []
          }
        },
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

    case 'LOAD_DATA':
      return {
        ...state,
        ...action.payload,
      };

    case 'CLEAR_ALL':
      return initialState;

    default:
      return state;
  }
}

// Context
const FFCSContext = createContext<{
  state: FFCSState;
  dispatch: React.Dispatch<FFCSAction>;
} | undefined>(undefined);

// Provider component
export function FFCSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(ffcsReducer, initialState);

  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('ffcs-data');
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        dispatch({ type: 'LOAD_DATA', payload: parsedData });
      } catch (error) {
        console.error('Error loading saved data:', error);
      }
    }
  }, []);

  // Save data to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('ffcs-data', JSON.stringify(state));
  }, [state]);

  return (
    <FFCSContext.Provider value={{ state, dispatch }}>
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
  return context;
}