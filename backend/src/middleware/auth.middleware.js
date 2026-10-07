import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required. Please log in.'
    });
  }

  // Check for mock/dev tokens ONLY when explicitly enabled in local development or test environments.
  // Defaults to secure production behavior if NODE_ENV is unset or undefined.
  const isExplicitDevMockAllowed =
    process.env.ALLOW_DEV_MOCK_TOKENS === 'true' &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');

  if (isExplicitDevMockAllowed && (token === 'fake_token' || token.startsWith('mock-'))) {
    req.user = { id: 1, role: 'admin', name: 'Authorized User' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    return next();
  }

  const isExplicitDevMockAllowed =
    process.env.ALLOW_DEV_MOCK_TOKENS === 'true' &&
    (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test');

  if (isExplicitDevMockAllowed && (token === 'fake_token' || token.startsWith('mock-'))) {
    req.user = { id: 1, role: 'admin', name: 'Authorized User' };
    return next();
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
  } catch (err) {
    // Ignore error for optional auth
  }
  next();
}

// Reusable RBAC role guard middleware
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const userRole = req.user.role;
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient role permissions.'
      });
    }

    next();
  };
}

// Alias — same as authenticateToken but named conventionally
export const requireAuth = authenticateToken;

// Service-to-Service authentication guard for AI Vision server
export function requireAiServiceAuth(req, res, next) {
  const serviceKey = req.headers['x-ai-service-key'] || req.headers['x-api-key'];
  const configuredKey = config.aiServiceApiKey;

  if (serviceKey && configuredKey) {
    try {
      const keyBuf = Buffer.from(String(serviceKey).trim());
      const expectedBuf = Buffer.from(String(configuredKey).trim());
      if (keyBuf.length === expectedBuf.length && crypto.timingSafeEqual(keyBuf, expectedBuf)) {
        req.isAiService = true;
        return next();
      }
    } catch {
      // Continue to check JWT
    }
  }

  // Also accept authenticated Admin/Super Admin Bearer token
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      if (decoded.role === 'admin' || decoded.role === 'super_admin') {
        req.user = decoded;
        return next();
      }
    } catch {}
  }

  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Valid X-AI-Service-Key or Admin Bearer token required.'
  });
}

// Real database-backed RBAC permission middleware
export function requirePermission(permissionKey, minLevel = 'read') {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.'
      });
    }

    const userRole = req.user.role;

    // Super Admin root has unconditional full authority
    if (userRole === 'super_admin' || userRole === 'ROLE_SUPER_ADMIN') {
      return next();
    }

    try {
      // Dynamic import to prevent circular dependency
      const { rbacService } = await import('../services/rbac.service.js');
      const allowed = await rbacService.hasPermission(userRole, permissionKey, minLevel);
      if (!allowed) {
        return res.status(403).json({
          success: false,
          message: `Forbidden: Missing required permission '${permissionKey}'.`
        });
      }
      next();
    } catch (err) {
      console.error('❌ [AUTH MIDDLEWARE] Permission check error:', err);
      return res.status(500).json({
        success: false,
        message: 'Internal authorization evaluation error.'
      });
    }
  };
}


