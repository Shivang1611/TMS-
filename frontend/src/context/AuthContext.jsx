import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('tms_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && !parsed._id && parsed.id) parsed._id = parsed.id;
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(true);

  // On mount, verify token is still valid
  useEffect(() => {
    const token = localStorage.getItem('tms_token');
    if (token) {
      authApi.getMe()
        .then((res) => {
          if (res?.data) {
            setUser(res.data);
            localStorage.setItem('tms_user', JSON.stringify(res.data));
          }
        })
        .catch((err) => {
          // Only clear session if token is explicitly invalid/expired (401)
          if (err.response?.status === 401) {
            localStorage.removeItem('tms_token');
            localStorage.removeItem('tms_user');
            setUser(null);
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await authApi.login({ email, password });
    const loggedUser = res.data.user;
    if (!loggedUser._id && loggedUser.id) loggedUser._id = loggedUser.id;
    localStorage.setItem('tms_token', res.data.token);
    localStorage.setItem('tms_user', JSON.stringify(loggedUser));
    setUser(loggedUser);
    return loggedUser;
  }, []);

  const register = useCallback(async (data) => {
    const res = await authApi.register(data);
    const registeredUser = res.data.user;
    if (!registeredUser._id && registeredUser.id) registeredUser._id = registeredUser.id;
    localStorage.setItem('tms_token', res.data.token);
    localStorage.setItem('tms_user', JSON.stringify(registeredUser));
    setUser(registeredUser);
    return registeredUser;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('tms_token');
    localStorage.removeItem('tms_user');
    setUser(null);
  }, []);

  const updateUser = useCallback((updates) => {
    setUser((prev) => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('tms_user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
