// app/(dashboard_advertiser)/WalletScreen.tsx
//
// Full redesign. Key fixes:
//  1. Shows BOTH escrowLocked (NGN) AND usdtEscrowLocked (USDT) — not just NGN
//  2. Dual-currency balance cards shown simultaneously (no hidden tabs)
//  3. Escrow card explains it runs down as creators/clippers earn
//  4. Transaction history merges deposits + withdrawals + transactions, all currencies
//
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, Alert, Platform,
  Dimensions, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import axios from 'axios';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const scale = width / 428;
const API_BASE = process.env.EXPO_PUBLIC_API_URL;

// ─── Types ────────────────────────────────────────────────────────────────────
interface WalletData {
  balance: number;
  usdtBalance: number;
  escrowLocked: number;
  usdtEscrowLocked: number;
}
interface PlatformDetails {
  bank: { name: string; accountNumber: string; accountName: string };
  usdt: { address: string; network: string; minDeposit: number; minWithdrawal: number };
  limits: { ngnMinDeposit: number; ngnMinWithdrawal: number; usdtRate: number };
}
interface TxItem {
  _id: string; type: string; amount: number;
  currency: 'NGN' | 'USDT'; status: string;
  description?: string; createdAt: string;
}
interface Deposit {
  _id: string; amount: number; currency: 'NGN' | 'USDT';
  status: 'pending' | 'approved' | 'rejected'; createdAt: string;
}
interface Withdrawal {
  _id: string; amount: number; currency: 'NGN' | 'USDT';
  status: 'pending' | 'completed' | 'declined'; createdAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtNGN  = (n: number) => `₦${n.toLocaleString('en-NG', { minimumFractionDigits: 0 })}`;
const fmtUSDT = (n: number) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmt     = (n: number, cur: 'NGN' | 'USDT') => cur === 'NGN' ? fmtNGN(n) : fmtUSDT(n);

const TX_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  deposit:          { icon: 'arrow-down-circle', color: '#10B981', bg: '#ECFDF5' },
  campaign_funding: { icon: 'lock-closed',       color: '#F59E0B', bg: '#FFFBEB' },
  escrow:           { icon: 'lock-closed',       color: '#F59E0B', bg: '#FFFBEB' },
  escrow_release:   { icon: 'lock-open',         color: '#6366F1', bg: '#EEF2FF' },
  clipping_reward:  { icon: 'trending-up',       color: '#10B981', bg: '#ECFDF5' },
  withdrawal:       { icon: 'arrow-up-circle',   color: '#EF4444', bg: '#FEF2F2' },
  payment:          { icon: 'cash',              color: '#8B5CF6', bg: '#F5F3FF' },
  refund:           { icon: 'refresh',           color: '#06B6D4', bg: '#ECFEFF' },
};
const txIcon = (type: string) => TX_ICONS[type] || { icon: 'swap-horizontal', color: '#6B7280', bg: '#F3F4F6' };

