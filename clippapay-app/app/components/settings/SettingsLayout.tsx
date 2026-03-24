// app/components/settings/SettingsLayout.tsx
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, SafeAreaView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface Props {
  title: string;
  children: React.ReactNode;
}

export default function SettingsLayout({ title, children }: Props) {
  const router = useRouter();
  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.back} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#0F0F1A" />
        </TouchableOpacity>
        <Text style={S.title} numberOfLines={1}>{title}</Text>
        <View style={S.spacer} />
      </View>
      <ScrollView contentContainerStyle={S.body} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: '#FAFAFA' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  back:   { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  title:  { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#0F0F1A' },
  spacer: { width: 36 },
  body:   { padding: 20, paddingBottom: 48 },
});
