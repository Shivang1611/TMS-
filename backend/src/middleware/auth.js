const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'tms-dev-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token for a user
 */
const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      organization: user.organization,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Authenticate — verify JWT and attach user to request
 */
const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch user to ensure they still exist and are active
    const user = await User.findById(decoded.id);

    if (!user) {
      const error = new Error('User not found');
      error.statusCode = 401;
      return next(error);
    }

    if (!user.isActive) {
      const error = new Error('Account is deactivated');
      error.statusCode = 403;
      return next(error);
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      const err = new Error('Invalid or expired token');
      err.statusCode = 401;
      return next(err);
    }
    next(error);
  }
};

/**
 * Authorize — check that the authenticated user has one of the required roles
 */
const authorize = (...allowedRoles) => {
  return (req, _res, next) => {
    if (!req.user) {
      const error = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    if (!allowedRoles.includes(req.user.role)) {
      const error = new Error('Insufficient permissions');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

module.exports = { generateToken, authenticate, authorize };
