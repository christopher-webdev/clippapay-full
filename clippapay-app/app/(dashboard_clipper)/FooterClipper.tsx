// app/components/FooterClipper.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname, useSegments } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const scale = width / 428;

// Define the tab items with active/inactive icons
const TAB_ITEMS = [
  {
    name: 'Browse',
    icon: 'grid-outline',
    activeIcon: 'grid',
    route: '/(dashboard_clipper)/clipper_dashboard',
    activeRoutes: [
      '/(dashboard_clipper)/clipper_dashboard',
      '/(dashboard_clipper)',
      '/clipper_dashboard',
    ],
  },
  {
    name: 'Submissions',
    icon: 'document-text-outline',
    activeIcon: 'document-text',
    route: '/(dashboard_clipper)/mysubmissions',
    activeRoutes: [
      '/(dashboard_clipper)/mysubmissions',
      '/mysubmissions',
      '/(dashboard_clipper)/submissions',
    ],
  },
  {
    name: 'Wallet',
    icon: 'wallet-outline',
    activeIcon: 'wallet',
    route: '/(dashboard_clipper)/wallet',
    activeRoutes: [
      '/(dashboard_clipper)/wallet',
      '/wallet',
      '/(dashboard_clipper)/wallet_screen',
    ],
  },
  {
    name: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person',
    route: '/(dashboard_clipper)/clipper_profile_edit',
    activeRoutes: [
      '/(dashboard_clipper)/clipper_profile_edit',
      '/clipper_profile_edit',
      '/(dashboard_clipper)/profile',
    ],
  },
];

export default function FooterClipper() {
  const pathname = usePathname();
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState('Browse');

  // Debug: Log current path for route matching
  useEffect(() => {
    console.log('Clipper Footer - Current pathname:', pathname);
    console.log('Clipper Footer - Current segments:', segments);
  }, [pathname, segments]);

  const isRouteActive = (activeRoutes: string[]) => {
    return activeRoutes.some(route => {
      // Exact match
      if (pathname === route) return true;
      
      // Path starts with route (for nested routes)
      if (pathname.startsWith(route) && route !== '/') return true;
      
      // Handle index route
      if (route === '/(dashboard_clipper)/clipper_dashboard' && 
          (pathname === '/(dashboard_clipper)' || pathname === '/')) {
        return true;
      }
      
      // Handle case-insensitive match
      if (pathname.toLowerCase() === route.toLowerCase()) return true;
      
      // Handle last segment match
      const routeSegments = route.split('/').filter(Boolean);
      const pathSegments = pathname.split('/').filter(Boolean);
      
      if (routeSegments.length > 0 && pathSegments.length > 0) {
        return routeSegments[routeSegments.length - 1].toLowerCase() === 
               pathSegments[pathSegments.length - 1].toLowerCase();
      }
      
      return false;
    });
  };

  const handleNavigation = (item: typeof TAB_ITEMS[0]) => {
    const targetRoute = item.route;
    console.log('Navigating to:', targetRoute);
    setActiveTab(item.name);
    router.push(targetRoute);
  };

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
            const isActive = isRouteActive(item.activeRoutes);

            return (
              <TouchableOpacity
                key={item.name}
                style={[styles.tabItem, isActive && styles.activeTabItem]}
                onPress={() => handleNavigation(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={22 * scale}
                    color={isActive ? '#7C3AED' : '#6B7280'}
                  />
                </View>
                <Text
                  style={[
                    styles.tabLabel,
                    isActive ? styles.activeTabLabel : styles.inactiveTabLabel,
                  ]}
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
            <Ionicons name="log-out-outline" size={18 * scale} color="#DC2626" />
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
    paddingHorizontal: 8 * scale,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
    paddingVertical: 6 * scale,
  },
  activeTabItem: {
    // Active state handled by child components
  },
  iconContainer: {
    padding: 6 * scale,
    borderRadius: 12 * scale,
  },
  activeIconContainer: {
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    padding: 6 * scale,
    borderRadius: 12 * scale,
  },
  tabLabel: {
    fontSize: 11 * scale,
    lineHeight: 11 * scale * 1.4,
    letterSpacing: 0.3 * scale,
    marginTop: 4 * scale,
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