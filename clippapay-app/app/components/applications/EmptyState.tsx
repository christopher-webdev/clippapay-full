// app/components/applications/EmptyState.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  onBrowseCampaigns?: () => void;
}

export function EmptyState({ onBrowseCampaigns }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="document-text-outline" size={64} color="#9CA3AF" />
      <Text style={styles.title}>No Applications Yet</Text>
      <Text style={styles.text}>
        When creators apply to your campaigns, they'll appear here.
      </Text>
      {onBrowseCampaigns && (
        <TouchableOpacity style={styles.button} onPress={onBrowseCampaigns}>
          <Text style={styles.buttonText}>View Your Campaigns</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default EmptyState;