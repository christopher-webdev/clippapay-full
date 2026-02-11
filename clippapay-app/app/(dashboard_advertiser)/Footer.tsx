// app/components/Footer.tsx
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

// Define the tab items with more precise route matching
const TAB_ITEMS = [
  {
    name: 'Browse',
    icon: 'grid-outline',
    activeIcon: 'grid',
    routes: [
      '/(dashboard_advertiser)/advertiser_dashboard',
      '/(dashboard_advertiser)',
      '/advertiser_dashboard',
      '/dashboard_advertiser',
    ],
  },
  {
    name: 'My Campaigns',
    icon: 'megaphone-outline',
    activeIcon: 'megaphone',
    routes: [
      '/(dashboard_advertiser)/Campaigns',
      '/Campaigns',
      '/(dashboard_advertiser)/campaigns',
      '/campaigns',
    ],
  },
  {
    name: 'Wallet',
    icon: 'cash-outline',
    activeIcon: 'cash',
    routes: [
      '/(dashboard_advertiser)/WalletScreen',
      '/WalletScreen',
      '/(dashboard_advertiser)/walletscreen',
      '/walletscreen',
      '/(dashboard_advertiser)/wallet',
      '/wallet',
    ],
  },
  {
    name: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person',
    routes: [
      '/(dashboard_advertiser)/Profile',
      '/Profile',
      '/(dashboard_advertiser)/profile',
      '/profile',
    ],
  },
];

export default function Footer() {
  const pathname = usePathname();
  const segments = useSegments();
  const [activeTab, setActiveTab] = useState<string>('Browse');

  // Debug: Log current path to see what we're getting
  useEffect(() => {
    console.log('Current pathname:', pathname);
    console.log('Current segments:', segments);
  }, [pathname, segments]);

  const isRouteActive = (routes: string[]) => {
    // Check if current pathname matches any of the routes for this tab
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
        return routeSegments[routeSegments.length - 1].toLowerCase() === 
               pathSegments[pathSegments.length - 1].toLowerCase();
      }
      
      return false;
    });
  };

  const handleNavigation = (item: typeof TAB_ITEMS[0]) => {
    // Use the first route as the primary navigation target
    const targetRoute = item.routes[0];
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
                  isActive && styles.activeIconContainer
                ]}>
                  <Ionicons
                    name={isActive ? item.activeIcon : item.icon}
                    size={24 * scale}
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
    // Active state styling is handled by child components
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