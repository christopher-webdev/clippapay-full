// app/(dashboard)/clipper/accept-offer/[applicationId].tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';

const { width } = Dimensions.get('window');

const API_URL = process.env.EXPO_PUBLIC_API_URL;
const UPLOADS_BASE_URL = process.env.EXPO_PUBLIC_UPLOADS_BASE_URL;

const toFullUrl = (path: string | null) => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${UPLOADS_BASE_URL}${path.startsWith('/') ? path : '/' + path}`;
};

export default function AcceptOfferScreen() {
  const { applicationId } = useLocalSearchParams<{ applicationId: string }>();
  const router = useRouter();

  const [application, setApplication] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string>('Calculating...');
  const [error, setError] = useState<string | null>(null);

  const fetchApplication = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (!token) {
        Alert.alert('Session expired', 'Please log in again.');
        router.replace('/(auth)/login');
        return;
      }

      console.log('Fetching application:', `${API_URL}/applications/${applicationId}`);
      
      const res = await fetch(`${API_URL}/applications/${applicationId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text.substring(0, 200));
        throw new Error('Server returned invalid response format');
      }

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || data.message || 'Failed to load offer');
      }

      setApplication(data.application || data);

    } catch (err: any) {
      console.error('Fetch error:', err);
      setError(err.message || 'Could not load offer details');
      Alert.alert('Error', err.message || 'Could not load offer details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (applicationId) fetchApplication();
  }, [applicationId]);

  // Countdown timer
  useEffect(() => {
    if (!application?.offerExpiresAt) return;

    const interval = setInterval(() => {
      const expires = new Date(application.offerExpiresAt).getTime();
      const now = Date.now();
      const diff = expires - now;

      if (diff <= 0) {
        setTimeLeft('Offer Expired');
        clearInterval(interval);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [application?.offerExpiresAt]);

  const handleAccept = async () => {
    Alert.alert(
      'Accept Offer',
      `You are about to accept this job for ${application?.paymentCurrency === 'NGN' ? '₦' : ''}${application?.paymentAmount?.toLocaleString()} ${application?.paymentCurrency || ''}. You will have 48 hours to submit the video after accepting.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          style: 'default',
          onPress: async () => {
            setAccepting(true);
            try {
              const token = await SecureStore.getItemAsync('userToken');
              const res = await fetch(`${API_URL}/applications/${applicationId}/accept`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              // Check if response is JSON
              const contentType = res.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error('Server returned invalid response format');
              }

              const data = await res.json();
              
              if (!res.ok) {
                throw new Error(data.error || data.message || 'Accept failed');
              }

              Alert.alert('Success', 'Offer accepted! You now have 48 hours to submit the video.');
              router.push('/(dashboard_clipper)/my-applications');

            } catch (err: any) {
              console.error('Accept error:', err);
              Alert.alert('Error', err.message || 'Failed to accept offer');
            } finally {
              setAccepting(false);
            }
          },
        },
      ]
    );
  };

  const handleReject = async () => {
    Alert.alert(
      'Reject Offer',
      'Are you sure you want to reject this offer? The advertiser will be notified and may select someone else.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('userToken');
              const res = await fetch(`${API_URL}/applications/${applicationId}/reject`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              // Check if response is JSON
              const contentType = res.headers.get('content-type');
              if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                console.error('Non-JSON response:', text.substring(0, 200));
                throw new Error('Server returned invalid response format');
              }

              const data = await res.json();

              if (!res.ok) {
                throw new Error(data.error || data.message || 'Reject failed');
              }

              Alert.alert('Rejected', 'Offer rejected successfully.');
              router.back();

            } catch (err: any) {
              console.error('Reject error:', err);
              Alert.alert('Error', err.message || 'Failed to reject offer');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ActivityIndicator size="large" color="#6366f1" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  if (error || !application) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <Ionicons name="alert-circle-outline" size={64} color="#ef4444" />
          <Text style={styles.errorText}>{error || 'Offer not found'}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isExpired = new Date(application.offerExpiresAt) < new Date();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Offer</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Campaign Preview */}
        <Image
          source={{ uri: toFullUrl(application.campaign?.thumbnailUrl) || 'https://via.placeholder.com/600' }}
          style={styles.hero}
        />

        <View style={styles.content}>
          <Text style={styles.campaignTitle}>{application.campaign?.title || 'Campaign'}</Text>

          <View style={styles.amountCard}>
            <Text style={styles.amountLabel}>Offered Amount</Text>
            <Text style={styles.amount}>
              {application.paymentCurrency === 'NGN'
                ? `₦${application.paymentAmount?.toLocaleString()}`
                : `${application.paymentAmount} USDT`}
            </Text>
          </View>

          {/* Countdown */}
          <View style={styles.countdownCard}>
            <Text style={styles.countdownLabel}>Time left to accept</Text>
            <Text style={[styles.countdown, isExpired && styles.expired]}>
              {timeLeft}
            </Text>
            {isExpired && (
              <Text style={styles.expiredNote}>This offer has expired</Text>
            )}
          </View>

          {/* Campaign Quick Info */}
          <View style={styles.infoSection}>
            <Text style={styles.sectionTitle}>Campaign Details</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={18} color="#64748b" />
              <Text style={styles.infoText}>
                Deadline: {application.campaign?.applicationDeadline ? new Date(application.campaign.applicationDeadline).toLocaleDateString() : 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="pricetag-outline" size={18} color="#64748b" />
              <Text style={styles.infoText}>Category: {application.campaign?.category || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={18} color="#64748b" />
              <Text style={styles.infoText}>Preferred Length: {application.campaign?.preferredLength || 'N/A'}</Text>
            </View>
          </View>

          {/* Action Buttons */}
          {!isExpired && application.status === 'selected' && (
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.btnAccept}
                onPress={handleAccept}
                disabled={accepting}
              >
                {accepting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Accept Offer</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.btnReject} onPress={handleReject}>
                <Text style={styles.btnTextReject}>Reject Offer</Text>
              </TouchableOpacity>
            </View>
          )}

          {isExpired && (
            <View style={styles.expiredBox}>
              <Text style={styles.expiredBoxText}>
                This offer has expired. The advertiser may select another creator.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f8fafc' },
  scrollContent: { paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#1e293b' },
  hero: { width: '100%', height: 220, resizeMode: 'cover' },
  content: { padding: 20 },
  campaignTitle: { fontSize: 24, fontWeight: '700', marginBottom: 16, color: '#1e293b' },
  amountCard: {
    backgroundColor: '#f0fdf4',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#dcfce7',
  },
  amountLabel: { fontSize: 16, color: '#166534', marginBottom: 8 },
  amount: { fontSize: 32, fontWeight: '800', color: '#15803d' },
  countdownCard: {
    backgroundColor: '#fefce8',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#fef08a',
  },
  countdownLabel: { fontSize: 16, color: '#854d0e', marginBottom: 8 },
  countdown: { fontSize: 28, fontWeight: '700', color: '#854d0e' },
  expired: { color: '#ef4444' },
  expiredNote: { fontSize: 14, color: '#b45309', marginTop: 8 },
  infoSection: { marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12, color: '#1e293b' },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 15, color: '#374151', marginLeft: 8, flex: 1 },
  actions: { flexDirection: 'row', gap: 12 },
  btnAccept: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnReject: {
    flex: 1,
    backgroundColor: '#ef4444',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  btnTextReject: { color: '#fff', fontSize: 16, fontWeight: '700' },
  expiredBox: {
    backgroundColor: '#fee2e2',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  expiredBoxText: { color: '#991b1b', fontSize: 15, textAlign: 'center' },
  errorText: { fontSize: 18, color: '#ef4444', marginTop: 16, marginBottom: 20, textAlign: 'center' },
  backBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  backBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});