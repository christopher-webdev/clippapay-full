// app/(dashboard_clipper)/FooterClipper.tsx
// Added "Clipping" tab so clippers can directly access clipping campaigns from footer
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const scale = width / 428;

const TAB_ITEMS = [
  {
    name: 'Home',
    icon: 'grid-outline',
    activeIcon: 'grid',
    route: '/(dashboard_clipper)/clipper_dashboard',
    activeRoutes: ['/(dashboard_clipper)/clipper_dashboard'],
  },
  {
    name: 'Clipping',
    icon: 'film-outline',
    activeIcon: 'film',
    route: '/(dashboard_clipper)/join_clipping',
    activeRoutes: [
      '/(dashboard_clipper)/join_clipping',
      '/(dashboard_clipper)/submit_clipping',
      '/(dashboard_clipper)/my_clipping',
    ],
  },
  {
    name: 'UGC',
    icon: 'document-text-outline',
    activeIcon: 'document-text',
    route: '/(dashboard_clipper)/my-applications',
    activeRoutes: ['/(dashboard_clipper)/my-applications'],
  },
  {
    name: 'Wallet',
    icon: 'wallet-outline',
    activeIcon: 'wallet',
    route: '/(dashboard_clipper)/wallet',
    activeRoutes: ['/(dashboard_clipper)/wallet'],
  },
  {
    name: 'Profile',
    icon: 'person-outline',
    activeIcon: 'person',
    route: '/(dashboard_clipper)/clipper_profile_edit',
    activeRoutes: ['/(dashboard_clipper)/clipper_profile_edit'],
  },
];

export default function FooterClipper() {
  const pathname = usePathname();

  const isRouteActive = (activeRoutes: string[]) => {
    return activeRoutes.some(route => {
      if (pathname === route) return true;
      if (pathname.startsWith(route) && route !== '/') return true;
      if (pathname.toLowerCase() === route.toLowerCase()) return true;
      const routeSegs = route.split('/').filter(Boolean);
      const pathSegs  = pathname.split('/').filter(Boolean);
      if (routeSegs.length > 0 && pathSegs.length > 0) {
        return routeSegs[routeSegs.length - 1].toLowerCase() === pathSegs[pathSegs.length - 1].toLowerCase();
      }
      return false;
    });
  };

  const handleNavigation = (item: typeof TAB_ITEMS[0]) => {
    router.push(item.route as any);
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
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
            Alert.alert('Error', 'Failed to sign out. Please try again.');
          }
        },
      },
    ], { cancelable: true });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        <View style={styles.tabBar}>
          {TAB_ITEMS.map((item) => {
            const isActive = isRouteActive(item.activeRoutes);
            return (
              <TouchableOpacity
                key={item.name}
                style={styles.tabItem}
                onPress={() => handleNavigation(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, isActive && styles.activeIconContainer]}>
                  <Ionicons
                    name={isActive ? item.activeIcon as any : item.icon as any}
                    size={22 * scale}
                    color={isActive ? '#FF6B35' : '#6B7280'}
                  />
                </View>
                <Text style={[styles.tabLabel, isActive ? styles.activeTabLabel : styles.inactiveTabLabel]}>
                  {item.name}
                </Text>
                {isActive && <View style={styles.activeIndicator} />}
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.7}>
          <LinearGradient
            colors={['#FEF2F2', '#FEE2E2']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
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
  safeArea:            { backgroundColor: '#FFFFFF' },
  container:           { width: '100%', height: 98 * scale, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8 },
  tabBar:              { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', height: 64 * scale, paddingHorizontal: 4 * scale },
  tabItem:             { alignItems: 'center', justifyContent: 'center', flex: 1, position: 'relative', paddingVertical: 6 * scale },
  iconContainer:       { padding: 6 * scale, borderRadius: 12 * scale },
  activeIconContainer: { backgroundColor: 'rgba(255, 107, 53, 0.12)' },
  tabLabel:            { fontSize: 10 * scale, lineHeight: 14 * scale, letterSpacing: 0.3 * scale, marginTop: 2 * scale, maxWidth: 70 * scale },
  activeTabLabel:      { color: '#FF6B35', fontWeight: '700' },
  inactiveTabLabel:    { color: '#6B7280', fontWeight: '500' },
  activeIndicator:     { position: 'absolute', bottom: -2 * scale, width: 24 * scale, height: 3 * scale, backgroundColor: '#FF6B35', borderRadius: 1.5 * scale, alignSelf: 'center' },
  logoutButton:        { height: 34 * scale, justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  logoutGradient:      { ...StyleSheet.absoluteFillObject },
  logoutContent:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 * scale },
  logoutText:          { fontWeight: '600', fontSize: 13 * scale, color: '#DC2626', letterSpacing: 0.3 * scale },
});
