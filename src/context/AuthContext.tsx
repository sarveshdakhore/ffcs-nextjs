'use client';

import React, { createContext, useContext, useReducer, useEffect, useCallback, useMemo, ReactNode } from 'react';

// Types
export interface User {
  name: string;
  username: string;
  token: string;
  isGDSC?: boolean;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

// Auth context
const AuthContext = createContext<{
  state: AuthState;
  login: (username: string, password: string, isGDSC?: boolean) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  verifyToken: () => Promise<boolean>;
} | null>(null);

// API Base URL
const API_BASE_URL = 'http://localhost:8005';

// Auth provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Verify token internally
  const verifyTokenInternal = useCallback(async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_BASE_URL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      return response.ok && data.msg !== undefined && !data.msg.includes('ERROR');
    } catch (error) {
      console.error('Token verification failed:', error);
      return false;
    }
  }, []);

  // Login function
  const login = useCallback(async (username: string, password: string, isGDSC = false) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const endpoint = isGDSC ? '/loginGDSC' : '/loginUser';

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && (data.msg === 'SUCCESS' || data.msg === 'Success')) {
        const user: User = {
          name: data.name,
          username,
          token: data.token,
          isGDSC,
        };

        // Save to localStorage
        localStorage.setItem('ffcs-user', JSON.stringify(user));
        dispatch({ type: 'LOGIN_SUCCESS', payload: user });

        // Fetch personal timetables from backend after successful login
        try {
          console.log('📥 Fetching personal timetables after login...');

          const timetablesResponse = await fetch(`${API_BASE_URL}/api/personal/timetables`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`,
            },
          });

          const timetablesData = await timetablesResponse.json();

          if (timetablesResponse.ok && timetablesData.msg === 'Success') {
            console.log('✅ Personal timetables fetched:', timetablesData.data);

            // Trigger event to load timetables into FFCSContext
            if (typeof window !== 'undefined') {
              const event = new CustomEvent('load-personal-timetables', {
                detail: {
                  timetables: timetablesData.data.timetables,
                  activeTimetable: timetablesData.data.activeTimetable
                }
              });
              window.dispatchEvent(event);
            }
          } else {
            console.warn('⚠️ Failed to fetch personal timetables:', timetablesData.msg);
          }
        } catch (timetablesError) {
          console.error('❌ Error fetching personal timetables:', timetablesError);
          // Don't fail login if timetables fetch fails
        }
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: data.msg || 'Login failed' });
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Network error. Please try again.' });
    }
  }, []);

  // Register function
  const register = useCallback(async (username: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });

    try {
      const response = await fetch(`${API_BASE_URL}/create_user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok && (data.msg === 'SUCCESS' || data.msg === 'Success')) {
        // Registration successful, now log in
        await login(username, password, false);
      } else {
        dispatch({ type: 'LOGIN_FAILURE', payload: data.msg || 'Registration failed' });
      }
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE', payload: 'Network error. Please try again.' });
    }
  }, [login]);

  // Logout function
  const logout = useCallback(() => {
    localStorage.removeItem('ffcs-user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  // Clear error function
  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  // Verify token function (public)
  const verifyToken = useCallback(async (): Promise<boolean> => {
    if (!state.user?.token) return false;
    return await verifyTokenInternal(state.user.token);
  }, [state.user?.token, verifyTokenInternal]);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = localStorage.getItem('ffcs-user');
        if (userData) {
          const user = JSON.parse(userData);
          dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        }
      } catch (error) {
        console.error('Error loading user:', error);
        localStorage.removeItem('ffcs-user');
      }
    };

    loadUser();
  }, []); // Empty dependency array - only run once on mount

  const value = useMemo(() => ({
    state,
    login,
    register,
    logout,
    clearError,
    verifyToken,
  }), [state, login, register, logout, clearError, verifyToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
