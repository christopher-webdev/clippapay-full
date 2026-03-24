// app/components/settings/LegalPage.tsx
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
      {sections.map((sec, i) => (
        <View key={i} style={S.section}>
          {sec.heading ? <Text style={S.heading}>{sec.heading}</Text> : null}
          <Text style={S.body}>{sec.body}</Text>
        </View>
      ))}
      <Text style={S.footer}>
        Clippa Digital Hub LTD{'\n'}Lagos, Nigeria
      </Text>
    </View>
  );
}

const S = StyleSheet.create({
  effectiveDate: { fontSize: 12, color: '#9CA3AF', marginBottom: 20, fontStyle: 'italic' },
  section:       { marginBottom: 20 },
  heading:       { fontSize: 15, fontWeight: '700', color: '#0F0F1A', marginBottom: 6 },
  body:          { fontSize: 14, color: '#374151', lineHeight: 22 },
  footer:        { marginTop: 32, fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});
