import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_BASE = 'http://localhost:5000/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check current session from httpOnly cookie on mount
  const checkAuth = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/auth/me`, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
      } else {
        setUser(null);
      }
    } catch (err) {
      console.warn('Auth check error (operating in guest mode):', err.message);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login with email and password
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed.');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Register a new account
  const register = async (email, password, displayName, preferredLanguage = 'en') => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, displayName, preferredLanguage }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Registration failed.');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Logout and clear session
  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setUser(null);
    }
  };

  // Update profile
  const updateProfile = async (updates) => {
    try {
      const res = await fetch(`${API_BASE}/auth/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile.');
      }

      setUser(data.user);
      return { success: true, user: data.user };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Delete account and all health data
  const deleteAccount = async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to delete account.');
      }

      setUser(null);
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
    deleteAccount,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
