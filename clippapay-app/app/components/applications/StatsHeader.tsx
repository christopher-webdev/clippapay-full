// app/components/applications/StatsHeader.tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface StatsHeaderProps {
  stats: {
    total: number;
    pending: number;
    offer_sent: number;
    submitted: number;
    approved: number;
  };
}

export function StatsHeader({ stats }: StatsHeaderProps) {
  const statCards = [
    { key: 'total', label: 'Total', value: stats.total, color: '#EEF2FF' },
    { key: 'pending', label: 'Pending', value: stats.pending, color: '#FEF3C7' },
    { key: 'offer_sent', label: 'Offers', value: stats.offer_sent, color: '#DCFCE7' },
    { key: 'submitted', label: 'To Review', value: stats.submitted, color: '#DBEAFE' },
    { key: 'approved', label: 'Approved', value: stats.approved, color: '#DCFCE7' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.container}>
        {statCards.map((card) => (
          <View key={card.key} style={[styles.card, { backgroundColor: card.color }]}>
            <Text style={styles.number}>{card.value}</Text>
            <Text style={styles.label}>{card.label}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 16,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minWidth: 80,
  },
  number: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  label: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
});

export default StatsHeader;