// app/components/applications/AddonBadge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AddonBadgeProps {
  addonId: string;
}

export function AddonBadge({ addonId }: AddonBadgeProps) {
  const getAddonIcon = (id: string): string => {
    const icons: Record<string, string> = {
      script: 'document-text-outline',
      whatsapp: 'logo-whatsapp',
      ig: 'logo-instagram',
      tiktok: 'logo-tiktok',
      outdoor: 'sunny-outline'
    };
    return icons[id] || 'apps-outline';
  };

  const getAddonLabel = (id: string): string => {
    const labels: Record<string, string> = {
      script: 'Creator provides script',
      whatsapp: 'Post on WhatsApp',
      ig: 'Post on Instagram',
      tiktok: 'Post on TikTok',
      outdoor: 'Outdoor shoot'
    };
    return labels[id] || id;
  };

  return (
    <View style={styles.badge}>
      <Ionicons name={getAddonIcon(addonId) as any} size={12} color="#4F46E5" />
      <Text style={styles.text} numberOfLines={1}>
        {getAddonLabel(addonId)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    maxWidth: 150,
  },
  text: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: '500',
  },
});

export default AddonBadge;