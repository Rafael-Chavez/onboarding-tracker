import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (serviceAccountPath) {
      const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin SDK initialized successfully');
    } else {
      console.warn('Firebase Admin SDK not initialized - No service account provided');
      console.warn('Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to enable authentication');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // Development fallback if Firebase Admin is not initialized or in dev mode
    const isDev = (process.env.NODE_ENV || 'development') === 'development';

    if (!admin.apps.length && isDev) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          req.user = {
            uid: payload.uid || payload.sub || 'dev-user-id',
            email: payload.email || 'dev@example.com',
            name: payload.name || 'Dev User'
          };
          return next();
        }
      } catch (e) {
        console.warn('Dev token decode failed:', e.message);
      }
    }

    // Standard token verification with Firebase Admin
    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      req.user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name
      };
      return next();
    } catch (verifyError) {
      // In dev mode, if Firebase Admin verification fails (e.g., mock token or expired test token), fallback to base64 payload decoding
      if (isDev) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
            req.user = {
              uid: payload.uid || payload.sub || 'dev-user-id',
              email: payload.email || 'dev@example.com',
              name: payload.name || 'Dev User'
            };
            return next();
          }
        } catch (e) {
          // ignore fallback error and throw main verifyError
        }
      }
      throw verifyError;
    }
  } catch (error) {
    console.error('Error verifying token:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if user has admin role
const requireAdmin = async (req, res, next) => {
  try {
    const pool = req.app.get('db');
    const result = await pool.query(
      'SELECT role FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

// Middleware to check if user has team role
const requireTeam = async (req, res, next) => {
  try {
    const pool = req.app.get('db');
    const result = await pool.query(
      'SELECT role, employee_id FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'User not found' });
    }

    req.userRole = result.rows[0].role;
    req.employeeId = result.rows[0].employee_id;

    next();
  } catch (error) {
    console.error('Error checking team role:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export {
  verifyToken,
  requireAdmin,
  requireTeam
};
