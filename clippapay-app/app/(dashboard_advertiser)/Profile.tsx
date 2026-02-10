// app/(dashboard)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const API_BASE = 'https://clippapay.com/api';

export default function ProfileScreen() {
  // Profile states
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  // Password change states
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);

  // Delete account states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getToken = async () => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem('userToken');
    }
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const token = await getToken();
      if (!token) {
        setProfileError('Please log in again.');
        return;
      }

      const res = await axios.get(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCompanyName(res.data.company || res.data.businessName || '');
      setEmail(res.data.email || '');
      setPhoneNumber(res.data.phone || res.data.phoneNumber || '');
    } catch (err: any) {
      console.error('Profile load error:', err);
      setProfileError(
        err.response?.status === 404
          ? 'Profile data not found on server. You can still update your details.'
          : err.response?.data?.error || 'Failed to load profile.'
      );
    } finally {
      setProfileLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileError(null);
    setProfileMsg(null);

    if (!companyName.trim()) {
      setProfileError('Business name is required.');
      return;
    }

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      await axios.patch(
        `${API_BASE}/user/me`,
        {
          company: companyName,
          phone: phoneNumber,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProfileMsg('Profile updated successfully!');
      setTimeout(() => setProfileMsg(null), 4000);
    } catch (err: any) {
      setProfileError(err.response?.data?.error || 'Failed to save changes.');
    }
  };

  const handleChangePassword = async () => {
    setPwdMsg(null);
    setPwdError(null);

    if (!currentPwd || !newPwd || !confirmPwd) {
      setPwdError('All fields are required.');
      return;
    }
    if (newPwd !== confirmPwd) {
      setPwdError("New passwords don't match.");
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('Password must be at least 6 characters.');
      return;
    }

    setPwdLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      await axios.post(
        `${API_BASE}/user/change-password`,
        { oldPassword: currentPwd, newPassword: newPwd },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPwdMsg('Password changed successfully.');
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setTimeout(() => setPwdMsg(null), 3000);
    } catch (err: any) {
      setPwdError(err.response?.data?.error || 'Failed to change password.');
    } finally {
      setPwdLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteMsg(null);

    if (deleteInput.trim().toUpperCase() !== 'DELETE') {
      setDeleteMsg('You must type DELETE to confirm.');
      return;
    }

    setDeleting(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token found');

      await axios.delete(`${API_BASE}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      await SecureStore.deleteItemAsync('userToken');
      await AsyncStorage.removeItem('userToken');

      Alert.alert(
        'Account Deleted',
        'Your account and all data have been permanently removed.',
        [
          {
            text: 'OK',
            onPress: () => {
              // Redirect to login (uncomment if using expo-router)
              // router.replace('/(auth)/login');
            },
          },
        ]
      );
    } catch (err: any) {
      setDeleteMsg(err.response?.data?.error || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <LinearGradient
            colors={['#34D3991A', '#D6CF8D80', '#ffffffb2']}
            style={styles.background}
    >
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      {/* PROFILE INFORMATION SECTION */}
      <View style={styles.sectionContainer}>
        <LinearGradient
          colors={['#FFFFFF', '#F0F9FF']}
          style={styles.sectionGradient}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>👤</Text>
            </View>
            <View>
              <Text style={styles.sectionTitle}>Profile Information</Text>
              <Text style={styles.sectionSubtitle}>Update your business details</Text>
            </View>
          </View>

          {profileMsg && <Text style={styles.successMessage}>{profileMsg}</Text>}
          {profileError && <Text style={styles.errorMessage}>{profileError}</Text>}

          {profileLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#3B82F6" />
              <Text style={styles.loadingText}>Loading profile...</Text>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Business Name</Text>
                <TextInput
                  style={styles.input}
                  value={companyName}
                  onChangeText={setCompanyName}
                  placeholder="Enter business name"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={[styles.input, styles.disabledInput]}
                  value={email}
                  editable={false}
                  placeholder="Email address"
                  keyboardType="email-address"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="+234 801 234 5678"
                  keyboardType="phone-pad"
                />
              </View>

              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.buttonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          )}
        </LinearGradient>
      </View>

      {/* PASSWORD SECTION */}
      <View style={[styles.sectionContainer, styles.passwordSection]}>
        <LinearGradient
          colors={['#FFFFFF', '#F8FAFC']}
          style={styles.sectionGradient}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, styles.passwordIcon]}>
              <Text style={styles.iconText}>🔒</Text>
            </View>
            <View>
              <Text style={[styles.sectionTitle, styles.passwordTitle]}>
                Change Password
              </Text>
              <Text style={styles.sectionSubtitle}>Keep your account secure</Text>
            </View>
          </View>

          {pwdMsg && <Text style={styles.successMessage}>{pwdMsg}</Text>}
          {pwdError && <Text style={styles.errorMessage}>{pwdError}</Text>}

          <View style={styles.formContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Current Password</Text>
              <TextInput
                style={styles.input}
                value={currentPwd}
                onChangeText={setCurrentPwd}
                placeholder="Enter current password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPwd}
                onChangeText={setNewPwd}
                placeholder="Enter new password"
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Confirm New Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPwd}
                onChangeText={setConfirmPwd}
                placeholder="Confirm new password"
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, styles.passwordButton]}
              onPress={handleChangePassword}
              disabled={pwdLoading}
            >
              {pwdLoading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.buttonText}>Change Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>

      {/* DANGER ZONE */}
      <View style={[styles.sectionContainer, styles.dangerSection]}>
        <LinearGradient
          colors={['#FFF5F5', '#FEE2E2']}
          style={styles.sectionGradient}
        >
          <View style={styles.sectionHeader}>
            <View style={[styles.iconCircle, styles.dangerIcon]}>
              <Text style={styles.iconText}>⚠️</Text>
            </View>
            <View>
              <Text style={[styles.sectionTitle, styles.dangerTitle]}>
                Danger Zone
              </Text>
              <Text style={styles.sectionSubtitle}>Permanent action</Text>
            </View>
          </View>

          <Text style={styles.dangerWarning}>
            Permanently delete your account and data
          </Text>

          <View style={styles.dangerBox}>
            <Text style={styles.dangerBoxTitle}>
              <Text style={styles.dangerIconText}>!</Text> This action cannot be undone.
            </Text>
            <Text style={styles.dangerBoxText}>
              All your campaigns, transaction history, and wallet balance will be permanently deleted.{'\n\n'}
              Any funds in escrow will be processed according to our terms.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.dangerButton}
            onPress={() => setShowDeleteModal(true)}
          >
            <Text style={styles.dangerButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </LinearGradient>
      </View>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Delete Account</Text>

            <Text style={styles.modalSubtitle}>
              Permanently remove your account and data
            </Text>

            <View style={styles.modalWarningBox}>
              <Text style={styles.modalWarningTitle}>
                This action cannot be undone.
              </Text>
              <Text style={styles.modalWarningText}>
                All your campaigns, transaction history, and wallet balance will be permanently deleted.{'\n\n'}
                Any funds in escrow will be processed according to our terms.
              </Text>
            </View>

            {deleteMsg && <Text style={styles.modalError}>{deleteMsg}</Text>}

            <Text style={styles.modalInstruction}>
              Type <Text style={styles.deleteConfirmText}>DELETE</Text> below to confirm
            </Text>

            <TextInput
              style={styles.modalInput}
              value={deleteInput}
              onChangeText={setDeleteInput}
              placeholder="Type DELETE"
              editable={!deleting}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmDeleteButton]}
                onPress={handleDeleteAccount}
                disabled={deleting}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.confirmDeleteButtonText}>Delete Account</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 80 }} />
    </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 40,
    marginTop: 90,
  },

  sectionContainer: {
    borderRadius: 16,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  background: {
    flex: 1,
  },

  sectionGradient: {
    padding: 24,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },

  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },

  passwordIcon: {
    backgroundColor: '#3730A3',
  },

  dangerIcon: {
    backgroundColor: '#DC2626',
  },

  iconText: {
    fontSize: 28,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1E40AF',
  },

  passwordTitle: {
    color: '#3730A3',
  },

  dangerTitle: {
    color: '#DC2626',
  },

  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },

  formContainer: {
    marginTop: 8,
  },

  inputGroup: {
    marginBottom: 20,
  },

  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },

  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#111827',
  },

  disabledInput: {
    backgroundColor: '#F3F4F6',
    color: '#6B7280',
  },

  saveButton: {
    backgroundColor: '#1D4ED8',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },

  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 12,
  },

  passwordButton: {
    backgroundColor: '#3730A3',
  },

  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Danger Zone
  dangerSection: {
    borderColor: '#FCA5A5',
  },

  dangerWarning: {
    fontSize: 16,
    fontWeight: '600',
    color: '#991B1B',
    marginBottom: 16,
  },

  dangerBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  dangerBoxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },

  dangerIconText: {
    fontSize: 18,
  },

  dangerBoxText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },

  dangerButton: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },

  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Messages
  successMessage: {
    color: '#16A34A',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
  },

  errorMessage: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
  },

  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },

  loadingText: {
    marginLeft: 12,
    color: '#6B7280',
    fontSize: 15,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 380,
  },

  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },

  modalSubtitle: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 20,
  },

  modalWarningBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },

  modalWarningTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },

  modalWarningText: {
    fontSize: 14,
    color: '#7F1D1D',
    lineHeight: 20,
  },

  modalInstruction: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 12,
  },

  deleteConfirmText: {
    fontWeight: '800',
    color: '#DC2626',
  },

  modalInput: {
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#FEF2F2',
    marginBottom: 24,
    textAlign: 'center',
    textTransform: 'uppercase',
  },

  modalError: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'center',
  },

  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },

  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },

  cancelButton: {
    backgroundColor: '#F3F4F6',
  },

  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },

  confirmDeleteButton: {
    backgroundColor: '#DC2626',
  },

  confirmDeleteButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});