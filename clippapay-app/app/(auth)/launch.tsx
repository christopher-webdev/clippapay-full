// app/(auth)/launch.tsx

import React, { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { Platform } from 'react-native';

// JWT Token Parser (copied from login.tsx)
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function LaunchScreen() {

  useEffect(() => {
    const bootstrap = async () => {
      try {
        /* ================= GET TOKEN ================= */
        let token: string | null = null;

        if (Platform.OS === 'web') {
          token = await AsyncStorage.getItem('userToken');
        } else {
          // Try SecureStore first (more secure)
          token = await SecureStore.getItemAsync('userToken');
          
          // Fallback to AsyncStorage if not in SecureStore
          if (!token) {
            token = await AsyncStorage.getItem('userToken');
          }
          
          console.log('[MOBILE] launch token:', token ? 'found' : 'not found');
        }

        /* ================= IF TOKEN EXISTS ================= */
        if (token) {
          try {
            // OPTION 1: Verify with backend (recommended - more secure)
            console.log('Verifying token with backend...');
            const API_URL = process.env.EXPO_PUBLIC_API_URL
            
            const res = await fetch(
              `${API_URL}/auth/verify-token`,
              {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );

            if (res.ok) {
              const user = await res.json();
              console.log('Token verified, user role:', user.role);

              /* ================= ROLE ROUTING ================= */
              if (user.role === 'advertiser') {
                console.log('Routing to advertiser dashboard');
                router.replace('/(dashboard_advertiser)/advertiser_dashboard');
                return;
              }

              if (user.role === 'clipper') {
                console.log('Routing to clipper dashboard');
                router.replace('/(dashboard_clipper)/clipper_dashboard');
                return;
              }

              // fallback if role not recognized
              console.log('Role not recognized, going to onboarding');
              router.replace('/(auth)/onboarding_1');
              return;
            } 
            
            // Handle specific error cases
            if (res.status === 401) {
              console.log('Token expired or invalid');
          
              // Clear invalid token
              if (Platform.OS === 'web') {
                await AsyncStorage.removeItem('userToken');
              } else {
                await SecureStore.deleteItemAsync('userToken');
                await AsyncStorage.removeItem('userToken');
              }
              
              console.log('Invalid token cleared, going to onboarding');
              router.replace('/(auth)/onboarding_1');
              return;
            }
            
            if (res.status === 403) {
              const error = await res.json();
              console.log('Account blocked or restricted:', error.error);
              
              // Show blocked message or redirect to support
              router.replace('/(auth)/onboarding_1');
              return;
            }
            const decoded = parseJwt(token);
            
            if (decoded && decoded.exp * 1000 > Date.now()) {
              console.log('Local token valid, role:', decoded.role);
              
              // Route based on role from token
              if (decoded.role === 'advertiser') {
                router.replace('/(dashboard_advertiser)/advertiser_dashboard');
                return;
              }
              if (decoded.role === 'clipper') {
                router.replace('/(dashboard_clipper)/clipper_dashboard');
                return;
              }
            }
            
            // Local token invalid
            console.log('Local token invalid/expired');
            router.replace('/(auth)/onboarding_1');
            
          } catch (err) {
            console.log('Token verification network error:', err);
            
            // OPTION 4: Network error - try local validation as fallback
            console.log('Network error, falling back to local token validation...');
            const decoded = parseJwt(token);
            
            if (decoded && decoded.exp * 1000 > Date.now()) {
              console.log('Local token valid, role:', decoded.role);
              
              if (decoded.role === 'advertiser') {
                router.replace('/(dashboard_advertiser)/advertiser_dashboard');
                return;
              }
              if (decoded.role === 'clipper') {
                router.replace('/(dashboard_clipper)/clipper_dashboard');
                return;
              }
            }
            
            router.replace('/(auth)/onboarding_1');
          }
        } else {
          /* ================= NO TOKEN ================= */
          console.log('No token found, going to onboarding');
          router.replace('/(auth)/onboarding_1');
        }

      } catch (err) {
        console.log('Launch screen error:', err);
        router.replace('/(auth)/onboarding_1');
      } finally {
        // Hide splash screen after all checks
        await SplashScreen.hideAsync();
      }
    };

    bootstrap();
  }, []);

  // Return null as this is just a loading/redirect screen
  return null;
}
