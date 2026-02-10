/// app/components/ProfileHeader.tsx
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
import { useFocusEffect } from '@react-navigation/native'; // ← Add this import

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = 'https://clippapay.com/api';

const DEFAULT_PROFILE = require('../../assets/images/user-default.jpg');

export default function ProfileHeader() {
  const [user, setUser] = useState<any>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

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
    }, [])
  );

  const handleImageError = () => {
    console.log('Failed to load profile image:', profileImage);
    setImageError(true);
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

  return (
    <View style={styles.container}>
      <Image
        source={imageSource}
        style={styles.profileImage}
        onError={handleImageError}
        defaultSource={DEFAULT_PROFILE}
      />

      <View style={styles.textContainer}>
        <Text style={styles.greeting}>Good Evening!</Text>
        <Text style={styles.name}>{displayName}</Text>
        <View style={styles.advertiserBadge}>
          <Text style={styles.advertiserText}>Clippa</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.notificationContainer}>
        <Ionicons name="notifications-outline" size={21 * scale} color="#000" />
        <View style={styles.notificationDot} />
      </TouchableOpacity>
    </View>
  );
}

// Styles remain exactly the same as before
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0 * scale,
    left: 0,
    width: 430 * scale,
    height: 130 * scale,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28 * scale,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  profileImage: {
    width: 58 * scale,
    height: 58 * scale,
    borderRadius: 30 * scale,
    backgroundColor: '#f0f0f0',
  },
  textContainer: {
    marginLeft: 14 * scale,
  },
  greeting: {
    fontWeight: '400',
    fontSize: 12 * scale,
    lineHeight: 12 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    color: '#000',
  },
  name: {
    fontWeight: '700',
    fontSize: 20 * scale,
    lineHeight: 20 * scale * 1.4,
    letterSpacing: 0.2 * scale,
    color: '#000',
  },
  advertiserBadge: {
    width: 71 * scale,
    height: 19 * scale,
    borderRadius: 20 * scale,
    backgroundColor: '#F8312F33',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4 * scale,
  },
  advertiserText: {
    fontSize: 12 * scale,
    color: '#F8312F',
  },
  notificationContainer: {
    position: 'absolute',
    right: 28 * scale,
    top: 50 * scale,
    width: 27 * scale,
    height: 27 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationDot: {
    position: 'absolute',
    top: 3 * scale,
    right: 4 * scale,
    width: 8 * scale,
    height: 8 * scale,
    borderRadius: 4 * scale,
    backgroundColor: '#F8312F',
  },
});