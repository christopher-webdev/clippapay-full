// app/(dashboard_clipper)/wallet.tsx
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
  SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = 'https://clippapay.com/api';

interface Withdrawal {
  _id: string;
  amount: number;
  paymentMethod: 'bank' | 'usdt';
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  usdt_address?: string;
  usdt_network?: string;
  status: 'pending' | 'completed' | 'declined';
  declineReason?: string;
  createdAt: string;
}

export default function ClipperWalletScreen() {
  const [balance, setBalance] = useState<number>(0);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);

  // Withdrawal modal
  const [modalVisible, setModalVisible] = useState(false);
  const [wdrAmount, setWdrAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'usdt'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtNetwork, setUsdtNetwork] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Constants
  const MIN_BANK_WITHDRAWAL = 1000;
  const MIN_USDT_WITHDRAWAL = 1;
  const USDT_RATE = 1400; // ₦1500 per 1 USDT

  const getToken = async () => {
    if (Platform.OS === 'web') return await AsyncStorage.getItem('userToken');
    let token = await SecureStore.getItemAsync('userToken');
    if (!token) token = await AsyncStorage.getItem('userToken');
    return token;
  };

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const [balanceRes, withdrawalsRes] = await Promise.all([
        axios.get(`${API_BASE}/wallet`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/withdrawals`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setBalance(balanceRes.data.balance || 0);
      setWithdrawals(withdrawalsRes.data || []);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleWithdrawPress = () => {
    console.log('Withdraw button pressed', {
      balance,
      minBank: MIN_BANK_WITHDRAWAL,
      canWithdraw: balance >= MIN_BANK_WITHDRAWAL,
    });

    if (balance < MIN_BANK_WITHDRAWAL) {
      Alert.alert(
        "Can't Withdraw Yet",
        `Your balance (₦${balance}) is below the minimum withdrawal amount of ₦${MIN_BANK_WITHDRAWAL}.\n\nEarn more from campaigns to unlock withdrawals!`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setModalVisible(true);
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(wdrAmount);
    if (isNaN(amount) || amount <= 0 || amount > balance) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    if (paymentMethod === 'bank' && amount < MIN_BANK_WITHDRAWAL) {
      setErrorMsg(`Minimum bank withdrawal is ₦${MIN_BANK_WITHDRAWAL}`);
      return;
    }

    if (paymentMethod === 'usdt' && amount / USDT_RATE < MIN_USDT_WITHDRAWAL) {
      setErrorMsg(`Minimum USDT withdrawal is ${MIN_USDT_WITHDRAWAL} USDT`);
      return;
    }

    if (paymentMethod === 'bank') {
      if (!bankName || !accountNumber || !accountName) {
        setErrorMsg('Please fill in all bank details');
        return;
      }
    } else {
      if (!usdtAddress || !usdtNetwork) {
        setErrorMsg('Please provide USDT address and network');
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const payload = {
        amount,
        paymentMethod,
        ...(paymentMethod === 'bank'
          ? { bank_name: bankName, account_number: accountNumber, account_name: accountName }
          : { usdt_address: usdtAddress, usdt_network: usdtNetwork }),
      };

      await axios.post(`${API_BASE}/withdrawals`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert(
        'Request Submitted!',
        'Your withdrawal request has been sent. We’ll process it soon.',
        [{ text: 'OK' }]
      );

      setModalVisible(false);
      resetForm();
      fetchWalletData();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setWdrAmount('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setUsdtAddress('');
    setUsdtNetwork('');
    setErrorMsg(null);
  };

  const formatNaira = (num: number) => `₦${num.toLocaleString()}`;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={styles.loadingText}>Loading your wallet...</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={['#f1f1f1', '#ffffff', '#ffffffb2']} style={styles.background}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.pageTitle}>Wallet</Text>
          <Text style={styles.pageSubtitle}>Manage your earnings</Text>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <Text style={styles.cardLabel}>Available Balance</Text>
            <Text style={styles.bigAmount}>{formatNaira(balance)}</Text>
            <Text style={styles.cardSubLabel}>Ready to withdraw</Text>

            <TouchableOpacity
              style={[
                styles.withdrawBtn,
                balance < MIN_BANK_WITHDRAWAL && styles.withdrawBtnDisabled,
              ]}
              onPress={handleWithdrawPress}
              activeOpacity={0.8}
            >
              <Text style={styles.withdrawBtnText}>
                {balance < MIN_BANK_WITHDRAWAL
                  ? `Withdraw (min ₦${MIN_BANK_WITHDRAWAL})`
                  : 'Withdraw Funds'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Recent Withdrawals */}
          <View style={styles.recentSection}>
            <Text style={styles.sectionTitle}>Withdrawal History</Text>

            {withdrawals.length === 0 ? (
              <Text style={styles.emptyText}>No withdrawals yet</Text>
            ) : (
              withdrawals.map((w) => (
                <View key={w._id} style={styles.withdrawalItem}>
                  <View>
                    <Text style={styles.withdrawalAmount}>
                      {formatNaira(w.amount)}
                    </Text>
                    <Text style={styles.withdrawalDate}>
                      {new Date(w.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      w.status === 'completed'
                        ? styles.statusCompleted
                        : w.status === 'declined'
                        ? styles.statusDeclined
                        : styles.statusPending,
                    ]}
                  >
                    <Text style={styles.statusText}>
                      {w.status.charAt(0).toUpperCase() + w.status.slice(1)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Bottom padding */}
          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Withdrawal Modal */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Withdraw Funds</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <Ionicons name="close" size={28} color="#374151" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {errorMsg && (
                  <Text style={styles.errorText}>{errorMsg}</Text>
                )}

                <Text style={styles.label}>Amount (₦)</Text>
                <TextInput
                  style={styles.input}
                  value={wdrAmount}
                  onChangeText={setWdrAmount}
                  placeholder="Enter amount"
                  keyboardType="numeric"
                  autoFocus
                />

                <Text style={[styles.label, { marginTop: 20 }]}>Payment Method</Text>

                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    paymentMethod === 'bank' && styles.methodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod('bank')}
                >
                  <Ionicons name="business-outline" size={20} color="#7C3AED" />
                  <Text style={styles.methodText}>Bank Transfer</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.methodBtn,
                    paymentMethod === 'usdt' && styles.methodBtnActive,
                  ]}
                  onPress={() => setPaymentMethod('usdt')}
                >
                  <Ionicons name="logo-usd" size={20} color="#16A34A" />
                  <Text style={styles.methodText}>USDT (Crypto)</Text>
                </TouchableOpacity>

                {/* Bank Fields */}
                {paymentMethod === 'bank' && (
                  <>
                    <Text style={styles.label}>Bank Name</Text>
                    <TextInput
                      style={styles.input}
                      value={bankName}
                      onChangeText={setBankName}
                      placeholder="e.g. Zenith Bank"
                    />

                    <Text style={styles.label}>Account Number</Text>
                    <TextInput
                      style={styles.input}
                      value={accountNumber}
                      onChangeText={setAccountNumber}
                      placeholder="10-digit account number"
                      keyboardType="numeric"
                    />

                    <Text style={styles.label}>Account Name</Text>
                    <TextInput
                      style={styles.input}
                      value={accountName}
                      onChangeText={setAccountName}
                      placeholder="Account holder's name"
                    />
                  </>
                )}

                {/* USDT Fields */}
                {paymentMethod === 'usdt' && (
                  <>
                    <Text style={styles.label}>USDT Wallet Address</Text>
                    <TextInput
                      style={styles.input}
                      value={usdtAddress}
                      onChangeText={setUsdtAddress}
                      placeholder="Enter your USDT address"
                    />

                    <Text style={styles.label}>Network (TRC20 / ERC20)</Text>
                    <TextInput
                      style={styles.input}
                      value={usdtNetwork}
                      onChangeText={setUsdtNetwork}
                      placeholder="e.g. TRC20"
                    />

                    {parseFloat(wdrAmount) > 0 && (
                      <Text style={styles.usdtInfo}>
                        ≈ {(parseFloat(wdrAmount) / USDT_RATE).toFixed(6)} USDT
                      </Text>
                    )}
                  </>
                )}

                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    (parseFloat(wdrAmount) < (paymentMethod === 'bank' ? MIN_BANK_WITHDRAWAL : MIN_USDT_WITHDRAWAL * USDT_RATE) ||
                      submitting) &&
                      styles.submitDisabled,
                  ]}
                  onPress={handleWithdraw}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.submitText}>Submit Withdrawal Request</Text>
                  )}
                </TouchableOpacity>

                <Text style={styles.modalFooterText}>
                  We usually process withdrawals within 24-48 hours
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1 },
  safeArea: { flex: 1 },
  scrollContent: {
    paddingTop: 120,
    paddingHorizontal: 24,
    paddingBottom: 40,
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
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
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
  withdrawBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  withdrawBtnDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  withdrawBtnText: {
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
  withdrawalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  withdrawalAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  withdrawalDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusCompleted: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusDeclined: { backgroundColor: '#FEE2E2' },
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#6B7280',
    fontSize: 16,
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
    maxHeight: '85%',
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
    marginBottom: 16,
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
  },
  usdtInfo: {
    fontSize: 13,
    color: '#16A34A',
    marginTop: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#EF4444',
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
  modalFooterText: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});