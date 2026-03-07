// app/components/ProfileHeader.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  Image, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  Platform, 
  Alert,
  ActivityIndicator 
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

// Import notification hook
import { useNotifications } from '../../hooks/useNotifications';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_PROFILE = require('../../assets/images/user-default.jpg');

interface ProfileHeaderProps {
  onNotificationPress?: () => void;
}

interface UserData {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  contactName?: string;
  role: 'clipper' | 'advertiser' | 'admin' | 'ad-worker' | 'platform';
  profileImage?: string | null;
  rating?: number;
  bio?: string;
  categories?: string[];
}

export default function ProfileHeader({ onNotificationPress }: ProfileHeaderProps) {
  const router = useRouter();
  const [user, setUser] = useState<UserData | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Use notifications hook
  const { unreadCount, refresh: refreshNotifications } = useNotifications();

  const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('userToken');
    }
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const fetchUserData = async () => {
    const token = await getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await axios.get(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setUser(data);

      // Handle profile image
      if (data.profileImage) {
        // Construct full URL - data.profileImage already starts with /uploads/profiles/
        const fullUrl = data.profileImage.startsWith('http') 
          ? data.profileImage 
          : `${API_BASE}${data.profileImage}`;
        setProfileImage(fullUrl);
      } else {
        setProfileImage(null);
      }
    } catch (err: any) {
      console.error('Error fetching user data:', err);
      if (err.response?.status === 401) {
        // Handle unauthorized - maybe redirect to login
        router.replace('/(auth)/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Refresh data when screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchUserData();
      refreshNotifications();
    }, [])
  );

  const handleImageError = () => {
    console.log('Failed to load profile image');
    setImageError(true);
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      // Navigate based on user role
      const notificationRoutes: Record<string, string> = {
        advertiser: '/(dashboard_advertiser)/notifications',
        clipper: '/(dashboard_clipper)/notifications',

      };
      
      const route = user?.role ? notificationRoutes[user.role] : '/(dashboard)/notifications';
      router.push(route as any);
    }
  };

  const handleProfilePress = () => {
    // Navigate to profile screen based on role
    const profileRoutes: Record<string, string> = {
      advertiser: '/(dashboard_advertiser)/Profile',
      clipper: '/(dashboard_clipper)/clipper_profile_edit',
    };
    
    const route = user?.role ? profileRoutes[user.role] : '/(dashboard)/clipper_profile_edit';
    router.push(route as any);
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#4F46E5" />
      </View>
    );
  }

  // Generate display name with proper fallbacks
  const getDisplayName = (): string => {
    if (!user) return 'Guest';
    
    // For advertisers
    if (user.company) return user.company;
    if (user.contactName) return user.contactName;
    
    // For clippers/users
    if (user.firstName) {
      return user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.firstName;
    }
    
    // Fallback to email
    return user.email?.split('@')[0] || 'User';
  };

  // Get role display text
  const getRoleDisplay = (): string => {
    if (!user?.role) return 'USER';
    
    const roleMap: Record<string, string> = {
      advertiser: 'ADVERTISER',
      clipper: 'CREATOR',

    };
    
    return roleMap[user.role] || user.role.toUpperCase();
  };

  // Get role badge color
  const getRoleBadgeStyle = () => {
    if (!user?.role) return styles.defaultBadge;
    
    const badgeStyles: Record<string, any> = {
      advertiser: styles.advertiserBadge,
      clipper: styles.creatorBadge,
      admin: styles.adminBadge,
      'ad-worker': styles.workerBadge,
      platform: styles.platformBadge
    };
    
    return badgeStyles[user.role] || styles.defaultBadge;
  };

  // Get role text color
  const getRoleTextStyle = () => {
    if (!user?.role) return styles.defaultText;
    
    const textStyles: Record<string, any> = {
      advertiser: styles.advertiserText,
      clipper: styles.creatorText,
      admin: styles.adminText,
      'ad-worker': styles.workerText,
      platform: styles.platformText
    };
    
    return textStyles[user.role] || styles.defaultText;
  };

  // Get greeting based on time
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = getDisplayName();
  const roleDisplay = getRoleDisplay();
  const imageSource = imageError || !profileImage
    ? DEFAULT_PROFILE
    : { uri: profileImage };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
        <Image
          source={imageSource}
          style={styles.profileImage}
          onError={handleImageError}
          defaultSource={DEFAULT_PROFILE}
        />
      </TouchableOpacity>

      <TouchableOpacity style={styles.textContainer} onPress={handleProfilePress} activeOpacity={0.7}>
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.name} numberOfLines={1}>
          {displayName}
        </Text>
        <View style={[styles.roleBadge, getRoleBadgeStyle()]}>
          <Text style={[styles.roleText, getRoleTextStyle()]}>
            {roleDisplay}
          </Text>
          {user?.rating !== undefined && user.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={10} color="#FBBF24" />
              <Text style={styles.ratingText}>{user.rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Notification Bell */}
      <TouchableOpacity
        style={styles.notificationContainer}
        onPress={handleNotificationPress}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={26 * scale} color="#4B5563" />

        {/* Badge with count */}
        {unreadCount > 0 && (
          <View style={styles.notificationBadge}>
            <Text style={styles.notificationCount}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 130 * scale,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 1000,
  },
  profileImage: {
    width: 58 * scale,
    height: 58 * scale,
    borderRadius: 29 * scale,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: '#4F46E5',
  },
  textContainer: {
    marginLeft: 14 * scale,
    flex: 1,
  },
  greeting: {
    fontSize: 12 * scale,
    color: '#6B7280',
    marginBottom: 2,
  },
  name: {
    fontSize: 18 * scale,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8 * scale,
    paddingVertical: 2 * scale,
    borderRadius: 12 * scale,
    gap: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
    gap: 2,
  },
  ratingText: {
    fontSize: 9 * scale,
    fontWeight: '600',
    color: '#FBBF24',
  },
  roleText: {
    fontSize: 10 * scale,
    fontWeight: '600',
  },
  // Role-specific badge colors
  advertiserBadge: {
    backgroundColor: '#F8312F20',
  },
  creatorBadge: {
    backgroundColor: '#4F46E520',
  },
  adminBadge: {
    backgroundColor: '#10B98120',
  },
  workerBadge: {
    backgroundColor: '#F59E0B20',
  },
  platformBadge: {
    backgroundColor: '#8B5CF620',
  },
  defaultBadge: {
    backgroundColor: '#6B728020',
  },
  // Role-specific text colors
  advertiserText: {
    color: '#F8312F',
  },
  creatorText: {
    color: '#4F46E5',
  },
  adminText: {
    color: '#10B981',
  },
  workerText: {
    color: '#F59E0B',
  },
  platformText: {
    color: '#8B5CF6',
  },
  defaultText: {
    color: '#6B7280',
  },
  notificationContainer: {
    position: 'relative',
    width: 44 * scale,
    height: 44 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 4 * scale,
    right: 4 * scale,
    minWidth: 20 * scale,
    height: 20 * scale,
    borderRadius: 10 * scale,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4 * scale,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notificationCount: {
    color: '#FFFFFF',
    fontSize: 10 * scale,
    fontWeight: '700',
  },
});