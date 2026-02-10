// app/(dashboard)/wallet.tsx

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const API_BASE = 'https://clippapay.com/api';

interface Deposit {
  _id: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  receiptUrl?: string;
}

export default function WalletScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [escrow, setEscrow] = useState<number>(0);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [loading, setLoading] = useState(true);

  // Deposit flow
  const [modalVisible, setModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'paystack' | 'manual'>('paystack');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt upload
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);

  useEffect(() => {
    loadUserEmail();
    fetchWalletData();
  }, []);

  const getToken = async () => {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const loadUserEmail = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await axios.get(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEmail(res.data.email || '');
    } catch (err) {
      console.log('Could not load user email');
    }
  };

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No token');

      const [walletRes, depositsRes] = await Promise.all([
        axios.get(`${API_BASE}/wallet`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/wallet/deposits`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setBalance(walletRes.data.balance || 0);
      setEscrow(walletRes.data.escrowLocked || 0);
      setDeposits(depositsRes.data || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = async () => {
    const amt = parseInt(depositAmount, 10);
    if (isNaN(amt) || amt < 20000) {
      Alert.alert('Invalid Amount', 'Minimum deposit is ₦20,000');
      return;
    }

    setSubmitting(true);

    if (depositMethod === 'paystack') {
      if (!email) {
        Alert.alert('Error', 'Email is required for Paystack');
        setSubmitting(false);
        return;
      }

      try {
        const token = await getToken();
        const initRes = await axios.post(
          `${API_BASE}/wallet/init-paystack`,
          { amount: amt, email },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { reference, authorization_url } = initRes.data;

        Alert.alert(
          'Paystack Payment',
          `Reference: ${reference}\n\nComplete payment in the opened browser.`,
          [
            { text: 'OK', onPress: () => {
              // In real app → use expo-web-browser.openBrowserAsync(authorization_url)
              console.log('Would open:', authorization_url);
            }},
          ]
        );
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to start payment');
      }
    } else {
      // Switch to receipt upload
      setModalVisible(false);
      setReceiptModalVisible(true);
    }

    setSubmitting(false);
    fetchWalletData();
  };

  const pickReceipt = async () => {
    try {
      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'We need access to your photo library to upload a receipt.'
        );
        return;
      }

      // Launch picker - use string literals instead of enum to avoid undefined crash
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',                  // ← string 'Images' (safe fallback)
        // Alternative if enum works in your version: [ImagePicker.MediaType.Images]
        allowsEditing: false,
        quality: 0.85,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Selected asset:', asset); // ← debug: check uri, mimeType, fileName
        setSelectedReceipt(asset);
      } else {
        console.log('Picker cancelled');
      }
    } catch (err: any) {
      console.error('ImagePicker error:', err);
      Alert.alert(
        'Picker Failed',
        err.message || 'Could not open image picker. Try restarting the app.'
      );
    }
  };

  const submitManualDeposit = async () => {
    const amt = parseInt(depositAmount, 10);
    if (isNaN(amt) || amt < 20000) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }
    if (!selectedReceipt) {
      Alert.alert('Missing Receipt', 'Please select a receipt image first');
      return;
    }

    setSubmitting(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const formData = new FormData();
      formData.append('amount', amt.toString());
      formData.append('paymentMethod', 'bank');

      // Important: match what your backend expects for the file field name
      formData.append('receipt', {
        uri: selectedReceipt.uri,
        name: selectedReceipt.fileName || `receipt-${Date.now()}.jpg`,
        type: selectedReceipt.mimeType || 'image/jpeg',
      } as any);

      const response = await axios.post(`${API_BASE}/wallet/deposits`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds timeout
      });

      if (response.status === 200 || response.status === 201) {
        Alert.alert('Success', 'Receipt uploaded! Your deposit is pending approval.');
        setReceiptModalVisible(false);
        setSelectedReceipt(null);
        setDepositAmount('');
        fetchWalletData();
      } else {
        Alert.alert('Upload Failed', 'Server responded with error');
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      const msg = err.response?.data?.error || err.message || 'Failed to upload receipt';
      Alert.alert('Upload Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const formatNaira = (num: number) => `₦${num.toLocaleString()}`;

  const amountNum = parseInt(depositAmount, 10);
  const displayAmount = isNaN(amountNum) ? '0' : amountNum.toLocaleString();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (

    <LinearGradient
      colors={['#34D3991A', '#D6CF8D80', '#ffffffb2']} // very light – adjust to match design
      style={styles.background}
    >

    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.pageTitle}>Wallet</Text>
      <Text style={styles.pageSubtitle}>Manage your funds</Text>

      <View style={styles.balanceCard}>
        <Text style={styles.cardLabel}>Available Balance</Text>
        <Text style={styles.bigAmount}>{formatNaira(balance)}</Text>
        <Text style={styles.cardSubLabel}>Available Funds</Text>

        <TouchableOpacity
          style={styles.depositBtn}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.depositBtnText}>Deposit Funds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.escrowCard}>
        <Text style={styles.cardLabel}>Escrow Balance</Text>
        <Text style={[styles.bigAmount, { color: '#DC2626' }]}>
          {formatNaira(escrow)}
        </Text>
        <Text style={styles.cardSubLabel}>Locked in active campaigns</Text>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.sectionTitle}>Recent Deposits</Text>

        {deposits.length === 0 ? (
          <Text style={styles.emptyText}>No recent deposits</Text>
        ) : (
          deposits.slice(0, 10).map((dep) => (
            <View key={dep._id} style={styles.depositItem}>
              <View>
                <Text style={styles.depositAmount}>
                  {formatNaira(dep.amount)}
                </Text>
                <Text style={styles.depositDate}>
                  {new Date(dep.createdAt).toLocaleDateString()}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  dep.status === 'approved'
                    ? styles.statusApproved
                    : dep.status === 'rejected'
                    ? styles.statusRejected
                    : styles.statusPending,
                ]}
              >
                <Text style={styles.statusText}>
                  {dep.status.charAt(0).toUpperCase() + dep.status.slice(1)}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Deposit Method Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit Funds</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.label}>Amount (₦)</Text>
              <TextInput
                style={styles.input}
                value={depositAmount}
                onChangeText={setDepositAmount}
                placeholder="Minimum ₦20,000"
                keyboardType="numeric"
                autoFocus
              />

              <Text style={[styles.label, { marginTop: 20 }]}>Payment Method</Text>

              <TouchableOpacity
                style={[
                  styles.methodBtn,
                  depositMethod === 'paystack' && styles.methodBtnActive,
                ]}
                onPress={() => setDepositMethod('paystack')}
              >
                <MaterialIcons name="payment" size={20} color="#7C3AED" />
                <Text style={styles.methodText}>Pay with Paystack</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodBtn,
                  depositMethod === 'manual' && styles.methodBtnActive,
                ]}
                onPress={() => setDepositMethod('manual')}
              >
                <Ionicons name="cash-outline" size={20} color="#16A34A" />
                <Text style={styles.methodText}>Manual Bank Transfer</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (isNaN(amountNum) || amountNum < 20000) && styles.submitDisabled,
                ]}
                onPress={handleDeposit}
                disabled={submitting || isNaN(amountNum) || amountNum < 20000}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Continue</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Upload Modal */}
      <Modal
        visible={receiptModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Receipt</Text>
              <TouchableOpacity onPress={() => setReceiptModalVisible(false)}>
                <Ionicons name="close" size={28} color="#374151" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.bankDetails}>
                Transfer ₦{displayAmount} to:{'\n\n'}
                <Text style={{ fontWeight: 'bold' }}>Bank:</Text> Kuda Microfinance Bank{'\n'}
                <Text style={{ fontWeight: 'bold' }}>Account:</Text> 3002830057{'\n'}
                <Text style={{ fontWeight: 'bold' }}>Name:</Text> Clippa Digital Hub LTD
              </Text>

              <TouchableOpacity style={styles.uploadArea} onPress={pickReceipt}>
                <Ionicons name="cloud-upload-outline" size={40} color="#7C3AED" />
                <Text style={styles.uploadText}>
                  Tap to upload receipt{'\n'}
                  <Text style={{ fontSize: 13, color: '#6B7280' }}>
                    PNG, JPG or PDF (max 5MB)
                  </Text>
                </Text>
              </TouchableOpacity>

              {selectedReceipt && (
                <View style={styles.selectedFileContainer}>
                  <Ionicons name="document-text-outline" size={20} color="#16A34A" />
                  <Text style={styles.selectedFileText} numberOfLines={1}>
                    {selectedReceipt.fileName || 'receipt.jpg'}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!selectedReceipt || submitting) && styles.submitDisabled,
                ]}
                onPress={submitManualDeposit}
                disabled={submitting || !selectedReceipt}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.submitText}>Submit for Verification</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom padding */}
      <View style={{ height: 40 }} />
    </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingTop: 120, // Reduced since header is in layout
    paddingHorizontal: 24,
    paddingBottom: 20,
  },

  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
  },

  balanceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#45A145',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },

  escrowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 20,
    marginBottom: 24,
  },

  cardLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
    marginBottom: 8,
  },
  bigAmount: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
  },
  cardSubLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    marginTop: 4,
    marginBottom: 20,
  },

  depositBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  depositBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  recentSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  depositItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  depositAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  depositDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusApproved: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusRejected: { backgroundColor: '#FEE2E2' },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#9CA3AF',
    fontSize: 15,
    paddingVertical: 40,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 17,
    backgroundColor: '#F9FAFB',
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#F9FAFB',
  },
  methodBtnActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#F3E8FF',
  },
  methodText: {
    fontSize: 15,
    color: '#111827',
    marginLeft: 12,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  submitDisabled: {
    backgroundColor: '#9CA3AF',
  },
  submitText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Receipt modal styles
  bankDetails: {
    fontSize: 15,
    color: '#111827',
    lineHeight: 24,
    marginBottom: 28,
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  uploadText: {
    fontSize: 16,
    color: '#374151',
    textAlign: 'center',
    marginTop: 12,
  },
  selectedFileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 24,
  },
  selectedFileText: {
    fontSize: 14,
    color: '#166534',
    marginLeft: 8,
    flex: 1,
  },

  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});