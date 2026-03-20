// app/(dashboard)/wallet.tsx (updated)

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
import * as Clipboard from 'expo-clipboard';
import { useNotificationsContext } from '../../hooks/useNotifications';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

interface PlatformDetails {
  bank: {
    name: string;
    accountNumber: string;
    accountName: string;
  };
  usdt: {
    address: string;
    network: string;
    minDeposit: number;
    minWithdrawal: number;
  };
  limits: {
    ngnMinDeposit: number;
    ngnMinWithdrawal: number;
    usdtRate: number;
  };
}

interface Deposit {
  _id: string;
  amount: number;
  currency: 'NGN' | 'USDT';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  receiptUrl?: string;
  txHash?: string;
}

interface Withdrawal {
  _id: string;
  amount: number;
  currency: 'NGN' | 'USDT';
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

export default function WalletScreen() {
  const { refresh: refreshNotifications } = useNotificationsContext();
  const [balance, setBalance] = useState<number>(0);
  const [usdtBalance, setUsdtBalance] = useState<number>(0);
  const [escrow, setEscrow] = useState<number>(0);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [platformDetails, setPlatformDetails] = useState<PlatformDetails | null>(null);
  const [loadingPlatformDetails, setLoadingPlatformDetails] = useState(true);

  // Currency selection
  const [selectedCurrency, setSelectedCurrency] = useState<'NGN' | 'USDT'>('NGN');

  // Deposit flow
  const [modalVisible, setModalVisible] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState<'paystack' | 'manual' | 'usdt'>('paystack');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Receipt upload
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);

