import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, notificationAPI } from '../services/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('lifelink_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);

  const login = useCallback((token, userData) => {
    localStorage.setItem('lifelink_token', token);
    localStorage.setItem('lifelink_user', JSON.stringify(userData));
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    const fcmToken = localStorage.getItem('lifelink_fcm_token');
    try {
      await authAPI.logout(fcmToken ? { deviceToken: fcmToken } : {});
      if (fcmToken) {
        await notificationAPI.removeToken({ token: fcmToken }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
    localStorage.removeItem('lifelink_token');
    localStorage.removeItem('lifelink_user');
    localStorage.removeItem('lifelink_fcm_token');
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await authAPI.getMe();
      const userData = data.data;
      localStorage.setItem('lifelink_user', JSON.stringify(userData));
      setUser(userData);
      return userData;
    } catch {
      logout();
      return null;
    }
  }, [logout]);

  useEffect(() => {
    const token = localStorage.getItem('lifelink_token');
    if (token) {
      refreshUser().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
