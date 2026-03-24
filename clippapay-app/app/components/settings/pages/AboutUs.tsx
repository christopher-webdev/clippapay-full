import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SettingsLayout from '../SettingsLayout';

type IonName = React.ComponentProps<typeof Ionicons>['name'];

const STATS = [
  { value: '500K+', label: 'Active Creators' },
  { value: '3',     label: 'Earning Models' },
  { value: '4',     label: 'Target Markets' },
  { value: '2025',  label: 'Founded' },
];

const VALUES: { icon: IonName; title: string; body: string }[] = [
  { icon: 'globe-outline',         title: 'Africa First',        body: 'We are building the infrastructure for African creators to lead the global peer-to-peer marketing revolution. Nigeria. South Africa. Kenya. India. The world.' },
  { icon: 'people-outline',        title: 'Creator-Centred',     body: 'African creators produce world-class content. They deserve world-class tools and fair, guaranteed income — not DM-negotiated deals or unpredictable brand payments.' },
  { icon: 'trending-up-outline',   title: 'Performance-Driven',  body: 'Virality is no longer accidental — it is engineered. We give brands measurable results and give creators transparent performance analytics.' },
  { icon: 'lock-closed-outline',   title: 'Trust & Safety',      body: 'Escrow-protected payments mean brands only pay for approved work. Our verification systems ensure every creator interaction is authentic.' },
];

export default function AboutUs() {
  return (
    <SettingsLayout title="About Us">
      <View style={S.hero}>
        <View style={S.logoWrap}><Text style={S.logoText}>C</Text></View>
        <Text style={S.heroTitle}>ClippaPay</Text>
        <Text style={S.heroTagline}>Africa's Creator Economy Platform</Text>
        <Text style={S.heroSub}>Clippa Digital Hub LTD · Lagos, Nigeria</Text>
      </View>

      <Text style={S.sectionTitle}>Our Mission</Text>
      <Text style={S.body}>
        ClippaPay is redefining how African brands create content and drive sales by putting
        creators at the centre of every campaign. We are building the infrastructure for Africa
        to lead the global people-powered marketing revolution.
      </Text>

      <View style={S.statsRow}>
        {STATS.map(st => (
          <View key={st.label} style={S.statBox}>
            <Text style={S.statValue}>{st.value}</Text>
            <Text style={S.statLabel}>{st.label}</Text>
          </View>
        ))}
      </View>

      <Text style={S.sectionTitle}>What We Do</Text>
      {[
        { emoji: 'UGC', title: 'UGC Creation', body: 'Brands post campaigns, vetted creators bid and produce authentic short-form video content. Brands control the output; creators earn guaranteed base pay.' },
        { emoji: 'CLP', title: 'Clipping',     body: 'Brands upload long-form content. Our Clipper network transforms it into platform-optimised short clips. Clippers earn per verified view.' },
        { emoji: 'AFF', title: 'UGC Affiliate', body: 'Creators promote products via unique referral links and earn commissions on every verified sale within a 30-day tracking window.' },
      ].map(m => (
        <View key={m.title} style={S.modelCard}>
          <Text style={S.modelTitle}>{m.title}</Text>
          <Text style={S.modelBody}>{m.body}</Text>
        </View>
      ))}

      <Text style={S.sectionTitle}>Our Values</Text>
      {VALUES.map(v => (
        <View key={v.title} style={S.valueRow}>
          <View style={S.valueIconBox}>
            <Ionicons name={v.icon} size={18} color="#10B981" />
          </View>
          <View style={S.valueText}>
            <Text style={S.valueTitle}>{v.title}</Text>
            <Text style={S.valueBody}>{v.body}</Text>
          </View>
        </View>
      ))}

      <TouchableOpacity style={S.websiteBtn} onPress={() => Linking.openURL('https://clippapay.com')} activeOpacity={0.8}>
        <Ionicons name="globe-outline" size={16} color="#FFF" />
        <Text style={S.websiteBtnText}>Visit clippapay.com</Text>
      </TouchableOpacity>
    </SettingsLayout>
  );
}

const S = StyleSheet.create({
  hero:          { backgroundColor: '#0F0F1A', borderRadius: 16, alignItems: 'center', paddingVertical: 28, marginBottom: 24 },
  logoWrap:      { width: 60, height: 60, borderRadius: 18, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  logoText:      { color: '#FFF', fontSize: 28, fontWeight: '900' },
  heroTitle:     { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  heroTagline:   { color: '#9CA3AF', fontSize: 13, marginBottom: 4 },
  heroSub:       { color: '#6B7280', fontSize: 11 },
  sectionTitle:  { fontSize: 15, fontWeight: '700', color: '#0F0F1A', marginBottom: 12, marginTop: 8 },
  body:          { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 20 },
  statsRow:      { flexDirection: 'row', gap: 10, marginBottom: 24 },
  statBox:       { flex: 1, backgroundColor: '#FFF', borderRadius: 12, alignItems: 'center', paddingVertical: 14, borderWidth: 1, borderColor: '#E5E7EB' },
  statValue:     { fontSize: 18, fontWeight: '800', color: '#10B981' },
  statLabel:     { fontSize: 11, color: '#6B7280', marginTop: 2, textAlign: 'center' },
  modelCard:     { backgroundColor: '#FFF', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 10 },
  modelTitle:    { fontSize: 14, fontWeight: '700', color: '#0F0F1A', marginBottom: 6 },
  modelBody:     { fontSize: 13, color: '#374151', lineHeight: 20 },
  valueRow:      { flexDirection: 'row', gap: 12, marginBottom: 14, alignItems: 'flex-start' },
  valueIconBox:  { width: 34, height: 34, borderRadius: 10, backgroundColor: '#ECFDF5', justifyContent: 'center', alignItems: 'center' },
  valueText:     { flex: 1 },
  valueTitle:    { fontSize: 14, fontWeight: '700', color: '#0F0F1A', marginBottom: 4 },
  valueBody:     { fontSize: 13, color: '#374151', lineHeight: 20 },
  websiteBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#10B981', borderRadius: 12, paddingVertical: 15, marginTop: 8 },
  websiteBtnText:{ color: '#FFF', fontSize: 15, fontWeight: '700' },
});
