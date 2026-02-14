/// app/components/ProfileHeaderClipper.tsx
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
const API_BASE = 'https://clippapay.com/api';

const DEFAULT_PROFILE = require('../../assets/images/user-default.jpg');

interface ProfileHeaderClipperProps {
  onNotificationPress?: () => void;
}

export default function ProfileHeaderClipper({ onNotificationPress }: ProfileHeaderClipperProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  
  // Use notifications hook
  const { unreadCount, refresh: refreshNotifications } = useNotifications();

  const getToken = async () => {
    let token: string | null = null;
    if (Platform.OS === 'web') {
      token = await AsyncStorage.getItem('userToken');
    } else {
      token = await SecureStore.getItemAsync('userToken');
      if (!token) token = await AsyncStorage.getItem('userToken');
    }
    return token;
  };

  const fetchData = async () => {
    const storedToken = await getToken();
    if (!storedToken) {
      Alert.alert('Authentication Error', 'No auth token found.');
      return;
    }
    setToken(storedToken);
    setLoading(true);

    try {
      // Fetch user basic info
      const { data: userData } = await axios.get(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      setUser(userData);

      // Fetch profile (image + video)
      const { data: profileData } = await axios.get(`${API_BASE}/user/clipper-profile/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });
      const imageUrl = profileData.profileImage;
      if (imageUrl) {
        const fullUrl = imageUrl.startsWith('http') 
          ? imageUrl 
          : `https://clippapay.com${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
        console.log('Resolved profile image URL:', fullUrl);
        setProfileImage(fullUrl);
      } else {
        setProfileImage(null);
      }
    } catch (err: any) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch every time the screen is focused (after coming back from edit)
  useFocusEffect(
    useCallback(() => {
      fetchData();
      // Also refresh notifications count
      refreshNotifications();
    }, [])
  );

  const handleImageError = () => {
    console.log('Failed to load profile image:', profileImage);
    setImageError(true);
  };

  const handleNotificationPress = () => {
    if (onNotificationPress) {
      onNotificationPress();
    } else {
      // Default navigation to notifications screen
      router.push('/(dashboard)/notifications');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  }

  const displayName = user?.firstName || user?.lastName
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim()
    : 'Hello, Clippa!';

  const imageSource = imageError || !profileImage
    ? DEFAULT_PROFILE
    : { uri: profileImage };

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning!';
    if (hour < 17) return 'Good Afternoon!';
    return 'Good Evening!';
  };

  return (
    <View style={styles.container}>
      <Image
        source={imageSource}
        style={styles.profileImage}
        onError={handleImageError}
        defaultSource={DEFAULT_PROFILE}
      />

      <View style={styles.textContainer}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
        <View style={styles.clipperBadge}>
          <Text style={styles.clipperText}>Clippa</Text>
          {user?.isPremiumCreator && (
            <View style={styles.premiumBadge}>
              <Ionicons name="star" size={10 * scale} color="#FFD700" />
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity 
        style={styles.notificationContainer}
        onPress={handleNotificationPress}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={24 * scale} color="#000" />
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
    width: 430 * scale,
    height: 130 * scale,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 1000,
  },
  profileImage: {
    width: 58 * scale,
    height: 58 * scale,
    borderRadius: 29 * scale,
    backgroundColor: '#f0f0f0',
  },
  textContainer: {
    marginLeft: 14 * scale,
    flex: 1,
  },
  greeting: {
    fontWeight: '400',
    fontSize: 12 * scale,
    lineHeight: 16 * scale,
    letterSpacing: 0.2 * scale,
    color: '#6B7280',
  },
  name: {
    fontWeight: '700',
    fontSize: 18 * scale,
    lineHeight: 24 * scale,
    letterSpacing: 0.2 * scale,
    color: '#111827',
    maxWidth: 200 * scale,
  },
  clipperBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4 * scale,
    gap: 8 * scale,
  },
  clipperText: {
    fontSize: 12 * scale,
    color: '#F8312F',
    fontWeight: '600',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8 * scale,
    paddingVertical: 2 * scale,
    borderRadius: 12 * scale,
    gap: 4 * scale,
  },
  premiumText: {
    fontSize: 10 * scale,
    color: '#D97706',
    fontWeight: '700',
  },
  notificationContainer: {
    position: 'relative',
    width: 44 * scale,
    height: 44 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8 * scale,
  },
  notificationBadge: {
    position: 'absolute',
    top: 2 * scale,
    right: 2 * scale,
    minWidth: 20 * scale,
    height: 20 * scale,
    borderRadius: 10 * scale,
    backgroundColor: '#F8312F',
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