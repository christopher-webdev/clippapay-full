// app/clipper_profile_edit.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  Platform,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode } from 'expo-av';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = 'https://clippapay.com/api';

const CATEGORIES = ['Tech', 'Fitness', 'Travel', 'Food', 'Fashion', 'Business', 'Lifestyle', 'Gaming'];

export default function ClipperProfileEdit() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>({
    bio: '',
    categories: [],
    sampleVideo: null,
    ratePerVideo: '',
    expectedDelivery: '',
    completedProjects: '',
    profileImage: null,
  });
  const [basicInfo, setBasicInfo] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
  });

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const videoRef = useRef<Video>(null);

  useEffect(() => {
    loadTokenAndProfile();
  }, []);

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

  const toFullUrl = (path: string | null): string | null => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    if (path.startsWith('file://') || path.startsWith('ph://')) return path;

    let cleanPath = path;
    if (cleanPath.startsWith('/api/')) {
      cleanPath = cleanPath.replace('/api', '');
    } else if (cleanPath.startsWith('api/')) {
      cleanPath = cleanPath.replace('api/', '');
    }

    return `https://clippapay.com${cleanPath.startsWith('/') ? '' : '/'}${cleanPath}`;
  };

  const loadTokenAndProfile = async () => {
    const storedToken = await getToken();
    if (!storedToken) {
      Alert.alert('Authentication Error', 'No auth token found. Please log in again.');
      router.replace('/login');
      return;
    }
    setToken(storedToken);
    fetchUserAndProfile(storedToken);
  };

  const fetchUserAndProfile = async (authToken: string) => {
    try {
      setLoading(true);

      const { data: userData } = await axios.get(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      setUser(userData);

      setBasicInfo({
        firstName: userData.firstName || '',
        lastName: userData.lastName || '',
        phone: userData.phone || '',
        country: userData.country || '',
      });

      const { data: profileData } = await axios
        .get(`${API_BASE}/user/clipper-profile/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        })
        .catch(() => ({ data: {} }));

      const newProfile = {
        bio: profileData.bio || '',
        categories: profileData.categories || [],
        sampleVideo: toFullUrl(profileData.sampleVideo),
        ratePerVideo: profileData.ratePerVideo ? profileData.ratePerVideo.toString() : '',
        expectedDelivery: profileData.expectedDelivery || '',
        completedProjects: profileData.completedProjects
          ? profileData.completedProjects.toString()
          : '',
        profileImage: toFullUrl(profileData.profileImage),
      };

      setProfile(newProfile);
    } catch (err: any) {
      console.error('Fetch error:', err.message, err.response?.data);
      Alert.alert('Error', err.response?.data?.error || 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (cat: string) => {
    if (!user?.isPremiumCreator) return;
    setProfile((prev: any) => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter((c: string) => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setProfile((prev: any) => ({ ...prev, profileImage: uri }));
    }
  };

  const pickVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const size = asset.fileSize || 0;
      if (size > 20 * 1024 * 1024) {
        Alert.alert('File too large', 'Video must be under 20MB');
        return;
      }
      setProfile((prev: any) => ({ ...prev, sampleVideo: asset.uri }));
    }
  };

  const handleSaveProfile = async () => {
    if (!token) return Alert.alert('Error', 'No auth token found');

    try {
      setSaving(true);

      await axios.patch(
        `${API_BASE}/user/me`,
        {
          firstName: basicInfo.firstName,
          lastName: basicInfo.lastName,
          phone: basicInfo.phone,
          country: basicInfo.country,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const formData = new FormData();

      if (profile.sampleVideo?.startsWith('file://') || profile.sampleVideo?.startsWith('ph://')) {
        setVideoUploading(true);
        formData.append('sampleVideo', {
          uri: profile.sampleVideo,
          type: 'video/mp4',
          name: `sample-${Date.now()}.mp4`,
        } as any);
      }

      if (profile.profileImage?.startsWith('file://') || profile.profileImage?.startsWith('ph://')) {
        formData.append('profileImage', {
          uri: profile.profileImage,
          type: 'image/jpeg',
          name: `profile-${Date.now()}.jpg`,
        } as any);
      }

      if (user?.isPremiumCreator) {
        formData.append('bio', profile.bio || '');
        formData.append('categories', JSON.stringify(profile.categories || []));
        formData.append('ratePerVideo', profile.ratePerVideo || '0');
        formData.append('expectedDelivery', profile.expectedDelivery || '');
        formData.append('completedProjects', profile.completedProjects || '0');
      }

      if (formData._parts?.length > 0) {
        const response = await axios.patch(`${API_BASE}/user/clipper-profile/me`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data) {
          setProfile((prev: any) => ({
            ...prev,
            profileImage: toFullUrl(response.data.profileImage || prev.profileImage),
            sampleVideo: toFullUrl(response.data.sampleVideo || prev.sampleVideo),
          }));
        }
      }

      Alert.alert('Success', 'Profile updated successfully!');
      await fetchUserAndProfile(token);
    } catch (err: any) {
      console.error('Save error:', err.response?.data || err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
      setVideoUploading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!token) return Alert.alert('Error', 'No auth token found');

    setPwSaving(true);
    setPwMessage('');

    if (newPassword.length < 6) {
      setPwMessage('New password must be at least 6 characters.');
      setPwSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMessage('New passwords do not match.');
      setPwSaving(false);
      return;
    }

    try {
      await axios.post(
        `${API_BASE}/user/change-password`,
        { oldPassword: currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setPwMessage('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwMessage(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!token) return Alert.alert('Error', 'No auth token found');

    Alert.alert('Delete Account', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await axios.delete(`${API_BASE}/user/me`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            Alert.alert('Success', 'Account deleted.');
            router.replace('/');
          } catch (err: any) {
            Alert.alert('Error', 'Failed to delete account');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient
          colors={['#F9FAFB', '#F3F4F6']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading your profile...</Text>
      </View>
    );
  }

  const isPremium = user?.isPremiumCreator;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F9FAFB', '#F3F4F6', '#E5E7EB']}
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#4B5563" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Premium Status Banner */}
        {!isPremium && (
          <BlurView intensity={20} tint="light" style={styles.premiumBanner}>
            <View style={styles.premiumIconContainer}>
              <Ionicons name="star" size={24} color="#FFD700" />
            </View>
            <View style={styles.premiumContent}>
              <Text style={styles.premiumTitle}>Become a Premium Creator</Text>
              <Text style={styles.premiumText}>
                Unlock advanced features. Requires 4.0+ rating.
              </Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={14} color="#FFD700" />
                <Text style={styles.ratingText}>
                  {user?.rating?.toFixed(1) || '0.0'}/5.0
                </Text>
              </View>
            </View>
          </BlurView>
        )}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
            onPress={() => setActiveTab('profile')}
          >
            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
              Profile
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'media' && styles.activeTab]}
            onPress={() => setActiveTab('media')}
          >
            <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>
              Media
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'security' && styles.activeTab]}
            onPress={() => setActiveTab('security')}
          >
            <Text style={[styles.tabText, activeTab === 'security' && styles.activeTabText]}>
              Security
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <>
              {/* Basic Information Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: '#EEF2FF' }]}>
                    <Ionicons name="person-outline" size={20} color="#7C3AED" />
                  </View>
                  <Text style={styles.cardTitle}>Basic Information</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>First Name</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={basicInfo.firstName}
                      onChangeText={(text) => setBasicInfo((p) => ({ ...p, firstName: text }))}
                      placeholder="Your first name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={basicInfo.lastName}
                      onChangeText={(text) => setBasicInfo((p) => ({ ...p, lastName: text }))}
                      placeholder="Your last name"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Phone Number</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="call-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      keyboardType="phone-pad"
                      value={basicInfo.phone}
                      onChangeText={(text) => setBasicInfo((p) => ({ ...p, phone: text }))}
                      placeholder="Your phone number"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Country</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="globe-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={basicInfo.country}
                      onChangeText={(text) => setBasicInfo((p) => ({ ...p, country: text }))}
                      placeholder="Your country"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>

              {/* Premium Creator Fields */}
              {isPremium && (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={[styles.cardIcon, { backgroundColor: '#FEF3C7' }]}>
                      <Ionicons name="star" size={20} color="#D97706" />
                    </View>
                    <Text style={styles.cardTitle}>Premium Creator Details</Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bio / About You</Text>
                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                      <Ionicons name="document-text-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        multiline
                        numberOfLines={4}
                        value={profile.bio}
                        onChangeText={(text) => setProfile((p: any) => ({ ...p, bio: text }))}
                        placeholder="Tell brands about your style and experience..."
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Specialized Categories</Text>
                  <View style={styles.categoriesContainer}>
                    {CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryChip,
                          profile.categories.includes(cat) && styles.categoryChipActive,
                        ]}
                        onPress={() => toggleCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            profile.categories.includes(cat) && styles.categoryTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Rate per Video (₦)</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="cash-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={profile.ratePerVideo}
                        onChangeText={(text) => setProfile((p: any) => ({ ...p, ratePerVideo: text }))}
                        placeholder="e.g. 15000"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Expected Delivery Time</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="time-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={profile.expectedDelivery}
                        onChangeText={(text) => setProfile((p: any) => ({ ...p, expectedDelivery: text }))}
                        placeholder="e.g. 3-5 days"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Completed Projects</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="checkmark-done-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={profile.completedProjects}
                        onChangeText={(text) => setProfile((p: any) => ({ ...p, completedProjects: text }))}
                        placeholder="e.g. 45"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </View>
              )}
            </>
          )}

          {/* Media Tab */}
          {activeTab === 'media' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#FCE7F3' }]}>
                  <Ionicons name="images-outline" size={20} color="#DB2777" />
                </View>
                <Text style={styles.cardTitle}>Profile Media</Text>
              </View>

              {/* Profile Photo */}
              <View style={styles.mediaSection}>
                <Text style={styles.mediaLabel}>Profile Photo</Text>
                <TouchableOpacity
                  style={styles.mediaPreview}
                  onPress={() => profile.profileImage && setShowImagePreview(true)}
                  activeOpacity={0.9}
                >
                  {profile.profileImage ? (
                    <Image
                      source={{ uri: profile.profileImage }}
                      style={styles.mediaImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.mediaPlaceholder}>
                      <Ionicons name="person-circle-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.mediaPlaceholderText}>No profile photo</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.mediaButton} onPress={pickImage}>
                  <LinearGradient
                    colors={['#7C3AED', '#8B5CF6']}
                    style={styles.mediaButtonGradient}
                  >
                    <Ionicons name="image-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.mediaButtonText}>Upload Photo</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Sample Video */}
              <View style={[styles.mediaSection, styles.mediaSectionLast]}>
                <Text style={styles.mediaLabel}>Sample Video (max 20MB)</Text>
                <TouchableOpacity
                  style={styles.mediaPreview}
                  onPress={() => profile.sampleVideo && setShowVideoPreview(true)}
                  activeOpacity={0.9}
                >
                  {profile.sampleVideo ? (
                    <View style={styles.videoPreview}>
                      <Video
                        ref={videoRef}
                        source={{ uri: profile.sampleVideo }}
                        style={styles.mediaVideo}
                        resizeMode={ResizeMode.CONTAIN}
                        shouldPlay={false}
                        useNativeControls={false}
                        isLooping={false}
                      />
                      <View style={styles.videoOverlay}>
                        <View style={styles.videoPlayButton}>
                          <Ionicons name="play" size={32} color="#FFFFFF" />
                        </View>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.mediaPlaceholder}>
                      <Ionicons name="videocam-outline" size={48} color="#9CA3AF" />
                      <Text style={styles.mediaPlaceholderText}>No sample video</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.mediaButton} onPress={pickVideo}>
                  <LinearGradient
                    colors={['#7C3AED', '#8B5CF6']}
                    style={styles.mediaButtonGradient}
                  >
                    <Ionicons name="videocam-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.mediaButtonText}>Upload Video</Text>
                  </LinearGradient>
                </TouchableOpacity>

                {videoUploading && (
                  <View style={styles.uploadingContainer}>
                    <ActivityIndicator size="small" color="#7C3AED" />
                    <Text style={styles.uploadingText}>Uploading video...</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <>
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: '#E0F2FE' }]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#0284C7" />
                  </View>
                  <Text style={styles.cardTitle}>Change Password</Text>
                </View>

                {pwMessage ? (
                  <View
                    style={[
                      styles.messageContainer,
                      pwMessage.includes('success') ? styles.successContainer : styles.errorContainer,
                    ]}
                  >
                    <Ionicons
                      name={pwMessage.includes('success') ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={pwMessage.includes('success') ? '#16A34A' : '#DC2626'}
                    />
                    <Text
                      style={[
                        styles.messageText,
                        pwMessage.includes('success') ? styles.successText : styles.errorText,
                      ]}
                    >
                      {pwMessage}
                    </Text>
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Current Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      value={currentPassword}
                      onChangeText={setCurrentPassword}
                      placeholder="Enter current password"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="lock-open-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      value={newPassword}
                      onChangeText={setNewPassword}
                      placeholder="Min 6 characters"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm New Password</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      secureTextEntry
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="Confirm new password"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.passwordButton, pwSaving && styles.disabledButton]}
                  onPress={handleChangePassword}
                  disabled={pwSaving}
                >
                  <LinearGradient
                    colors={['#0284C7', '#0EA5E9']}
                    style={styles.buttonGradient}
                  >
                    {pwSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="lock-closed" size={18} color="#FFFFFF" />
                        <Text style={styles.buttonText}>Update Password</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <View style={styles.dangerCard}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: '#FEE2E2' }]}>
                    <Ionicons name="trash-outline" size={20} color="#DC2626" />
                  </View>
                  <Text style={[styles.cardTitle, styles.dangerTitle]}>Danger Zone</Text>
                </View>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
                  <Ionicons name="warning-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.deleteButtonText}>Delete Account</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Save Button - Visible in all tabs */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.disabledButton]}
            onPress={handleSaveProfile}
            disabled={saving}
          >
            <LinearGradient
              colors={['#7C3AED', '#8B5CF6']}
              style={styles.buttonGradient}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  <Text style={styles.buttonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.bottomPadding} />
        </ScrollView>

        {/* Image Preview Modal */}
        <Modal
          visible={showImagePreview}
          transparent
          onRequestClose={() => setShowImagePreview(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowImagePreview(false)}
          >
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowImagePreview(false)}
              >
                <Ionicons name="close-circle" size={40} color="#FFFFFF" />
              </TouchableOpacity>
              <Image
                source={{ uri: profile.profileImage }}
                style={styles.fullscreenMedia}
                resizeMode="contain"
              />
            </BlurView>
          </TouchableOpacity>
        </Modal>

        {/* Video Preview Modal */}
        <Modal
          visible={showVideoPreview}
          transparent
          onRequestClose={() => setShowVideoPreview(false)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowVideoPreview(false)}
              >
                <Ionicons name="close-circle" size={40} color="#FFFFFF" />
              </TouchableOpacity>
              <Video
                source={{ uri: profile.sampleVideo }}
                style={styles.fullscreenMedia}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
                useNativeControls
                isLooping={false}
              />
            </BlurView>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    
  },
  safeArea: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    backgroundColor: 'transparent',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  premiumBanner: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'rgba(254,243,199,0.8)',
    borderWidth: 1,
    borderColor: '#FBBF24',
  },
  premiumIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(255,215,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  premiumContent: {
    flex: 1,
  },
  premiumTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 4,
  },
  premiumText: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,215,0,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#D97706',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 4,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: '#F3E8FF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#111827',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#F3E8FF',
    borderColor: '#7C3AED',
  },
  categoryText: {
    color: '#4B5563',
    fontSize: 14,
    fontWeight: '600',
  },
  categoryTextActive: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  mediaSection: {
    marginBottom: 24,
  },
  mediaSectionLast: {
    marginBottom: 8,
  },
  mediaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  mediaPreview: {
    height: 180,
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  mediaImage: {
    width: '100%',
    height: '100%',
  },
  mediaPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  mediaPlaceholderText: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 8,
  },
  videoPreview: {
    flex: 1,
    position: 'relative',
  },
  mediaVideo: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  videoPlayButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(124,58,237,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediaButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  mediaButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  mediaButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  uploadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
    gap: 8,
  },
  uploadingText: {
    color: '#7C3AED',
    fontSize: 14,
    fontWeight: '600',
  },
  messageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  successContainer: {
    backgroundColor: '#DCFCE7',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  successText: {
    color: '#16A34A',
  },
  errorText: {
    color: '#DC2626',
  },
  passwordButton: {
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 8,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 8,
    marginBottom: 16,
  },
  dangerCard: {
    backgroundColor: '#FFF5F5',
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  dangerTitle: {
    color: '#DC2626',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
  },
  modalCloseButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    right: 20,
    zIndex: 10,
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%',
  },
});