const getToken = async () => {
  if (Platform.OS === 'web') return AsyncStorage.getItem('userToken');
  return (await SecureStore.getItemAsync('userToken')) || (await AsyncStorage.getItem('userToken'));
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function WalletScreen() {
  const [wallet, setWallet]             = useState<WalletData>({ balance: 0, usdtBalance: 0, escrowLocked: 0, usdtEscrowLocked: 0 });
  const [platform, setPlatform]         = useState<PlatformDetails | null>(null);
  const [deposits, setDeposits]         = useState<Deposit[]>([]);
  const [withdrawals, setWithdrawals]   = useState<Withdrawal[]>([]);
  const [transactions, setTransactions] = useState<TxItem[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [historyTab, setHistoryTab]     = useState<'all' | 'deposits' | 'withdrawals'>('all');

  // Deposit modal state
  const [depositModal, setDepositModal] = useState(false);
  const [depositCur, setDepositCur]     = useState<'NGN' | 'USDT'>('NGN');
  const [depositAmt, setDepositAmt]     = useState('');
  const [receipt, setReceipt]           = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [txHash, setTxHash]             = useState('');
  const [submitting, setSubmitting]     = useState(false);

  // Withdraw modal state
  const [wdrModal, setWdrModal]         = useState(false);
  const [wdrCur, setWdrCur]             = useState<'NGN' | 'USDT'>('NGN');
  const [wdrAmt, setWdrAmt]             = useState('');
  const [bankName, setBankName]         = useState('');
  const [accNum, setAccNum]             = useState('');
  const [accName, setAccName]           = useState('');
  const [wdrAddr, setWdrAddr]           = useState('');
  const [wdrNet, setWdrNet]             = useState('');
  const [wdrErr, setWdrErr]             = useState('');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const token = await getToken();
      if (!token) return;
      const h = { Authorization: `Bearer ${token}` };

      const [walletRes, depositsRes, wdrRes, txRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/wallet`, { headers: h }),
        axios.get(`${API_BASE}/wallet/deposits`, { headers: h }),
        axios.get(`${API_BASE}/withdrawals`, { headers: h }),
        axios.get(`${API_BASE}/transactions`, { headers: h }),
      ]);

      if (walletRes.status === 'fulfilled') {
        const d = walletRes.value.data;
        setWallet({
          balance:          d.balance          || 0,
          usdtBalance:      d.usdtBalance      || 0,
          escrowLocked:     d.escrowLocked     || 0,
          usdtEscrowLocked: d.usdtEscrowLocked || 0,
        });
      }
      if (depositsRes.status === 'fulfilled')  setDeposits(depositsRes.value.data  || []);
      if (wdrRes.status === 'fulfilled')        setWithdrawals(wdrRes.value.data    || []);
      if (txRes.status === 'fulfilled')         setTransactions(txRes.value.data    || []);
    } catch (e) {
      console.error('wallet load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadPlatform = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_BASE}/wallet/platform-details`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlatform(res.data);
    } catch (_) {}
  }, []);

  useEffect(() => { load(); loadPlatform(); }, []);

  // ── Deposit ──────────────────────────────────────────────────────────────
  const pickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission required'); return; }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'Images' as any, quality: 0.85 });
    if (!r.canceled && r.assets[0]) setReceipt(r.assets[0]);
  };

  const submitDeposit = async () => {
    const amt = depositCur === 'NGN' ? parseInt(depositAmt) : parseFloat(depositAmt);
    const min = depositCur === 'NGN' ? (platform?.limits.ngnMinDeposit || 1000) : (platform?.usdt.minDeposit || 10);
    if (!amt || amt < min) { Alert.alert('Invalid amount', `Minimum: ${depositCur === 'NGN' ? fmtNGN(min) : `$${min} USDT`}`); return; }
    if (!receipt) { Alert.alert('Receipt required', 'Attach your payment receipt or screenshot'); return; }
    if (depositCur === 'USDT' && !txHash.trim()) { Alert.alert('TX Hash required', 'Paste your transaction hash'); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      const form = new FormData();
      form.append('amount', amt.toString());
      form.append('currency', depositCur);
      form.append('paymentMethod', depositCur === 'NGN' ? 'bank_transfer' : 'usdt');
      form.append('receipt', { uri: receipt.uri, name: receipt.fileName || 'receipt.jpg', type: receipt.mimeType || 'image/jpeg' } as any);
      if (depositCur === 'USDT') { form.append('txHash', txHash.trim()); form.append('network', platform?.usdt.network || 'TRC20'); }

      await axios.post(`${API_BASE}/wallet/deposits`, form, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        timeout: 30000,
      });

      Alert.alert('✅ Submitted!', 'Your deposit is pending admin approval.');
      setDepositModal(false); setDepositAmt(''); setReceipt(null); setTxHash('');
      load(true);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.error || 'Could not submit deposit');
    } finally { setSubmitting(false); }
  };

  // ── Withdraw ─────────────────────────────────────────────────────────────
  const submitWithdrawal = async () => {
    setWdrErr('');
    const amt   = wdrCur === 'NGN' ? parseInt(wdrAmt) : parseFloat(wdrAmt);
    const avail = wdrCur === 'NGN' ? wallet.balance : wallet.usdtBalance;
    const minW  = wdrCur === 'NGN' ? (platform?.limits.ngnMinWithdrawal || 500) : (platform?.usdt.minWithdrawal || 5);

    if (!amt || isNaN(amt) || amt <= 0) { setWdrErr('Enter a valid amount'); return; }
    if (amt > avail) { setWdrErr(`Exceeds your available ${wdrCur} balance`); return; }
    if (amt < minW)  { setWdrErr(`Minimum: ${wdrCur === 'NGN' ? fmtNGN(minW) : `$${minW}`}`); return; }
    if (wdrCur === 'NGN' && (!bankName || !accNum || !accName)) { setWdrErr('Fill in all bank details'); return; }
    if (wdrCur === 'USDT' && (!wdrAddr || !wdrNet)) { setWdrErr('Fill in USDT address and network'); return; }

    setSubmitting(true);
    try {
      const token = await getToken();
      await axios.post(`${API_BASE}/withdrawals`, {
        amount: amt, currency: wdrCur,
        paymentMethod: wdrCur === 'NGN' ? 'bank' : 'usdt',
        ...(wdrCur === 'NGN'
          ? { bank_name: bankName, account_number: accNum, account_name: accName }
          : { usdt_address: wdrAddr, usdt_network: wdrNet }),
      }, { headers: { Authorization: `Bearer ${token}` } });

      Alert.alert('✅ Request submitted', "We'll process within 24–48 hours.");
      setWdrModal(false); setWdrAmt(''); setBankName(''); setAccNum(''); setAccName(''); setWdrAddr(''); setWdrNet('');
      load(true);
    } catch (e: any) {
      setWdrErr(e.response?.data?.error || 'Could not submit withdrawal');
    } finally { setSubmitting(false); }
  };

  // ── History list ─────────────────────────────────────────────────────────
  const historyItems = (() => {
    if (historyTab === 'deposits')    return deposits.map((d) => ({ ...d, _kind: 'deposit'    as const }));
    if (historyTab === 'withdrawals') return withdrawals.map((w) => ({ ...w, _kind: 'withdrawal' as const }));
    const merged = [
      ...transactions.map((t) => ({ ...t, _kind: 'tx' as const })),
      ...deposits.map((d) => ({ ...d, type: 'deposit', _kind: 'deposit' as const })),
      ...withdrawals.map((w) => ({ ...w, type: 'withdrawal', _kind: 'withdrawal' as const })),
    ];
    const seen = new Set<string>();
    return merged
      .filter((x) => { if (seen.has(x._id)) return false; seen.add(x._id); return true; })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 30);
  })();

  const statusColor = (s: string) =>
    ['approved', 'completed'].includes(s) ? '#10B981'
    : ['rejected', 'declined'].includes(s) ? '#EF4444'
    : '#F59E0B';

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F5F7' }}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={{ color: '#6B7280', marginTop: 12, fontWeight: '500' }}>Loading wallet…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F5F7' }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor="#4F46E5" />}
      >
        {/* ── Hero gradient header ── */}
        <LinearGradient colors={['#312E81', '#4338CA', '#4F46E5']} style={S.hero}>
          <Text style={S.heroTitle}>My Wallet</Text>
          <Text style={S.heroSub}>Campaign budgets & available funds</Text>

          {/* Side-by-side balance cards */}
          <View style={S.balanceRow}>
            <BalanceCard
              label="NGN Balance"
              amount={fmtNGN(wallet.balance)}
              sub={`${fmtNGN(wallet.escrowLocked)} in escrow`}
              iconName="cash"
              accentColor="#6EE7B7"
              subColor="#A7F3D0"
              onDeposit={() => { setDepositCur('NGN'); setDepositModal(true); }}
              onWithdraw={() => { setWdrCur('NGN'); setWdrModal(true); }}
            />
            <View style={{ width: 12 }} />
            <BalanceCard
              label="USDT Balance"
              amount={fmtUSDT(wallet.usdtBalance)}
              sub={`$${wallet.usdtEscrowLocked.toFixed(2)} in escrow`}
              iconName="logo-bitcoin"
              accentColor="#FCD34D"
              subColor="#FDE68A"
              onDeposit={() => { setDepositCur('USDT'); setDepositModal(true); }}
              onWithdraw={() => { setWdrCur('USDT'); setWdrModal(true); }}
            />
          </View>
        </LinearGradient>

        {/* ── Escrow breakdown ── */}
        {(wallet.escrowLocked > 0 || wallet.usdtEscrowLocked > 0) && (
          <View style={S.escrowCard}>
            <View style={S.escrowHeader}>
              <View style={S.escrowIconWrap}>
                <Ionicons name="lock-closed" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={S.escrowTitle}>Campaign Escrow</Text>
                <Text style={S.escrowSub}>Runs down as creators & clippers earn</Text>
              </View>
            </View>

            <View style={S.escrowChipsRow}>
              {wallet.escrowLocked > 0 && (
                <View style={S.escrowChip}>
                  <Text style={S.escrowChipLabel}>NGN Locked</Text>
                  <Text style={S.escrowChipAmt}>{fmtNGN(wallet.escrowLocked)}</Text>
                </View>
              )}
              {wallet.usdtEscrowLocked > 0 && (
                <View style={[S.escrowChip, { backgroundColor: '#FFFDE7', borderColor: '#FFF176' }]}>
                  <Text style={S.escrowChipLabel}>USDT Locked</Text>
                  <Text style={[S.escrowChipAmt, { color: '#B45309' }]}>{fmtUSDT(wallet.usdtEscrowLocked)}</Text>
                </View>
              )}
            </View>

            <View style={S.escrowInfoRow}>
              <Ionicons name="information-circle-outline" size={14} color="#92400E" />
              <Text style={S.escrowInfoTxt}>
                When you fund a campaign, the budget is locked here. Each time admin approves a creator's work, that amount is deducted and paid to the creator. Remaining escrow is refunded if you cancel a campaign.
              </Text>
            </View>
          </View>
        )}

        {/* ── Transaction history ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Transaction History</Text>

          <View style={S.historyTabs}>
            {(['all', 'deposits', 'withdrawals'] as const).map((t) => (
              <TouchableOpacity key={t} style={[S.hTab, historyTab === t && S.hTabActive]} onPress={() => setHistoryTab(t)}>
                <Text style={[S.hTabTxt, historyTab === t && S.hTabTxtActive]}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {historyItems.length === 0 ? (
            <View style={S.empty}>
              <MaterialCommunityIcons name="receipt-outline" size={48} color="#D1D5DB" />
              <Text style={S.emptyTxt}>No transactions yet</Text>
            </View>
          ) : (
            historyItems.map((item: any) => {
              const ic = txIcon(item.type || 'payment');
              const isCredit = ['deposit', 'clipping_reward', 'escrow_release', 'refund'].includes(item.type);
              const cur: 'NGN' | 'USDT' = item.currency || 'NGN';
              return (
                <View key={item._id} style={S.txRow}>
                  <View style={[S.txIcon, { backgroundColor: ic.bg }]}>
                    <Ionicons name={ic.icon as any} size={20} color={ic.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={S.txDesc} numberOfLines={1}>
                      {item.description || (item.type || 'Transaction').replace(/_/g, ' ')}
                    </Text>
                    <Text style={S.txDate}>
                      {new Date(item.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 3 }}>
                    <Text style={[S.txAmt, { color: isCredit ? '#10B981' : '#EF4444' }]}>
                      {isCredit ? '+' : '-'}{fmt(item.amount, cur)}
                    </Text>
                    <View style={[S.txStatusPill, { backgroundColor: `${statusColor(item.status)}18` }]}>
                      <Text style={[S.txStatusTxt, { color: statusColor(item.status) }]}>{item.status}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ════════════════════════════════════════════════════════
          DEPOSIT MODAL
      ════════════════════════════════════════════════════════ */}
      <Modal visible={depositModal} animationType="slide" transparent onRequestClose={() => setDepositModal(false)}>
        <BlurView intensity={20} tint="dark" style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.mHdr}>
              <Text style={S.mTitle}>Deposit Funds</Text>
              <TouchableOpacity style={S.mClose} onPress={() => setDepositModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {/* Currency */}
              <Text style={S.mLabel}>Currency</Text>
              <View style={S.toggle}>
                {(['NGN', 'USDT'] as const).map((c) => (
                  <TouchableOpacity key={c} style={[S.toggleBtn, depositCur === c && S.toggleBtnActive]} onPress={() => setDepositCur(c)}>
                    <Text style={[S.toggleTxt, depositCur === c && S.toggleTxtActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={S.mLabel}>Amount</Text>
              <View style={S.inputRow}>
                <Text style={S.inputPrefix}>{depositCur === 'NGN' ? '₦' : '$'}</Text>
                <TextInput
                  style={S.bigInput}
                  value={depositAmt}
                  onChangeText={setDepositAmt}
                  keyboardType="numeric"
                  placeholder={depositCur === 'NGN' ? '20,000' : '10'}
                  placeholderTextColor="#9CA3AF"
                />
              </View>
              <Text style={S.mHint}>Min: {depositCur === 'NGN' ? fmtNGN(platform?.limits.ngnMinDeposit || 1000) : `$${platform?.usdt.minDeposit || 10} USDT`}</Text>

              {/* Payment details */}
              {depositCur === 'NGN' && platform && (
                <View style={S.detailCard}>
                  <Text style={S.detailCardTitle}>Transfer to this account first</Text>
                  {[['Bank', platform.bank.name], ['Account No.', platform.bank.accountNumber], ['Name', platform.bank.accountName]].map(([l, v]) => (
                    <View key={l} style={S.detailRow}>
                      <Text style={S.detailLbl}>{l}</Text>
                      <Text style={S.detailVal}>{v}</Text>
                    </View>
                  ))}
                </View>
              )}

              {depositCur === 'USDT' && platform && (
                <View style={S.detailCard}>
                  <Text style={S.detailCardTitle}>Send USDT ({platform.usdt.network}) to:</Text>
                  <View style={S.addrRow}>
                    <Text style={S.addrTxt} numberOfLines={1}>{platform.usdt.address}</Text>
                    <TouchableOpacity onPress={() => { Clipboard.setStringAsync(platform.usdt.address); Alert.alert('Copied!'); }}>
                      <Ionicons name="copy-outline" size={18} color="#4F46E5" />
                    </TouchableOpacity>
                  </View>
                  <View style={S.warningRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
                    <Text style={S.warningTxt}>Only send on {platform.usdt.network}. Wrong network = lost funds.</Text>
                  </View>

                  <Text style={[S.mLabel, { marginTop: 14 }]}>Transaction Hash (TXID) *</Text>
                  <TextInput
                    style={S.txHashInput}
                    value={txHash}
                    onChangeText={setTxHash}
                    placeholder="Paste transaction hash from your wallet"
                    placeholderTextColor="#9CA3AF"
                    multiline
                  />
                </View>
              )}

              {/* Receipt */}
              <Text style={[S.mLabel, { marginTop: 16 }]}>
                {depositCur === 'NGN' ? 'Upload Bank Receipt *' : 'Upload Screenshot *'}
              </Text>
              <TouchableOpacity style={S.uploadBox} onPress={pickReceipt}>
                <Ionicons name={receipt ? 'checkmark-circle' : 'cloud-upload-outline'} size={28} color={receipt ? '#10B981' : '#4F46E5'} />
                <Text style={[S.uploadTxt, receipt && { color: '#10B981' }]}>
                  {receipt ? (receipt.fileName || 'File attached ✓') : 'Tap to attach'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={[S.submitBtn, submitting && { opacity: 0.6 }]} onPress={submitDeposit} disabled={submitting}>
                <LinearGradient colors={['#4338CA', '#4F46E5']} style={S.submitGrad}>
                  {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={S.submitTxt}>Submit Deposit Request</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>

      {/* ════════════════════════════════════════════════════════
          WITHDRAWAL MODAL
      ════════════════════════════════════════════════════════ */}
      <Modal visible={wdrModal} animationType="slide" transparent onRequestClose={() => setWdrModal(false)}>
        <BlurView intensity={20} tint="dark" style={S.overlay}>
          <View style={S.sheet}>
            <View style={S.handle} />
            <View style={S.mHdr}>
              <Text style={S.mTitle}>Withdraw Funds</Text>
              <TouchableOpacity style={S.mClose} onPress={() => setWdrModal(false)}>
                <Ionicons name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 20 }} showsVerticalScrollIndicator={false}>
              {wdrErr ? <Text style={S.errTxt}>{wdrErr}</Text> : null}

              <Text style={S.mLabel}>Currency</Text>
              <View style={S.toggle}>
                {(['NGN', 'USDT'] as const).map((c) => (
                  <TouchableOpacity key={c} style={[S.toggleBtn, wdrCur === c && S.toggleBtnActive]} onPress={() => setWdrCur(c)}>
                    <Text style={[S.toggleTxt, wdrCur === c && S.toggleTxtActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={S.mLabel}>Amount</Text>
              <View style={S.inputRow}>
                <Text style={S.inputPrefix}>{wdrCur === 'NGN' ? '₦' : '$'}</Text>
                <TextInput style={S.bigInput} value={wdrAmt} onChangeText={setWdrAmt} keyboardType="numeric" placeholder="0" placeholderTextColor="#9CA3AF" />
              </View>
              <Text style={S.mHint}>Available: {wdrCur === 'NGN' ? fmtNGN(wallet.balance) : fmtUSDT(wallet.usdtBalance)}</Text>

              {wdrCur === 'NGN' ? (
                <>
                  {([['Bank Name', bankName, setBankName, 'e.g. Zenith Bank', 'default'],
                     ['Account Number', accNum, setAccNum, '10-digit number', 'numeric'],
                     ['Account Name', accName, setAccName, 'Account holder name', 'default']] as any[]).map(([lbl, val, setter, ph, kb]) => (
                    <View key={lbl} style={{ marginTop: 14 }}>
                      <Text style={S.mLabel}>{lbl}</Text>
                      <TextInput style={S.fieldInput} value={val} onChangeText={setter} placeholder={ph} placeholderTextColor="#9CA3AF" keyboardType={kb} />
                    </View>
                  ))}
                </>
              ) : (
                <>
                  <View style={{ marginTop: 14 }}>
                    <Text style={S.mLabel}>USDT Wallet Address</Text>
                    <TextInput style={S.fieldInput} value={wdrAddr} onChangeText={setWdrAddr} placeholder="Your USDT address" placeholderTextColor="#9CA3AF" />
                  </View>
                  <View style={{ marginTop: 14 }}>
                    <Text style={S.mLabel}>Network</Text>
                    <TextInput style={S.fieldInput} value={wdrNet} onChangeText={setWdrNet} placeholder="TRC20 / ERC20 / BEP20" placeholderTextColor="#9CA3AF" />
                  </View>
                </>
              )}

              <TouchableOpacity style={[S.submitBtn, { marginTop: 24 }, submitting && { opacity: 0.6 }]} onPress={submitWithdrawal} disabled={submitting}>
                <LinearGradient colors={['#DC2626', '#EF4444']} style={S.submitGrad}>
                  {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={S.submitTxt}>Submit Withdrawal</Text>}
                </LinearGradient>
              </TouchableOpacity>
              <Text style={S.footerNote}>Processed within 24–48 hours</Text>
            </ScrollView>
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

// ─── BalanceCard sub-component ────────────────────────────────────────────────
function BalanceCard({ label, amount, sub, iconName, accentColor, subColor, onDeposit, onWithdraw }: {
  label: string; amount: string; sub: string; iconName: string;
  accentColor: string; subColor: string; onDeposit: () => void; onWithdraw: () => void;
}) {
  return (
    <View style={BC.card}>
      <View style={BC.topRow}>
        <Ionicons name={iconName as any} size={14} color={accentColor} />
        <Text style={[BC.label, { color: accentColor }]}>{label}</Text>
      </View>
      <Text style={BC.amount} numberOfLines={1} adjustsFontSizeToFit>{amount}</Text>
      <Text style={[BC.sub, { color: subColor }]} numberOfLines={1}>{sub}</Text>
      <View style={BC.btnRow}>
        <TouchableOpacity style={BC.fundBtn} onPress={onDeposit}>
          <Ionicons name="add" size={13} color="#FFF" />
          <Text style={BC.fundTxt}>Fund</Text>
        </TouchableOpacity>
        <TouchableOpacity style={BC.wdrBtn} onPress={onWithdraw}>
          <Ionicons name="arrow-up" size={13} color="#4338CA" />
          <Text style={BC.wdrTxt}>Withdraw</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const BC = StyleSheet.create({
  card:    { flex: 1, backgroundColor: 'rgba(255,255,255,0.13)', borderRadius: 18, padding: 14,},
  topRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 6 },
  label:   { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  amount:  { fontSize: 19, fontWeight: '800', color: '#FFF', marginBottom: 3 },
  sub:     { fontSize: 10, marginBottom: 14 },
  btnRow:  { flexDirection: 'row', gap: 7 },
  fundBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 9, paddingVertical: 8 },
  fundTxt: { fontSize: 12, fontWeight: '700', color: '#FFF' },
  wdrBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 9, paddingVertical: 8 },
  wdrTxt:  { fontSize: 12, fontWeight: '700', color: '#4338CA' },
});

const S = StyleSheet.create({
  hero:       { paddingTop: 60, paddingBottom: 28, paddingHorizontal: 20 },
  heroTitle:  { fontSize: 26, fontWeight: '800', color: '#FFF', marginBottom: 3 },
  heroSub:    { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 22 },
  balanceRow: { flexDirection: 'row' },

  escrowCard:     { margin: 16, marginTop: 16, backgroundColor: '#FFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  escrowHeader:   { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  escrowIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  escrowTitle:    { fontSize: 15, fontWeight: '700', color: '#111827' },
  escrowSub:      { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  escrowChipsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  escrowChip:     { flex: 1, backgroundColor: '#FEF3C7', borderWidth: 1, borderColor: '#FDE68A', borderRadius: 12, padding: 12, alignItems: 'center' },
  escrowChipLabel:{ fontSize: 11, fontWeight: '600', color: '#92400E' },
  escrowChipAmt:  { fontSize: 18, fontWeight: '800', color: '#D97706', marginTop: 4 },
  escrowInfoRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFFBEB', borderRadius: 10, padding: 10 },
  escrowInfoTxt:  { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 17 },

  section:      { margin: 16, backgroundColor: '#FFF', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 14 },

  historyTabs:   { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3, marginBottom: 16 },
  hTab:          { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  hTabActive:    { backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  hTabTxt:       { fontSize: 13, fontWeight: '500', color: '#6B7280' },
  hTabTxtActive: { color: '#4F46E5', fontWeight: '700' },

  empty:    { alignItems: 'center', paddingVertical: 32, gap: 10 },
  emptyTxt: { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },

  txRow:      { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F9FAFB', gap: 12 },
  txIcon:     { width: 42, height: 42, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
  txDesc:     { fontSize: 13, fontWeight: '600', color: '#1F2937', textTransform: 'capitalize' },
  txDate:     { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  txAmt:      { fontSize: 14, fontWeight: '700' },
  txStatusPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  txStatusTxt:  { fontSize: 10, fontWeight: '600', textTransform: 'capitalize' },

  // Modals
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  sheet:    { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '92%' },
  handle:   { width: 40, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 4 },
  mHdr:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  mTitle:   { fontSize: 18, fontWeight: '800', color: '#111827' },
  mClose:   { width: 34, height: 34, borderRadius: 17, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
  mLabel:   { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 8 },
  mHint:    { fontSize: 11, color: '#9CA3AF', marginTop: 5, marginBottom: 4 },

  toggle:         { flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 10, padding: 3, marginBottom: 18 },
  toggleBtn:      { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 8 },
  toggleBtnActive:{ backgroundColor: '#FFF', shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  toggleTxt:      { fontSize: 14, fontWeight: '600', color: '#6B7280' },
  toggleTxtActive:{ color: '#4F46E5', fontWeight: '700' },

  inputRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, backgroundColor: '#FAFAFA', paddingHorizontal: 14 },
  inputPrefix: { fontSize: 22, fontWeight: '700', color: '#9CA3AF', marginRight: 6 },
  bigInput:    { flex: 1, paddingVertical: 14, fontSize: 22, fontWeight: '700', color: '#111' },
  fieldInput:  { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#111', backgroundColor: '#FAFAFA' },

  detailCard:     { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 14, marginTop: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  detailCardTitle:{ fontSize: 13, fontWeight: '700', color: '#374151', marginBottom: 10 },
  detailRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  detailLbl:      { fontSize: 13, color: '#6B7280' },
  detailVal:      { fontSize: 13, fontWeight: '600', color: '#111827' },

  addrRow:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 10, padding: 10, gap: 8, marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' },
  addrTxt:   { flex: 1, fontSize: 12, fontWeight: '600', color: '#111', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  warningRow:{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFFBEB', borderRadius: 8, padding: 8, gap: 6 },
  warningTxt:{ flex: 1, fontSize: 12, color: '#92400E' },
  txHashInput:{ borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 12, fontSize: 13, color: '#111', minHeight: 70, textAlignVertical: 'top', backgroundColor: '#FAFAFA', marginTop: 8 },

  uploadBox: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderStyle: 'dashed', borderColor: '#C7D2FE', borderRadius: 14, paddingVertical: 22, backgroundColor: '#F5F3FF', gap: 8, marginBottom: 4 },
  uploadTxt: { fontSize: 14, fontWeight: '600', color: '#4F46E5' },

  submitBtn:  { height: 54, borderRadius: 14, overflow: 'hidden', marginTop: 20 },
  submitGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  submitTxt:  { fontSize: 16, fontWeight: '700', color: '#FFF' },
  errTxt:     { color: '#EF4444', fontSize: 13, fontWeight: '600', textAlign: 'center', backgroundColor: '#FEF2F2', borderRadius: 10, padding: 12, marginBottom: 16 },
  footerNote: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', marginTop: 12 },
});
