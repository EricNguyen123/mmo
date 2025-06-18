'use client';

import { useState, useEffect } from 'react';

interface User {
  _id: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'USER';
  firstName?: string;
  lastName?: string;
  profileImage?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include', // Important for cookies
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Auth check successful:', data.user); // Debug log
          setUser(data.user);
        } else {
          console.log('Auth check failed:', response.status); // Debug log
          setUser(null);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      localStorage.removeItem('authToken');
      localStorage.removeItem('userToken');
      localStorage.clear();
      setUser(null);
      // Force page refresh to clear any cached state
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even if API call fails
      localStorage.clear();
      setUser(null);
      window.location.href = '/login';
    }
  };

  return { user, loading, logout };
}
