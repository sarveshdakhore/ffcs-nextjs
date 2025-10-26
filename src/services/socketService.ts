const { io } = require('socket.io-client');
type Socket = any;

const SOCKET_URL = 'http://localhost:8005';

class SocketService {
  private socket: Socket | null = null;
  private token: string | null = null;
  private isGDSC: boolean = false;
  private userId: string | null = null;

  // Initialize socket connection with auth
  connect(token: string, userId: string, isGDSC: boolean = false) {
    if (this.socket?.connected) {
      console.log('Socket already connected');
      return this.socket;
    }

    console.log('🔌 Connecting to socket...', { userId, isGDSC });

    this.token = token;
    this.userId = userId;
    this.isGDSC = isGDSC;

    this.socket = io(SOCKET_URL, {
      auth: {
        token,
        userId,
        isGDSC
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5
    });

    this.setupListeners();
    return this.socket;
  }

  private setupListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: any) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error: any) => {
      console.error('🔴 Socket connection error:', error.message);
    });

    this.socket.on('server-message', (data: any) => {
      console.log('📨 Server message:', data);
      if (data.error) {
        console.error('Server error:', data.error);
      }
    });
  }

  // Disconnect socket
  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
      this.userId = null;
    }
  }

  // Get socket instance
  getSocket(): Socket | null {
    return this.socket;
  }

  // Check if connected
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // ===================================
  // PERSONAL TIMETABLE OPERATIONS
  // ===================================

  // Get all personal timetables
  getPersonalTimetables(): Promise<{
    success: boolean;
    timetables?: { [name: string]: any };
    activeTimetable?: string;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('🔵 [EMIT] get-personal-timetables');

      this.socket.emit('get-personal-timetables', (response: any) => {
        console.log('🟢 [RESPONSE] get-personal-timetables:', response);
        resolve(response);
      });
    });
  }

  // Create new personal timetable
  createPersonalTimetable(timetableName: string): Promise<{
    success: boolean;
    timetableName?: string;
    timetable?: any;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('🔵 [EMIT] create-personal-timetable:', { timetableName });

      this.socket.emit('create-personal-timetable', { timetableName }, (response: any) => {
        console.log('🟢 [RESPONSE] create-personal-timetable:', response);
        resolve(response);
      });
    });
  }

  // Update personal timetable
  updatePersonalTimetable(timetableName: string, timetable: any): Promise<{
    success: boolean;
    timetableName?: string;
    timetable?: any;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('🔵 [EMIT] update-personal-timetable:', { timetableName });

      this.socket.emit('update-personal-timetable', { timetableName, timetable }, (response: any) => {
        console.log('🟢 [RESPONSE] update-personal-timetable:', response);
        resolve(response);
      });
    });
  }

  // Delete personal timetable
  deletePersonalTimetable(timetableName: string): Promise<{
    success: boolean;
    timetableName?: string;
    activeTimetable?: string;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('🔵 [EMIT] delete-personal-timetable:', { timetableName });

      this.socket.emit('delete-personal-timetable', { timetableName }, (response: any) => {
        console.log('🟢 [RESPONSE] delete-personal-timetable:', response);
        resolve(response);
      });
    });
  }

  // Rename personal timetable
  renamePersonalTimetable(oldName: string, newName: string): Promise<{
    success: boolean;
    oldName?: string;
    newName?: string;
    activeTimetable?: string;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('🔵 [EMIT] rename-personal-timetable:', { oldName, newName });

      this.socket.emit('rename-personal-timetable', { oldName, newName }, (response: any) => {
        console.log('🟢 [RESPONSE] rename-personal-timetable:', response);
        resolve(response);
      });
    });
  }

  // Set active timetable
  setActiveTimetable(timetableName: string): Promise<{
    success: boolean;
    activeTimetable?: string;
    error?: string;
  }> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Socket not connected'));
        return;
      }

      console.log('🔵 [EMIT] set-active-timetable:', { timetableName });

      this.socket.emit('set-active-timetable', { timetableName }, (response: any) => {
        console.log('🟢 [RESPONSE] set-active-timetable:', response);
        resolve(response);
      });
    });
  }
}

// Export singleton instance
export const socketService = new SocketService();