  // USDT Deposit
  const [usdtTxHash, setUsdtTxHash] = useState('');
  const [usdtReceipt, setUsdtReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [usdtDepositModalVisible, setUsdtDepositModalVisible] = useState(false);

  // Withdrawal flow
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);
  const [wdrAmount, setWdrAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'usdt'>('bank');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [usdtAddress, setUsdtAddress] = useState('');
  const [usdtNetwork, setUsdtNetwork] = useState('');
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  // Constants (will be overridden by platform details)
  const [MIN_NGN_DEPOSIT, setMinNgnDeposit] = useState(20000);
  const [MIN_USDT_DEPOSIT, setMinUsdtDeposit] = useState(10);
  const [MIN_NGN_WITHDRAWAL, setMinNgnWithdrawal] = useState(1000);
  const [MIN_USDT_WITHDRAWAL, setMinUsdtWithdrawal] = useState(5);
  const [USDT_RATE, setUsdtRate] = useState(1500);

  useEffect(() => {
    loadUserEmail();
    fetchPlatformDetails();
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

  const fetchPlatformDetails = async () => {
    setLoadingPlatformDetails(true);
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE}/wallet/platform-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlatformDetails(res.data);
      
      // Update constants
      setMinNgnDeposit(res.data.limits.ngnMinDeposit);
      setMinNgnWithdrawal(res.data.limits.ngnMinWithdrawal);
      setMinUsdtDeposit(res.data.usdt.minDeposit);
      setMinUsdtWithdrawal(res.data.usdt.minWithdrawal);
      setUsdtRate(res.data.limits.usdtRate);
    } catch (err) {
      console.error('Failed to fetch platform details:', err);
    } finally {
      setLoadingPlatformDetails(false);
    }
  };

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      if (!token) throw new Error('No token');

      const [walletRes, depositsRes, withdrawalsRes] = await Promise.all([
        axios.get(`${API_BASE}/wallet`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/wallet/deposits`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`${API_BASE}/withdrawals`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setBalance(walletRes.data.balance || 0);
      setUsdtBalance(walletRes.data.usdtBalance || 0);
      setEscrow(walletRes.data.escrowLocked || 0);
      setDeposits(depositsRes.data || []);
      setWithdrawals(withdrawalsRes.data || []);
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

  const copyToClipboard = async (text: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied!', 'Address copied to clipboard');
  };

  // USDT Receipt picker
  const pickUsdtReceipt = async () => {
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
        setUsdtReceipt(result.assets[0]);
      }
    } catch (err: any) {
      console.error('ImagePicker error:', err);
      Alert.alert('Picker Failed', 'Could not open image picker. Please try again.');
    }
  };

  const handleDeposit = async () => {
    if (selectedCurrency === 'NGN') {
      const amount = parseInt(depositAmount, 10);
      if (isNaN(amount) || amount < MIN_NGN_DEPOSIT) {
        Alert.alert('Invalid Amount', `Minimum deposit is ₦${MIN_NGN_DEPOSIT.toLocaleString()}`);
        return;
      }

      setSubmitting(true);

      if (depositMethod === 'paystack') {
        if (!email) {
          Alert.alert('Error', 'coming soon, please use bank deposit or usdt');
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
          Alert.alert('Paystack Payment', `Reference: ${reference}\n\nComplete payment in the browser that will open.`);
          // Here you would typically open the authorization_url in a WebView
          setModalVisible(false);
          setDepositAmount('');
        } catch (err: any) {
          Alert.alert('Error', err.response?.data?.error || 'Failed to start payment');
        }
      } else {
        setModalVisible(false);
        setReceiptModalVisible(true);
      }
    } else {
      // USDT Deposit
      const amount = parseFloat(depositAmount);
      if (isNaN(amount) || amount < MIN_USDT_DEPOSIT) {
        Alert.alert('Invalid Amount', `Minimum deposit is ${MIN_USDT_DEPOSIT} USDT`);
        return;
      }
      setModalVisible(false);
      setUsdtDepositModalVisible(true);
    }

    setSubmitting(false);
  };

  const submitUSDTDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount < MIN_USDT_DEPOSIT) {
      Alert.alert('Error', 'Invalid amount');
      return;
    }
    if (!usdtTxHash.trim()) {
      Alert.alert('Missing Transaction Hash', 'Please provide the USDT transaction hash');
      return;
    }
    if (!usdtReceipt) {
      Alert.alert('Missing Receipt', 'Please upload a screenshot of the transaction');
      return;
    }

    setSubmitting(true);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const formData = new FormData();
      formData.append('amount', amount.toString());
      formData.append('txHash', usdtTxHash.trim());
      formData.append('network', platformDetails?.usdt.network || 'TRC20');
      formData.append('receipt', {
        uri: usdtReceipt.uri,
        name: usdtReceipt.fileName || `usdt-receipt-${Date.now()}.jpg`,
        type: usdtReceipt.mimeType || 'image/jpeg',
      } as any);

      await axios.post(`${API_BASE}/wallet/deposits/usdt`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });

      Alert.alert('Success', 'USDT deposit submitted! Your deposit is pending confirmation.');
      
      // Refresh notifications
      refreshNotifications();
      
      setUsdtDepositModalVisible(false);
      setUsdtTxHash('');
      setUsdtReceipt(null);
      setDepositAmount('');
      fetchWalletData();
    } catch (err: any) {
      console.error('USDT deposit error:', err);
      Alert.alert('Error', err.response?.data?.error || 'Failed to submit USDT deposit');
    } finally {
      setSubmitting(false);
    }
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
    if (isNaN(amount) || amount < MIN_NGN_DEPOSIT) {
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
      formData.append('currency', 'NGN');
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
      
      // Refresh notifications
      refreshNotifications();
      
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

  const handleWithdrawPress = () => {
    if (selectedCurrency === 'NGN' && balance < MIN_NGN_WITHDRAWAL) {
      Alert.alert(
        "Can't Withdraw Yet",
        `Your NGN balance (₦${balance.toLocaleString()}) is below the minimum withdrawal amount of ₦${MIN_NGN_WITHDRAWAL.toLocaleString()}.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    if (selectedCurrency === 'USDT' && usdtBalance < MIN_USDT_WITHDRAWAL) {
      Alert.alert(
        "Can't Withdraw Yet",
        `Your USDT balance (${usdtBalance} USDT) is below the minimum withdrawal amount of ${MIN_USDT_WITHDRAWAL} USDT.`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    setWithdrawModalVisible(true);
  };

  const handleWithdraw = async () => {
    const amount = selectedCurrency === 'NGN' 
      ? parseInt(wdrAmount, 10) 
      : parseFloat(wdrAmount);

    if (isNaN(amount) || amount <= 0) {
      setWithdrawError('Please enter a valid amount');
      return;
    }

    const maxAmount = selectedCurrency === 'NGN' ? balance : usdtBalance;
    if (amount > maxAmount) {
      setWithdrawError(`Amount exceeds your ${selectedCurrency} balance`);
      return;
    }

    if (selectedCurrency === 'NGN') {
      if (amount < MIN_NGN_WITHDRAWAL) {
        setWithdrawError(`Minimum NGN withdrawal is ₦${MIN_NGN_WITHDRAWAL}`);
        return;
      }
    } else {
      if (amount < MIN_USDT_WITHDRAWAL) {
        setWithdrawError(`Minimum USDT withdrawal is ${MIN_USDT_WITHDRAWAL} USDT`);
        return;
      }
    }

    if (selectedCurrency === 'NGN' && paymentMethod === 'bank') {
      if (!bankName || !accountNumber || !accountName) {
        setWithdrawError('Please fill in all bank details');
        return;
      }
    }

    if (selectedCurrency === 'USDT' && paymentMethod === 'usdt') {
      if (!usdtAddress || !usdtNetwork) {
        setWithdrawError('Please provide USDT address and network');
        return;
      }
    }

    setSubmitting(true);
    setWithdrawError(null);

    try {
      const token = await getToken();
      if (!token) throw new Error('No auth token');

      const payload = {
        amount,
        currency: selectedCurrency,
        paymentMethod: selectedCurrency === 'NGN' ? 'bank' : 'usdt',
        ...(selectedCurrency === 'NGN'
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

      // Refresh notifications
      refreshNotifications();

      setWithdrawModalVisible(false);
      resetWithdrawForm();
      fetchWalletData();
    } catch (err: any) {
      setWithdrawError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const resetWithdrawForm = () => {
    setWdrAmount('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
    setUsdtAddress('');
    setUsdtNetwork('');
    setWithdrawError(null);
  };

  const formatNaira = (num: number) => `₦${num.toLocaleString()}`;
  const formatUSDT = (num: number) => `${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;

  const amountNum = selectedCurrency === 'NGN' 
    ? parseInt(depositAmount, 10) 
    : parseFloat(depositAmount);
  const displayAmount = isNaN(amountNum) ? '0' : amountNum.toLocaleString();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return { bg: '#DCFCE7', text: '#16A34A', icon: 'checkmark-circle' };
      case 'rejected':
      case 'declined':
        return { bg: '#FEE2E2', text: '#DC2626', icon: 'close-circle' };
      default:
        return { bg: '#FEF3C7', text: '#D97706', icon: 'time' };
    }
  };

  if (loading || loadingPlatformDetails) {
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

        {/* Currency Selector */}
        <View style={styles.currencySelector}>
          <TouchableOpacity
            style={[styles.currencyTab, selectedCurrency === 'NGN' && styles.currencyTabActive]}
            onPress={() => setSelectedCurrency('NGN')}
          >
            <Text style={[styles.currencyTabText, selectedCurrency === 'NGN' && styles.currencyTabTextActive]}>
              NGN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.currencyTab, selectedCurrency === 'USDT' && styles.currencyTabActive]}
            onPress={() => setSelectedCurrency('USDT')}
          >
            <Text style={[styles.currencyTabText, selectedCurrency === 'USDT' && styles.currencyTabTextActive]}>
              USDT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Balance Cards */}
        <View style={styles.cardsContainer}>
          <View style={styles.balanceCard}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconContainer, { backgroundColor: '#EEF2FF' }]}>
                <Ionicons name="wallet-outline" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.cardLabel}>
                {selectedCurrency === 'NGN' ? 'Available Balance' : 'USDT Balance'}
              </Text>
            </View>
            <Text style={styles.balanceAmount}>
              {selectedCurrency === 'NGN' ? formatNaira(balance) : formatUSDT(usdtBalance)}
            </Text>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              {/* <TouchableOpacity
                style={[styles.actionButton, styles.depositAction]}
                onPress={() => {
                  setActiveTab('deposit');
                  setModalVisible(true);
                }}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  style={styles.actionGradient}
                >
                  <Text style={styles.actionButtonText}>Deposit</Text>
                </LinearGradient>
              </TouchableOpacity> */}

              <TouchableOpacity
                style={[styles.actionButton, styles.withdrawAction]}
                onPress={() => {
                  setActiveTab('withdraw');
                  handleWithdrawPress();
                }}
              >
                <LinearGradient
                  colors={['#EF4444', '#F87171']}
                  style={styles.actionGradient}
                >
                  <Text style={styles.actionButtonText}>Withdraw</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* <View style={styles.escrowCard}>
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
          </View> */}
        </View>

        {/* Tabs for Deposits/Withdrawals */}
        <View style={styles.historyTabs}>
          {/* <TouchableOpacity
            style={[styles.historyTab, activeTab === 'deposit' && styles.historyTabActive]}
            onPress={() => setActiveTab('deposit')}
          >
            <Text style={[styles.historyTabText, activeTab === 'deposit' && styles.historyTabTextActive]}>
              Deposits
            </Text>
          </TouchableOpacity> */}
          <TouchableOpacity
            style={[styles.historyTab, activeTab === 'withdraw' && styles.historyTabActive]}
            onPress={() => setActiveTab('withdraw')}
          >
            <Text style={[styles.historyTabText, activeTab === 'withdraw' && styles.historyTabTextActive]}>
              Withdrawals
            </Text>
          </TouchableOpacity>
        </View>

        {/* History List */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <Ionicons 
                name={activeTab === 'deposit' ? 'time-outline' : 'arrow-up-outline'} 
                size={20} 
                color="#4F46E5" 
              />
              <Text style={styles.sectionTitle}>
                {activeTab === 'deposit' ? 'Recent Deposits' : 'Withdrawal History'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleRefresh}>
              <Ionicons name="refresh-outline" size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {activeTab === 'deposit' && deposits.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="wallet-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No deposits yet</Text>
              <Text style={styles.emptyText}>
                Your deposit history will appear here
              </Text>
            </View>
          ) : activeTab === 'withdraw' && withdrawals.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Ionicons name="arrow-up-outline" size={32} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>No withdrawals yet</Text>
              <Text style={styles.emptyText}>
                Your withdrawal history will appear here
              </Text>
            </View>
          ) : (
            (activeTab === 'deposit' ? deposits : withdrawals).slice(0, 10).map((item) => {
              const config = getStatusConfig(item.status);
              const isDeposit = activeTab === 'deposit';
              const deposit = item as Deposit;
              const withdrawal = item as Withdrawal;
              
              return (
                <View key={item._id} style={styles.depositItem}>
                  <View style={styles.depositInfo}>
                    <View style={[styles.depositIconContainer, { backgroundColor: isDeposit ? '#EEF2FF' : '#FEE2E2' }]}>
                      <Ionicons 
                        name={isDeposit ? "arrow-down-circle" : "arrow-up-circle"} 
                        size={24} 
                        color={isDeposit ? "#4F46E5" : "#EF4444"} 
                      />
                    </View>
                    <View>
                      <Text style={styles.depositAmount}>
                        {isDeposit 
                          ? (deposit.currency === 'USDT' ? formatUSDT(deposit.amount) : formatNaira(deposit.amount))
                          : (withdrawal.currency === 'USDT' ? formatUSDT(withdrawal.amount) : formatNaira(withdrawal.amount))
                        }
                      </Text>
                      <Text style={styles.depositCurrency}>
                        {isDeposit ? deposit.currency : withdrawal.currency}
                      </Text>
                      <Text style={styles.depositDate}>
                        {new Date(item.createdAt).toLocaleDateString('en-US', {
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
                      {item.status}
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
              <Text style={styles.modalTitle}>
                Deposit {selectedCurrency}
              </Text>
              <TouchableOpacity 
                onPress={() => setModalVisible(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Amount ({selectedCurrency === 'NGN' ? '₦' : 'USDT'})
                </Text>
                <View style={styles.inputContainer}>
                  {selectedCurrency === 'NGN' && (
                    <Text style={styles.inputCurrency}>₦</Text>
                  )}
                  <TextInput
                    style={styles.input}
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    placeholder={selectedCurrency === 'NGN' ? MIN_NGN_DEPOSIT.toString() : MIN_USDT_DEPOSIT.toString()}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <Text style={styles.inputHint}>
                  Minimum: {selectedCurrency === 'NGN' ? `₦${MIN_NGN_DEPOSIT.toLocaleString()}` : `${MIN_USDT_DEPOSIT} USDT`}
                </Text>
              </View>

              {selectedCurrency === 'NGN' && (
                <>
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
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  ((selectedCurrency === 'NGN' && (isNaN(amountNum) || amountNum < MIN_NGN_DEPOSIT)) ||
                   (selectedCurrency === 'USDT' && (isNaN(amountNum) || amountNum < MIN_USDT_DEPOSIT)) ||
                   submitting) && styles.submitButtonDisabled,
                ]}
                onPress={handleDeposit}
                disabled={
                  (selectedCurrency === 'NGN' && (isNaN(amountNum) || amountNum < MIN_NGN_DEPOSIT)) ||
                  (selectedCurrency === 'USDT' && (isNaN(amountNum) || amountNum < MIN_USDT_DEPOSIT)) ||
                  submitting
                }
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

      {/* Receipt Upload Modal for NGN */}
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
                  <Text style={styles.bankDetailValue}>{platformDetails?.bank.name || 'Kuda Microfinance Bank'}</Text>
                </View>
                <View style={styles.bankDetailsRow}>
                  <Text style={styles.bankDetailLabel}>Account:</Text>
                  <Text style={styles.bankDetailValue}>{platformDetails?.bank.accountNumber || '3002830057'}</Text>
                </View>
                <View style={styles.bankDetailsRow}>
                  <Text style={styles.bankDetailLabel}>Account Name:</Text>
                  <Text style={styles.bankDetailValue}>{platformDetails?.bank.accountName || 'Clippa Digital Hub LTD'}</Text>
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

      {/* USDT Deposit Modal with Receipt Upload */}
      <Modal
        visible={usdtDepositModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUsdtDepositModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>USDT Deposit</Text>
              <TouchableOpacity 
                onPress={() => {
                  setUsdtDepositModalVisible(false);
                  setUsdtTxHash('');
                  setUsdtReceipt(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.usdtDetailsCard}>
                <View style={styles.usdtHeader}>
                  <Ionicons name="logo-usd" size={24} color="#16A34A" />
                  <Text style={styles.usdtTitle}>Send USDT to this address</Text>
                </View>

                <View style={styles.usdtAddressContainer}>
                  <Text style={styles.usdtAddressLabel}>Network: {platformDetails?.usdt.network || 'TRC20'}</Text>
                  <View style={styles.usdtAddressRow}>
                    <Text style={styles.usdtAddress} numberOfLines={1}>
                      {platformDetails?.usdt.address || 'TXmz7jY7yY9Zy9Zy9Zy9Zy9Zy9Zy9Zy9Zy9'}
                    </Text>
                    <TouchableOpacity 
                      onPress={() => copyToClipboard(platformDetails?.usdt.address || '')}
                      style={styles.copyButton}
                    >
                      <Ionicons name="copy-outline" size={20} color="#4F46E5" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.usdtWarning}>
                  <Ionicons name="alert-circle-outline" size={16} color="#D97706" />
                  <Text style={styles.usdtWarningText}>
                    Only send USDT on {platformDetails?.usdt.network || 'TRC20'} network. Sending on other networks may result in loss of funds.
                  </Text>
                </View>

                <View style={styles.usdtAmountRow}>
                  <Text style={styles.usdtAmountLabel}>Amount to send:</Text>
                  <Text style={styles.usdtAmountValue}>{displayAmount} USDT</Text>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Transaction Hash / TXID</Text>
                <TextInput
                  style={[styles.input, styles.usdtTxInput]}
                  value={usdtTxHash}
                  onChangeText={setUsdtTxHash}
                  placeholder="Enter the transaction hash from your wallet"
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
                <Text style={styles.inputHint}>
                  You'll find this in your wallet after sending USDT
                </Text>
              </View>

              {/* Receipt Upload for USDT */}
              <Text style={[styles.methodLabel, { marginTop: 16 }]}>Upload Transaction Screenshot</Text>
              
              <TouchableOpacity style={styles.uploadArea} onPress={pickUsdtReceipt}>
                <View style={styles.uploadIconContainer}>
                  <Ionicons name="cloud-upload" size={32} color="#4F46E5" />
                </View>
                <Text style={styles.uploadTitle}>Tap to upload screenshot</Text>
                <Text style={styles.uploadHint}>PNG or JPG of the transaction (max 5MB)</Text>
              </TouchableOpacity>

              {usdtReceipt && (
                <View style={styles.selectedFileCard}>
                  <View style={styles.fileIconContainer}>
                    <Ionicons name="document-text" size={24} color="#10B981" />
                  </View>
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {usdtReceipt.fileName || 'usdt-receipt.jpg'}
                    </Text>
                    <Text style={styles.fileSize}>
                      {Math.round((usdtReceipt.fileSize || 0) / 1024)} KB
                    </Text>
                  </View>
                  <TouchableOpacity 
                    onPress={() => setUsdtReceipt(null)}
                    style={styles.fileRemoveButton}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!usdtTxHash.trim() || !usdtReceipt || submitting) && styles.submitButtonDisabled,
                ]}
                onPress={submitUSDTDeposit}
                disabled={!usdtTxHash.trim() || !usdtReceipt || submitting}
              >
                <LinearGradient
                  colors={['#4F46E5', '#6366F1']}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Deposit</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.usdtNote}>
                Your deposit will be credited after {platformDetails?.usdt.network || 'TRC20'} network confirmations
              </Text>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>

      {/* Withdrawal Modal */}
      <Modal
        visible={withdrawModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setWithdrawModalVisible(false)}
      >
        <BlurView intensity={20} tint="dark" style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Withdraw {selectedCurrency}
              </Text>
              <TouchableOpacity 
                onPress={() => {
                  setWithdrawModalVisible(false);
                  resetWithdrawForm();
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {withdrawError && (
                <Text style={styles.errorText}>{withdrawError}</Text>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>
                  Amount ({selectedCurrency === 'NGN' ? '₦' : 'USDT'})
                </Text>
                <View style={styles.inputContainer}>
                  {selectedCurrency === 'NGN' && (
                    <Text style={styles.inputCurrency}>₦</Text>
                  )}
                  <TextInput
                    style={styles.input}
                    value={wdrAmount}
                    onChangeText={setWdrAmount}
                    placeholder={selectedCurrency === 'NGN' ? MIN_NGN_WITHDRAWAL.toString() : MIN_USDT_WITHDRAWAL.toString()}
                    keyboardType="numeric"
                    placeholderTextColor="#9CA3AF"
                  />
                </View>
                <Text style={styles.inputHint}>
                  Available: {selectedCurrency === 'NGN' ? formatNaira(balance) : formatUSDT(usdtBalance)}
                </Text>
                <Text style={styles.inputHint}>
                  Minimum: {selectedCurrency === 'NGN' ? `₦${MIN_NGN_WITHDRAWAL}` : `${MIN_USDT_WITHDRAWAL} USDT`}
                </Text>
              </View>

              {selectedCurrency === 'NGN' ? (
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
                    maxLength={10}
                  />

                  <Text style={styles.label}>Account Name</Text>
                  <TextInput
                    style={styles.input}
                    value={accountName}
                    onChangeText={setAccountName}
                    placeholder="Account holder's name"
                  />
                </>
              ) : (
                <>
                  <Text style={styles.label}>USDT Wallet Address</Text>
                  <TextInput
                    style={styles.input}
                    value={usdtAddress}
                    onChangeText={setUsdtAddress}
                    placeholder="Enter your USDT address"
                  />

                  <Text style={styles.label}>Network (TRC20 / ERC20 / BEP20)</Text>
                  <TextInput
                    style={styles.input}
                    value={usdtNetwork}
                    onChangeText={setUsdtNetwork}
                    placeholder="e.g. TRC20"
                  />
                </>
              )}

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (submitting || 
                   (selectedCurrency === 'NGN' 
                     ? (parseInt(wdrAmount) < MIN_NGN_WITHDRAWAL || !bankName || !accountNumber || !accountName)
                     : (parseFloat(wdrAmount) < MIN_USDT_WITHDRAWAL || !usdtAddress || !usdtNetwork))) && 
                  styles.submitButtonDisabled,
                ]}
                onPress={handleWithdraw}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#EF4444', '#F87171']}
                  style={styles.submitGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.submitButtonText}>Submit Withdrawal Request</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.modalFooterText}>
                Withdrawals are processed within 24-48 hours
              </Text>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

// Keep all the existing styles from the original WalletScreen
const styles = StyleSheet.create({
  // ... (all the styles from the original WalletScreen)
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
  currencySelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
  },
  currencyTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  currencyTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  currencyTabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  currencyTabTextActive: {
    color: '#4F46E5',
  },
  cardsContainer: {
    gap: 16,
    marginBottom: 24,
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
    fontSize: 32,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 16,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    overflow: 'hidden',
  },
  depositAction: {
    marginRight: 6,
  },
  withdrawAction: {
    marginLeft: 6,
  },
  actionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  escrowHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
  },
  historyTabs: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  historyTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  historyTabActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  historyTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  historyTabTextActive: {
    color: '#4F46E5',
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
    marginBottom: 2,
  },
  depositCurrency: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
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
  usdtDetailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  usdtHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  usdtTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  usdtAddressContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  usdtAddressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  usdtAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usdtAddress: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginRight: 8,
  },
  copyButton: {
    padding: 4,
  },
  usdtWarning: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  usdtWarningText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
  },
  usdtAmountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  usdtAmountLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  usdtAmountValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#16A34A',
  },
  usdtTxInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  usdtNote: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  modalFooterText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
});