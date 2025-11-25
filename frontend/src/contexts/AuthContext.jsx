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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await api.get('/auth/me');
      if (response.data.success && response.data.user) {
        setUser(response.data.user);
      } else {
        setUser(null);
      }
    } catch {
      // Not authenticated or token expired
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Register handler for 401 responses to clear auth state globally
  useEffect(() => {
    setAuthExpiredHandler(() => {
      setUser(null);
    });
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
