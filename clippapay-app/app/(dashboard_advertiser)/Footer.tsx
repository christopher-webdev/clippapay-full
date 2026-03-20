// app/components/Footer.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Alert,
  Platform,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
// Define the tab items with Applications tab added
const TAB_ITEMS = [
  {
    name: 'Browse',
    icon: 'grid-outline',
    activeIcon: 'grid',
    routes: [
      '/(dashboard_advertiser)/advertiser_dashboard',
    ],
  },
  {
    name: 'My Campaigns',
    icon: 'megaphone-outline',
    activeIcon: 'megaphone',
    routes: [
      '/(dashboard_advertiser)/campaigns_hub',
      '/(dashboard_advertiser)/Campaigns',
      '/(dashboard_advertiser)/my_clipping_campaigns',
      '/(dashboard_advertiser)/clipping_campaign_detail',
    ],
  },
  {
    name: 'Wallet',
    icon: 'cash-outline',
    activeIcon: 'cash',
    routes: [
      '/(dashboard_advertiser)/WalletScreen',
    ],
  },
  {
    name: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person',
    routes: [
      '/(dashboard_advertiser)/Profile',
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState<string>('Browse');
  const [pendingApplicationsCount, setPendingApplicationsCount] = useState(0);
  const [isLoadingCount, setIsLoadingCount] = useState(false);
  const [appState, setAppState] = useState(AppState.currentState);

  // Load pending applications count
  const loadPendingApplicationsCount = async () => {
    try {
      setIsLoadingCount(true);
      const token = await getToken();
      if (!token) return;

      const response = await axios.get(`${API_BASE}/applications/advertiser/pending-count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPendingApplicationsCount(response.data.count || 0);
    } catch (error) {
      console.error('Error loading pending applications count:', error);
    } finally {
      setIsLoadingCount(false);
    }
  };

  // Get auth token
  const getToken = async () => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('userToken');
    }
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  // Handle app state changes (refresh when app comes to foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      if (appState.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground - refresh pending count
        // loadPendingApplicationsCount();
      }
      setAppState(nextAppState);
    });

    return () => subscription.remove();
  }, [appState]);

  // Initial load and periodic refresh
  // useEffect(() => {
  //   loadPendingApplicationsCount();

  //   // Refresh every 30 seconds
  //   const interval = setInterval(loadPendingApplicationsCount, 30000);
  //   return () => clearInterval(interval);
  // }, []);

  // Debug logging (remove in production)
  useEffect(() => {
    console.log('Current pathname:', pathname);
    console.log('Current segments:', segments);
  }, [pathname, segments]);

  // Check if a route is active
  const isRouteActive = (routes: string[]) => {
    return routes.some(route => {
      // Exact match
      if (pathname === route) return true;
      
      // Path starts with route (for nested routes)
      if (pathname.startsWith(route) && route !== '/') return true;
      
      // Handle index route
      if (route === '/(dashboard_advertiser)/advertiser_dashboard' && 
          (pathname === '/(dashboard_advertiser)' || pathname === '/')) {
        return true;
      }
      
      // Handle case sensitivity
      if (pathname.toLowerCase() === route.toLowerCase()) return true;
      
      // Handle segments match
      const routeSegments = route.split('/').filter(Boolean);
      const pathSegments = pathname.split('/').filter(Boolean);
      
      if (routeSegments.length > 0 && pathSegments.length > 0) {
        const lastRouteSegment = routeSegments[routeSegments.length - 1].toLowerCase();
        const lastPathSegment = pathSegments[pathSegments.length - 1].toLowerCase();
        
        // Check if the last segment matches (for dynamic routes)
        if (lastRouteSegment === lastPathSegment) return true;
        
        // Check if the last segment is a parameter (e.g., [id])
        if (lastRouteSegment.includes('[') && lastRouteSegment.includes(']')) {
          return routeSegments.slice(0, -1).every((seg, idx) => 
            seg.toLowerCase() === pathSegments[idx]?.toLowerCase()
          );
        }
      }
      
      return false;
    });
  };

  // Handle navigation
  const handleNavigation = (item: typeof TAB_ITEMS[0]) => {
    let targetRoute = item.routes[0];
    // Always land on the hub when tapping My Campaigns from footer
    if (item.name === 'My Campaigns') {
      targetRoute = '/(dashboard_advertiser)/campaigns_hub';
    }
    console.log('Navigating to:', targetRoute);
    setActiveTab(item.name);
    router.push(targetRoute);
  };

  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              if (Platform.OS === 'web') {
                await AsyncStorage.removeItem('userToken');
              } else {
                await SecureStore.deleteItemAsync('userToken');
                await AsyncStorage.removeItem('userToken');
              }
              router.replace('/login');
            } catch (error) {
              console.error('Logout error:', error);
              Alert.alert('Error', 'Failed to sign out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        {/* Main tab bar */}
        <View style={styles.tabBar}>
          {TAB_ITEMS.map((item) => {
            const isActive = isRouteActive(item.routes);

            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.tabItem, isActive && styles.activeTabItem]}
                onPress={() => handleNavigation(item)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.iconContainer, 
                  isActive && styles.activeIconContainer,
                  item.name === 'Applications' && styles.applicationsIconContainer
                ]}>
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={24 * scale}
                    color={isActive ? '#7C3AED' : '#6B7280'}
                  />
                  
                  {/* Show badge for Applications tab when there are pending applications */}
                  {item.showBadge && pendingApplicationsCount > 0 && (
                    <View style={styles.applicationBadge}>
                      <Text style={styles.applicationBadgeText}>
                        {pendingApplicationsCount > 99 ? '99+' : pendingApplicationsCount}
                      </Text>
                    </View>
                  )}
                  
                  {/* Small dot for other tabs with activity (optional) */}
                  {!item.showBadge && isActive && (
                    <View style={styles.activeDot} />
                  )}
                </View>
                
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
                  ]}
                  numberOfLines={1}
                >
                  {item.name}
                </Text>
                
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.logoutGradient}
          />
          <View style={styles.logoutContent}>
            <Ionicons name="log-out-outline" size={20 * scale} color="#DC2626" />
            <Text style={styles.logoutText}>Sign Out</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  container: {
    width: '100%',
    height: 98 * scale,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64 * scale,
    paddingHorizontal: 4 * scale,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
    paddingVertical: 6 * scale,
  },
  activeTabItem: {
    // Active state styling is handled by child components
  },
  iconContainer: {
    padding: 6 * scale,
    borderRadius: 12 * scale,
    position: 'relative',
  },
  activeIconContainer: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
  },
  applicationsIconContainer: {
    // Additional styling for applications icon if needed
  },
  applicationBadge: {
    position: 'absolute',
    top: -4 * scale,
    right: -4 * scale,
    minWidth: 18 * scale,
    height: 18 * scale,
    borderRadius: 9 * scale,
    backgroundColor: '#F8312F',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4 * scale,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  applicationBadgeText: {
    color: '#FFFFFF',
    fontSize: 10 * scale,
    fontWeight: '700',
    textAlign: 'center',
  },
  activeDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 6 * scale,
    height: 6 * scale,
    borderRadius: 3 * scale,
    backgroundColor: '#7C3AED',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  tabLabel: {
    fontSize: 11 * scale,
    lineHeight: 14 * scale,
    letterSpacing: 0.3 * scale,
    marginTop: 4 * scale,
    maxWidth: 70 * scale,
  },
  activeTabLabel: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  inactiveTabLabel: {
    color: '#6B7280',
    fontWeight: '500',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -2 * scale,
    width: 24 * scale,
    height: 3 * scale,
    backgroundColor: '#7C3AED',
    borderRadius: 1.5 * scale,
    alignSelf: 'center',
  },
  logoutButton: {
    height: 34 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  logoutGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8 * scale,
  },
  logoutText: {
    fontWeight: '600',
    fontSize: 13 * scale,
    color: '#DC2626',
    letterSpacing: 0.3 * scale,
  },
});