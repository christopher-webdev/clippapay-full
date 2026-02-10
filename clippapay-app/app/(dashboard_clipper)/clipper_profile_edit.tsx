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

const CATEGORIES = ['Tech', 'Fitness', 'Travel', 'Food', 'Fashion', 'Business'];

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

  // Password change fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Preview states
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);

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
        sampleVideo: profileData.sampleVideo || null,
        ratePerVideo: profileData.ratePerVideo ? profileData.ratePerVideo.toString() : '',
        expectedDelivery: profileData.expectedDelivery || '',
        completedProjects: profileData.completedProjects
          ? profileData.completedProjects.toString()
          : '',
        profileImage: profileData.profileImage || null,
      };

      setProfile(newProfile);

      // Debug URIs
      console.log('Loaded profile image URI:', newProfile.profileImage);
      console.log('Loaded sample video URI:', newProfile.sampleVideo);
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
      console.log('Selected profile image URI:', uri);
      setProfile((prev: any) => ({ ...prev, profileImage: uri }));
      Alert.alert('Success', 'Profile photo selected!');
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
      console.log('Selected video URI:', asset.uri);
      setProfile((prev: any) => ({ ...prev, sampleVideo: asset.uri }));
      Alert.alert('Success', 'Video attached successfully! Tap to preview.');
    }
  };

  const handleSaveProfile = async () => {
    if (!token) return Alert.alert('Error', 'No auth token found');

    try {
      setSaving(true);

      // Update basic info
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
          name: 'sample.mp4',
        } as any);
      }

      if (profile.profileImage?.startsWith('file://') || profile.profileImage?.startsWith('ph://')) {
        formData.append('profileImage', {
          uri: profile.profileImage,
          type: 'image/jpeg',
          name: 'profile.jpg',
        } as any);
      }

      if (user?.isPremiumCreator) {
        formData.append('bio', profile.bio);
        formData.append('categories', JSON.stringify(profile.categories));
        formData.append('ratePerVideo', profile.ratePerVideo || '0');
        formData.append('expectedDelivery', profile.expectedDelivery || '');
        formData.append('completedProjects', profile.completedProjects || '0');
      }

      if (formData._parts?.length > 0) {
        await axios.patch(`${API_BASE}/user/clipper-profile/me`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data',
          },
        });
      }

      Alert.alert('Success', 'Profile updated successfully!');
      fetchUserAndProfile(token);
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
      setPwMessage('New password must be at least 6 characters long.');
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
      <LinearGradient colors={['#0F0F0F', '#1A1A1A']} style={styles.background}>
        <SafeAreaView style={styles.container}>
          <ActivityIndicator size="large" color="#FF3366" />
        </SafeAreaView>
      </LinearGradient>
    );
  }

  const isPremium = user?.isPremiumCreator;

  return (
    <LinearGradient colors={['#0F0F0F', '#1A1A1A']} style={styles.background}>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={28 * scale} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.title}>Clipper Settings</Text>
            <View style={{ width: 28 * scale }} />
          </View>

          {/* Premium Notice */}
          {!isPremium && (
            <View style={styles.premiumNotice}>
              <Ionicons name="star-outline" size={32 * scale} color="#FFD700" />
              <Text style={styles.premiumTitle}>Become a Premium Creator</Text>
              <Text style={styles.premiumText}>
                Unlock advanced features like setting your rate, bio, categories, and more. You need a rating of 4.0 or higher.
              </Text>
              <Text style={styles.currentRating}>
                Your current rating: {user?.rating?.toFixed(1) || '0.0'}/5.0
              </Text>
            </View>
          )}

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.firstName}
              onChangeText={(text) => setBasicInfo((p) => ({ ...p, firstName: text }))}
            />

            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.lastName}
              onChangeText={(text) => setBasicInfo((p) => ({ ...p, lastName: text }))}
            />

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              keyboardType="phone-pad"
              value={basicInfo.phone}
              onChangeText={(text) => setBasicInfo((p) => ({ ...p, phone: text }))}
            />

            <Text style={styles.label}>Country</Text>
            <TextInput
              style={styles.input}
              value={basicInfo.country}
              onChangeText={(text) => setBasicInfo((p) => ({ ...p, country: text }))}
            />
          </View>

          {/* Visual Profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visual Profile</Text>

            {/* Profile Photo */}
            <Text style={styles.label}>Profile Photo</Text>
            <TouchableOpacity
              style={styles.mediaContainer}
              onPress={() => profile.profileImage && setShowImagePreview(true)}
              activeOpacity={0.85}
            >
              {profile.profileImage ? (
                <Image
                  source={{ uri: profile.profileImage }}
                  style={styles.currentMedia}
                  resizeMode="cover"
                  onError={(e) => console.log('Profile image load error:', e.nativeEvent.error)}
                />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons name="person-circle-outline" size={80 * scale} color="#666" />
                  <Text style={styles.placeholderText}>No photo yet</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
              <Ionicons name="image-outline" size={20 * scale} color="#FFF" />
              <Text style={styles.uploadBtnText}>Change Profile Photo</Text>
            </TouchableOpacity>

            {/* Sample Video */}
            <Text style={styles.label}>Sample Video (max 20MB)</Text>
            <TouchableOpacity
              style={styles.mediaContainer}
              onPress={() => profile.sampleVideo && setShowVideoPreview(true)}
              activeOpacity={0.85}
            >
              {profile.sampleVideo ? (
                <Video
                  ref={videoRef}
                  source={{ uri: profile.sampleVideo }}
                  style={styles.currentMedia}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={false}
                  useNativeControls={false}
                  isLooping={false}
                  onError={(err) => console.log('Video preview error:', err)}
                />
              ) : (
                <View style={styles.placeholder}>
                  <Ionicons name="videocam-off" size={80 * scale} color="#666" />
                  <Text style={styles.placeholderText}>No video yet</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickVideo}>
              <Ionicons name="videocam" size={20 * scale} color="#FFF" />
              <Text style={styles.uploadBtnText}>Attach / Change Video</Text>
            </TouchableOpacity>

            {videoUploading && (
              <Text style={styles.uploadingText}>Uploading video...</Text>
            )}
          </View>

          {/* Premium-only fields */}
          {isPremium && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Premium Creator Details</Text>

              <Text style={styles.label}>Bio / About You</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                multiline
                numberOfLines={4}
                value={profile.bio}
                onChangeText={(text) => setProfile((p: any) => ({ ...p, bio: text }))}
                placeholder="Tell brands about your style and experience..."
              />

              <Text style={styles.label}>Specialized Categories</Text>
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

              <Text style={styles.label}>Rate per Video (₦)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={profile.ratePerVideo}
                onChangeText={(text) => setProfile((p: any) => ({ ...p, ratePerVideo: text }))}
                placeholder="e.g. 15000"
              />

              <Text style={styles.label}>Expected Delivery Time</Text>
              <TextInput
                style={styles.input}
                value={profile.expectedDelivery}
                onChangeText={(text) => setProfile((p: any) => ({ ...p, expectedDelivery: text }))}
                placeholder="e.g. 3-5 days"
              />

              <Text style={styles.label}>Completed Projects</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={profile.completedProjects}
                onChangeText={(text) => setProfile((p: any) => ({ ...p, completedProjects: text }))}
                placeholder="e.g. 45"
              />
            </View>
          )}

          {/* Change Password */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Change Password</Text>

            {pwMessage ? (
              <Text
                style={[
                  styles.message,
                  pwMessage.includes('success') ? styles.success : styles.error,
                ]}
              >
                {pwMessage}
              </Text>
            ) : null}

            <Text style={styles.label}>Current Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <Text style={styles.label}>New Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <Text style={styles.label}>Confirm New Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.disabledButton]}
              onPress={handleSaveProfile}
              disabled={saving}
            >
              <Text style={styles.buttonText}>
                {saving ? 'Saving...' : 'Save Profile'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.passwordButton, pwSaving && styles.disabledButton]}
              onPress={handleChangePassword}
              disabled={pwSaving}
            >
              <Text style={styles.buttonText}>
                {pwSaving ? 'Changing...' : 'Change Password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dangerButton} onPress={handleDeleteAccount}>
              <Text style={styles.dangerButtonText}>Delete Account</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: 60 * scale }} />
        </ScrollView>
      </SafeAreaView>

      {/* Image Preview Modal */}
      <Modal visible={showImagePreview} transparent onRequestClose={() => setShowImagePreview(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowImagePreview(false)}
        >
          <Image
            source={{ uri: profile.profileImage }}
            style={styles.fullscreenMedia}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </Modal>

      {/* Video Preview Modal */}
      <Modal visible={showVideoPreview} transparent onRequestClose={() => setShowVideoPreview(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowVideoPreview(false)}
          >
            <Ionicons name="close-circle" size={40} color="#FFF" />
          </TouchableOpacity>

          <Video
            source={{ uri: profile.sampleVideo }}
            style={styles.fullscreenMedia}
            resizeMode={ResizeMode.CONTAIN}
            shouldPlay
            useNativeControls
            isLooping={false}
          />
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { padding: 20 * scale, paddingBottom: 100 * scale, paddingTop: 120 * scale },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24 * scale,
  },
  title: { fontSize: 26 * scale, fontWeight: '800', color: '#FFF' },
  section: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16 * scale,
    padding: 20 * scale,
    marginBottom: 20 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  sectionTitle: {
    fontSize: 18 * scale,
    fontWeight: '700',
    color: '#FF3366',
    marginBottom: 16 * scale,
  },
  label: {
    fontSize: 14 * scale,
    color: '#DDD',
    marginBottom: 6 * scale,
    marginTop: 12 * scale,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12 * scale,
    padding: 14 * scale,
    color: '#FFF',
    fontSize: 16 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  textarea: { height: 100 * scale, textAlignVertical: 'top' },
  mediaContainer: {
    height: 220 * scale,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12 * scale,
    overflow: 'hidden',
    marginVertical: 12 * scale,
  },
  currentMedia: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  placeholderText: {
    color: '#888',
    marginTop: 12 * scale,
    fontSize: 14 * scale,
  },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3366',
    paddingVertical: 14 * scale,
    borderRadius: 12 * scale,
    marginTop: 12 * scale,
    gap: 8 * scale,
  },
  uploadBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15 * scale,
  },
  uploadingText: {
    color: '#FF3366',
    textAlign: 'center',
    marginTop: 12 * scale,
    fontWeight: '600',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10 * scale,
    marginTop: 8 * scale,
  },
  categoryChip: {
    paddingHorizontal: 16 * scale,
    paddingVertical: 8 * scale,
    borderRadius: 20 * scale,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  categoryChipActive: {
    backgroundColor: 'rgba(255,51,102,0.25)',
    borderColor: '#FF3366',
  },
  categoryText: { color: '#CCC', fontSize: 14 * scale, fontWeight: '600' },
  categoryTextActive: { color: '#FFF', fontWeight: '700' },
  premiumNotice: {
    backgroundColor: 'rgba(255,215,0,0.12)',
    borderRadius: 16 * scale,
    padding: 20 * scale,
    alignItems: 'center',
    marginBottom: 24 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255,215,0,0.3)',
  },
  premiumTitle: {
    fontSize: 18 * scale,
    fontWeight: '700',
    color: '#FFD700',
    marginTop: 12 * scale,
  },
  premiumText: {
    fontSize: 15 * scale,
    color: '#EEE',
    textAlign: 'center',
    marginVertical: 8 * scale,
  },
  currentRating: {
    fontSize: 14 * scale,
    color: '#BBB',
    fontWeight: '500',
  },
  message: {
    padding: 12 * scale,
    borderRadius: 12 * scale,
    marginBottom: 16 * scale,
    textAlign: 'center',
    fontWeight: '600',
  },
  success: { backgroundColor: 'rgba(0,255,0,0.15)', color: '#0F0' },
  error: { backgroundColor: 'rgba(255,0,0,0.15)', color: '#F33' },
  buttonsContainer: {
    marginTop: 24 * scale,
    gap: 12 * scale,
  },
  saveButton: {
    backgroundColor: '#FF3366',
    padding: 16 * scale,
    borderRadius: 12 * scale,
    alignItems: 'center',
  },
  passwordButton: {
    backgroundColor: '#3B82F6',
    padding: 16 * scale,
    borderRadius: 12 * scale,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: '#DC2626',
    padding: 16 * scale,
    borderRadius: 12 * scale,
    alignItems: 'center',
  },
  disabledButton: { opacity: 0.6 },
  buttonText: { color: '#FFF', fontSize: 16 * scale, fontWeight: '700' },
  dangerButtonText: { color: '#FFF', fontSize: 16 * scale, fontWeight: '700' },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenMedia: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
  },
});