// app/(dashboard_advertiser)/ProfileHeader.tsx
import React, { useState, useCallback } from 'react';
import {
  View, Text, Image, TouchableOpacity,
  StyleSheet, Platform, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, usePathname } from 'expo-router';
import { useNotifications } from '../../hooks/useNotifications';

const API_BASE      = process.env.EXPO_PUBLIC_API_URL;
const DEFAULT_IMAGE = require('../../assets/images/user-default.jpg');

export const HEADER_HEIGHT = 72;

// Routes where the Settings icon shows (and bell hides)
const PROFILE_ROUTES = [
  '/(dashboard_advertiser)/Profile',
  '/Profile',
];

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
}

interface Props { onNotificationPress?: () => void }

const ROLE_CFG: Record<string, { label: string; color: string; bg: string }> = {
  advertiser:  { label: 'ADVERTISER', color: '#EF4444', bg: '#FEF2F2' },
  clipper:     { label: 'CREATOR',    color: '#6366F1', bg: '#EEF2FF' },
  admin:       { label: 'ADMIN',      color: '#10B981', bg: '#ECFDF5' },
  'ad-worker': { label: 'AD WORKER',  color: '#F59E0B', bg: '#FFFBEB' },
  platform:    { label: 'PLATFORM',   color: '#8B5CF6', bg: '#F5F3FF' },
};

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

const getGreeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
};

export default function ProfileHeader({ onNotificationPress }: Props) {
  const router   = useRouter();
  const pathname = usePathname();

  const [user, setUser]          = useState<UserData | null>(null);
  const [imgUri, setImgUri]      = useState<string | null>(null);
  const [imgErr, setImgErr]      = useState(false);
  const [loading, setLoading]    = useState(true);
  const { unreadCount, refresh } = useNotifications();

  // True when the user is currently on the Profile screen
  const isOnProfile = PROFILE_ROUTES.some(r =>
    pathname === r || pathname.toLowerCase() === r.toLowerCase()
  );

  const load = async () => {
    const token = await getToken();
    if (!token) { setLoading(false); return; }
    try {
      const { data } = await axios.get(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(data);
      if (data.profileImage) {
        setImgUri(
          data.profileImage.startsWith('http')
            ? data.profileImage
            : `${API_BASE}${data.profileImage}`
        );
      }
    } catch (e: any) {
      if (e.response?.status === 401) router.replace('/(auth)/login');
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); refresh(); }, []));

  const displayName = (() => {
    if (!user) return 'Guest';
    if (user.company) return user.company;
    if (user.contactName) return user.contactName;
    if (user.firstName) return user.lastName ? `${user.firstName} ${user.lastName}` : user.firstName;
    return user.email?.split('@')[0] || 'User';
  })();

  const roleCfg = ROLE_CFG[user?.role ?? ''] ?? { label: 'USER', color: '#6B7280', bg: '#F3F4F6' };
  const imgSrc  = imgErr || !imgUri ? DEFAULT_IMAGE : { uri: imgUri };

  const goNotifs = () => {
    if (onNotificationPress) { onNotificationPress(); return; }
    const routes: Record<string, string> = {
      advertiser: '/(dashboard_advertiser)/notifications',
      clipper:    '/(dashboard_clipper)/notifications',
    };
    router.push((routes[user?.role ?? ''] ?? '/(dashboard)/notifications') as any);
  };

  const goProfile = () => {
    const routes: Record<string, string> = {
      advertiser: '/(dashboard_advertiser)/Profile',
      clipper:    '/(dashboard_clipper)/Profile',
    };
    router.push((routes[user?.role ?? ''] ?? '/(dashboard)/profile') as any);
  };

  const goSettings = () => {
    router.push('/(dashboard_advertiser)/settings' as any);
  };

  if (loading) {
    return (
      <View style={S.container}>
        <ActivityIndicator size="small" color="#6366F1" />
      </View>
    );
  }

  return (
    <View style={S.container}>
      {/* Avatar */}
      <TouchableOpacity onPress={goProfile} activeOpacity={0.8} style={S.avatarWrap}>
        <Image
          source={imgSrc}
          style={S.avatar}
          onError={() => setImgErr(true)}
          defaultSource={DEFAULT_IMAGE}
        />
      </TouchableOpacity>

      {/* Name + role */}
      <TouchableOpacity style={S.textWrap} onPress={goProfile} activeOpacity={0.7}>
        <Text style={S.greeting}>Good {getGreeting()}</Text>
        <View style={S.nameRow}>
          <Text style={S.name} numberOfLines={1}>{displayName}</Text>
          <View style={[S.rolePill, { backgroundColor: roleCfg.bg }]}>
            <Text style={[S.roleLabel, { color: roleCfg.color }]}>{roleCfg.label}</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Settings icon — only on Profile screen */}
      {isOnProfile && (
        <TouchableOpacity style={S.iconWrap} onPress={goSettings} activeOpacity={0.75}>
          <View style={S.iconInner}>
            <Ionicons name="settings-outline" size={20} color="#374151" />
          </View>
        </TouchableOpacity>
      )}

      {/* Notification bell — hidden on Profile screen */}
      {!isOnProfile && (
        <TouchableOpacity style={S.bellWrap} onPress={goNotifs} activeOpacity={0.75}>
          <View style={S.bellInner}>
            <Ionicons name="notifications-outline" size={21} color="#374151" />
            {unreadCount > 0 && (
              <View style={S.badge}>
                <Text style={S.badgeTxt}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const S = StyleSheet.create({
  container: {
    height: HEADER_HEIGHT,
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    marginTop: 30,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarWrap: { marginRight: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#EEF2FF',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
  textWrap:  { flex: 1, justifyContent: 'center' },
  greeting:  { fontSize: 11, color: '#9CA3AF', fontWeight: '500', marginBottom: 2 },
  nameRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name:      { fontSize: 16, fontWeight: '700', color: '#0F0F1A', flexShrink: 1 },
  rolePill:  { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, flexShrink: 0 },
  roleLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.8 },
  iconWrap:  { marginLeft: 8 },
  iconInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  bellWrap:  { marginLeft: 8 },
  bellInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F9FAFB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  badge: {
    position: 'absolute',
    top: 5,
    right: 5,
    minWidth: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeTxt: { color: '#FFF', fontSize: 9, fontWeight: '700' },
});