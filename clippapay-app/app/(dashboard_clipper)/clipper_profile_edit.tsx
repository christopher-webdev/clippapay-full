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
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Video, ResizeMode, Audio } from 'expo-av';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;
const API_BASE_UPLOADS = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

// Log API configuration for debugging
console.log('API Config:', {
  API_BASE,
  API_BASE_UPLOADS
});

// Comprehensive country list with dial codes
const COUNTRIES = [
  // Africa
  { code: 'NG', name: 'Nigeria', dialCode: '+234' },
  { code: 'GH', name: 'Ghana', dialCode: '+233' },
  { code: 'KE', name: 'Kenya', dialCode: '+254' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27' },
  { code: 'EG', name: 'Egypt', dialCode: '+20' },
  { code: 'CI', name: 'Côte d\'Ivoire', dialCode: '+225' },
  { code: 'US', name: 'United States', dialCode: '+1' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44' },
  { code: 'CA', name: 'Canada', dialCode: '+1' },
  { code: 'AU', name: 'Australia', dialCode: '+61' },
  { code: 'DE', name: 'Germany', dialCode: '+49' },
  { code: 'FR', name: 'France', dialCode: '+33' },
  { code: 'IT', name: 'Italy', dialCode: '+39' },
  { code: 'ES', name: 'Spain', dialCode: '+34' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31' },
  { code: 'BE', name: 'Belgium', dialCode: '+32' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41' },
  { code: 'SE', name: 'Sweden', dialCode: '+46' },
  { code: 'NO', name: 'Norway', dialCode: '+47' },
  { code: 'DK', name: 'Denmark', dialCode: '+45' },
  { code: 'FI', name: 'Finland', dialCode: '+358' },
  { code: 'JP', name: 'Japan', dialCode: '+81' },
  { code: 'KR', name: 'South Korea', dialCode: '+82' },
  { code: 'CN', name: 'China', dialCode: '+86' },
  { code: 'IN', name: 'India', dialCode: '+91' },
  { code: 'BR', name: 'Brazil', dialCode: '+55' },
  { code: 'MX', name: 'Mexico', dialCode: '+52' },
  { code: 'AE', name: 'UAE', dialCode: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966' },
  { code: 'IL', name: 'Israel', dialCode: '+972' },
  { code: 'TR', name: 'Turkey', dialCode: '+90' },
  { code: 'RU', name: 'Russia', dialCode: '+7' },
];

const CATEGORIES = ['Tech', 'Fitness', 'Travel', 'Food', 'Fashion', 'Business', 'Lifestyle', 'Gaming', 'Music', 'Education', 'Sports', 'Comedy', 'Beauty', 'Health', 'Finance'];

// Types
interface User {
  _id: string;
  role: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  country?: string;
  rating?: number;
  profileImage?: string | null;
  sampleVideos?: string[];
  bio?: string;
  categories?: string[];
  paymentMethod?: string;
  usdtAddress?: string;
  usdtNetwork?: string;
  payBankName?: string;
  payAccountNumber?: string;
  payAccountName?: string;
}

interface ProfileState {
  bio: string;
  categories: string[];
  sampleVideos: (string | null)[];
  profileImage: string | null;
}

interface BasicInfo {
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
}

interface PaymentInfo {
  paymentMethod: 'Bank' | 'USDT';
  usdtAddress: string;
  usdtNetwork: string;
  payBankName: string;
  payAccountNumber: string;
  payAccountName: string;
}

export default function ClipperProfileEdit() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileState>({
    bio: '',
    categories: [],
    sampleVideos: [null, null, null],
    profileImage: null,
  });
  const [basicInfo, setBasicInfo] = useState<BasicInfo>({
    firstName: '',
    lastName: '',
    phone: '',
    country: 'NG',
  });

  // Payment info state
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo>({
    paymentMethod: 'Bank',
    usdtAddress: '',
    usdtNetwork: 'TRC20',
    payBankName: '',
    payAccountNumber: '',
    payAccountName: '',
  });

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState({ text: '', type: '' });

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [videoUploading, setVideoUploading] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState('profile');
  const [countryModalVisible, setCountryModalVisible] = useState(false);
  const [deletingVideo, setDeletingVideo] = useState<number | null>(null);
  const [imageLoadError, setImageLoadError] = useState<{[key: string]: boolean}>({});

  const videoRefs = useRef<(Video | null)[]>([]);

  // Debug state changes
  useEffect(() => {
    console.log('Current state:', {
      basicInfo,
      paymentInfo,
      profile: {
        ...profile,
        profileImage: profile.profileImage ? 'exists' : null
      }
    });
  }, [basicInfo, paymentInfo, profile]);

  useEffect(() => {
    loadTokenAndProfile();
  }, []);

  // Helper Functions
  const getToken = async (): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('userToken');
    }
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const toFullUrl = (path: string | null): string | null => {
    if (!path) return null;
    
    console.log('Converting path:', path);
    
    // If it's already a full URL, return as is
    if (path.startsWith('http://') || path.startsWith('https://')) {
      console.log('Already full URL:', path);
      return path;
    }
    
    // If it's a local file URI, return as is
    if (path.startsWith('file://') || path.startsWith('ph://')) {
      console.log('Local file:', path);
      return path;
    }

    // Clean up the path - ensure it starts with /
    let cleanPath = path;
    if (!cleanPath.startsWith('/')) {
      cleanPath = '/' + cleanPath;
    }

    // Your paths come as "/uploads/profiles/filename.jpg"
    // API_BASE_UPLOADS is "http://192.168.0.16:5000"
    const fullUrl = `${API_BASE_UPLOADS}${cleanPath}`;
    console.log('Full URL:', fullUrl);
    return fullUrl;
  };

  const validatePhoneForCountry = (phone: string, countryCode: string): boolean => {
    const country = COUNTRIES.find(c => c.code === countryCode);
    if (!country) return true;
    
    const dialCode = country.dialCode.replace('+', '');
    const phoneDigits = phone.replace(/\D/g, '');
    
    // Check if phone starts with dial code or local format (0)
    if (!phoneDigits.startsWith(dialCode) && !phone.startsWith('0')) {
      return false;
    }
    
    // Check minimum length
    const minLength = dialCode.length + 7;
    return phoneDigits.length >= minLength;
  };

  // Data Loading
  const loadTokenAndProfile = async () => {
    const storedToken = await getToken();
    if (!storedToken) {
      Alert.alert('Authentication Error', 'No auth token found. Please log in again.');
      router.replace('/login');
      return;
    }
    setToken(storedToken);
    await fetchUserAndProfile(storedToken);
  };

  const fetchUserAndProfile = async (authToken: string) => {
    try {
      setLoading(true);
      setImageLoadError({});

      // Fetch user data
      const { data: userData } = await axios.get(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      
      console.log('Raw user data from API:', JSON.stringify(userData, null, 2));
      setUser(userData);

      // Set basic info - with proper null checks
      setBasicInfo({
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
        phone: userData?.phone || '',
        country: userData?.country || 'NG',
      });

      console.log('Basic info set:', {
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        phone: userData?.phone,
        country: userData?.country
      });

      // Set payment info - with proper null checks
      setPaymentInfo({
        paymentMethod: userData?.paymentMethod === 'USDT' ? 'USDT' : 'Bank',
        usdtAddress: userData?.usdtAddress || '',
        usdtNetwork: userData?.usdtNetwork || 'TRC20',
        payBankName: userData?.payBankName || '',
        payAccountNumber: userData?.payAccountNumber || '',
        payAccountName: userData?.payAccountName || '',
      });

      console.log('Payment info set:', {
        paymentMethod: userData?.paymentMethod,
        bankName: userData?.payBankName,
        accountNumber: userData?.payAccountNumber,
        accountName: userData?.payAccountName,
        usdtAddress: userData?.usdtAddress,
        usdtNetwork: userData?.usdtNetwork
      });

      // Set profile data
      const sampleVideos = userData?.sampleVideos || [];
      const videoArray = [null, null, null];
      sampleVideos.forEach((video: string, index: number) => {
        if (index < 3) {
          const videoUrl = toFullUrl(video);
          console.log(`Video ${index} URL:`, videoUrl);
          videoArray[index] = videoUrl;
        }
      });

      // Handle profile image URL
      let profileImageUrl = null;
      if (userData?.profileImage) {
        profileImageUrl = toFullUrl(userData.profileImage);
        console.log('Profile image URL:', profileImageUrl);
      }

      setProfile({
        bio: userData?.bio || '',
        categories: userData?.categories || [],
        sampleVideos: videoArray,
        profileImage: profileImageUrl,
      });

      console.log('Profile set:', {
        bio: userData?.bio,
        categories: userData?.categories,
        profileImage: profileImageUrl,
        sampleVideosCount: videoArray.filter(v => v).length
      });

    } catch (err: any) {
      console.error('Fetch error:', err.response?.data || err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to load your profile');
    } finally {
      setLoading(false);
    }
  };

  // Media Handling
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
      console.log('Selected image URI:', uri);
      setProfile(prev => ({ ...prev, profileImage: uri }));
      // Clear any previous load error for this image
      setImageLoadError({});
    }
  };

  const pickVideo = async (index: number) => {
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
      console.log(`Selected video ${index} URI:`, asset.uri);
      
      // Simple size check using file size from asset if available
      if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
        Alert.alert('File too large', 'Video must be under 50MB');
        return;
      }

      const updatedVideos = [...profile.sampleVideos];
      updatedVideos[index] = asset.uri;
      setProfile(prev => ({ ...prev, sampleVideos: updatedVideos }));
    }
  };

  const deleteVideo = async (index: number) => {
    if (!token || !user) return;

    Alert.alert(
      'Delete Video',
      'Are you sure you want to delete this sample video?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeletingVideo(index);
              
              const videoPath = user.sampleVideos?.[index];
              if (videoPath) {
                const filename = videoPath.split('/').pop();
                if (filename) {
                  console.log('Deleting video:', filename);
                  await axios.delete(`${API_BASE}/user/profile/video/${filename}`, {
                    headers: { Authorization: `Bearer ${token}` },
                  });
                }
              }

              // Update local state
              const updatedVideos = [...profile.sampleVideos];
              updatedVideos[index] = null;
              setProfile(prev => ({ ...prev, sampleVideos: updatedVideos }));

              if (user.sampleVideos) {
                const updatedUserVideos = [...user.sampleVideos];
                updatedUserVideos.splice(index, 1);
                setUser({ ...user, sampleVideos: updatedUserVideos });
              }

              Alert.alert('Success', 'Video deleted successfully');
            } catch (err: any) {
              console.error('Delete video error:', err);
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete video');
            } finally {
              setDeletingVideo(null);
            }
          },
        },
      ]
    );
  };

  // Save Functions
  const uploadProfileImage = async (uri: string): Promise<string | null> => {
    if (!token) return null;

    const formData = new FormData();
    formData.append('profileImage', {
      uri,
      type: 'image/jpeg',
      name: `profile-${Date.now()}.jpg`,
    } as any);

    console.log('Uploading profile image:', uri);
    
    const response = await axios.patch(
      `${API_BASE}/user/profile`,
      formData,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    console.log('Profile image upload response:', response.data);
    return response.data.user?.profileImage;
  };

  const uploadSampleVideos = async (): Promise<string[]> => {
    if (!token) return [];

    const uploadedPaths: string[] = [];
    
    for (let i = 0; i < profile.sampleVideos.length; i++) {
      const videoUri = profile.sampleVideos[i];
      // Only upload if it's a local file (starts with file://)
      if (!videoUri || !videoUri.startsWith('file://')) continue;

      try {
        setVideoUploading(i);

        const formData = new FormData();
        
        // Determine mime type from extension
        const mimeType = videoUri.endsWith('.mov') ? 'video/quicktime' : 'video/mp4';
        const filename = `sample-${Date.now()}-${i}.mp4`;
        
        console.log(`Uploading video ${i}:`, { uri: videoUri, mimeType, filename });
        
        formData.append('sampleVideos', {
          uri: videoUri,
          type: mimeType,
          name: filename,
        } as any);

        const response = await axios.patch(
          `${API_BASE}/user/profile`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );

        console.log(`Video ${i} upload response:`, response.data);

        // Get the newly uploaded video path
        const newVideoPath = response.data.user?.sampleVideos?.pop();
        if (newVideoPath) {
          uploadedPaths.push(newVideoPath);
        }
      } catch (err) {
        console.error(`Error uploading video ${i}:`, err);
        throw err;
      }
    }

    return uploadedPaths;
  };

  const handleSaveProfile = async () => {
    if (!token) {
      Alert.alert('Error', 'No auth token found');
      return;
    }

    // Validate phone number
    if (basicInfo.phone && !validatePhoneForCountry(basicInfo.phone, basicInfo.country)) {
      const country = COUNTRIES.find(c => c.code === basicInfo.country);
      Alert.alert(
        'Invalid Phone Number',
        `Please enter a valid ${country?.name} phone number starting with ${country?.dialCode} or 0`
      );
      return;
    }

    try {
      setSaving(true);

      // Prepare text updates
      const textUpdates: Record<string, any> = {
        firstName: basicInfo.firstName,
        lastName: basicInfo.lastName,
        phone: basicInfo.phone,
        country: basicInfo.country,
        bio: profile.bio,
        categories: JSON.stringify(profile.categories),
        paymentMethod: paymentInfo.paymentMethod,
        payBankName: paymentInfo.payBankName,
        payAccountNumber: paymentInfo.payAccountNumber,
        payAccountName: paymentInfo.payAccountName,
        usdtAddress: paymentInfo.usdtAddress,
        usdtNetwork: paymentInfo.usdtNetwork,
      };

      console.log('Saving text updates:', textUpdates);

      // First, save all text fields
      const textResponse = await axios.patch(
        `${API_BASE}/user/profile`,
        textUpdates,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('Text fields saved:', textResponse.data);

      // Upload profile image if changed
      if (profile.profileImage?.startsWith('file://')) {
        console.log('Uploading profile image...');
        await uploadProfileImage(profile.profileImage);
      }

      // Upload new sample videos
      if (profile.sampleVideos.some(v => v?.startsWith('file://'))) {
        console.log('Uploading sample videos...');
        await uploadSampleVideos();
      }

      // Fetch fresh data to confirm updates
      await fetchUserAndProfile(token);

      Alert.alert('Success', 'Profile updated successfully!');
      
    } catch (err: any) {
      console.error('Save error:', err.response?.data || err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
      setVideoUploading(null);
    }
  };

  // Password Change
  const handleChangePassword = async () => {
    if (!token) {
      Alert.alert('Error', 'No auth token found');
      return;
    }

    setPwSaving(true);
    setPwMessage({ text: '', type: '' });

    if (!currentPassword) {
      setPwMessage({ text: 'Please enter your current password', type: 'error' });
      setPwSaving(false);
      return;
    }

    if (newPassword.length < 6) {
      setPwMessage({ text: 'New password must be at least 6 characters', type: 'error' });
      setPwSaving(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwMessage({ text: 'New passwords do not match', type: 'error' });
      setPwSaving(false);
      return;
    }

    try {
      console.log('Changing password...');
      await axios.post(
        `${API_BASE}/user/change-password`,
        { oldPassword: currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPwMessage({ text: 'Password changed successfully!', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Clear success message after 3 seconds
      setTimeout(() => setPwMessage({ text: '', type: '' }), 3000);
      
    } catch (err: any) {
      console.error('Password change error:', err.response?.data || err);
      setPwMessage({ 
        text: err.response?.data?.error || 'Failed to change password', 
        type: 'error' 
      });
    } finally {
      setPwSaving(false);
    }
  };

  // Account Deletion
  const handleDeleteAccount = async () => {
    if (!token) {
      Alert.alert('Error', 'No auth token found');
      return;
    }

    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Deleting account...');
              await axios.delete(`${API_BASE}/user/me`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              
              // Clear stored tokens
              await AsyncStorage.removeItem('userToken');
              await AsyncStorage.removeItem('userInfo');
              if (Platform.OS !== 'web') {
                await SecureStore.deleteItemAsync('userToken');
              }
              
              Alert.alert('Account Deleted', 'Your account has been successfully deleted.');
              router.replace('/');
            } catch (err: any) {
              console.error('Delete account error:', err.response?.data || err);
              Alert.alert('Error', err.response?.data?.error || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  // Render Functions
  const renderVideoPreview = (videoUri: string | null, index: number) => {
    if (!videoUri) {
      return (
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam-outline" size={32} color="#9CA3AF" />
          <Text style={styles.videoPlaceholderText}>No video</Text>
        </View>
      );
    }

    return (
      <View style={styles.videoPreview}>
        <Video
          ref={ref => { videoRefs.current[index] = ref; }}
          source={{ uri: videoUri }}
          style={styles.videoThumbnail}
          resizeMode={ResizeMode.COVER}
          shouldPlay={false}
          isLooping={false}
          useNativeControls={false}
          onError={(error) => console.log(`Video ${index} error:`, error)}
        />
        <View style={styles.videoOverlay}>
          <TouchableOpacity
            style={styles.videoPlayButton}
            onPress={() => setShowVideoPreview(index)}
          >
            <Ionicons name="play" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {deletingVideo === index ? (
            <ActivityIndicator size="small" color="#EF4444" style={styles.videoDeleteSpinner} />
          ) : (
            <TouchableOpacity
              style={styles.videoDeleteButton}
              onPress={() => deleteVideo(index)}
            >
              <Ionicons name="trash-outline" size={20} color="#EF4444" />
            </TouchableOpacity>
          )}
        </View>
        {videoUploading === index && (
          <View style={styles.videoUploadingOverlay}>
            <ActivityIndicator size="small" color="#7C3AED" />
            <Text style={styles.videoUploadingText}>Uploading...</Text>
          </View>
        )}
      </View>
    );
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
            style={[styles.tab, activeTab === 'payment' && styles.activeTab]}
            onPress={() => setActiveTab('payment')}
          >
            <Text style={[styles.tabText, activeTab === 'payment' && styles.activeTabText]}>
              Payment
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
                      onChangeText={(text) => setBasicInfo(p => ({ ...p, firstName: text }))}
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
                      onChangeText={(text) => setBasicInfo(p => ({ ...p, lastName: text }))}
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
                      onChangeText={(text) => setBasicInfo(p => ({ ...p, phone: text }))}
                      placeholder="Your phone number"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Country</Text>
                  <TouchableOpacity
                    style={styles.countrySelector}
                    onPress={() => setCountryModalVisible(true)}
                  >
                    <View style={styles.countrySelectorContent}>
                      <Ionicons name="globe-outline" size={18} color="#9CA3AF" />
                      <Text style={styles.countrySelectorText}>
                        {COUNTRIES.find(c => c.code === basicInfo.country)?.name || basicInfo.country}
                      </Text>
                      <Ionicons name="chevron-down" size={18} color="#9CA3AF" />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Creator Profile Card */}
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.cardIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="star" size={20} color="#D97706" />
                  </View>
                  <Text style={styles.cardTitle}>Creator Profile</Text>
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
                      onChangeText={(text) => setProfile(p => ({ ...p, bio: text }))}
                      placeholder="Tell brands about your style and experience..."
                      placeholderTextColor="#9CA3AF"
                      maxLength={500}
                    />
                  </View>
                  <Text style={styles.charCount}>{profile.bio.length}/500</Text>
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
                      onPress={() => {
                        setProfile(prev => ({
                          ...prev,
                          categories: prev.categories.includes(cat)
                            ? prev.categories.filter(c => c !== cat)
                            : [...prev.categories, cat],
                        }));
                      }}
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
              </View>
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
                      onError={(e) => {
                        console.log('Image failed to load:', profile.profileImage);
                        console.log('Error:', e.nativeEvent.error);
                        setImageLoadError(prev => ({ ...prev, profile: true }));
                      }}
                      onLoad={() => {
                        console.log('Image loaded successfully:', profile.profileImage);
                        setImageLoadError(prev => ({ ...prev, profile: false }));
                      }}
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

              {/* Sample Videos */}
              <View style={[styles.mediaSection, styles.mediaSectionLast]}>
                <Text style={styles.mediaLabel}>Sample Videos (Max 3, 50MB each)</Text>
                
                {profile.sampleVideos.map((videoUri, index) => (
                  <View key={index} style={styles.videoItem}>
                    <View style={styles.videoHeader}>
                      <Text style={styles.videoIndex}>Video {index + 1}</Text>
                      {!videoUri && (
                        <TouchableOpacity
                          style={styles.addVideoButton}
                          onPress={() => pickVideo(index)}
                        >
                          <Ionicons name="add-circle" size={24} color="#7C3AED" />
                        </TouchableOpacity>
                      )}
                    </View>
                    
                    <View style={styles.videoContainer}>
                      {renderVideoPreview(videoUri, index)}
                    </View>
                    
                    {videoUri && (
                      <TouchableOpacity
                        style={styles.replaceVideoButton}
                        onPress={() => pickVideo(index)}
                      >
                        <Text style={styles.replaceVideoText}>Replace Video</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Payment Tab */}
          {activeTab === 'payment' && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={[styles.cardIcon, { backgroundColor: '#DCFCE7' }]}>
                  <Ionicons name="wallet-outline" size={20} color="#16A34A" />
                </View>
                <Text style={styles.cardTitle}>Payment Information</Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Method</Text>
                <View style={styles.paymentMethodContainer}>
                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentInfo.paymentMethod === 'Bank' && styles.paymentMethodActive,
                    ]}
                    onPress={() => setPaymentInfo(p => ({ ...p, paymentMethod: 'Bank' }))}
                  >
                    <Ionicons
                      name="business-outline"
                      size={20}
                      color={paymentInfo.paymentMethod === 'Bank' ? '#7C3AED' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentInfo.paymentMethod === 'Bank' && styles.paymentMethodTextActive,
                      ]}
                    >
                      Bank Transfer
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.paymentMethodOption,
                      paymentInfo.paymentMethod === 'USDT' && styles.paymentMethodActive,
                    ]}
                    onPress={() => setPaymentInfo(p => ({ ...p, paymentMethod: 'USDT' }))}
                  >
                    <Ionicons
                      name="logo-bitcoin"
                      size={20}
                      color={paymentInfo.paymentMethod === 'USDT' ? '#7C3AED' : '#6B7280'}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentInfo.paymentMethod === 'USDT' && styles.paymentMethodTextActive,
                      ]}
                    >
                      USDT (Crypto)
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {paymentInfo.paymentMethod === 'Bank' ? (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Bank Name</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="business-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={paymentInfo.payBankName}
                        onChangeText={(text) => setPaymentInfo(p => ({ ...p, payBankName: text }))}
                        placeholder="e.g. GTBank"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Number</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="keypad-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={paymentInfo.payAccountNumber}
                        onChangeText={(text) => setPaymentInfo(p => ({ ...p, payAccountNumber: text }))}
                        placeholder="10-digit account number"
                        placeholderTextColor="#9CA3AF"
                        maxLength={10}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Account Name</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="person-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={paymentInfo.payAccountName}
                        onChangeText={(text) => setPaymentInfo(p => ({ ...p, payAccountName: text }))}
                        placeholder="Full account name"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>USDT Address</Text>
                    <View style={styles.inputContainer}>
                      <Ionicons name="qr-code-outline" size={18} color="#9CA3AF" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={paymentInfo.usdtAddress}
                        onChangeText={(text) => setPaymentInfo(p => ({ ...p, usdtAddress: text }))}
                        placeholder="Your USDT wallet address"
                        placeholderTextColor="#9CA3AF"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Network</Text>
                    <View style={styles.paymentMethodContainer}>
                      {['TRC20', 'BEP20', 'ERC20'].map((network) => (
                        <TouchableOpacity
                          key={network}
                          style={[
                            styles.paymentMethodOption,
                            paymentInfo.usdtNetwork === network && styles.paymentMethodActive,
                          ]}
                          onPress={() => setPaymentInfo(p => ({ ...p, usdtNetwork: network }))}
                        >
                          <Text
                            style={[
                              styles.paymentMethodText,
                              paymentInfo.usdtNetwork === network && styles.paymentMethodTextActive,
                            ]}
                          >
                            {network}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </>
              )}
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

                {pwMessage.text ? (
                  <View
                    style={[
                      styles.messageContainer,
                      pwMessage.type === 'success' ? styles.successContainer : styles.errorContainer,
                    ]}
                  >
                    <Ionicons
                      name={pwMessage.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={pwMessage.type === 'success' ? '#16A34A' : '#DC2626'}
                    />
                    <Text
                      style={[
                        styles.messageText,
                        pwMessage.type === 'success' ? styles.successText : styles.errorText,
                      ]}
                    >
                      {pwMessage.text}
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

        {/* Country Selection Modal */}
        <Modal
          visible={countryModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setCountryModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Country</Text>
                <TouchableOpacity onPress={() => setCountryModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={COUNTRIES}
                keyExtractor={(item) => item.code}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.countryItem,
                      basicInfo.country === item.code && styles.countryItemActive,
                    ]}
                    onPress={() => {
                      setBasicInfo(p => ({ ...p, country: item.code }));
                      setCountryModalVisible(false);
                    }}
                  >
                    <Text style={styles.countryItemName}>{item.name}</Text>
                    <Text style={styles.countryItemCode}>{item.code}</Text>
                    <Text style={styles.countryItemDial}>{item.dialCode}</Text>
                    {basicInfo.country === item.code && (
                      <Ionicons name="checkmark-circle" size={24} color="#16A34A" />
                    )}
                  </TouchableOpacity>
                )}
                showsVerticalScrollIndicator={false}
              />
            </View>
          </View>
        </Modal>

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
              {profile.profileImage ? (
                <Image
                  source={{ uri: profile.profileImage }}
                  style={styles.fullscreenMedia}
                  resizeMode="contain"
                  onError={(e) => console.log('Preview image error:', e.nativeEvent.error)}
                />
              ) : (
                <View style={styles.noImageContainer}>
                  <Ionicons name="image-outline" size={64} color="#FFFFFF" />
                  <Text style={styles.noImageText}>No image to display</Text>
                </View>
              )}
            </BlurView>
          </TouchableOpacity>
        </Modal>

        {/* Video Preview Modal */}
        <Modal
          visible={showVideoPreview !== null}
          transparent
          onRequestClose={() => setShowVideoPreview(null)}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill}>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowVideoPreview(null)}
              >
                <Ionicons name="close-circle" size={40} color="#FFFFFF" />
              </TouchableOpacity>
              {showVideoPreview !== null && profile.sampleVideos[showVideoPreview] && (
                <Video
                  source={{ uri: profile.sampleVideos[showVideoPreview]! }}
                  style={styles.fullscreenMedia}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  useNativeControls
                  isLooping={false}
                  onError={(error) => console.log('Video playback error:', error)}
                  onLoad={() => console.log('Video loaded successfully')}
                  onPlaybackStatusUpdate={(status) => {
                    if (status.isLoaded && status.error) {
                      console.log('Video playback error:', status.error);
                    }
                  }}
                />
              )}
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
  charCount: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'right',
    marginTop: 4,
  },
  countrySelector: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  countrySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 8,
  },
  countrySelectorText: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
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
  paymentMethodContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethodOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    gap: 8,
  },
  paymentMethodActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  paymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  paymentMethodTextActive: {
    color: '#7C3AED',
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
  videoItem: {
    marginBottom: 24,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  videoIndex: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  addVideoButton: {
    padding: 4,
  },
  videoContainer: {
    height: 160,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  videoPlaceholderText: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
  videoPreview: {
    flex: 1,
    position: 'relative',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    gap: 20,
  },
  videoPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(124,58,237,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDeleteButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDeleteSpinner: {
    marginLeft: 8,
  },
  replaceVideoButton: {
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  replaceVideoText: {
    fontSize: 12,
    color: '#7C3AED',
    fontWeight: '600',
  },
  videoUploadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  videoUploadingText: {
    color: '#7C3AED',
    fontSize: 12,
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
  noImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    padding: 20,
    marginTop: 'auto',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  countryItemActive: {
    backgroundColor: '#F0FDF4',
  },
  countryItemName: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  countryItemCode: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
  countryItemDial: {
    fontSize: 14,
    color: '#6B7280',
    marginRight: 8,
  },
});