// app/components/settings/LegalPage.tsx
// Reusable component for text-heavy legal pages
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Section {
  heading?: string;
  body: string;
}

interface Props {
  effectiveDate?: string;
  sections: Section[];
}

export default function LegalPage({ effectiveDate, sections }: Props) {
  return (
    <View>
      {effectiveDate && (
        <Text style={S.effectiveDate}>Effective Date: {effectiveDate}</Text>
      )}
      {sections.map((s, i) => (
        <View key={i} style={S.section}>
          {s.heading && <Text style={S.heading}>{s.heading}</Text>}
          <Text style={S.body}>{s.body}</Text>
        </View>
      ))}
      <Text style={S.footer}>
        Clippa Digital Hub LTD · RC: [8770280] · Lagos, Nigeria
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  effectiveDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 20,
    fontStyle: 'italic',
  },
  section: { marginBottom: 20 },
  heading: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F0F1A',
    marginBottom: 6,
  },
  body: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 22,
  },
  footer: {
    marginTop: 32,
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});
