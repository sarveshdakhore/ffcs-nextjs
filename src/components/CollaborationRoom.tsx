'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useFFCS } from '@/context/FFCSContext';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { io } = require('socket.io-client');
import { useRouter } from 'next/navigation';
import '@/css/collaboration-room.css';

export default function CollaborationRoom() {
  const { state: authState, logout } = useAuth();
  const { state: ffcsState, dispatch: ffcsDispatch, forceUpdate } = useFFCS();
  const router = useRouter();
  
  const socketRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const [roomVisibility, setRoomVisibility] = useState<'public' | 'private'>('public');

  // Save room state to localStorage
  const saveRoomState = (roomData: any) => {
    if (roomData) {
      localStorage.setItem('ffcs-collaboration-room', JSON.stringify(roomData));
    } else {
      localStorage.removeItem('ffcs-collaboration-room');
    }
  };

  // Load room state from localStorage
  const loadRoomState = () => {
    try {
      const saved = localStorage.getItem('ffcs-collaboration-room');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load room state:', error);
      return null;
    }
  };

  // Simple socket connection
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user?.token) {
      console.log('❌ Cannot connect - not authenticated or no token');
      return;
    }

    // Additional check: if token looks invalid, logout immediately
    if (authState.user.token.length < 10) {
      console.log('🔑 Token appears invalid - logging out');
      logout();
      router.push('/login');
      return;
    }

    const socket = io('https://gdscffsc.onrender.com', {
      auth: { 
        token: authState.user.token,
        userId: authState.user.username,
        isGDSC: authState.user.isGDSC || false
      },
      transports: ['websocket'],
      upgrade: false,
      forceNew: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      console.log('✅ Connected via WebSocket');
      setMessage({ type: 'success', text: 'Connected to collaboration server!' });
      
      // Store socket globally for sync functions to access
      if (typeof window !== 'undefined') {
        (window as any).collaborationSocket = socket;
        (window as any).collaborationUserId = authState.user?.username;
        
        // Initialize collaboration state tracking
        if (!(window as any).ffcsCollaborationState) {
          (window as any).ffcsCollaborationState = {
            isReceivingCollaboration: { current: false }
          };
        }
      }
      
      // Try to restore room on connect
      const savedRoom = loadRoomState();
      if (savedRoom?.roomId) {
        console.log('🔄 Attempting to restore room:', savedRoom.roomId);
        setMessage({ type: 'info', text: 'Rejoining previous room...' });
        socket.emit('request-join-room', { roomId: savedRoom.roomId }, (response: any) => {
          if (response?.error) {
            console.log('❌ Failed to restore room:', response.error);
            saveRoomState(null); // Clear invalid room data
            setMessage({ type: 'error', text: 'Previous room no longer available' });
          } else if (response?.pending) {
            setMessage({ type: 'info', text: 'Waiting for admin approval to rejoin...' });
          } else if (response?.success) {
            console.log('✅ Successfully rejoined room');
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('❌ Disconnected from collaboration server');
      setMessage({ type: 'error', text: 'Disconnected from server' });
      
      // Clear global socket reference
      if (typeof window !== 'undefined') {
        (window as any).collaborationSocket = null;
        (window as any).collaborationUserId = null;
      }
      
      // Don't clear room state on disconnect - allow reconnection
    });

    socket.on('connect_error', (error: any) => {
      setConnected(false);
      console.error('❌ Connection error:', error);
      
      // Handle invalid token specifically
      if (error.message.includes('Invalid token') || error.message.includes('No token')) {
        console.log('🔑 Invalid token detected - logging out and redirecting to login');
        
        // Clear all collaboration state
        setCurrentRoom(null);
        setRoomMembers([]);
        setJoinRequests([]);
        saveRoomState(null);
        
        // Clear global socket reference
        if (typeof window !== 'undefined') {
          (window as any).collaborationSocket = null;
          (window as any).collaborationUserId = null;
        }
        
        // Show message before logout
        setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
        
        // Logout and redirect after a short delay to show the message
        setTimeout(() => {
          logout(); // This will clear localStorage and auth state
          router.push('/login');
        }, 1500);
        
        return;
      }
      
      // Handle other connection errors
      setMessage({ type: 'error', text: `Connection failed: ${error.message}` });
    });

    socket.on('joined-room', ({ roomId, roomTt }: { roomId: any; roomTt: any }) => {
      const members = Object.values(roomTt) as any[];
      const roomData = { roomId, adminId: (members[0] as any)?.id };
      setCurrentRoom(roomData);
      setRoomMembers(members);
      
      // Save room state
      saveRoomState(roomData);
      
      // Set flag to prevent sync loops during initial room setup
      if (typeof window !== 'undefined' && (window as any).ffcsCollaborationState) {
        (window as any).ffcsCollaborationState.isReceivingCollaboration.current = true;
      }
      
      // Create global room timetable by merging all members' data
      const allMembers = Object.values(roomTt) as any[];
      if (allMembers.length > 0) {
        const roomTimetableName = `Room ${roomId} - Global`;
        const currentTables = ffcsState.timetableStoragePref || [];
        
        // Merge all members' data to create the most comprehensive timetable
        const mergedData: any[] = [];
        const mergedSubject: any = {};
        const mergedQuick: any[] = [];
        const mergedAttackData: any[] = [];
        const mergedAttackQuick: any[] = [];
        
        // Combine data from all members (avoid duplicates by course code)
        const seenCourses = new Set();
        allMembers.forEach((member: any) => {
          if (member.data) {
            member.data.forEach((course: any) => {
              if (!seenCourses.has(course.courseCode)) {
                mergedData.push(course);
                seenCourses.add(course.courseCode);
              }
            });
          }
          
          // Merge subjects with proper teacher selection merging
          if (member.subject) {
            Object.keys(member.subject).forEach((courseName: string) => {
              if (!mergedSubject[courseName]) {
                // If course doesn't exist, add it completely
                mergedSubject[courseName] = { ...member.subject[courseName] };
              } else {
                // If course exists, merge teachers properly
                const existingCourse = mergedSubject[courseName];
                const newCourse = member.subject[courseName];
                
                // Merge teacher objects
                if (newCourse.teacher) {
                  if (!existingCourse.teacher) {
                    existingCourse.teacher = {};
                  }
                  Object.assign(existingCourse.teacher, newCourse.teacher);
                }
                
                // Use the latest credits value
                if (newCourse.credits !== undefined) {
                  existingCourse.credits = newCourse.credits;
                }
              }
            });
          }
          
          // Merge quick arrays (keeping unique entries)
          if (member.quick) {
            member.quick.forEach((item: any) => {
              if (!mergedQuick.some((existing: any) => 
                JSON.stringify(existing) === JSON.stringify(item)
              )) {
                mergedQuick.push(item);
              }
            });
          }
          
          // Merge attack data
          if (member.attackData) {
            member.attackData.forEach((course: any) => {
              if (!mergedAttackData.some((existing: any) => 
                existing.courseCode === course.courseCode
              )) {
                mergedAttackData.push(course);
              }
            });
          }
          
          // Merge attack quick
          if (member.attackQuick) {
            member.attackQuick.forEach((item: any) => {
              if (!mergedAttackQuick.some((existing: any) => 
                JSON.stringify(existing) === JSON.stringify(item)
              )) {
                mergedAttackQuick.push(item);
              }
            });
          }
        });

        const roomTable = {
          id: Date.now(),
          name: roomTimetableName,
          data: [...mergedData], // Force new array reference
          subject: { ...mergedSubject }, // Force new object reference
          quick: [...mergedQuick], // Force new array reference
          attackData: [...mergedAttackData], // Force new array reference
          attackQuick: [...mergedAttackQuick] // Force new array reference
        };

        const existingIndex = currentTables.findIndex((t: any) => t.name === roomTimetableName);
        let updatedTables;
        
        if (existingIndex >= 0) {
          roomTable.id = currentTables[existingIndex].id;
          updatedTables = currentTables.map((t, i) => i === existingIndex ? roomTable : t);
        } else {
          updatedTables = [...currentTables, roomTable];
        }

        ffcsDispatch({
          type: 'LOAD_DATA',
          payload: {
            timetableStoragePref: updatedTables,
            activeTable: roomTable,
            currentTableId: roomTable.id,
            totalCredits: roomTable.data.reduce((sum: number, course: any) => sum + (course.credits || 0), 0)
          }
        });
        
        // Force UI update after joining room - ensure components re-render
        setTimeout(() => {
          console.log('🔄 Forcing UI update after joining room');
          // Additional force update to ensure all components refresh
          ffcsDispatch({ type: 'FORCE_UPDATE' });
          
          // Try a second dispatch to really force the update
          setTimeout(() => {
            ffcsDispatch({ type: 'FORCE_UPDATE' });
            if (forceUpdate) {
              forceUpdate();
            }
            console.log('✅ Room join UI update complete');
          }, 50);
          
          // Clear the receiving collaboration flag after initial setup
          if (typeof window !== 'undefined' && (window as any).ffcsCollaborationState) {
            (window as any).ffcsCollaborationState.isReceivingCollaboration.current = false;
          }
        }, 100);
      }
      
      setShowCreateModal(false);
      setShowJoinModal(false);
      
      // Check if this was a restoration
      const savedRoom = loadRoomState();
      const wasRestoring = savedRoom?.roomId === roomId;
      
      setMessage({ 
        type: 'success', 
        text: wasRestoring ? `Rejoined room ${roomId}` : `Joined room ${roomId}` 
      });
    });

    socket.on('user-joined', ({ userId, roomTt }: { userId: any; roomTt: any }) => {
      setRoomMembers(Object.values(roomTt));
      setMessage({ type: 'info', text: `${userId} joined` });
    });

    socket.on('timetable-updated', ({ userId, roomTt }: { userId: any; roomTt: any }) => {
      try {
        console.log('📨 Received timetable-updated event:', {
          fromUserId: userId,
          currentUserId: authState.user?.username,
          roomMembersCount: Object.keys(roomTt).length,
          isOwnUpdate: userId === authState.user?.username,
          hasCurrentRoom: !!currentRoom,
          currentRoomId: currentRoom?.roomId
        });
      
      setRoomMembers(Object.values(roomTt));
      
      // Skip processing our own updates to prevent loops
      if (userId === authState.user?.username) {
        console.log('⏭️ Skipping own update to prevent loops');
        return;
      }
      
      // ADDITIONAL LOOP PREVENTION: Check if we just processed this user's update recently
      const now = Date.now();
      const lastProcessedKey = `lastProcessed_${userId}`;
      if (typeof window !== 'undefined') {
        const lastProcessed = (window as any)[lastProcessedKey] || 0;
        if (now - lastProcessed < 2000) { // Don't process updates from same user within 2 seconds
          console.log('🛑 BLOCKED update - too recent from same user:', userId);
          return;
        }
        (window as any)[lastProcessedKey] = now;
      }
      
      // ALWAYS process updates from other users - don't check currentRoom
      console.log('🔄 Processing timetable update from:', userId);
      
      // Find the room ID from the saved room state if currentRoom is not set
      let roomId = currentRoom?.roomId;
      if (!roomId) {
        const savedRoom = loadRoomState();
        roomId = savedRoom?.roomId;
        console.log('🔍 Using saved room ID:', roomId);
      }
      
      if (roomId) {
        // Set flag to prevent sync loops - CRITICAL: Do this FIRST
        if (typeof window !== 'undefined' && (window as any).ffcsCollaborationState) {
          (window as any).ffcsCollaborationState.isReceivingCollaboration.current = true;
          console.log('🛑 SET receiving collaboration flag to TRUE - preventing auto-sync');
        }
        
        console.log('🔄 Processing timetable update from:', userId);
        
        // Always update the room timetable with the latest changes from all members
        const roomTimetableName = `Room ${roomId} - Global`;
        const currentTables = ffcsState.timetableStoragePref || [];
        
        // Debug: Log all room members
        const allMembers = Object.values(roomTt) as any[];
        console.log('👥 All room members:', allMembers.map((m: any) => ({
          id: m.id,
          courses: m.data?.length || 0,
          subjects: Object.keys(m.subject || {}).length
        })));
        
        // Find the member who made the update
        const updatedMember = Object.values(roomTt).find((m: any) => (m as any).id === userId);
        if (updatedMember) {
          console.log('👤 Found updated member data:', {
            userId,
            courses: (updatedMember as any).data?.length || 0,
            subjects: Object.keys((updatedMember as any).subject || {}).length
          });
        } else {
          console.log('⚠️ Updated member not found in room data!');
        }
        
        // Always process the update regardless of whether we found the specific member
        // Merge all members' data to create the most comprehensive timetable
        const mergedData: any[] = [];
        const mergedSubject: any = {};
        const mergedQuick: any[] = [];
        const mergedAttackData: any[] = [];
        const mergedAttackQuick: any[] = [];
        
        console.log('🔄 Starting merge process for', allMembers.length, 'members');
        
        // Combine data from all members (avoid duplicates by course code)
        const seenCourses = new Set();
        allMembers.forEach((member: any, index: number) => {
          console.log(`📊 Processing member ${index + 1}/${allMembers.length}:`, {
            id: member.id,
            courses: member.data?.length || 0,
            subjects: Object.keys(member.subject || {}).length
          });
          
          if (member.data) {
            member.data.forEach((course: any) => {
              if (!seenCourses.has(course.courseCode)) {
                mergedData.push(course);
                seenCourses.add(course.courseCode);
                console.log(`  ✅ Added course: ${course.courseCode} - ${course.courseTitle}`);
              } else {
                console.log(`  ⏭️ Skipped duplicate course: ${course.courseCode}`);
              }
            });
          }
          
          // Merge subjects with proper teacher selection merging
          if (member.subject) {
            Object.keys(member.subject).forEach((courseName: string) => {
              if (!mergedSubject[courseName]) {
                // If course doesn't exist, add it completely
                mergedSubject[courseName] = { ...member.subject[courseName] };
                console.log(`  ✅ Added subject: ${courseName} with ${Object.keys(member.subject[courseName].teacher || {}).length} teachers`);
              } else {
                  // If course exists, merge teachers properly
                  const existingCourse = mergedSubject[courseName];
                  const newCourse = member.subject[courseName];
                  
                  // Merge teacher objects
                  if (newCourse.teacher) {
                    if (!existingCourse.teacher) {
                      existingCourse.teacher = {};
                    }
                    Object.assign(existingCourse.teacher, newCourse.teacher);
                  }
                  
                  // Use the latest credits value
                  if (newCourse.credits !== undefined) {
                    existingCourse.credits = newCourse.credits;
                  }
                }
              });
            }
            
            // Merge quick arrays (keeping unique entries)
            if (member.quick) {
              member.quick.forEach((item: any) => {
                if (!mergedQuick.some((existing: any) => 
                  JSON.stringify(existing) === JSON.stringify(item)
                )) {
                  mergedQuick.push(item);
                }
              });
            }
            
            // Merge attack data
            if (member.attackData) {
              member.attackData.forEach((course: any) => {
                if (!mergedAttackData.some((existing: any) => 
                  existing.courseCode === course.courseCode
                )) {
                  mergedAttackData.push(course);
                }
              });
            }
            
            // Merge attack quick
            if (member.attackQuick) {
              member.attackQuick.forEach((item: any) => {
                if (!mergedAttackQuick.some((existing: any) => 
                  JSON.stringify(existing) === JSON.stringify(item)
                )) {
                  mergedAttackQuick.push(item);
                }
              });
            }
          });

        console.log('🎯 Merge completed:', {
          totalCourses: mergedData.length,
          totalSubjects: Object.keys(mergedSubject).length,
          totalTeachers: Object.values(mergedSubject).reduce((sum: number, subject: any) => 
            sum + Object.keys(subject.teacher || {}).length, 0)
        });

        const existingIndex = currentTables.findIndex((t: any) => t.name === roomTimetableName);
        
        const roomTable = {
          id: existingIndex >= 0 ? currentTables[existingIndex].id : Date.now(),
          name: roomTimetableName,
          data: JSON.parse(JSON.stringify(mergedData)), // Deep clone to force new reference
          subject: JSON.parse(JSON.stringify(mergedSubject)), // Deep clone to force new reference
          quick: JSON.parse(JSON.stringify(mergedQuick)), // Deep clone to force new reference
          attackData: JSON.parse(JSON.stringify(mergedAttackData)), // Deep clone to force new reference
          attackQuick: JSON.parse(JSON.stringify(mergedAttackQuick)) // Deep clone to force new reference
        };

        let updatedTables;
        
        if (existingIndex >= 0) {
          updatedTables = currentTables.map((t, i) => i === existingIndex ? roomTable : t);
        } else {
          updatedTables = [...currentTables, roomTable];
        }
        
        console.log('🔄 Updating collaboration room data:', {
          roomId: roomId,
          userId,
          dataLength: mergedData.length,
          subjectKeys: Object.keys(mergedSubject),
          tableId: roomTable.id,
          existingIndex,
          currentTableId: ffcsState.currentTableId,
          willSwitchTable: roomTable.id !== ffcsState.currentTableId
        });
        
        console.log('📤 Dispatching LOAD_DATA with payload:', {
          activeTableName: roomTable.name,
          activeTableId: roomTable.id,
          activeTableCourses: roomTable.data.length,
          activeTableSubjects: Object.keys(roomTable.subject).length,
          willReplaceCurrentTable: ffcsState.currentTableId !== roomTable.id
        });
        
        // DIRECT FORCE UPDATE - bypass normal state flow temporarily
        console.log('🚨 FORCING DIRECT UPDATE - DEBUGGING MODE');
        
        ffcsDispatch({
          type: 'LOAD_DATA',
          payload: {
            timetableStoragePref: updatedTables,
            activeTable: roomTable,
            currentTableId: roomTable.id,
            totalCredits: roomTable.data.reduce((sum: number, course: any) => sum + (course.credits || 0), 0)
          }
        });
        
        // Immediate multiple force updates
        ffcsDispatch({ type: 'FORCE_UPDATE' });
        ffcsDispatch({ type: 'FORCE_UPDATE' });
        ffcsDispatch({ type: 'FORCE_UPDATE' });
        
        // Also manually switch to room table if we're not on it
        if (ffcsState.currentTableId !== roomTable.id) {
          ffcsDispatch({ type: 'SWITCH_TABLE', payload: roomTable.id });
        }
        
        // SIMPLE FORCE UPDATE - no complex timing
        if (forceUpdate) {
          forceUpdate();
          forceUpdate();
          forceUpdate();
        }
        
        console.log('✅ Direct collaboration UI update complete');
        setMessage({ type: 'info', text: `${userId} updated timetable` });
        
        // Clear the receiving collaboration flag after processing - LONGER DELAY
        setTimeout(() => {
          if (typeof window !== 'undefined' && (window as any).ffcsCollaborationState) {
            (window as any).ffcsCollaborationState.isReceivingCollaboration.current = false;
            console.log('🏁 CLEARED receiving collaboration flag - auto-sync re-enabled');
          }
        }, 1000); // Increased from 100ms to 1000ms
      } else {
        console.log('❌ No room ID found - cannot process update');
      }
      } catch (error) {
        // Handle timetable update errors gracefully
        console.error('❌ Error processing timetable update:', error);
        handleCollaborationError(error);
      }
    });

    socket.on('join-request', ({ userId }: { userId: any }) => {
      setJoinRequests(prev => [...prev, { userId }]);
      setMessage({ type: 'info', text: `${userId} wants to join` });
    });

    socket.on('server-message', ({ error, message: msg }: { error: any; message: any }) => {
      if (error) setMessage({ type: 'error', text: error });
      if (msg) setMessage({ type: 'info', text: msg });
    });

    socket.on('user-left', ({ userId }: { userId: any }) => {
      if (userId === authState.user?.username) {
        // Current user was removed from room
        setCurrentRoom(null);
        setRoomMembers([]);
        setJoinRequests([]);
        saveRoomState(null);
        setMessage({ type: 'info', text: 'You have been removed from the room' });
      } else {
        setMessage({ type: 'info', text: `${userId} left the room` });
      }
    });

    return () => {
      // Clear global socket reference before disconnecting
      if (typeof window !== 'undefined') {
        (window as any).collaborationSocket = null;
      }
      socket.disconnect();
    };
  }, [authState.isAuthenticated, authState.user?.token, logout, router]);

  // Helper function to gracefully disconnect and reset state
  const handleCollaborationError = (error: any) => {
    console.error('❌ Collaboration error occurred:', error);
    
    // Check if it's a token-related error
    const errorMessage = error?.message || error?.toString() || '';
    if (errorMessage.includes('Invalid token') || errorMessage.includes('No token') || errorMessage.includes('Unauthorized')) {
      console.log('🔑 Token-related error detected - logging out and redirecting');
      
      // Clear all collaboration state
      setCurrentRoom(null);
      setRoomMembers([]);
      setJoinRequests([]);
      setConnected(false);
      saveRoomState(null);
      
      // Clear global socket reference
      if (typeof window !== 'undefined') {
        (window as any).collaborationSocket = null;
        (window as any).collaborationUserId = null;
      }
      
      // Disconnect socket
      if (socketRef.current?.connected) {
        socketRef.current.disconnect();
      }
      
      // Show message and logout
      setMessage({ type: 'error', text: 'Session expired. Please log in again.' });
      setTimeout(() => {
        logout();
        router.push('/login');
      }, 1500);
      
      return;
    }
    
    // Handle other errors normally
    // Disconnect socket
    if (socketRef.current?.connected) {
      socketRef.current.disconnect();
    }
    
    // Reset all collaboration state
    setCurrentRoom(null);
    setRoomMembers([]);
    setJoinRequests([]);
    setConnected(false);
    saveRoomState(null);
    
    // Clear global socket reference
    if (typeof window !== 'undefined') {
      (window as any).collaborationSocket = null;
      (window as any).collaborationUserId = null;
    }
    
    setMessage({ type: 'error', text: 'Collaboration error - returning to normal view' });
  };

  // Auto-sync timetable changes - comprehensive detection
  useEffect(() => {
    try {
      // Get room ID from either currentRoom or saved state
      let roomId = currentRoom?.roomId;
      if (!roomId) {
        const savedRoom = loadRoomState();
        roomId = savedRoom?.roomId;
      }
    
    console.log('🔍 Auto-sync effect triggered:', {
      socketConnected: socketRef.current?.connected,
      hasCurrentRoom: !!currentRoom,
      hasActiveTable: !!ffcsState.activeTable,
      roomId: roomId,
      tableId: ffcsState.activeTable?.id,
      forceUpdateCounter: ffcsState.forceUpdateCounter
    });
    
    if (!socketRef.current?.connected || !roomId || !ffcsState.activeTable) {
      console.log('🔍 Auto-sync skipped:', {
        connected: socketRef.current?.connected,
        roomId,
        activeTable: !!ffcsState.activeTable
      });
      return;
    }

    // Don't sync if we're receiving collaboration data to prevent loops
    if (typeof window !== 'undefined' && (window as any).ffcsCollaborationState?.isReceivingCollaboration?.current) {
      console.log('� BLOCKED auto-sync - currently receiving collaboration data');
      return;
    }

    const timetableData = {
      id: authState.user?.username || 'user',
      name: authState.user?.name || 'User',
      data: ffcsState.activeTable.data || [],
      subject: ffcsState.activeTable.subject || {},
      quick: ffcsState.activeTable.quick || [],
      attackData: ffcsState.activeTable.attackData || [],
      attackQuick: ffcsState.activeTable.attackQuick || []
    };

    console.log('🔄 Auto-syncing timetable changes to room:', roomId);
    console.log('� Syncing:', {
      courses: timetableData.data.length,
      subjects: Object.keys(timetableData.subject).length,
      teachers: Object.keys(timetableData.subject).map(s => 
        Object.keys(timetableData.subject[s]?.teacher || {}).length
      ).reduce((a, b) => a + b, 0)
    });

    // Send the update with user information for proper identification
    socketRef.current.emit('update-timetable', {
      roomId: roomId,
      userId: authState.user?.username || 'user',
      timetable: timetableData
    });
    } catch (error) {
      // Handle any errors gracefully by disconnecting and returning to normal view
      handleCollaborationError(error);
    }
  }, [
    // Watch the entire state to catch ALL changes - using JSON.stringify for deep comparison
    JSON.stringify(ffcsState.activeTable?.data), // Serialize to catch deep changes
    JSON.stringify(ffcsState.activeTable?.subject), // Serialize to catch deep changes
    JSON.stringify(ffcsState.activeTable?.quick), // Serialize to catch deep changes
    JSON.stringify(ffcsState.activeTable?.attackData), // Serialize to catch deep changes
    JSON.stringify(ffcsState.activeTable?.attackQuick), // Serialize to catch deep changes
    ffcsState.forceUpdateCounter, // This catches manual force updates
    ffcsState.totalCredits,
    currentRoom?.roomId,
    connected
  ]);

  // Restore room state on mount
  useEffect(() => {
    const savedRoom = loadRoomState();
    if (savedRoom?.roomId && !currentRoom) {
      console.log('🔄 Room state found in storage:', savedRoom.roomId);
      // Room restoration will happen when socket connects
    }
  }, []);

  // Actions
  const createRoom = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('create-room', { visibility: roomVisibility }, (response: any) => {
        if (response?.error) {
          setMessage({ type: 'error', text: response.error });
        } else if (response?.roomId) {
          console.log(`✅ Room created with ID: ${response.roomId}`);
        }
      });
    }
  };

  const joinRoom = () => {
    if (socketRef.current?.connected && roomIdToJoin.trim()) {
      socketRef.current.emit('request-join-room', { roomId: roomIdToJoin.trim() }, (response: any) => {
        if (response?.error) {
          setMessage({ type: 'error', text: response.error });
        } else if (response?.pending) {
          setMessage({ type: 'info', text: 'Waiting for admin approval...' });
        }
      });
    }
  };

  const leaveRoom = () => {
    if (socketRef.current?.connected && currentRoom) {
      socketRef.current.emit('leave-room', { roomId: currentRoom.roomId });
      setCurrentRoom(null);
      setRoomMembers([]);
      setJoinRequests([]);
      saveRoomState(null); // Clear saved room state
      setMessage({ type: 'info', text: 'Left room' });
    }
  };

  const approveJoin = (userId: string) => {
    if (socketRef.current?.connected && currentRoom) {
      socketRef.current.emit('approve-join', { roomId: currentRoom.roomId, userId });
      setJoinRequests(prev => prev.filter(r => r.userId !== userId));
    }
  };

  // Auto-hide messages
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  if (!authState.isAuthenticated) return null;

  return (
    <div className="collab-room">
      <div className="collab-container">
        {/* Header */}
        <div className="collab-header">
          <h1 className="collab-title">Collaboration Room</h1>
          <p className="collab-subtitle">Share and sync your timetables in real-time</p>
          <div className="collab-status">
            <div className={`status-indicator ${connected ? 'connected' : 'disconnected'}`}></div>
            <span className={`status-text ${connected ? 'connected' : 'disconnected'}`}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`message ${message.type} ${message.text.includes('Session expired') ? 'urgent' : ''}`}>
            {message.text}
            {message.text.includes('Session expired') && (
              <div style={{ marginTop: '8px', fontSize: '14px', opacity: 0.9 }}>
                Redirecting to login page...
              </div>
            )}
          </div>
        )}

        {/* Room Status */}
        {currentRoom ? (
          <div className="collab-card">
            <div className="room-header">
              <div className="room-info">
                <h2>Room {currentRoom.roomId}</h2>
                <p>{roomMembers.length} member(s)</p>
              </div>
              <button
                onClick={leaveRoom}
                className="btn btn-danger"
              >
                Leave Room
              </button>
            </div>

            {/* Members */}
            <div className="member-list">
              <h3>Members</h3>
              {roomMembers.map((member: any, index) => (
                <div key={(member as any).id || index} className="member-item">
                  <div className="member-info">
                    <span className="member-name">{(member as any).name || (member as any).id}</span>
                    {(member as any).id === currentRoom.adminId && (
                      <span className="admin-badge">Admin</span>
                    )}
                  </div>
                  <span className="course-count">
                    {(member as any).data?.length || 0} courses
                  </span>
                </div>
              ))}
            </div>

            {/* Join Requests (for admin) */}
            {joinRequests.length > 0 && currentRoom.adminId === authState.user?.username && (
              <div className="join-requests">
                <h3>Join Requests</h3>
                {joinRequests.map((request, index) => (
                  <div key={index} className="join-request-item">
                    <span className="join-request-user">{request.userId}</span>
                    <button
                      onClick={() => approveJoin(request.userId)}
                      className="btn btn-success btn-small"
                    >
                      Approve
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="collab-card large-card">
            <div className="empty-state">
              <h2>Join or Create a Room</h2>
              <div className="btn-group">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="btn btn-primary btn-large"
                >
                  Create Room
                </button>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="btn btn-success btn-large"
                >
                  Join Room
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Room Modal */}
        {showCreateModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Create Room</h3>
              <div className="modal-form">
                <div className="form-group">
                  <label className="form-label">Visibility</label>
                  <select
                    value={roomVisibility}
                    onChange={(e) => setRoomVisibility(e.target.value as 'public' | 'private')}
                    className="form-select"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
                <div className="btn-group-fill">
                  <button
                    onClick={createRoom}
                    className="btn btn-primary"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Join Room Modal */}
        {showJoinModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Join Room</h3>
              <div className="modal-form">
                <input
                  type="text"
                  placeholder="Enter Room ID"
                  value={roomIdToJoin}
                  onChange={(e) => setRoomIdToJoin(e.target.value)}
                  className="form-input"
                />
                <div className="btn-group-fill">
                  <button
                    onClick={joinRoom}
                    className="btn btn-success"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => setShowJoinModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
