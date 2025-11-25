import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api, { setAuthExpiredHandler } from '../services/api';

const AuthContext = createContext(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

const SESSION_KEY = 'auth_session_active';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    // Only attempt to restore session if marker exists
    // sessionStorage is cleared when browser is closed, ensuring logout on browser close
    if (!sessionStorage.getItem(SESSION_KEY)) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        // Server explicitly said not authenticated
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (error) {
      // Only clear session on 401 (invalid/expired token)
      // Transient network/500 errors should not log user out
      if (error.response?.status === 401) {
        setUser(null);
        sessionStorage.removeItem(SESSION_KEY);
      }
      // On other errors, just leave user as null but don't clear marker
      // so they can retry on next navigation
    } finally {
      setLoading(false);
    }
  }, []);

  // Register handler for 401 responses to clear auth state globally
  useEffect(() => {
    setAuthExpiredHandler(() => {
      setUser(null);
      sessionStorage.removeItem(SESSION_KEY);
    });
    // Clean up handler on unmount to avoid setState calls after provider is torn down
    return () => setAuthExpiredHandler(null);
  }, []);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
        // Set session marker - cleared when browser closes
        sessionStorage.setItem(SESSION_KEY, 'true');
        return { success: true };
      }
      return { success: false, error: 'Login failed' };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      sessionStorage.removeItem(SESSION_KEY);
    }
  };

  const isAdmin = () => {
    return user && user.role === 'admin';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
