import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin SDK
// You'll need to download your service account key from Firebase Console
// and set the path in environment variable
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
      // For development, initialize with mock configuration to prevent "app/no-app" errors
      admin.initializeApp({
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'mock-project'
      });
      console.warn('Firebase Admin SDK initialized with mock development configuration');
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
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV === 'development';

    // Check for development fallback
    if (isDev && !process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      console.log('Using development unverified token verification fallback');
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          req.user = {
            uid: payload.user_id || payload.sub || 'mock-uid',
            email: payload.email || 'mock@example.com',
            name: payload.name || 'Mock User'
          };
        } else {
          req.user = {
            uid: 'mock-uid',
            email: 'rchavez@deconetwork.com',
            name: 'Mock Admin'
          };
        }
        return next();
      } catch (err) {
        console.warn('Development token decoding failed, falling back to mock admin:', err.message);
        req.user = {
          uid: 'mock-uid',
          email: 'rchavez@deconetwork.com',
          name: 'Mock Admin'
        };
        return next();
      }
    }

    // Verify the token using Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      name: decodedToken.name
    };

    next();
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
