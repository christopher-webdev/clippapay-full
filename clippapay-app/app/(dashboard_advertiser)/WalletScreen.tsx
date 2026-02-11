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
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const scale = width / 428;
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
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWalletData();
  };

  const handleDeposit = async () => {
    const amount = parseInt(depositAmount, 10);
    if (isNaN(amount) || amount < 20000) {
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
          { amount, email },
          { headers: { Authorization: `Bearer ${token}` } }
        );

        const { reference, authorization_url } = initRes.data;
        Alert.alert('Paystack Payment', `Reference: ${reference}`);
        setModalVisible(false);
        setDepositAmount('');
      } catch (err: any) {
        Alert.alert('Error', err.response?.data?.error || 'Failed to start payment');
      }
    } else {
      setModalVisible(false);
      setReceiptModalVisible(true);
    }

    setSubmitting(false);
  };

  const pickReceipt = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'We need access to your photo library to upload a receipt.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: false,
        quality: 0.85,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedReceipt(result.assets[0]);
      }
    } catch (err: any) {
      console.error('ImagePicker error:', err);
      Alert.alert('Picker Failed', 'Could not open image picker. Please try again.');
    }
  };

  const submitManualDeposit = async () => {
    const amount = parseInt(depositAmount, 10);
    if (isNaN(amount) || amount < 20000) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }
    if (!selectedReceipt) {
      Alert.alert('Missing Receipt', 'Please select a receipt image');
      return;
    }

    setSubmitting(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const formData = new FormData();
      formData.append('amount', amount.toString());
      formData.append('paymentMethod', 'bank');
      formData.append('receipt', {
        uri: selectedReceipt.uri,
        name: selectedReceipt.fileName || `receipt-${Date.now()}.jpg`,
        type: selectedReceipt.mimeType || 'image/jpeg',
      } as any);

      await axios.post(`${API_BASE}/wallet/deposits`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      Alert.alert('Success', 'Receipt uploaded! Your deposit is pending approval.');
      setReceiptModalVisible(false);
      setSelectedReceipt(null);
      setDepositAmount('');
      fetchWalletData();
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
        return { bg: '#DCFCE7', text: '#16A34A', icon: 'checkmark-circle' };
      case 'rejected':
        return { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle' };
      default:
        return { bg: '#FEF3C7', text: '#D97706', icon: 'time' };
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <LinearGradient
          colors={['#F9FAFB', '#F3F4F6']}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Loading wallet...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#F9FAFB', '#F3F4F6', '#E5E7EB']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Wallet</Text>
          <Text style={styles.subtitle}>Manage your funds and transactions</Text>
        </View>

        {/* Balance Cards */}
        <View style={styles.cardsContainer}>
          <View style={styles.balanceCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="wallet-outline" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.cardLabel}>Available Balance</Text>
            </View>
            <Text style={styles.balanceAmount}>{formatNaira(balance)}</Text>
            <TouchableOpacity
              style={styles.depositButton}
              onPress={() => setModalVisible(true)}
            >
              <LinearGradient
                colors={['#4F46E5', '#6366F1']}
                style={styles.depositGradient}
              >
                <Text style={styles.depositButtonText}>Deposit Funds</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View style={styles.escrowCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="lock-closed-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.cardLabel}>Escrow Balance</Text>
            </View>
            <Text style={[styles.balanceAmount, { color: '#D97706' }]}>
              {formatNaira(escrow)}
            </Text>
            <Text style={styles.escrowHint}>Locked in active campaigns</Text>
          </View>
        </View>

        {/* Recent Deposits */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons name="time-outline" size={20} color="#4F46E5" />
              <Text style={styles.sectionTitle}>Recent Deposits</Text>
            </View>
            <TouchableOpacity onPress={handleRefresh}>
              <Ionicons name="refresh-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {deposits.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="wallet-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No deposits yet</Text>
              <Text style={styles.emptyText}>
                Your deposit history will appear here
              </Text>
            </View>
          ) : (
            deposits.slice(0, 10).map((deposit) => {
              const config = getStatusConfig(deposit.status);
              return (
                <View key={deposit._id} style={styles.depositItem}>
                  <View style={styles.depositInfo}>
                    <View style={styles.depositIconContainer}>
                      <Ionicons name="arrow-down-circle" size={24} color="#4F46E5" />
                    </View>
                    <View>
                      <Text style={styles.depositAmount}>
                        {formatNaira(deposit.amount)}
                      </Text>
                      <Text style={styles.depositDate}>
                        {new Date(deposit.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.depositStatus, { backgroundColor: config.bg }]}>
                    <Ionicons name={config.icon as any} size={14} color={config.text} />
                    <Text style={[styles.statusText, { color: config.text }]}>
                      {deposit.status}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Deposit Method Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deposit Funds</Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Amount (₦)</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.inputCurrency}>₦</Text>
                  <TextInput
                    style={styles.input}
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    placeholder="20000"
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <Text style={styles.inputHint}>Minimum deposit: ₦20,000</Text>
              </View>

              <Text style={styles.methodLabel}>Payment Method</Text>

              <TouchableOpacity
                style={[
                  styles.methodCard,
                  depositMethod === 'paystack' && styles.methodCardActive,
                ]}
                onPress={() => setDepositMethod('paystack')}
              >
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIcon, { backgroundColor: '#EEF2FF' }]}>
                    <MaterialIcons name="payment" size={20} color="#4F46E5" />
                  </View>
                  <View>
                    <Text style={styles.methodTitle}>Paystack</Text>
                    <Text style={styles.methodDescription}>Instant payment with card or bank</Text>
                  </View>
                </View>
                {depositMethod === 'paystack' && (
                  <View style={styles.methodSelected}>
                    <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.methodCard,
                  depositMethod === 'manual' && styles.methodCardActive,
                ]}
                onPress={() => setDepositMethod('manual')}
              >
                <View style={styles.methodLeft}>
                  <View style={[styles.methodIcon, { backgroundColor: '#FEF3C7' }]}>
                    <Ionicons name="cash-outline" size={20} color="#D97706" />
                  </View>
                  <View>
                    <Text style={styles.methodTitle}>Bank Transfer</Text>
                    <Text style={styles.methodDescription}>Upload receipt after transfer</Text>
                  </View>
                </View>
                {depositMethod === 'manual' && (
                  <View style={styles.methodSelected}>
                    <Ionicons name="checkmark-circle" size={24} color="#4F46E5" />
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (isNaN(amountNum) || amountNum < 20000 || submitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleDeposit}
                disabled={isNaN(amountNum) || amountNum < 20000 || submitting}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Continue</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>

      {/* Receipt Upload Modal */}
      <Modal
        visible={receiptModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upload Receipt</Text>
              <TouchableOpacity 
                onPress={() => {
                  setReceiptModalVisible(false);
                  setSelectedReceipt(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.bankDetailsCard}>
                <View style={styles.bankHeader}>
                  <Ionicons name="business" size={20} color="#4F46E5" />
                  <Text style={styles.bankTitle}>Bank Transfer Details</Text>
                </View>
                <View style={styles.bankDetailsRow}>
                  <Text style={styles.bankDetailLabel}>Amount:</Text>
                  <Text style={styles.bankDetailValue}>₦{displayAmount}</Text>
                </View>
                <View style={styles.bankDetailsRow}>
                  <Text style={styles.bankDetailLabel}>Bank:</Text>
                  <Text style={styles.bankDetailValue}>Kuda Microfinance Bank</Text>
                </View>
                <View style={styles.bankDetailsRow}>
                  <Text style={styles.bankDetailLabel}>Account:</Text>
                  <Text style={styles.bankDetailValue}>3002830057</Text>
                </View>
                <View style={styles.bankDetailsRow}>
                  <Text style={styles.bankDetailLabel}>Account Name:</Text>
                  <Text style={styles.bankDetailValue}>Clippa Digital Hub LTD</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.uploadArea} onPress={pickReceipt}>
                <View style={styles.uploadIconContainer}>
                  <Ionicons name="cloud-upload" size={32} color="#4F46E5" />
                </View>
                <Text style={styles.uploadTitle}>Tap to upload receipt</Text>
                <Text style={styles.uploadHint}>PNG, JPG or PDF (max 5MB)</Text>
              </TouchableOpacity>

              {selectedReceipt && (
                <View style={styles.selectedFileCard}>
                  <View style={styles.fileIconContainer}>
                    <Ionicons name="document-text" size={24} color="#10B981" />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {selectedReceipt.fileName || 'receipt.jpg'}
                    </Text>
                    <Text style={styles.fileSize}>
                      {Math.round((selectedReceipt.fileSize || 0) / 1024)} KB
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setSelectedReceipt(null)}
                    style={styles.fileRemoveButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!selectedReceipt || submitting) && styles.submitButtonDisabled,
                ]}
                onPress={submitManualDeposit}
                disabled={!selectedReceipt || submitting}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit for Verification</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 120,
    paddingBottom: 100,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 32,
  },
  balanceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  escrowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  depositButton: {
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  depositGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  depositButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  escrowHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  recentSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  depositItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  depositInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  depositIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  depositAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  depositDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  depositStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    padding: 24,
  },
  inputGroup: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
  },
  inputCurrency: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  methodLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  methodCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  methodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  methodIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  methodSelected: {
    marginLeft: 12,
  },
  submitButton: {
    height: 56,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 24,
  },
  submitGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bankDetailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  bankTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  bankDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  bankDetailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  bankDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  uploadArea: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 32,
    backgroundColor: '#F9FAFB',
    marginBottom: 16,
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  uploadHint: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  fileIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#166534',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#16A34A',
  },
  fileRemoveButton: {
    padding: 4,
  },
});