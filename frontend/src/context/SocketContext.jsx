import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const listenersRef = useRef(new Map()); // event -> Set of callbacks

  useEffect(() => {
    if (!user) {
      // Disconnect if user logs out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const token = localStorage.getItem('lifelink_token');
    if (!token) return;

    const socket = io(SOCKET_URL, {
      auth: { token },
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
      setConnected(true);

      // Auto-join user's personal notification room
      socket.emit('join-user', user.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // Forward all events to registered listeners
    socket.onAny((event, ...args) => {
      const callbacks = listenersRef.current.get(event);
      if (callbacks) {
        callbacks.forEach((cb) => {
          try {
            cb(...args);
          } catch (err) {
            console.error(`[Socket] Listener error for "${event}":`, err);
          }
        });
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  /**
   * Subscribe to a socket event. Returns an unsubscribe function.
   * Usage: const unsub = on('emergency:donor-response', handler);
   */
  const on = useCallback((event, callback) => {
    if (!listenersRef.current.has(event)) {
      listenersRef.current.set(event, new Set());
    }
    listenersRef.current.get(event).add(callback);

    return () => {
      const set = listenersRef.current.get(event);
      if (set) {
        set.delete(callback);
        if (set.size === 0) listenersRef.current.delete(event);
      }
    };
  }, []);

  /**
   * Emit a socket event.
   */
  const emit = useCallback((event, ...args) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, ...args);
    }
  }, []);

  return (
    <SocketContext.Provider value={{ connected, on, emit, socket: socketRef }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
}

/**
 * Hook to auto-reload data when specific socket events fire.
 * @param {string[]} events - Array of event names to listen for
 * @param {Function} reloadFn - Function to call when any event fires
 */
export function useSocketReload(events, reloadFn) {
  const { on } = useSocket();

  useEffect(() => {
    const unsubs = events.map((event) => on(event, reloadFn));
    return () => unsubs.forEach((unsub) => unsub());
  }, [events, reloadFn, on]);
}
