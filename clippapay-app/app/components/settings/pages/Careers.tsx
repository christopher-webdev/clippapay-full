import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SettingsLayout from '../SettingsLayout';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const ROLES = [
  { title: 'Senior Backend Engineer (Node.js)', team: 'Engineering', location: 'Lagos / Remote' },
  { title: 'Mobile Developer (React Native)',   team: 'Engineering', location: 'Lagos / Remote' },
  { title: 'Creator Partnerships Manager',      team: 'Growth',      location: 'Lagos' },
  { title: 'Brand Sales Executive',             team: 'Sales',       location: 'Lagos' },
  { title: 'Content & Community Manager',       team: 'Marketing',   location: 'Lagos / Remote' },
  { title: 'Data Analyst',                      team: 'Product',     location: 'Remote' },
];

const PERKS: { icon: IonName; text: string }[] = [
  { icon: 'rocket-outline',      text: "Work at the forefront of Africa's creator economy" },
  { icon: 'people-outline',      text: 'Fast-moving, founder-led team' },
  { icon: 'globe-outline',       text: 'Remote-friendly culture' },
  { icon: 'trending-up-outline', text: 'Competitive salary + equity for early hires' },
  { icon: 'book-outline',        text: 'Learning & development budget' },
  { icon: 'sunny-outline',       text: 'Flexible working hours' },
];

export default function Careers() {
  return (
    <SettingsLayout title="Careers">
      <View style={S.hero}>
        <Text style={S.heroTitle}>Join the ClippaPay Team</Text>
        <Text style={S.heroSub}>We are building Africa's creator economy infrastructure. Come build it with us.</Text>
      </View>

      <Text style={S.sectionTitle}>Why ClippaPay?</Text>
      <View style={S.card}>
        {PERKS.map((p, idx) => (
          <View key={idx} style={[S.perkRow, idx < PERKS.length - 1 && S.border]}>
            <Ionicons name={p.icon} size={18} color="#10B981" style={S.perkIcon} />
            <Text style={S.perkText}>{p.text}</Text>
          </View>
        ))}
      </View>

      <Text style={S.sectionTitle}>Open Roles</Text>
      {ROLES.map((role, idx) => (
        <View key={idx} style={S.roleCard}>
          <Text style={S.roleTitle}>{role.title}</Text>
          <Text style={S.roleMeta}>{role.team} · {role.location}</Text>
        </View>
      ))}

      <View style={S.applyBox}>
        <Text style={S.applyTitle}>Don't see your role?</Text>
        <Text style={S.applyBody}>
          We're always looking for talented, passionate people. Send your CV and a short note about
          why you want to help build ClippaPay.
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
  hero:         { backgroundColor: '#0F0F1A', borderRadius: 16, alignItems: 'center', paddingVertical: 28, marginBottom: 24, paddingHorizontal: 20 },
  heroTitle:    { color: '#FFF', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' },
  heroSub:      { color: '#9CA3AF', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0F0F1A', marginBottom: 12 },
  card:         { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', marginBottom: 24 },
  perkRow:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
  perkIcon:     { marginRight: 12 },
  perkText:     { fontSize: 14, color: '#374151', flex: 1 },
  border:       { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  roleCard:     { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  roleTitle:    { fontSize: 14, fontWeight: '700', color: '#0F0F1A', marginBottom: 4 },
  roleMeta:     { fontSize: 12, color: '#6B7280' },
  applyBox:     { backgroundColor: '#EEF2FF', borderRadius: 16, padding: 20, marginTop: 8 },
  applyTitle:   { fontSize: 15, fontWeight: '700', color: '#0F0F1A', marginBottom: 8 },
  applyBody:    { fontSize: 14, color: '#374151', lineHeight: 21, marginBottom: 16 },
  applyBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 13 },
  applyBtnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
});
