// app/components/applications/StatusBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type ApplicationStatus = 'pending' | 'shortlisted' | 'offer_sent' | 'accepted' | 'rejected' | 'expired' | 'working' | 'submitted' | 'revision_requested' | 'approved' | 'completed' | 'cancelled';

interface StatusBadgeProps {
  status: ApplicationStatus;
  showIcon?: boolean;
  size?: 'small' | 'medium';
}

export function StatusBadge({ status, showIcon = true, size = 'medium' }: StatusBadgeProps) {
  const configs: Record<ApplicationStatus, { bg: string; text: string; label: string; icon: string }> = {
    pending: { bg: '#FEF3C7', text: '#D97706', label: 'Pending Review', icon: 'time-outline' },
    shortlisted: { bg: '#DBEAFE', text: '#2563EB', label: 'Shortlisted', icon: 'star-outline' },
    offer_sent: { bg: '#DCFCE7', text: '#16A34A', label: 'Offer Sent', icon: 'mail-outline' },
    accepted: { bg: '#DCFCE7', text: '#16A34A', label: 'Accepted', icon: 'checkmark-circle-outline' },
    rejected: { bg: '#FEE2E2', text: '#DC2626', label: 'Rejected', icon: 'close-circle-outline' },
    expired: { bg: '#F3F4F6', text: '#6B7280', label: 'Expired', icon: 'time-outline' },
    working: { bg: '#DBEAFE', text: '#2563EB', label: 'Working', icon: 'construct-outline' },
    submitted: { bg: '#FEF3C7', text: '#D97706', label: 'Submitted', icon: 'videocam-outline' },
    revision_requested: { bg: '#FEF3C7', text: '#D97706', label: 'Revision Needed', icon: 'create-outline' },
    approved: { bg: '#DCFCE7', text: '#16A34A', label: 'Approved', icon: 'checkmark-done-outline' },
    completed: { bg: '#DCFCE7', text: '#16A34A', label: 'Completed', icon: 'flag-outline' },
    cancelled: { bg: '#FEE2E2', text: '#DC2626', label: 'Cancelled', icon: 'close-circle-outline' }
  };

  const config = configs[status] || configs.pending;
  
  return (
    <View style={[
      styles.badge,
      { backgroundColor: config.bg },
      size === 'small' && styles.badgeSmall
    ]}>
      {showIcon && (
        <Ionicons 
          name={config.icon as any} 
          size={size === 'small' ? 12 : 14} 
          color={config.text} 
        />
      )}
      <Text style={[
        styles.text,
        { color: config.text },
        size === 'small' && styles.textSmall
      ]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
});
export default StatusBadge;