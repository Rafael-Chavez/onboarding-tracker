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

  // Get user roles from localStorage
  const getUserRoles = () => {
    try {
      const stored = localStorage.getItem(USER_ROLES_KEY);
      return stored ? JSON.parse(stored) : getDefaultUserRoles();
    } catch (error) {
      console.error('Error loading user roles:', error);
      return getDefaultUserRoles();
    }
  };

  // Default user role configuration
  const getDefaultUserRoles = () => ({
    'rchavez@deconetwork.com': { role: 'admin', employeeId: 1 },
    'jim@deconetwork.com': { role: 'team', employeeId: 3 },
    'marc@deconetwork.com': { role: 'team', employeeId: 4 },
    'danreb@deconetwork.com': { role: 'team', employeeId: 2 },
    'steve@deconetwork.com': { role: 'team', employeeId: 5 },
    'erick@deconetwork.com': { role: 'team', employeeId: 6 }
  });

  // Fetch user data from localStorage
  const fetchUserData = async (firebaseUser) => {
    try {
      const userRoles = getUserRoles();
      const userData = userRoles[firebaseUser.email.toLowerCase()];

      if (userData) {
        setUserRole(userData.role);
        setEmployeeId(userData.employeeId);
        return userData;
      } else {
        // Default to team role if not configured
        console.warn(`User ${firebaseUser.email} not found in role mapping, defaulting to team role`);
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
