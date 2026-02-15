// app/components/applications/FilterChips.tsx
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';

type FilterType = 'all' | 'pending' | 'offer_sent' | 'submitted' | 'approved';

interface FilterChipsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export function FilterChips({ activeFilter, onFilterChange }: FilterChipsProps) {
  const filters: Array<{ key: FilterType; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'offer_sent', label: 'Offers' },
    { key: 'submitted', label: 'To Review' },
    { key: 'approved', label: 'Approved' },
  ];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
      <View style={styles.container}>
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.key}
            style={[
              styles.chip,
              activeFilter === filter.key && styles.chipActive
            ]}
            onPress={() => onFilterChange(filter.key)}
          >
            <Text style={[
              styles.text,
              activeFilter === filter.key && styles.textActive
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginBottom: 8,
  },
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  text: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  textActive: {
    color: '#FFFFFF',
  },
});

export default FilterChips;