import { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth } from '../config/firebase';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User role mapping (stored in localStorage)
  const USER_ROLES_KEY = 'userRoles';
  const USER_ROLES_VERSION_KEY = 'userRolesVersion';
  const CURRENT_VERSION = '2'; // Increment this when roles change

  // Get user roles from localStorage
  const getUserRoles = () => {
    try {
      const storedVersion = localStorage.getItem(USER_ROLES_VERSION_KEY);
      const stored = localStorage.getItem(USER_ROLES_KEY);

      // If version doesn't match, use default roles (forces update)
      if (storedVersion !== CURRENT_VERSION) {
        console.log('🔄 User roles outdated, updating to latest version...');
        const defaultRoles = getDefaultUserRoles();
        localStorage.setItem(USER_ROLES_KEY, JSON.stringify(defaultRoles));
        localStorage.setItem(USER_ROLES_VERSION_KEY, CURRENT_VERSION);
        return defaultRoles;
      }

      return stored ? JSON.parse(stored) : getDefaultUserRoles();
    } catch (error) {
      console.error('Error loading user roles:', error);
      return getDefaultUserRoles();
    }
  };

  // Default user role configuration
  const getDefaultUserRoles = () => ({
    'rchavez@deconetwork.com': { role: 'admin', employeeId: 1 },
    'jparica@deconetwork.com': { role: 'team', employeeId: 3 },
    'mcruz@deconetwork.com': { role: 'team', employeeId: 4 },
    'danreb@deconetwork.com': { role: 'team', employeeId: 2 },
    'sclar@deconetwork.com': { role: 'team', employeeId: 5 },
    'eortiz@deconetwork.com': { role: 'team', employeeId: 6 }
  });

  // Fetch user data from localStorage
  const fetchUserData = async (firebaseUser) => {
    try {
      const userRoles = getUserRoles();
      const userData = userRoles[firebaseUser.email.toLowerCase()];

      if (userData) {
        console.log(`✅ User ${firebaseUser.email} authenticated - Role: ${userData.role}, Employee ID: ${userData.employeeId}`);
        setUserRole(userData.role);
        setEmployeeId(userData.employeeId);
        return userData;
      } else {
        // Default to team role if not configured
        console.error(`❌ User ${firebaseUser.email} NOT found in role mapping!`);
        console.error('Available emails:', Object.keys(userRoles));
        console.error('Please add this email to AuthContext.jsx or use a configured email.');
        setUserRole('team');
        setEmployeeId(null);
        return { role: 'team', employeeId: null };
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError(err.message);
    }
  };

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      const result = await signInWithEmailAndPassword(auth, email, password);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setError(null);
      await signOut(auth);
      setUserRole(null);
      setEmployeeId(null);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Initialize user roles in localStorage on first load
  useEffect(() => {
    const stored = localStorage.getItem(USER_ROLES_KEY);
    if (!stored) {
      localStorage.setItem(USER_ROLES_KEY, JSON.stringify(getDefaultUserRoles()));
      console.log('User roles initialized in localStorage');
    }
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        await fetchUserData(user);
      } else {
        setUserRole(null);
        setEmployeeId(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userRole,
    employeeId,
    login,
    logout,
    loading,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
