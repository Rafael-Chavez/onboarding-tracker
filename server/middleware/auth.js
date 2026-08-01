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

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;

    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    if (isDev && (!hasServiceAccount || !admin.apps.length)) {
      // Unverified base64 decode fallback in development environment
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payloadB64 = parts[1];
          const decodedStr = Buffer.from(payloadB64, 'base64').toString('utf8');
          decodedToken = JSON.parse(decodedStr);
          console.log('Firebase ID token verified via unverified base64 payload decoding fallback (Development Mode)');
        } else {
          throw new Error('Invalid JWT format for fallback');
        }
      } catch (fallbackError) {
        console.error('Fallback decoding failed:', fallbackError);
        return res.status(401).json({ error: 'Invalid token format' });
      }
    } else {
      try {
        // Verify the token properly
        decodedToken = await admin.auth().verifyIdToken(token);
      } catch (verifyError) {
        // Even if we have service account, if we are in dev and token verify fails, we can fall back to make local development painless
        if (isDev) {
          console.warn('Token verification failed, attempting development fallback decoding:', verifyError.message);
          const parts = token.split('.');
          if (parts.length === 3) {
            const payloadB64 = parts[1];
            const decodedStr = Buffer.from(payloadB64, 'base64').toString('utf8');
            decodedToken = JSON.parse(decodedStr);
          } else {
            throw verifyError;
          }
        } else {
          throw verifyError;
        }
      }
    }

    req.user = {
      uid: decodedToken.uid || decodedToken.user_id || 'mock-uid',
      email: decodedToken.email || 'mock@example.com',
      name: decodedToken.name || decodedToken.display_name || 'Mock User'
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
