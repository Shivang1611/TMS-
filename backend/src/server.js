require('dotenv').config();
const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const connectDatabase = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { authenticate } = require('./middleware/auth');
const { initSocketIO } = require('./services/socket');
const notificationWorker = require('./workers/notificationWorker');
const cleanupWorker = require('./workers/cleanupWorker');
const reminderCron = require('./workers/reminderCron');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_STANDARD, 10) || 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again later.' },
});
app.use('/api/', globalLimiter);

// File upload rate limit (stricter)
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_UPLOAD, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many upload requests. Try again later.' },
});
app.use('/api/documents/upload', uploadLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/auth', require('./routes/auth'));
app.use('/api/organizations', authenticate, require('./routes/organizations'));
app.use('/api/departments', authenticate, require('./routes/departments'));
app.use('/api/teams', authenticate, require('./routes/teams'));
app.use('/api/users', authenticate, require('./routes/users'));
app.use('/api/projects', authenticate, require('./routes/projects'));
app.use('/api/milestones', authenticate, require('./routes/milestones'));
app.use('/api/tasks', authenticate, require('./routes/tasks'));
app.use('/api/notes', authenticate, require('./routes/notes'));
app.use('/api/comments', authenticate, require('./routes/comments'));
app.use('/api/documents', authenticate, require('./routes/documents'));
app.use('/api/notifications', authenticate, require('./routes/notifications'));
app.use('/api/reports', authenticate, require('./routes/reports'));
app.use('/api/dashboards', authenticate, require('./routes/dashboards'));
app.use('/api/search', authenticate, require('./routes/search'));
app.use('/api/activities', authenticate, require('./routes/activities'));
app.use('/api/audit-logs', authenticate, require('./routes/auditLogs'));
app.use('/api/upload', authenticate, require('./routes/uploads'));
app.use('/api/reminders', authenticate, require('./routes/reminderRoutes'));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error Handler ───────────────────────────────────────────────────────────

app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────────────────────

const startServer = async () => {
  await connectDatabase();

  // Initialize Socket.IO with the HTTP server
  initSocketIO(server);

  // Start background workers
  notificationWorker.startWorker();
  cleanupWorker.startWorker();
  reminderCron.startWorker();

  server.listen(PORT, () => {
    console.log(`TMS API server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Socket.IO ready for real-time connections`);
  });
};

startServer();

module.exports = { app, server };
