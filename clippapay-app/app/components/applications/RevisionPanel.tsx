// app/components/applications/RevisionPanel.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface RevisionPanelProps {
  type: 'offer' | 'revision';
  application: any;
  onAction: (action: string, data?: any) => void;
  loading?: boolean;
}

export function RevisionPanel({ type, application, onAction, loading }: RevisionPanelProps) {
  if (type === 'offer') {
    const { offerExpiresAt } = application;

    const handleAccept = () => {
      Alert.alert(
        'Accept Offer',
        'Are you sure you want to accept this offer? You will have 3 days to submit your video.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Accept', onPress: () => onAction('accept_offer') }
        ]
      );
    };

    const handleReject = () => {
      Alert.alert(
        'Reject Offer',
        'Are you sure you want to reject this offer? This action cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Reject', onPress: () => onAction('reject_offer'), style: 'destructive' }
        ]
      );
    };

    const expiryDate = offerExpiresAt ? new Date(offerExpiresAt) : null;
    const hoursLeft = expiryDate 
      ? Math.max(0, Math.floor((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60)))
      : 0;

    return (
      <View style={styles.container}>
        <View style={styles.timerContainer}>
          <Ionicons name="time-outline" size={24} color="#D97706" />
          <View>
            <Text style={styles.timerTitle}>Offer Expires In</Text>
            <Text style={styles.timerValue}>{hoursLeft} hours</Text>
          </View>
        </View>

        <View style={styles.offerDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Budget:</Text>
            <Text style={styles.detailValue}>
              ₦{application.campaign.budget_total.toLocaleString()}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deadline:</Text>
            <Text style={styles.detailValue}>3 days after acceptance</Text>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.acceptButton]}
            onPress={handleAccept}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={20} color="#FFF" />
                <Text style={styles.buttonText}>Accept Offer</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={handleReject}
            disabled={loading}
          >
            <Ionicons name="close-circle" size={20} color="#FFF" />
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.disclaimer}>
          By accepting, you agree to complete and submit the video within 3 days.
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 16,
  },
  timerTitle: {
    fontSize: 12,
    color: '#D97706',
  },
  timerValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D97706',
  },
  offerDetails: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#059669',
  },
  rejectButton: {
    backgroundColor: '#DC2626',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default RevisionPanel;