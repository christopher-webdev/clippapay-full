// app/components/Footer.tsx
import React from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');
const scale = width / 428;

// Define the tab items
const TAB_ITEMS = [
  {
    name: 'Browse',
    icon: 'grid-outline',
    route: '/(dashboard_advertiser)/advertiser_dashboard',
  },
  {
    name: 'My Campaigns',
    icon: 'megaphone-outline',
    route: '/(dashboard_advertiser)/Campaigns',
  },
  {
    name: 'Wallet',
    icon: 'cash-outline',
    route: '/(dashboard_advertiser)/WalletScreen',
  },
  {
    name: 'Profile',
    icon: 'person-outline',
    route: '/(dashboard_advertiser)/Profile',
  },
];

export default function Footer() {
  const pathname = usePathname();

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
              // Clear token from storage
              if (Platform.OS === 'web') {
                await AsyncStorage.removeItem('userToken');
              } else {
                await SecureStore.deleteItemAsync('userToken');
                // Also clear AsyncStorage as fallback
                await AsyncStorage.removeItem('userToken');
              }

              // Optional: clear other stored data if needed
              // await AsyncStorage.multiRemove(['userData', 'otherKey']);

              // Navigate to login screen and clear stack
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
            const isActive =
              pathname === item.route || pathname.startsWith(item.route + '/');

            return (
              <TouchableOpacity
                key={item.name}
                style={styles.tabItem}
                onPress={() => router.push(item.route)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={item.icon as any}
                  size={24 * scale}
                  color={isActive ? '#7C3AED' : '#6B7280'}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? '#7C3AED' : '#6B7280' },
                  ]}
                >
                  {item.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20 * scale} color="#EF4444" />
          <Text style={styles.logoutText}>Sign Out</Text>
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
    height: 90 * scale,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 56 * scale,
    paddingHorizontal: 16 * scale,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontWeight: '600',
    fontSize: 12 * scale,
    lineHeight: 12 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    marginTop: 4 * scale,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10 * scale,
    backgroundColor: '#FEF2F2', // light red background
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    gap: 8 * scale,
  },
  logoutText: {
    fontWeight: '600',
    fontSize: 14 * scale,
    color: '#EF4444', // red color for logout
    letterSpacing: 0.2 * scale,
  },
});