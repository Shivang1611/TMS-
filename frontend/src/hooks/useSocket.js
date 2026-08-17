import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

/**
 * Socket.IO hook that manages the connection lifecycle and wires events
 * to React Query cache invalidation for real-time updates.
 *
 * Events handled:
 *   - task:updated    → invalidates task detail + task list queries
 *   - comment:created → invalidates task detail (comments section)
 *   - notification:new → invalidates notification queries, shows toast
 */
export default function useSocket(token) {
  const socketRef = useRef(null);
  const queryClient = useQueryClient();

  // Reconnect on token change
  useEffect(() => {
    if (!token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Connect
    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
      console.warn('[Socket] Connection error:', err.message);
    });

    // ─── Task updated ────────────────────────────────────────────────
    socket.on('task:updated', (data) => {
      console.log('[Socket] task:updated', data);

      // Invalidate task detail
      queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });

      // Invalidate task lists (all query variations)
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });

      // Invalidate project detail if projectId is available
      if (data.projectId) {
        queryClient.invalidateQueries({ queryKey: ['project', data.projectId] });
      }

      // Invalidate dashboards
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    // ─── Comment created ─────────────────────────────────────────────
    socket.on('comment:created', (data) => {
      console.log('[Socket] comment:created', data);

      // Invalidate task detail to refetch comments
      if (data.taskId) {
        queryClient.invalidateQueries({ queryKey: ['task', data.taskId] });
      }
    });

    // ─── New notification ────────────────────────────────────────────
    socket.on('notification:new', (data) => {
      console.log('[Socket] notification:new', data);

      // Invalidate notification queries
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      // Show brief toast for important notifications
      if (data.title) {
        toast(data.title, {
          icon: '🔔',
          duration: 4000,
        });
      }
    });

    socket.on('notification:unread-count', () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, queryClient]);

  /**
   * Join a task room to receive live updates for a specific task
   */
  const joinTask = useCallback((taskId) => {
    if (socketRef.current?.connected && taskId) {
      socketRef.current.emit('task:join', taskId);
    }
  }, []);

  /**
   * Leave a task room
   */
  const leaveTask = useCallback((taskId) => {
    if (socketRef.current?.connected && taskId) {
      socketRef.current.emit('task:leave', taskId);
    }
  }, []);

  return { joinTask, leaveTask, socket: socketRef };
}
