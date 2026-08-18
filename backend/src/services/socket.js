const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'tms-dev-secret-change-in-production';
let io = null;

/**
 * Initialize Socket.IO server with JWT authentication middleware.
 * Each authenticated user joins:
 *   - `user:{userId}` — personal room (for direct notifications)
 *   - `org:{orgId}` — organization room (for org-wide broadcasts)
 */
function initSocketIO(httpServer) {
  const { Server } = require('socket.io');

  io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true,
    },
    pingInterval: 25000,
    pingTimeout: 20000,
  });

  // JWT authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userId = decoded.id;
      socket.orgId = decoded.organization;
      socket.userRole = decoded.role;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired token'));
    }
  });

  // Handle connections
  io.on('connection', (socket) => {
    const { userId, orgId, userRole } = socket;

    console.log(`[Socket] User ${userId} connected (org: ${orgId}, role: ${userRole})`);

    // Join personal and org rooms
    socket.join(`user:${userId}`);
    socket.join(`org:${orgId}`);

    // Handle joining a task room (for live task updates)
    socket.on('task:join', (taskId) => {
      if (taskId) {
        socket.join(`task:${taskId}`);
      }
    });

    // Handle leaving a task room
    socket.on('task:leave', (taskId) => {
      if (taskId) {
        socket.leave(`task:${taskId}`);
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] User ${userId} disconnected: ${reason}`);
    });
  });

  console.log('[Socket] Socket.IO initialized');
  return io;
}

/**
 * Get the Socket.IO server instance
 */
function getIO() {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initSocketIO first.');
  }
  return io;
}

// ─── Event Emitters ─────────────────────────────────────────────────────────

/**
 * Emit a task updated event to all users viewing the task
 * Also broadcast to the organization room
 */
function emitTaskUpdated(task) {
  if (!io) return;

  const payload = {
    taskId: task._id,
    projectId: task.project,
    status: task.status,
    assignees: task.assignees,
    updatedAt: task.updatedAt || new Date(),
  };

  // Emit to task room (users viewing this task detail)
  io.to(`task:${task._id}`).emit('task:updated', payload);

  // Also emit to org room for list views
  if (task.project) {
    // We don't have orgId on the task directly, but project lookup will happen on client
  }

  // Emit to org room (users on task lists / dashboards)
  // Fetch orgId from project lookup is expensive here; the client
  // org room is handled via a separate event if needed
}

/**
 * Emit a comment created event to all users viewing the task
 */
function emitCommentCreated(comment) {
  if (!io) return;

  const payload = {
    commentId: comment._id,
    taskId: comment.task,
    authorId: comment.author,
    createdAt: comment.createdAt,
  };

  io.to(`task:${comment.task}`).emit('comment:created', payload);
}

/**
 * Emit a new notification event to a specific user
 */
function emitNewNotification(notification) {
  if (!io) return;

  const payload = {
    notificationId: notification._id,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    entityType: notification.entityType,
    entityId: notification.entityId,
    actorId: notification.actor,
    createdAt: notification.createdAt,
  };

  io.to(`user:${notification.recipient}`).emit('notification:new', payload);

  // Also emit event to the user's org for badge count update
  if (notification.recipient) {
    io.to(`user:${notification.recipient}`).emit('notification:unread-count', { increment: 1 });
  }
}

/**
 * Emit a general org-wide update (for dashboards, project lists, etc.)
 */
function emitOrgUpdate(orgId, event, data) {
  if (!io) return;
  io.to(`org:${orgId}`).emit(event, data);
}

module.exports = {
  initSocketIO,
  getIO,
  emitTaskUpdated,
  emitCommentCreated,
  emitNewNotification,
  emitOrgUpdate,
};
