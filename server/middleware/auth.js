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
      // For development, you can initialize without credentials
      // but token verification will not work
      console.warn('Firebase Admin SDK not initialized - No service account provided');
      console.warn('Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to enable authentication');
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error);
  }
}

const decodeTokenUnverified = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    return {
      uid: payload.user_id || payload.sub,
      email: payload.email,
      name: payload.name || payload.email?.split('@')[0]
    };
  } catch (error) {
    console.error('Error decoding token without verification:', error);
    return null;
  }
};

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    let decodedToken;
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      // Verify the token using Firebase Admin SDK
      decodedToken = await admin.auth().verifyIdToken(token);
    } else {
      console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_PATH not set. Using unverified token decoding for development.');
      decodedToken = decodeTokenUnverified(token);
      if (!decodedToken) {
        return res.status(401).json({ error: 'Invalid token format in development fallback' });
      }
    }

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
