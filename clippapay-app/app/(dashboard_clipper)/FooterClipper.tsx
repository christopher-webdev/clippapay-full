
// app/components/Footer.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, usePathname } from 'expo-router';

const { width } = Dimensions.get('window');
const scale = width / 428; // consistent with your other components

// Define the tab items
const TAB_ITEMS = [
  {
    name: 'Browse',
    icon: 'grid-outline',
    route: '/(dashboard_clipper)/clipper_dashboard', // adjust to your actual route
  },
  {
    name: 'Submissions',
    icon: 'megaphone-outline',
    route: '/(dashboard_clipper)/mysubmissions',
  },
  {
    name: 'Wallet',
    icon: 'cash-outline',
    route: '/(dashboard_clipper)/wallet',
  },
  {
    name: 'Profile',
    icon: 'person-outline',
    route: '/(dashboard_clipper)/clipper_profile_edit',
  },
];

export default function FooterClipper() {
  const pathname = usePathname(); // to highlight active tab

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={styles.container}>
        {/* Main tab bar */}
        <View style={styles.tabBar}>
          {TAB_ITEMS.map((item) => {
            const isActive = pathname === item.route || pathname.startsWith(item.route);

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

        <TouchableOpacity
          style={styles.accessButton}
          onPress={() => {
            // TODO: navigate to premium creators or upgrade screen
            router.push('/premium-creators');
          }}
        >
          <Text style={styles.accessText}>
            Sign out →
          </Text>
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
    // fixed at bottom
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
  accessButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8 * scale,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    
  },
  accessText: {

    fontWeight: '600',
    fontSize: 13 * scale,
    color: '#7C3AED',
    letterSpacing: 0.2 * scale,
  },
});