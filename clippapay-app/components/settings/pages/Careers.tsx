import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SettingsLayout from '../SettingsLayout';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Role {
  title: string;
  team: string;
  type: string;
  location: string;
}

const OPEN_ROLES: Role[] = [
  { title: 'Senior Backend Engineer (Node.js)', team: 'Engineering', type: 'Full-time', location: 'Lagos / Remote' },
  { title: 'Mobile Developer (React Native)', team: 'Engineering', type: 'Full-time', location: 'Lagos / Remote' },
  { title: 'Creator Partnerships Manager', team: 'Growth', type: 'Full-time', location: 'Lagos' },
  { title: 'Brand Sales Executive', team: 'Sales', type: 'Full-time', location: 'Lagos' },
  { title: 'Content & Community Manager', team: 'Marketing', type: 'Full-time', location: 'Lagos / Remote' },
  { title: 'Data Analyst', team: 'Product', type: 'Full-time', location: 'Remote' },
];

const PERKS: { icon: IconName; text: string }[] = [
  { icon: 'rocket-outline', text: 'Work at the forefront of Africa\'s creator economy' },
  { icon: 'people-outline', text: 'Fast-moving, founder-led team' },
  { icon: 'globe-outline', text: 'Remote-friendly culture' },
  { icon: 'trending-up-outline', text: 'Competitive salary + equity for early hires' },
  { icon: 'book-outline', text: 'Learning & development budget' },
  { icon: 'sunny-outline', text: 'Flexible working hours' },
];

export default function Careers() {
  return (
    <SettingsLayout title="Careers">
      <View style={S.hero}>
        <Text style={S.heroEmoji}>🚀</Text>
        <Text style={S.heroTitle}>Join the ClippaPay Team</Text>
        <Text style={S.heroSub}>
          We're building Africa's creator economy infrastructure. Come build it with us.
        </Text>
      </View>

      {/* Perks */}
      <Text style={S.sectionTitle}>Why ClippaPay?</Text>
      <View style={S.perksCard}>
        {PERKS.map((p, idx) => (
          <View key={idx} style={[S.perkRow, idx < PERKS.length - 1 && S.border]}>
            <Ionicons name={p.icon} size={18} color="#10B981" style={S.perkIcon} />
            <Text style={S.perkText}>{p.text}</Text>
          </View>
        ))}
      </View>

      {/* Open Roles */}
      <Text style={S.sectionTitle}>Open Roles</Text>
      {OPEN_ROLES.map((role, idx) => (
        <View key={idx} style={S.roleCard}>
          <View style={S.roleTop}>
            <Text style={S.roleTitle}>{role.title}</Text>
            <View style={S.typePill}>
              <Text style={S.typeText}>{role.type}</Text>
            </View>
          </View>
          <View style={S.roleMeta}>
            <Text style={S.metaText}>📁 {role.team}</Text>
            <Text style={S.metaDot}>·</Text>
            <Text style={S.metaText}>📍 {role.location}</Text>
          </View>
        </View>
      ))}

      <View style={S.applyBox}>
        <Text style={S.applyTitle}>Don't see your role?</Text>
        <Text style={S.applyBody}>
          We're always looking for talented, passionate people. Send your CV and a short note
          about why you want to help build ClippaPay.
        </Text>
        <TouchableOpacity
          style={S.applyBtn}
          onPress={() => Linking.openURL('mailto:careers@clippapay.com?subject=Open Application - ClippaPay')}
          activeOpacity={0.8}
        >
          <Ionicons name="mail-outline" size={16} color="#FFF" />
          <Text style={S.applyBtnText}>Send Open Application</Text>
        </TouchableOpacity>
      </View>
    </SettingsLayout>
  );
}

const S = StyleSheet.create({
  hero: { backgroundColor: '#0F0F1A', borderRadius: 16, alignItems: 'center', paddingVertical: 28, marginBottom: 24 },
  heroEmoji: { fontSize: 36, marginBottom: 10 },
  heroTitle: { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 8 },
  heroSub: { color: '#9CA3AF', fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F0F1A', marginBottom: 12 },
  perksCard: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', marginBottom: 24 },
  perkRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  perkIcon: { marginRight: 12 },
  perkText: { fontSize: 14, color: '#374151', flex: 1 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  roleCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  roleTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  roleTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: '#0F0F1A', lineHeight: 20 },
  typePill: { backgroundColor: '#ECFDF5', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typeText: { fontSize: 11, color: '#059669', fontWeight: '600' },
  roleMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, color: '#6B7280' },
  metaDot: { fontSize: 12, color: '#D1D5DB' },
  applyBox: { backgroundColor: '#EEF2FF', borderRadius: 16, padding: 20, marginTop: 8 },
  applyTitle: { fontSize: 15, fontWeight: '700', color: '#0F0F1A', marginBottom: 8 },
  applyBody: { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 16 },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 13 },
  applyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
