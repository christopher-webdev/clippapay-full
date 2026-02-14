// mobile_app/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

interface User {
  _id: string;
  email: string;
  role: 'clipper' | 'advertiser' | 'admin';
  firstName?: string;
  lastName?: string;
  [key: string]: any;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        // Fetch user data
        const response = await fetch('https://clippapay.com/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return { user, isAuthenticated, loading };
}