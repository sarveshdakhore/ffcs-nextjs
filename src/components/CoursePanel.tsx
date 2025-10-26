'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFFCS } from '@/context/FFCSContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { activateSortable, deactivateSortable } from '@/utils/sortableUtils';
// Using require() for socket.io-client due to TypeScript import compatibility issues
const { io } = require('socket.io-client');
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
import { 
  parseTextToListForMultipleAdd, 
  validateTeacherData, 
  processTeacherName 
} from '@/utils/teacherUtils';
import { CourseData } from '@/context/FFCSContext';

export default function CoursePanel() {
  const { state, dispatch, forceUpdate } = useFFCS();
  const { state: authState, logout } = useAuth();
  const router = useRouter();

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
  
  // Multiple teachers modal states
  const [multipleTeachersText, setMultipleTeachersText] = useState('');
  const [multipleError, setMultipleError] = useState('');
  const [showMultipleTeachersModal, setShowMultipleTeachersModal] = useState(false);
  
  // Live FFCS Mode (Attack Mode) states
  const [liveFfcsMode, setLiveFfcsMode] = useState(false);
  const [autoFocus, setAutoFocus] = useState(true);

  // Room Settings state
  const [showRoomSettings, setShowRoomSettings] = useState(false);

  // Collaboration room states
  const socketRef = useRef<any>(null);
  const [connected, setConnected] = useState(false);
  const [currentRoom, setCurrentRoom] = useState<any>(null);
  const [roomMembers, setRoomMembers] = useState<any[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [collabMessage, setCollabMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [publicRooms, setPublicRooms] = useState<any[]>([]);
  const [roomIdToJoin, setRoomIdToJoin] = useState('');
  const [roomSearchQuery, setRoomSearchQuery] = useState('');
  const [primaryTimetableUser, setPrimaryTimetableUser] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [roomVisibility, setRoomVisibility] = useState<'public' | 'private'>('public');

  // Multi-room management states
  const [myRooms, setMyRooms] = useState<any[]>([]); // All rooms user is part of
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null); // Currently viewing room ID
  const [activeRoomDetails, setActiveRoomDetails] = useState<any>(null); // Full room info for active room
  const [activeRoomMembers, setActiveRoomMembers] = useState<any[]>([]); // Members with timetables for active room

  // Force re-render trigger for occupied slots when QV toggles
  const [qvUpdateTrigger, setQvUpdateTrigger] = useState(0);

  // Modal refs for Bootstrap
  const modalRef = useRef<HTMLDivElement>(null);
  const bootstrapModalRef = useRef<any>(null);
  
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

  // DEBUG: Log when activeTable changes
  useEffect(() => {
    console.log('🔍 CoursePanel activeTable changed:', {
      tableId: activeTable.id,
      tableName: activeTable.name,
      courses: activeTable.data?.length || 0,
      subjects: Object.keys(subjects).length,
      forceCounter: state.forceUpdateCounter
    });
  }, [activeTable.id, activeTable.name, activeTable.data?.length, Object.keys(subjects).length, state.forceUpdateCounter]);

  // Force component update (similar to re-rendering in vanilla JS)
  const [renderKey, setRenderKey] = useState(0);
  const triggerUpdate = () => setRenderKey(prev => prev + 1);

  // Collaboration room helper functions
  const saveRoomState = (roomData: any) => {
    if (roomData) {
      localStorage.setItem('ffcs-collaboration-room', JSON.stringify(roomData));
    } else {
      localStorage.removeItem('ffcs-collaboration-room');
    }
  };

  const loadRoomState = () => {
    try {
      const saved = localStorage.getItem('ffcs-collaboration-room');
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load room state:', error);
      return null;
    }
  };

  const createRoom = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('create-room', { visibility: roomVisibility }, (response: any) => {
        if (response?.error) {
          setCollabMessage({ type: 'error', text: response.error });
        } else if (response?.roomId) {
          console.log(`✅ Room created with ID: ${response.roomId}`);
          setCollabMessage({ type: 'success', text: `Room created: ${response.roomId}` });
        }
      });
    } else {
      setCollabMessage({ type: 'error', text: 'Not connected to collaboration server' });
    }
  };

  const joinRoom = (roomId?: string) => {
    const targetRoomId = roomId || roomIdToJoin.trim();
    if (socketRef.current?.connected && targetRoomId) {
      socketRef.current.emit('request-join-room', { roomId: targetRoomId }, (response: any) => {
        if (response?.error) {
          setCollabMessage({ type: 'error', text: response.error });
        } else if (response?.pending) {
          setCollabMessage({ type: 'info', text: 'Waiting for admin approval...' });
          setRoomIdToJoin('');
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
      saveRoomState(null);
      setCollabMessage({ type: 'info', text: 'Left room' });
    }
  };

  const approveJoin = (userId: string) => {
    if (socketRef.current?.connected && currentRoom) {
      socketRef.current.emit('approve-join', { roomId: currentRoom.roomId, userId });
      setJoinRequests(prev => prev.filter(r => r.userId !== userId));
      setCollabMessage({ type: 'success', text: `${userId} approved` });
    }
  };

  const fetchPublicRooms = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/rooms/public`, {
        headers: {
          'Authorization': `Bearer ${authState.user?.token}`,
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPublicRooms(data.data?.rooms || []);
      } else {
        setCollabMessage({ type: 'error', text: 'Failed to fetch public rooms' });
      }
    } catch (error) {
      setCollabMessage({ type: 'error', text: 'Error fetching public rooms' });
    }
  };

  const searchRooms = async () => {
    if (!roomSearchQuery.trim()) {
      fetchPublicRooms();
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/rooms/search?q=${encodeURIComponent(roomSearchQuery)}`,
        {
          headers: {
            'Authorization': `Bearer ${authState.user?.token}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setPublicRooms(data.data?.rooms || []);
      } else {
        setCollabMessage({ type: 'error', text: 'Search failed' });
      }
    } catch (error) {
      setCollabMessage({ type: 'error', text: 'Error searching rooms' });
    }
  };

  const removeMember = async (userId: string) => {
    if (!currentRoom || currentRoom.adminId !== authState.user?.username) {
      setCollabMessage({ type: 'error', text: 'Only admin can remove members' });
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/room/${currentRoom.roomId}/member/${userId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authState.user?.token}`,
          }
        }
      );

      if (response.ok) {
        setCollabMessage({ type: 'success', text: `${userId} removed from room` });
      } else {
        const data = await response.json();
        setCollabMessage({ type: 'error', text: data.msg || 'Failed to remove member' });
      }
    } catch (error) {
      setCollabMessage({ type: 'error', text: 'Error removing member' });
    }
  };

  const setPrimaryTimetable = async (userId: string) => {
    if (!currentRoom || currentRoom.adminId !== authState.user?.username) {
      setCollabMessage({ type: 'error', text: 'Only admin can set primary timetable' });
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/room/${currentRoom.roomId}/timetable/primary`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.user?.token}`,
          },
          body: JSON.stringify({ userId })
        }
      );

      if (response.ok) {
        setPrimaryTimetableUser(userId);
        setCollabMessage({ type: 'success', text: `${userId}'s timetable is now primary` });
      } else {
        const data = await response.json();
        setCollabMessage({ type: 'error', text: data.msg || 'Failed to set primary timetable' });
      }
    } catch (error) {
      setCollabMessage({ type: 'error', text: 'Error setting primary timetable' });
    }
  };

  const updateRoomName = async () => {
    if (!currentRoom || currentRoom.adminId !== authState.user?.username || !newRoomName.trim()) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/room/${currentRoom.roomId}/name`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authState.user?.token}`,
          },
          body: JSON.stringify({ displayName: newRoomName.trim() })
        }
      );

      if (response.ok) {
        setCollabMessage({ type: 'success', text: 'Room name updated' });
        setNewRoomName('');
        setCurrentRoom({ ...currentRoom, displayName: newRoomName.trim() });
      } else {
        const data = await response.json();
        setCollabMessage({ type: 'error', text: data.msg || 'Failed to update room name' });
      }
    } catch (error) {
      setCollabMessage({ type: 'error', text: 'Error updating room name' });
    }
  };

  // Multi-room management helper functions
  const fetchMyRooms = async () => {
    if (!authState.isAuthenticated || !authState.user?.token) {
      return;
    }

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/user/rooms`,
        {
          headers: {
            'Authorization': `Bearer ${authState.user.token}`,
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        const allRooms = [...(data.data?.owned || []), ...(data.data?.member || [])];
        setMyRooms(allRooms);
      } else {
        setCollabMessage({ type: 'error', text: 'Failed to fetch your rooms' });
      }
    } catch (error) {
      console.error('Error fetching rooms:', error);
      setCollabMessage({ type: 'error', text: 'Error fetching your rooms' });
    }
  };

  const fetchActiveRoomDetails = async (roomId: string) => {
    if (!authState.isAuthenticated || !authState.user?.token) {
      return;
    }

    try {
      const [infoResponse, membersResponse] = await Promise.all([
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/room/${roomId}/info`,
          {
            headers: {
              'Authorization': `Bearer ${authState.user.token}`,
            }
          }
        ),
        fetch(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8005'}/api/room/${roomId}/members`,
          {
            headers: {
              'Authorization': `Bearer ${authState.user.token}`,
            }
          }
        )
      ]);

      if (infoResponse.ok && membersResponse.ok) {
        const infoData = await infoResponse.json();
        const membersData = await membersResponse.json();

        setActiveRoomDetails(infoData.data);
        setActiveRoomMembers(membersData.data?.members || []);
        setPrimaryTimetableUser(infoData.data?.primaryTimetableUserId || '');
      } else {
        setCollabMessage({ type: 'error', text: 'Failed to fetch room details' });
      }
    } catch (error) {
      console.error('Error fetching room details:', error);
      setCollabMessage({ type: 'error', text: 'Error fetching room details' });
    }
  };

  const switchToRoom = (roomId: string) => {
    // Set as active room
    setActiveRoomId(roomId);

    // Join via socket
    if (socketRef.current?.connected) {
      socketRef.current.emit('request-join-room', { roomId }, (response: any) => {
        if (response?.error) {
          setCollabMessage({ type: 'error', text: response.error });
        } else {
          // Fetch full details
          fetchActiveRoomDetails(roomId);
        }
      });
    }
  };

  const joinRoomAndAdd = (roomId: string) => {
    if (socketRef.current?.connected && roomId) {
      socketRef.current.emit('request-join-room', { roomId }, (response: any) => {
        if (response?.error) {
          setCollabMessage({ type: 'error', text: response.error });
        } else if (response?.pending) {
          setCollabMessage({ type: 'info', text: 'Waiting for admin approval...' });
          setRoomIdToJoin('');
        } else {
          // Successfully joined, refresh room list and set as active
          fetchMyRooms();
          setActiveRoomId(roomId);
          fetchActiveRoomDetails(roomId);
          setRoomIdToJoin('');
        }
      });
    }
  };

  const leaveRoomPermanently = async (roomId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('leave-room', { roomId });

      // Remove from myRooms
      setMyRooms(prev => prev.filter(r => r.roomId !== roomId));

      // Clear active room if it was the one we left
      if (activeRoomId === roomId) {
        setActiveRoomId(null);
        setActiveRoomDetails(null);
        setActiveRoomMembers([]);
        setCurrentRoom(null);
        setRoomMembers([]);
        setJoinRequests([]);
        saveRoomState(null);
      }

      setCollabMessage({ type: 'info', text: 'Left room' });
    }
  };

  const createRoomAndActivate = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('create-room', { visibility: roomVisibility }, (response: any) => {
        if (response?.error) {
          setCollabMessage({ type: 'error', text: response.error });
        } else if (response?.roomId) {
          console.log(`✅ Room created with ID: ${response.roomId}`);
          setCollabMessage({ type: 'success', text: `Room created: ${response.roomId}` });

          // Add to myRooms and set as active
          fetchMyRooms();
          setActiveRoomId(response.roomId);
          fetchActiveRoomDetails(response.roomId);
        }
      });
    } else {
      setCollabMessage({ type: 'error', text: 'Not connected to collaboration server' });
    }
  };

  // Sync liveFfcsMode with global attackMode state
  useEffect(() => {
    if (state.ui.attackMode !== liveFfcsMode) {
      console.log('🔄 Syncing liveFfcsMode with global attackMode:', state.ui.attackMode);
      setLiveFfcsMode(state.ui.attackMode);
    }
  }, [state.ui.attackMode, liveFfcsMode]);

  // Force re-render of occupied slots when QV toggles in live mode
  useEffect(() => {
    console.log('🔄 QV state changed:', {
      liveFfcsMode,
      attackMode: state.ui.attackMode,
      quickVisualizationEnabled: state.ui.quickVisualizationEnabled,
      willTrigger: liveFfcsMode || state.ui.attackMode
    });
    if (liveFfcsMode || state.ui.attackMode) {
      console.log('🔄 Forcing occupied slots refresh via qvUpdateTrigger');
      setQvUpdateTrigger(prev => prev + 1);
    }
  }, [state.ui.quickVisualizationEnabled, liveFfcsMode, state.ui.attackMode]);

  // Socket connection for collaboration
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.user?.token) {
      console.log('❌ Cannot connect - not authenticated or no token');
      return;
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8005', {
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
      setCollabMessage({ type: 'success', text: 'Connected to collaboration server!' });

      // Store socket globally
      if (typeof window !== 'undefined') {
        (window as any).collaborationSocket = socket;
        (window as any).collaborationUserId = authState.user?.username;

        if (!(window as any).ffcsCollaborationState) {
          (window as any).ffcsCollaborationState = {
            isReceivingCollaboration: { current: false }
          };
        }
      }

      // Try to restore room
      const savedRoom = loadRoomState();
      if (savedRoom?.roomId) {
        console.log('🔄 Attempting to restore room:', savedRoom.roomId);
        socket.emit('request-join-room', { roomId: savedRoom.roomId }, (response: any) => {
          if (response?.error) {
            console.log('❌ Failed to restore room:', response.error);
            saveRoomState(null);
          }
        });
      }
    });

    socket.on('disconnect', () => {
      setConnected(false);
      console.log('❌ Disconnected from collaboration server');
      if (typeof window !== 'undefined') {
        (window as any).collaborationSocket = null;
      }
    });

    socket.on('joined-room', ({ roomId, roomTt }: any) => {
      const members = Object.values(roomTt) as any[];
      const roomData = { roomId, adminId: (members[0] as any)?.id };
      setCurrentRoom(roomData);
      setRoomMembers(members);
      saveRoomState(roomData);
      setCollabMessage({ type: 'success', text: `Joined room ${roomId}` });

      // Refresh room list when we join a room
      fetchMyRooms();

      // If this room is our active room, fetch details
      if (activeRoomId === roomId) {
        fetchActiveRoomDetails(roomId);
      }
    });

    socket.on('user-joined', ({ userId, roomTt }: any) => {
      setRoomMembers(Object.values(roomTt));
      setCollabMessage({ type: 'info', text: `${userId} joined` });

      // Refresh active room members if viewing a room
      if (activeRoomId) {
        fetchActiveRoomDetails(activeRoomId);
      }
    });

    socket.on('user-left', ({ userId }: any) => {
      if (userId === authState.user?.username) {
        setCurrentRoom(null);
        setRoomMembers([]);
        setJoinRequests([]);
        saveRoomState(null);
        setCollabMessage({ type: 'info', text: 'You have been removed from the room' });

        // Refresh room list when we're removed
        fetchMyRooms();
      } else {
        setCollabMessage({ type: 'info', text: `${userId} left the room` });

        // Refresh active room members if viewing a room
        if (activeRoomId) {
          fetchActiveRoomDetails(activeRoomId);
        }
      }
    });

    socket.on('join-request', ({ userId }: any) => {
      setJoinRequests(prev => [...prev, { userId }]);
      setCollabMessage({ type: 'info', text: `${userId} wants to join` });
    });

    socket.on('server-message', ({ error, message: msg }: any) => {
      if (error) setCollabMessage({ type: 'error', text: error });
      if (msg) setCollabMessage({ type: 'info', text: msg });
    });

    return () => {
      if (typeof window !== 'undefined') {
        (window as any).collaborationSocket = null;
      }
      socket.disconnect();
    };
  }, [authState.isAuthenticated, authState.user?.token, authState.user?.username, authState.user?.isGDSC]);

  // Auto-fetch public rooms and myRooms when room settings is opened
  useEffect(() => {
    if (showRoomSettings && connected && authState.isAuthenticated) {
      fetchPublicRooms();
      fetchMyRooms();
    }
  }, [showRoomSettings, connected, authState.isAuthenticated]);

  // Auto-hide messages after 5 seconds
  useEffect(() => {
    if (collabMessage) {
      const timer = setTimeout(() => setCollabMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [collabMessage]);

  // Create a stable key for React re-rendering based on actual data changes
  const dataKey = useMemo(() => {
    const subjectsString = JSON.stringify(subjects);
    const dataString = JSON.stringify(activeTable.data);
    const collaborationActive = typeof window !== 'undefined' && (window as any).collaborationSocket ? 'collab' : 'solo';
    const timestamp = Date.now(); // Force new key every time
    return `${activeTable.id}-${subjectsString}-${dataString}-${state.forceUpdateCounter}-${collaborationActive}-${renderKey}-${timestamp}`;
  }, [activeTable.id, JSON.stringify(activeTable.data), JSON.stringify(subjects), state.forceUpdateCounter, renderKey]);

  // Add socket listener for collaboration updates with AGGRESSIVE re-rendering
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
      const socket = (window as any).collaborationSocket;
      
      const handleCollaborationUpdate = (data: any) => {
        console.log('🔄 CoursePanel: Received collaboration update', data);
        
        // Only trigger update if this is not our own change
        if (data.userId !== (window as any).collaborationUserId) {
          console.log('🚨 CoursePanel: FORCING AGGRESSIVE UPDATE');
          
          // Multiple immediate updates
          triggerUpdate();
          triggerUpdate();
          triggerUpdate();
          
          // Force re-render via forceUpdate if available
          if (forceUpdate) {
            forceUpdate();
            forceUpdate();
            forceUpdate();
          }
          
          // Force state update
          setTimeout(() => {
            triggerUpdate();
            if (forceUpdate) forceUpdate();
          }, 10);
          
          setTimeout(() => {
            triggerUpdate();
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

  // Load courses data on component mount (like getCourses in vanilla JS)
  useEffect(() => {
    const loadCoursesData = async () => {
      try {
        // For now, use empty arrays - the course data loading needs to be fixed
        // But this is separate from the collaboration sync issue
        setCoursesData({
          courses: [],
          all_data: []
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

    // Trigger collaboration sync after course addition (debounced)
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
        console.log('🔄 Syncing course addition to collaboration room');
        // Don't force update here - let the natural sync handle it
      }
    }, 100);

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
        
        // Trigger collaboration sync after teacher deselection (debounced)
        setTimeout(() => {
          if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
            console.log('🔄 Syncing teacher deselection to collaboration room');
            // Force an auto-sync by triggering a state update
            dispatch({ type: 'FORCE_UPDATE' });
          }
        }, 100);
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

      // Trigger collaboration sync after teacher selection (debounced)
      setTimeout(() => {
        if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
          console.log('🔄 Syncing teacher selection to collaboration room');
          // Force an auto-sync by triggering a state update
          dispatch({ type: 'FORCE_UPDATE' });
        }
      }, 100);

      // Auto-focus next course - ONLY in attack mode when autofocus is enabled
      if (state.ui.attackMode && state.ui.autoFocusEnabled) {
        // LIVE MODE with autofocus: close current dropdown and open next
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
      // NORMAL MODE: do nothing, dropdown stays open
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

    // Trigger collaboration sync after subject addition (debounced)
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
        console.log('🔄 Syncing subject addition to collaboration room');
        // Don't force update here - let the natural sync handle it
      }
    }, 100);

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

    // Trigger collaboration sync after teacher addition (debounced)
    setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).collaborationSocket) {
        console.log('🔄 Syncing teacher addition to collaboration room');
        // Don't force update here - let the natural sync handle it
      }
    }, 100);

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

  // Character filtering functions (from original FFCSonTheGo)
  const applyOriginalCharacterFiltering = (input: string): string => {
    let cleanedValue = input.replace(/\./g, ''); // Remove dots
    cleanedValue = cleanedValue.replace(/\--/g, '-'); // Replace double dashes with single dash
    cleanedValue = cleanedValue.replace(/\  /g, ' '); // Replace double spaces with single space
    cleanedValue = cleanedValue.replace(/[^a-zA-Z0-9+ \-()]/g, ''); // Keep only alphanumeric, +, space, -, ()
    return cleanedValue;
  };

  const applySlotCharacterFiltering = (input: string): string => {
    let cleanedValue = input.replace(/\./g, ''); // Remove dots
    cleanedValue = cleanedValue.replace(/[^a-zA-Z0-9+-]/g, ''); // Keep only alphanumeric, +, -
    return cleanedValue;
  };

  const applyCourseCodeFiltering = (input: string): string => {
    // Course codes should be clean already but apply basic filtering
    // Allow alphanumeric characters for course codes (dashes are handled separately in full course names)
    return input.replace(/[^a-zA-Z0-9]/g, ''); // Keep only alphanumeric for course codes
  };

  const trimSign = (str: string, sign: string): string => {
    while (str.startsWith(sign)) {
      str = str.slice(1);
    }
    while (str.endsWith(sign)) {
      str = str.slice(0, -1);
    }
    return str;
  };

  const processRawCourseName = (courseInput: string): string => {
    try {
      courseInput = courseInput.trim();
      courseInput = trimSign(courseInput, '-');
      const courseListStr = courseInput.split('-').filter(part => part.trim() !== '');
      
      if (courseListStr.length > 1 && courseListStr[0] !== '') {
        let part2 = '';
        for (let i = 1; i < courseListStr.length; i++) {
          if (courseListStr[i].trim() !== '') {
            part2 += '-' + courseListStr[i].trim();
          }
        }
        courseInput = courseListStr[0].trim() + part2;
      } else {
        courseInput = courseListStr[0]?.trim() || '';
      }
      
      if (courseInput) {
        courseInput = trimSign(courseInput, '-');
        courseInput = courseInput.replace(/\s+/g, ' ');
        return courseInput;
      }
      return '';
    } catch (e) {
      return courseInput.trim();
    }
  };

  // Helper functions for slot type checking (from original FFCSonTheGo)
  const isTheory = (slots: string): boolean => {
    const slot = slots.split('+')[0];
    return /[A-KM-Z]\d+/.test(slot);
  };

  const isMorningTheory = (slots: string): boolean => {
    let isMTheory: boolean | null = null;
    const slotArray = slots.split('+');
    
    for (let slot of slotArray) {
      slot = slot.trim();
      if (slot.includes('V')) {
        const num = parseInt(slot.slice(1));
        if (num === 1 || num === 2) {
          if (isMTheory === false) {
            return false;
          }
          isMTheory = true;
        }
      } else if (slot.startsWith('L')) {
        const num = parseInt(slot.slice(1));
        if (num >= 1 && num <= 30) {
          if (isMTheory === true) {
            return false;
          }
          isMTheory = false;
        } else {
          if (isMTheory === false) {
            return false;
          }
          isMTheory = true;
        }
      } else if (/[A-ULW-Z]\d+/.test(slot)) {
        // Check if it's a theory slot and ends with '1' (morning theory)
        if (slot.endsWith('1')) {
          if (isMTheory === false) {
            return false;
          }
          isMTheory = true;
        }
      }
    }
    
    return isMTheory === true;
  };

  const isMorningLab = (slots: string): boolean => {
    const slot = slots.split('+')[0];
    if (slot.startsWith('L')) {
      // Check if it's a lab slot and is between L1 and L30 (morning lab)
      return parseInt(slot.slice(1)) <= 30;
    }
    return false;
  };

  const getTeacherSlots = (courseName: string, teacherName: string): string | null => {
    const subjectData = state.activeTable.subject[courseName];
    if (subjectData && subjectData.teacher && subjectData.teacher[teacherName]) {
      return subjectData.teacher[teacherName].slots;
    }
    return null;
  };

  const updateTeacherSlots = (courseName: string, teacherName: string, newSlots: string): void => {
    console.log(`🔄 Updating teacher slots: ${teacherName} -> ${newSlots}`);
    dispatch({
      type: 'UPDATE_TEACHER_IN_SUBJECT',
      payload: {
        courseName,
        teacherName,
        slots: newSlots.trim().toUpperCase(),
        venue: state.activeTable.subject[courseName]?.teacher[teacherName]?.venue || 'VENUE',
        color: state.activeTable.subject[courseName]?.teacher[teacherName]?.color || color
      }
    });
  };

  // Original FFCSonTheGo combining logic with TH/LO support
  const checkTeacherAndSlotsMatch = (courseName: string, teacherName: string, slotString: string): string | boolean => {
    const slots = slotString.split('+');
    const subjectData = state.activeTable.subject[courseName];
    
    if (!subjectData || !subjectData.teacher) {
      return teacherName; // No existing teachers, use the name as is
    }
    
    const teachers = subjectData.teacher;

    // Helper function to check if slots match
    const doSlotsMatch = (teacherSlots: string[], inputSlots: string[]): boolean => {
      const lowerCaseInputSlots = inputSlots.map(slot => slot.toLowerCase());
      const lowerCaseTeacherSlots = teacherSlots.map(slot => slot.toLowerCase());
      return lowerCaseInputSlots.every(slot => lowerCaseTeacherSlots.includes(slot));
    };

    // Recursive helper function to generate a unique name and check slots
    const generateUniqueNameAndCheckSlots = (baseName: string, counter: number = 1): string | boolean => {
      const uniqueName = counter === 1 ? baseName : `${baseName} ${counter}`;
      console.log('🔍 Checking unique name:', uniqueName);
      
      const existingTeacher = teachers[uniqueName];
      const uniqueNameSlots = existingTeacher ? existingTeacher.slots.split('+') : [];
      
      console.log('🔍 Existing teacher slots:', uniqueNameSlots);
      
      if (doSlotsMatch(uniqueNameSlots, slots)) {
        // If the slots match, return false (duplicate)
        console.log('❌ Slots match - this is a duplicate');
        return false;
      } else if (teachers.hasOwnProperty(uniqueName)) {
        // ORIGINAL COMBINING LOGIC: Check for TH/LO merge possibility
        const existingSlots = getTeacherSlots(courseName, uniqueName);
        
        if (!existingSlots) {
          return false;
        }

        // Theory and Lab slots are not allowed to merge if theory already contains lab
        if (isTheory(existingSlots) && existingSlots.includes('L')) {
          console.log('🔄 Theory and Lab slots already combined, trying next counter');
          return generateUniqueNameAndCheckSlots(baseName, counter + 1);
        }

        // Case 1: Existing is Theory, new is Lab
        if (isTheory(existingSlots) && !isTheory(slotString)) {
          if (isMorningTheory(existingSlots) && !isMorningLab(slotString)) {
            // Morning theory + Evening lab = MERGE
            const mergedSlots = existingSlots + '+' + slotString;
            console.log('✅ Merging morning theory + evening lab:', mergedSlots);
            updateTeacherSlots(courseName, uniqueName, mergedSlots);
            return true;
          } else if (!isMorningTheory(existingSlots) && isMorningLab(slotString)) {
            // Evening theory + Morning lab = MERGE
            const mergedSlots = existingSlots + '+' + slotString;
            console.log('✅ Merging evening theory + morning lab:', mergedSlots);
            updateTeacherSlots(courseName, uniqueName, mergedSlots);
            return true;
          }
        } 
        // Case 2: Existing is Lab, new is Theory
        else if (!isTheory(existingSlots) && isTheory(slotString)) {
          if (isMorningTheory(slotString) && !isMorningLab(existingSlots)) {
            // Morning theory + Evening lab = MERGE (theory first)
            const mergedSlots = slotString + '+' + existingSlots;
            console.log('✅ Merging morning theory + evening lab:', mergedSlots);
            updateTeacherSlots(courseName, uniqueName, mergedSlots);
            return true;
          } else if (!isMorningTheory(slotString) && isMorningLab(existingSlots)) {
            // Evening theory + Morning lab = MERGE (theory first)
            const mergedSlots = slotString + '+' + existingSlots;
            console.log('✅ Merging evening theory + morning lab:', mergedSlots);
            updateTeacherSlots(courseName, uniqueName, mergedSlots);
            return true;
          }
        }

        // If no merge possible, try next counter
        console.log('🔄 No merge possible, trying next counter');
        return generateUniqueNameAndCheckSlots(baseName, counter + 1);
      } else {
        // Teacher doesn't exist, we can use this name
        console.log('✅ Unique name found:', uniqueName);
        return uniqueName;
      }
    };

    return generateUniqueNameAndCheckSlots(teacherName);
  };

  // Live FFCS Mode toggle handler (from original FFCSonTheGo)
  const handleLiveFfcsModeToggle = (checked: boolean) => {
    console.log('🎯 Live FFCS Mode toggled:', checked);
    setLiveFfcsMode(checked);
    
    // Update global state
    dispatch({ type: 'SET_UI_STATE', payload: { liveModeEnabled: checked } });
    
    if (checked) {
      // ENABLE Live FFCS Mode
      console.log('✅ Enabling Live FFCS Mode - Attack Mode ON');

      // Hide normal edit/add UI
      setShowAddCourse(false);
      setShowAddTeacher(false);
      setShowEditCourse(false);
      setShowEditTeacher(false);

      // Switch to attack data mode (don't clear timetable to preserve attackQuick data)
      dispatch({ type: 'SET_ATTACK_MODE', payload: { enabled: true } });
      
    } else {
      // DISABLE Live FFCS Mode  
      console.log('❌ Disabling Live FFCS Mode - Normal Mode ON');
      
      // Show normal add teacher UI
      setShowAddTeacher(true);
      
      // Switch back to normal data mode
      dispatch({ type: 'SET_ATTACK_MODE', payload: { enabled: false } });
      
      // Regenerate timetable from normal data
      dispatch({ type: 'REGENERATE_TIMETABLE' });
    }
  };

  // Handle Add Multiple Teachers button click
  const handleAddMultiple = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    console.log('🚀🚀🚀 UPDATED VERSION - Add Multiple button clicked! - VERSION 2.0');
    console.log('📋 Selected course:', selectedCourse);
    console.log('🔗 Modal ref current:', modalRef.current);
    console.log('🌍 Window available:', typeof window !== 'undefined');
    console.log('🌍 Document available:', typeof document !== 'undefined');
    
    // Check if course is selected (exactly like the original)
    if (!selectedCourse || selectedCourse === '' || selectedCourse === 'Select Course') {
      console.log('❌ No course selected, showing error');
      alert('Please select a course first!');
      setTeacherMessage({ text: 'Please select a course before adding multiple teachers', color: 'red' });
      setTimeout(() => setTeacherMessage({ text: '', color: '' }), 5000);
      return;
    }
    
    console.log('✅ Course selected, proceeding with modal...');
    
    // Clear any previous errors
    setMultipleError('');
    
    // FORCE React state modal first to test
    console.log('🔄 FORCING React state fallback modal for testing');
    setShowMultipleTeachersModal(true);
    
    // Also try Bootstrap approach
    if (modalRef.current && typeof window !== 'undefined') {
      console.log('✅ Creating Bootstrap modal instance on demand (following original pattern)');
      try {
        // @ts-ignore - Bootstrap types not available  
        const bootstrap = await import('bootstrap');
        console.log('📦 Bootstrap loaded:', bootstrap);
        console.log('📦 Bootstrap.Modal constructor:', (bootstrap as any).Modal);
        
        // Create modal instance exactly like original
        const modal = new (bootstrap as any).Modal(modalRef.current);
        console.log('✅ Modal instance created:', modal);
        
        // Show modal exactly like original
        modal.show();
        console.log('📖 Modal show() called successfully');
        
        // Store reference for later cleanup
        bootstrapModalRef.current = modal;
        
        // Hide React fallback if Bootstrap works
        setTimeout(() => setShowMultipleTeachersModal(false), 500);
        
      } catch (error) {
        console.error('❌ Error with Bootstrap modal:', error);
        console.log('🔄 Bootstrap failed, keeping React state fallback');
      }
    } else {
      console.error('❌ No modal ref or not in browser environment');
      console.log('🔄 Keeping React state fallback');
    }
  };

  // Process multiple teachers from VTOP data
  const processMultipleTeachers = () => {
    console.log('🔄 Processing multiple teachers...');
    
    // Validate inputs
    if (!selectedCourse) {
      setMultipleError('Please select a course before adding multiple teachers');
      return;
    }

    if (!multipleTeachersText.trim()) {
      setMultipleError('Please paste the teacher data from VTOP');
      return;
    }

    try {
      // Parse the text input
      const teacherList = parseTextToListForMultipleAdd(multipleTeachersText);
      let addedCount = 0;
      let skippedCount = 0;

      console.log('📝 Parsed teacher list:', teacherList);

      // Process each teacher
      teacherList.forEach((teacherData, index) => {
        console.log(`🔄 Processing teacher ${index + 1}:`, teacherData);
        
        // Validate teacher data - for VTOP format, we need slots, course code (in venue field), and faculty
        if (!teacherData.slots.trim() || !teacherData.venue.trim() || !teacherData.faculty.trim()) {
          console.log(`❌ Invalid teacher data at index ${index}:`, teacherData);
          skippedCount++;
          return;
        }

        // Apply original character filtering rules
        const rawTeacherName = teacherData.faculty.trim().toUpperCase();
        const cleanedTeacherName = applyOriginalCharacterFiltering(rawTeacherName);
        
        const rawSlots = teacherData.slots.trim().toUpperCase();
        const cleanedSlots = applySlotCharacterFiltering(rawSlots);
        
        // Process teacher name (add (E) for evening classes if needed)
        const processedTeacherName = processTeacherName(cleanedTeacherName, cleanedSlots);

        // CORRECT: Parse the VTOP format correctly
        // VTOP data format: SLOTS(0)    VENUE(1)         TEACHER_NAME(2)    TYPE(3)  
        // Our parser maps to:  slots      venue            faculty           ct
        // So: venue = VENUE, faculty = TEACHER_NAME (this is correct!)
        const actualVenue = teacherData.venue.trim() || 'VENUE'; // This is the actual venue
        
        console.log('🔍 Venue:', actualVenue);
        console.log('🔍 Teacher name:', teacherData.faculty);
        console.log('🔍 Slots:', teacherData.slots);
        
        // Add teacher to the SELECTED COURSE (like original FFCSonTheGo)
        const courseObj = state.courses.find(course => course.code === selectedCourse);
        const courseName = courseObj?.name || selectedCourse;
        
        // Use the SELECTED COURSE for adding teachers
        const rawFullCourseName = `${selectedCourse} - ${courseName}`;
        const fullCourseName = processRawCourseName(rawFullCourseName);
        
        console.log('🔍 Adding teacher to SELECTED course:', selectedCourse);
        
        console.log('📋 Full course name:', fullCourseName);

        // Ensure the course exists in subject data
        if (!state.activeTable.subject[fullCourseName]) {
          dispatch({
            type: 'ADD_SUBJECT',
            payload: {
              courseName: fullCourseName,
              credits: courseObj?.credits || 0
            }
          });
        }

        // Apply original combining logic
        const uniqueName = checkTeacherAndSlotsMatch(fullCourseName, processedTeacherName, cleanedSlots);
        
        if (uniqueName === false) {
          // This is a duplicate teacher with same slots - skip
          console.log(`⚠️ Skipping duplicate teacher: ${processedTeacherName} with slots: ${cleanedSlots}`);
          skippedCount++;
          return;
        }
        
        if (uniqueName === true) {
          // This shouldn't happen in our implementation, but handle it
          console.log(`✅ Teacher already exists: ${processedTeacherName}`);
          addedCount++;
          return;
        }

        // Use the unique name (could be original name or name with counter)
        const finalTeacherName = uniqueName as string;
        console.log(`📝 Using final teacher name: ${finalTeacherName}`);

        // Add teacher to subject data
        dispatch({
          type: 'ADD_TEACHER_TO_SUBJECT',
          payload: {
            courseName: fullCourseName,
            teacherName: finalTeacherName,
            slots: cleanedSlots,
            venue: actualVenue,
            color: color
          }
        });

        // Also add to legacy teacher structure for compatibility
        const newTeacher = {
          name: finalTeacherName,
          slot: cleanedSlots,
          venue: actualVenue,
          color: color,
          course: selectedCourse, // Use the selected course
        };

        dispatch({
          type: 'ADD_TEACHER',
          payload: { courseCode: selectedCourse, teacher: newTeacher }
        });
        
        console.log(`✅ Added teacher: ${finalTeacherName} for course ${selectedCourse}`);

        addedCount++;
      });

      // Show success/error message
      if (addedCount > 0) {
        const successMsg = `✅ Successfully added ${addedCount} teacher${addedCount > 1 ? 's' : ''}${skippedCount > 0 ? ` (⚠️ ${skippedCount} skipped due to invalid data)` : ''}`;
        setTeacherMessage({ text: successMsg, color: 'green' });
        console.log('✅ Success:', successMsg);
      } else {
        setMultipleError('❌ No valid teachers found in the provided data. Please check the format.');
      }

      // Close modal and clear form if successful
      if (addedCount > 0) {
        // Close Bootstrap modal if it exists
        if (bootstrapModalRef.current) {
          bootstrapModalRef.current.hide();
        }
        
        // Close React modal
        setShowMultipleTeachersModal(false);
        setMultipleTeachersText('');
        setMultipleError('');
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setTeacherMessage({ text: '', color: '' });
        }, 5000);
      }

    } catch (err) {
      console.error('Error processing multiple teachers:', err);
      setMultipleError('Error processing teacher data. Please check the format and try again.');
    }
  };

  // Helper to get cell slot text by row and column (complete mapping from vellore.json)
  const getCellSlotText = (row: number, col: number): string[] => {
    // Complete mapping based on vellore.json schema
    // Row indices: 0=Theory, 1=Lab, 2=Mon, 3=Tue, 4=Wed, 5=Thu, 6=Fri, 7=Sat, 8=Sun
    // Col indices: 1-6 are morning slots, 7 is LUNCH (skip), 8-14 are afternoon slots

    const slotMap: { [key: string]: string } = {
      // Theory row (row 0)
      '0,1': 'A1', '0,2': 'F1', '0,3': 'D1', '0,4': 'TB1', '0,5': 'TG1', '0,6': 'V1',
      '0,8': 'A2', '0,9': 'F2', '0,10': 'D2', '0,11': 'TB2', '0,12': 'TG2', '0,14': 'V3',

      // Lab row (row 1)
      '1,1': 'L1', '1,2': 'L2', '1,3': 'L3', '1,4': 'L4', '1,5': 'L5', '1,6': 'L6',
      '1,8': 'L31', '1,9': 'L32', '1,10': 'L33', '1,11': 'L34', '1,12': 'L35', '1,13': 'L36',

      // Monday (row 2)
      '2,1': 'A1 / L1', '2,2': 'F1 / L2', '2,3': 'D1 / L3', '2,4': 'TB1 / L4', '2,5': 'TG1 / L5', '2,6': 'V1 / L16',
      '2,8': 'A2 / L31', '2,9': 'F2 / L32', '2,10': 'D2 / L33', '2,11': 'TB2 / L34', '2,12': 'TG2 / L35', '2,14': 'V3 / L36',

      // Tuesday (row 3)
      '3,1': 'B1 / L7', '3,2': 'G1 / L8', '3,3': 'E1 / L9', '3,4': 'TC1 / L10', '3,5': 'TAA1 / L11', '3,6': 'V2 / L17',
      '3,8': 'B2 / L37', '3,9': 'G2 / L38', '3,10': 'E2 / L39', '3,11': 'TC2 / L40', '3,12': 'TAA2 / L41', '3,14': 'V4 / L42',

      // Wednesday (row 4)
      '4,1': 'C1 / L13', '4,2': 'A1 / L14', '4,3': 'F1 / L15', '4,4': 'V1 / L16', '4,5': 'V2 / L17', '4,6': 'V2 / L18',
      '4,8': 'C2 / L43', '4,9': 'A2 / L44', '4,10': 'F2 / L45', '4,11': 'TD2 / L46', '4,12': 'TBB2 / L47', '4,14': 'V5 / L48',

      // Thursday (row 5)
      '5,1': 'D1 / L19', '5,2': 'B1 / L20', '5,3': 'G1 / L21', '5,4': 'TE1 / L22', '5,5': 'TCC1 / L23', '5,6': 'TCC1 / L24',
      '5,8': 'D2 / L49', '5,9': 'B2 / L50', '5,10': 'G2 / L51', '5,11': 'TE2 / L52', '5,12': 'TCC2 / L53', '5,14': 'V6 / L54',

      // Friday (row 6)
      '6,1': 'E1 / L25', '6,2': 'C1 / L26', '6,3': 'TA1 / L27', '6,4': 'TF1 / L28', '6,5': 'TD1 / L29', '6,6': 'TD1 / L30',
      '6,8': 'E2 / L55', '6,9': 'C2 / L56', '6,10': 'TA2 / L57', '6,11': 'TF2 / L58', '6,12': 'TDD2 / L59', '6,14': 'V7 / L60',
    };

    const key = `${row},${col}`;
    const slotText = slotMap[key] || '';
    if (!slotText) {
      console.warn(`⚠️ No slot mapping for row=${row}, col=${col}`);
      return [''];
    }
    return slotText.split(' / ').map(s => s.trim()).filter(s => s.length > 0);
  };

  // Get occupied slots from attackData + attackQuick (EXACT FFCSonTheGo logic)
  // Memoized to re-calculate when dependencies change
  const occupiedSlots = useMemo(() => {
    const attackData = state.activeTable.attackData || [];
    const attackQuick = state.activeTable.attackQuick || [];
    console.log('🔍 occupiedSlots recalculating - attackData:', attackData);
    console.log('🔍 occupiedSlots recalculating - attackQuick:', attackQuick);
    console.log('🔍 occupiedSlots recalculating - attackMode:', state.ui.attackMode);
    console.log('🔍 occupiedSlots recalculating - quickVisualizationEnabled:', state.ui.quickVisualizationEnabled);

    // ClashMap for slot expansion
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

    // Collect all raw slots from attackData
    const allSlots: string[] = [];
    attackData.forEach((course) => {
      allSlots.push(...course.slots);
    });

    const thSlots = new Set<string>();
    const labSlots = new Set<string>();

    // Process each slot with clashMap expansion (EXACT FFCSonTheGo logic)
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

    // CRITICAL: Include attackQuick if Quick Visualization is enabled (FFCSonTheGo line 2387-2439)
    if (state.ui.quickVisualizationEnabled) {
      console.log('🔍 Processing attackQuick entries...');
      attackQuick.forEach((el: any[]) => {
        const x = getCellSlotText(el[0], el[1]);
        console.log(`🔍 attackQuick entry [${el[0]}, ${el[1]}] (length=${el.length}) -> slots:`, x);

        if (el.length === 3) {
          // QV tile highlight (3 elements)
          if (x.length === 1) {
            // Single slot cell
            if (x[0].includes('L')) {
              labSlots.add(x[0]);
            } else {
              thSlots.add(x[0]);
              if (clashMap[x[0]]) {
                clashMap[x[0]].forEach((lec) => labSlots.add(lec));
              }
            }
          } else {
            // Theory/Lab cell - only add theory slot
            thSlots.add(x[0]);
            if (clashMap[x[0]]) {
              clashMap[x[0]].forEach((lec) => labSlots.add(lec));
            }
          }
        } else {
          // Individual cell highlight (2 elements)
          if (x.length === 1) {
            // Single slot cell
            if (x[0].includes('L')) {
              console.log(`  ➕ Adding lab slot: ${x[0]}`);
              labSlots.add(x[0]);
              if (clashMap[x[0]]) {
                console.log(`  ➕ Expanding ${x[0]} to theory: ${clashMap[x[0]].join(', ')}`);
                clashMap[x[0]].forEach((lec) => thSlots.add(lec));
              }
            } else {
              console.log(`  ➕ Adding theory slot: ${x[0]}`);
              thSlots.add(x[0]);
            }
          } else {
            // Theory/Lab cell - only add lab slot
            const labSlot = x[1].split('\n')[0];
            console.log(`  ➕ Adding lab slot from theory/lab cell: ${labSlot}`);
            labSlots.add(labSlot);
            if (clashMap[labSlot]) {
              console.log(`  ➕ Expanding ${labSlot} to theory: ${clashMap[labSlot].join(', ')}`);
              clashMap[labSlot].forEach((lec) => thSlots.add(lec));
            }
          }
        }
      });
    }

    const result = {
      theory: Array.from(thSlots).sort(),
      lab: Array.from(labSlots).sort()
    };

    console.log('🔍 occupiedSlots - result:', result);
    console.log('🔍 occupiedSlots - allSlots:', allSlots);

    return result;
  }, [
    state.activeTable.attackData,
    state.activeTable.attackQuick,
    state.ui.quickVisualizationEnabled,
    state.ui.attackMode,
    liveFfcsMode,
    qvUpdateTrigger
  ]);

  return (
    <>
      <div key={`course-panel-${dataKey}`} className="flex gap-6 min-h-[600px] h-[80vh] p-4 w-full">
      {/* Left Column */}
      <div className="flex-[3] flex flex-col h-full min-w-0">
        {/* Course Preferences Card */}
        <div className="card h-full flex flex-col">
          <div className="card-header text-left fw-bold header-button">
            <div className="c_pref w-[28%] self-center">
              Course Preferences
              {state.ui.attackMode && <span className="badge bg-warning text-dark ms-2">Live FFCS Mode</span>}
            </div>
          </div>

          <div className="card-body p-4 flex-1 overflow-hidden flex flex-col">
        {/* Subject Area OR Active Room Details */}
        <section className="left-border left-box flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-[#4a5568] scrollbar-track-[#2d3748] pr-2" id="subjectArea">
          {showRoomSettings ? (
            // Active Room Details (60% LEFT column when Room Settings is ON)
            <div className="text-white p-2">
              {!authState.isAuthenticated ? (
                // Not authenticated
                <div className="text-center p-8 bg-google-red/10 rounded-lg border border-google-red/30">
                  <i className="fas fa-lock text-5xl text-google-red mb-4"></i>
                  <h5 className="text-white mb-4">Authentication Required</h5>
                  <p className="text-white/70 mb-0">
                    Please log in to access collaboration rooms.
                  </p>
                </div>
              ) : !activeRoomId ? (
                // No active room selected
                <div className="text-center p-8 bg-google-blue/10 rounded-lg border border-google-blue/30">
                  <i className="fas fa-users text-5xl text-google-blue mb-4"></i>
                  <h5 className="text-white mb-2">No Active Room</h5>
                  <p className="text-white/70 mb-0">
                    Create a new room or join an existing one from the panel on the right →
                  </p>
                </div>
              ) : (
                // Active room details
                <div>
                  {/* Room Header */}
                  <div className="bg-google-blue/15 rounded-lg p-4 mb-6 border-2 border-google-blue/30">
                    <h5 className="text-white mb-3 text-[1.1rem] font-semibold">
                      📍 {activeRoomDetails?.displayName || `Room ${activeRoomId}`}
                    </h5>
                    <div className="text-sm text-white/80">
                      <div>🆔 {activeRoomId}</div>
                      <div>👤 Admin: {activeRoomDetails?.adminId}</div>
                      <div>👥 Members: {activeRoomMembers.length}</div>
                      <div>🌐 {activeRoomDetails?.visibility === 'public' ? 'Public Room' : 'Private Room'}</div>
                    </div>
                  </div>

                  {/* Pending Join Requests (Admin Only) */}
                  {joinRequests.length > 0 && activeRoomDetails?.isAdmin && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h6 style={{ color: '#fbbf24', marginBottom: '0.75rem', fontSize: '1rem' }}>
                        ⏳ Pending Requests ({joinRequests.length})
                      </h6>
                      {joinRequests.map((request, idx) => (
                        <div key={idx} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.75rem',
                          backgroundColor: 'rgba(251, 191, 36, 0.1)',
                          borderRadius: '6px',
                          marginBottom: '0.5rem',
                          border: '1px solid rgba(251, 191, 36, 0.3)'
                        }}>
                          <span style={{ fontSize: '0.9rem' }}>👤 {request.userId}</span>
                          <button
                            className="btn btn-sm btn-success"
                            onClick={() => approveJoin(request.userId)}
                            style={{ fontSize: '0.8rem', padding: '0.25rem 0.75rem' }}
                          >
                            ✓ Approve
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Members List with Timetables */}
                  <div>
                    <h6 style={{ color: 'white', marginBottom: '0.75rem', fontSize: '1rem' }}>
                      👥 Members & Timetables
                    </h6>
                    {activeRoomMembers.map((member, idx) => {
                      const isPrimary = member.userId === primaryTimetableUser;
                      const isCurrentUser = member.userId === authState.user?.username;

                      return (
                        <div key={idx} style={{
                          backgroundColor: isPrimary ? 'rgba(52, 168, 83, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '8px',
                          padding: '1rem',
                          marginBottom: '1rem',
                          border: isPrimary ? '2px solid rgba(52, 168, 83, 0.4)' : '1px solid rgba(255,255,255,0.1)'
                        }}>
                          {/* Member Header */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                            <div>
                              <div style={{ fontSize: '1rem', fontWeight: '600', color: 'white', marginBottom: '0.25rem' }}>
                                {member.userId}
                                {member.role === 'admin' && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(234, 67, 53, 0.2)', color: '#ea4335', borderRadius: '4px' }}>👑 Admin</span>}
                                {isPrimary && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(52, 168, 83, 0.2)', color: '#34a853', borderRadius: '4px' }}>⭐ Primary</span>}
                                {isCurrentUser && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(66, 133, 244, 0.2)', color: '#4285f4', borderRadius: '4px' }}>You</span>}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </div>
                            </div>

                            {/* Admin Actions */}
                            {activeRoomDetails?.isAdmin && member.userId !== authState.user?.username && (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {!isPrimary && (
                                  <button
                                    className="btn btn-sm btn-outline-success"
                                    onClick={() => setPrimaryTimetable(member.userId)}
                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                  >
                                    ⭐ Set Primary
                                  </button>
                                )}
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => removeMember(member.userId)}
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                >
                                  ✕ Remove
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Timetables */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {/* Normal Mode Timetable */}
                            <div style={{
                              backgroundColor: 'rgba(66, 133, 244, 0.1)',
                              borderRadius: '6px',
                              padding: '0.75rem',
                              border: '1px solid rgba(66, 133, 244, 0.3)'
                            }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#4285f4', marginBottom: '0.5rem' }}>
                                📅 Normal Mode
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                                {member.hasTimetable ? (
                                  <span>📚 Courses: {/* Will be filled by backend */} Available</span>
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>No timetable</span>
                                )}
                              </div>
                            </div>

                            {/* Live FFCS Mode Timetable */}
                            <div style={{
                              backgroundColor: 'rgba(251, 191, 36, 0.1)',
                              borderRadius: '6px',
                              padding: '0.75rem',
                              border: '1px solid rgba(251, 191, 36, 0.3)'
                            }}>
                              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#fbbf24', marginBottom: '0.5rem' }}>
                                ⚡ Live FFCS Mode
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)' }}>
                                {member.hasTimetable ? (
                                  <span>📚 Courses: {/* Will be filled by backend */} Available</span>
                                ) : (
                                  <span style={{ color: 'rgba(255,255,255,0.5)' }}>No timetable</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Room Settings (Admin Only) */}
                  {activeRoomDetails?.isAdmin && (
                    <div style={{
                      backgroundColor: 'rgba(234, 67, 53, 0.1)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginTop: '1.5rem',
                      border: '1px solid rgba(234, 67, 53, 0.3)'
                    }}>
                      <h6 style={{ color: '#ea4335', marginBottom: '0.75rem', fontSize: '1rem' }}>⚙️ Room Settings</h6>

                      {/* Update Room Name */}
                      <div style={{ marginBottom: '1rem' }}>
                        <label style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', display: 'block', marginBottom: '0.5rem' }}>
                          Room Display Name
                        </label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            placeholder="Enter new room name..."
                            value={newRoomName}
                            onChange={(e) => setNewRoomName(e.target.value)}
                            style={{ flex: 1, fontSize: '0.85rem' }}
                          />
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={updateRoomName}
                            disabled={!newRoomName.trim()}
                            style={{ fontSize: '0.85rem' }}
                          >
                            Update
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Leave Room Button */}
                  <div style={{ marginTop: '1.5rem' }}>
                    <button
                      className="btn btn-danger"
                      onClick={() => leaveRoomPermanently(activeRoomId)}
                      style={{ width: '100%', fontSize: '0.9rem' }}
                    >
                      🚪 Leave Room
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            // Regular Subject List
            <>
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

                    // CRITICAL: Use occupiedSlots (theory + lab) as activeSlots
                    // This includes BOTH attackData AND attackQuick (when QV is enabled)
                    const occupiedTheory = occupiedSlots.theory || [];
                    const occupiedLab = occupiedSlots.lab || [];
                    activeSlots = [...occupiedTheory, ...occupiedLab];
                  } else {
                    slotsOfCourse = getSlotsOfCourse(subjectName, activeTable.data);
                    activeSlots = getSlots(activeTable.data);
                  }
                  
                  // CRITICAL: This is the vanilla JS pattern - subtract same course slots
                  const consideredSlots = subtractArray(slotsOfCourse, activeSlots);
                  
                  // Check clash against OTHER courses only
                  const hasClash = isCommonSlot(teacherSlots, consideredSlots);
                  
                  // Check if this teacher is selected and clashing in normal mode (for red highlighting)
                  const isSelected = isTeacherSelected(subjectName, teacherName);
                  const isClashingAndSelected = hasClash && isSelected && !state.ui.attackMode;
                  
                  return (
                  <li 
                    key={teacherName} 
                    className={hasClash ? 'clashLi' : ''}
                    style={{ 
                      backgroundColor: isClashingAndSelected ? '#ff6b6b' : teacherData.color, 
                      color: isClashingAndSelected ? 'white' : undefined,
                      fontWeight: isClashingAndSelected ? 'bold' : undefined,
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
          </>
          )}
          </section>
          </div>
        </div>

        {/* Live Mode Toggle Card */}
        <div className="card" style={{ marginTop: '1rem' }}>
          <div className="card-body" style={{ padding: '1rem' }}>
            <div className="form-check form-switch">
              <label className="form-check-label" htmlFor="live-mode-toggle" style={{ color: 'white', fontWeight: '500' }}>
                Live FFCS Mode
              </label>
              <input
                className="form-check-input"
                type="checkbox"
                id="live-mode-toggle"
                checked={liveFfcsMode}
                onChange={(e) => handleLiveFfcsModeToggle(e.target.checked)}
                style={{ marginLeft: '1rem' }}
              />
            </div>
            
            {/* Autofocus Toggle - Only visible in Live FFCS Mode */}
            {liveFfcsMode && (
              <div className="form-check form-switch mt-2">
                <label className="form-check-label" htmlFor="autofocus-toggle" style={{ color: 'white', fontWeight: '500' }}>
                  Autofocus
                </label>
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autofocus-toggle"
                  checked={autoFocus}
                  onChange={(e) => {
                    setAutoFocus(e.target.checked);
                    dispatch({ type: 'SET_UI_STATE', payload: { autoFocusEnabled: e.target.checked } });
                  }}
                  style={{ marginLeft: '1rem' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-[2] flex flex-col h-full min-w-0">
        {/* Top Buttons Card */}
        <div className="card">
          <div className="card-body p-4">
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
                style={{ display: state.globalVars.editTeacher || state.globalVars.editSub ? 'none' : 'inline-block', marginLeft: '0.5rem' }}
              >
                <i className="fas fa-plus"></i> Course
              </button>

              {/* Room Settings button - Only show for authenticated users */}
              {authState.isAuthenticated && authState.user?.token && (
                <button
                  id="tt-room-settings"
                  type="button"
                  className={`btn ${showRoomSettings ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => {
                    setShowRoomSettings(!showRoomSettings);
                    // Reset forms when toggling
                    if (!showRoomSettings) {
                      setShowAddCourse(false);
                      setShowAddTeacher(false);
                      setShowEditCourse(false);
                      setShowEditTeacher(false);
                    }
                  }}
                  style={{ display: state.globalVars.editTeacher || state.globalVars.editSub ? 'none' : 'inline-block', marginLeft: '0.5rem' }}
                >
                  <i className="fas fa-users"></i> {showRoomSettings ? 'Hide' : 'Show'} Room Settings
                </button>
              )}

              <button
                id="tt-subject-edit"
                className="btn btn-warning"
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
                  display: state.globalVars.editSub || state.globalVars.editTeacher ? 'inline-block' : 'none'
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
                  display: state.globalVars.editSub || state.globalVars.editTeacher ? 'inline-block' : 'none'
                }}
              >
                <i className="fas fa-chevron-up"></i>
                <span>&nbsp;&nbsp;Collapse All</span>
              </button>
            </div>
          </div>

          {/* Add/Edit Course Card */}
          <div className="card" style={{ 
            marginTop: '1rem', 
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div className="card-body" style={{ 
              padding: '1.5rem',
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Scrollable Content Area */}
              <div style={{
                flex: 1,
                overflowY: 'auto',
                scrollbarWidth: 'thin',
                scrollbarColor: '#4a5568 #2d3748',
                paddingRight: '0.5rem'
              }}>
                {/* Conditional Rendering: Room Settings OR Forms/Occupied Slots */}
                {showRoomSettings ? (
                  // NEW: Room Management UI (40% RIGHT column)
                  <div className="room-settings-panel" style={{ color: 'white' }}>
                    {/* Connection Status */}
                    <div style={{
                      padding: '0.75rem',
                      marginBottom: '1rem',
                      borderRadius: '8px',
                      backgroundColor: connected ? 'rgba(52, 168, 83, 0.15)' : 'rgba(234, 67, 53, 0.15)',
                      border: `1px solid ${connected ? 'rgba(52, 168, 83, 0.3)' : 'rgba(234, 67, 53, 0.3)'}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white' }}>
                        <i className="fas fa-users"></i> Collaboration
                      </span>
                      <span style={{
                        fontSize: '0.85rem',
                        padding: '0.25rem 0.75rem',
                        borderRadius: '12px',
                        backgroundColor: connected ? 'rgba(52, 168, 83, 0.3)' : 'rgba(234, 67, 53, 0.3)',
                        color: connected ? '#34a853' : '#ea4335'
                      }}>
                        {connected ? '● Connected' : '○ Disconnected'}
                      </span>
                    </div>

                    {/* Message Display */}
                    {collabMessage && (
                      <div style={{
                        padding: '0.75rem',
                        marginBottom: '1rem',
                        borderRadius: '6px',
                        fontSize: '0.9rem',
                        backgroundColor: collabMessage.type === 'error' ? 'rgba(234, 67, 53, 0.15)' :
                                       collabMessage.type === 'success' ? 'rgba(52, 168, 83, 0.15)' :
                                       'rgba(66, 133, 244, 0.15)',
                        color: collabMessage.type === 'error' ? '#ea4335' :
                               collabMessage.type === 'success' ? '#34a853' :
                               '#4285f4',
                        border: `1px solid ${collabMessage.type === 'error' ? 'rgba(234, 67, 53, 0.3)' :
                                            collabMessage.type === 'success' ? 'rgba(52, 168, 83, 0.3)' :
                                            'rgba(66, 133, 244, 0.3)'}`
                      }}>
                        {collabMessage.text}
                      </div>
                    )}

                    {/* Create Room Section */}
                    <div style={{
                      backgroundColor: 'rgba(66, 133, 244, 0.1)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      border: '1px solid rgba(66, 133, 244, 0.3)'
                    }}>
                      <h6 style={{ color: '#4285f4', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
                        🏠 Create New Room
                      </h6>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <select
                          className="form-select form-select-sm"
                          value={roomVisibility}
                          onChange={(e) => setRoomVisibility(e.target.value as 'public' | 'private')}
                          style={{ flex: 1, fontSize: '0.85rem' }}
                        >
                          <option value="public">🌐 Public</option>
                          <option value="private">🔒 Private</option>
                        </select>
                      </div>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => createRoomAndActivate()}
                        disabled={!connected}
                        style={{ fontSize: '0.9rem', width: '100%' }}
                      >
                        <i className="fas fa-plus"></i> Create Room
                      </button>
                    </div>

                    {/* Join by ID Section */}
                    <div style={{
                      backgroundColor: 'rgba(52, 168, 83, 0.1)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      border: '1px solid rgba(52, 168, 83, 0.3)'
                    }}>
                      <h6 style={{ color: '#34a853', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
                        🔗 Join by Room ID
                      </h6>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Enter Room ID..."
                          value={roomIdToJoin}
                          onChange={(e) => setRoomIdToJoin(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && joinRoomAndAdd(roomIdToJoin)}
                          style={{ flex: 1, fontSize: '0.85rem' }}
                        />
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => joinRoomAndAdd(roomIdToJoin)}
                          disabled={!roomIdToJoin.trim() || !connected}
                          style={{ fontSize: '0.85rem' }}
                        >
                          Join
                        </button>
                      </div>
                    </div>

                    {/* My Rooms Section */}
                    <div style={{
                      backgroundColor: 'rgba(251, 191, 36, 0.1)',
                      borderRadius: '8px',
                      padding: '1rem',
                      marginBottom: '1rem',
                      border: '1px solid rgba(251, 191, 36, 0.3)'
                    }}>
                      <h6 style={{ color: '#fbbf24', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
                        📂 My Rooms ({myRooms.length})
                      </h6>
                      <div style={{
                        maxHeight: '250px',
                        overflowY: 'auto',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#4a5568 #2d3748'
                      }}>
                        {myRooms.length === 0 ? (
                          <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '0.85rem', margin: 0 }}>
                            You haven't joined any rooms yet
                          </p>
                        ) : (
                          myRooms.map(room => (
                            <div key={room.roomId} style={{
                              backgroundColor: activeRoomId === room.roomId ? 'rgba(251, 191, 36, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '6px',
                              padding: '0.75rem',
                              marginBottom: '0.5rem',
                              border: activeRoomId === room.roomId ? '2px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255,255,255,0.1)',
                              cursor: 'pointer'
                            }}
                            onClick={() => switchToRoom(room.roomId)}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white', marginBottom: '0.25rem' }}>
                                    {room.displayName || room.roomId}
                                    {activeRoomId === room.roomId && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(251, 191, 36, 0.3)', color: '#fbbf24', borderRadius: '4px' }}>● Active</span>}
                                  </div>
                                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                                    🆔 {room.roomId}
                                  </div>
                                </div>
                                <button
                                  className="btn btn-sm btn-outline-info"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    switchToRoom(room.roomId);
                                  }}
                                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                >
                                  {activeRoomId === room.roomId ? 'Active' : 'View'}
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Browse Public Rooms Section */}
                    <div style={{
                      backgroundColor: 'rgba(234, 67, 53, 0.1)',
                      borderRadius: '8px',
                      padding: '1rem',
                      border: '1px solid rgba(234, 67, 53, 0.3)'
                    }}>
                      <h6 style={{ color: '#ea4335', marginBottom: '0.75rem', fontSize: '1rem', fontWeight: '600' }}>
                        🌐 Browse Public Rooms
                      </h6>

                      {/* Search Bar */}
                      <div style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Search rooms..."
                          value={roomSearchQuery}
                          onChange={(e) => setRoomSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && searchRooms()}
                          style={{ flex: 1, fontSize: '0.85rem' }}
                        />
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => searchRooms()}
                          style={{ fontSize: '0.85rem' }}
                        >
                          🔍
                        </button>
                      </div>

                      {/* Public Rooms List */}
                      <div style={{
                        maxHeight: '250px',
                        overflowY: 'auto',
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#4a5568 #2d3748'
                      }}>
                        {publicRooms.length === 0 ? (
                          <p style={{ color: 'rgba(255,255,255,0.6)', textAlign: 'center', fontSize: '0.85rem', margin: 0 }}>
                            No public rooms found
                          </p>
                        ) : (
                          publicRooms.map(room => (
                            <div key={room.roomId} style={{
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              borderRadius: '6px',
                              padding: '0.75rem',
                              marginBottom: '0.75rem',
                              border: '1px solid rgba(255,255,255,0.1)'
                            }}>
                              <div style={{ fontSize: '0.9rem', fontWeight: '600', color: 'white', marginBottom: '0.5rem' }}>
                                {room.displayName || room.roomId}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', marginBottom: '0.5rem' }}>
                                <div>🆔 {room.roomId}</div>
                                <div>👤 Admin: {room.adminUsername}</div>
                                <div>👥 {room.memberCount} members</div>
                              </div>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => joinRoomAndAdd(room.roomId)}
                                style={{ fontSize: '0.8rem', width: '100%' }}
                              >
                                <i className="fas fa-sign-in-alt"></i> Join
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  // EXISTING: Forms and Occupied Slots Display
                  <>
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

                {/* Live FFCS Mode - Slot Occupancy Display */}
          {liveFfcsMode && (
            <div id="div-for-attack-slot" style={{ display: 'block', marginBottom: '1rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ color: 'white', fontWeight: '600', margin: '0', fontSize: '1.25rem' }}>
                  <i className="fas fa-bolt" style={{ color: '#ffd700', marginRight: '0.5rem' }}></i>
                  Live FFCS Mode - Slot Occupancy
                </h4>
              </div>

              <div style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px', padding: '1rem' }}>
                <div className="alert alert-info mb-3">
                  <strong>Live Mode Active:</strong> This mode shows occupied slots based on your course selections.
                </div>

                {/* Theory Occupied Slots */}
                <div style={{ marginBottom: '1rem' }}>
                  <h5 style={{ color: 'white', fontWeight: '600', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Theory Slots Occupied
                  </h5>
                  {occupiedSlots.theory.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem' }}>
                      {occupiedSlots.theory.map(slot => (
                        <div
                          key={slot}
                          style={{
                            backgroundColor: 'rgba(255, 107, 107, 0.3)',
                            border: '1px solid rgba(255, 107, 107, 0.6)',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#ff6b6b'
                          }}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      No theory slots occupied
                    </p>
                  )}
                </div>

                {/* Lab Occupied Slots */}
                <div>
                  <h5 style={{ color: 'white', fontWeight: '600', fontSize: '1rem', marginBottom: '0.5rem' }}>
                    Lab Slots Occupied
                  </h5>
                  {occupiedSlots.lab.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem' }}>
                      {occupiedSlots.lab.map(slot => (
                        <div
                          key={slot}
                          style={{
                            backgroundColor: 'rgba(255, 165, 0, 0.3)',
                            border: '1px solid rgba(255, 165, 0, 0.6)',
                            borderRadius: '4px',
                            padding: '0.5rem',
                            textAlign: 'center',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#ffb347'
                          }}
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                      No lab slots occupied
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Add Course Form */}
          {showAddCourse && !state.globalVars.editSub && !state.globalVars.editTeacher && (
            <div id="div-for-add-course" style={{ display: 'block' }}>
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem' }}>
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
            <div id="div-for-edit-course" style={{ display: 'block' }}>
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
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem' }}>
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
            <div id="div-for-add-teacher">
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
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem' }}>
                  <button
                    className="btn btn-success btn-sm"
                    type="button"
                    id="addMultipleTeacher"
                    onClick={handleAddMultiple}
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
            <div id="div-for-edit-teacher" style={{ display: 'block' }}>
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
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'space-between', marginTop: '1rem', paddingTop: '1rem' }}>
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
                  </>
                )}
                {/* End of Conditional Rendering */}
              </div> {/* End Scrollable Content Area */}
            </div> {/* End card-body */}
          </div> {/* End Add/Edit Course Card */}

          {/* Bottom Buttons Card */}
          <div className="card" style={{ marginTop: '1rem' }}>
            <div className="card-body" style={{ padding: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  id="save-panel-button"
                  type="button"
                  className="btn btn-success"
                  style={{ borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '500', fontSize: '0.875rem', flex: '1' }}
                  onClick={() => {
                    document.getElementById('download-modal')?.click();
                  }}
                >
                  Save TT
                </button>
                <button
                  id="load-panel-button"
                  type="button"
                  className="btn btn-success"
                  style={{ borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '500', fontSize: '0.875rem', flex: '1' }}
                  onClick={() => {
                    document.getElementById('upload-modal')?.click();
                  }}
                >
                  Upload TT
                </button>
                <button
                  id="clear-course-button"
                  type="button"
                  className="btn btn-danger"
                  style={{ borderRadius: '12px', padding: '0.5rem 0.75rem', fontWeight: '500', fontSize: '0.875rem', flex: '1' }}
                  onClick={() => {
                    // Different confirmation messages for normal vs attack mode (like vanilla JS)
                    const confirmMessage = state.ui.attackMode
                      ? 'Are you sure you want to clear the course list and Quick Visualization?'
                      : 'Are you sure you want to clear the course list?';

                    if (confirm(confirmMessage)) {
                      dispatch({ type: 'CLEAR_LIST' });
                    }
                  }}
                >
                  Clear List
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Modal for Multiple Teachers */}
      {showMultipleTeachersModal && (
        <div 
          className="modal fade show" 
          style={{ 
            display: 'block', 
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1055
          }}
          tabIndex={-1}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add Multiple Teachers</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowMultipleTeachersModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <label htmlFor="teachers-input"><strong>Paste VTOP Data Here:</strong></label>
                <textarea
                  className="form-control"
                  id="teachers-input"
                  placeholder="Copy the list from your VTOP course allocation and paste it here."
                  value={multipleTeachersText}
                  onChange={(e) => setMultipleTeachersText(e.target.value)}
                ></textarea>

                {multipleError && (
                  <div className="alert alert-danger mt-2" role="alert">
                    {multipleError}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowMultipleTeachersModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    processMultipleTeachers();
                    setShowMultipleTeachersModal(false);
                  }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

