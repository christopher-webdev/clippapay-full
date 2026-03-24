// app/components/settings/SettingsIndex.tsx
// The main settings hub - shared between advertiser & clipper dashboards
import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Linking, SafeAreaView, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface SettingsIndexProps {
  dashboardType: 'advertiser' | 'clipper';
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface SettingsItem {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  label: string;
  route?: string;
  action?: () => void;
  isExternal?: boolean;
}

interface SettingsGroup {
  title: string;
  items: SettingsItem[];
}

const SOCIALS: { icon: IconName; label: string; url: string; color: string; bg: string }[] = [
  { icon: 'logo-instagram',  label: 'Instagram',  url: 'https://instagram.com/clippapay',             color: '#E1306C', bg: '#FDF2F8' },
  { icon: 'logo-facebook',   label: 'Facebook',   url: 'https://facebook.com/clippapay',              color: '#1877F2', bg: '#EFF6FF' },
  { icon: 'logo-youtube',    label: 'YouTube',    url: 'https://youtube.com/@clippapay',              color: '#FF0000', bg: '#FEF2F2' },
  { icon: 'logo-tiktok',     label: 'TikTok',     url: 'https://tiktok.com/@clippapay',              color: '#000000', bg: '#F3F4F6' },
  { icon: 'chatbubble-ellipses-outline', label: 'WhatsApp', url: 'https://wa.me/2348053353964',       color: '#25D366', bg: '#F0FDF4' },
  { icon: 'paper-plane-outline', label: 'Telegram', url: 'https://t.me/clippapay',                   color: '#2AABEE', bg: '#EFF9FF' },
];

export default function SettingsIndex({ dashboardType }: SettingsIndexProps) {
  const router = useRouter();
  const base = dashboardType === 'advertiser'
    ? '/(dashboard_advertiser)/settings'
    : '/(dashboard_clipper)/settings';

  const go = (route: string) => router.push(route as any);

  const GROUPS: SettingsGroup[] = [
    {
      title: 'Support & Information',
      items: [
        { icon: 'help-circle-outline',    iconColor: '#6366F1', iconBg: '#EEF2FF', label: 'Help Center / FAQ',     route: `${base}/help_center` },
        { icon: 'mail-outline',           iconColor: '#10B981', iconBg: '#ECFDF5', label: 'Contact Us',            route: `${base}/contact_us` },
        { icon: 'information-circle-outline', iconColor: '#F59E0B', iconBg: '#FFFBEB', label: 'About Us',          route: `${base}/about_us` },
        { icon: 'briefcase-outline',      iconColor: '#8B5CF6', iconBg: '#F5F3FF', label: 'Careers',              route: `${base}/careers` },
      ],
    },
    {
      title: 'Legal & Compliance',
      items: [
        { icon: 'shield-checkmark-outline', iconColor: '#10B981', iconBg: '#ECFDF5', label: 'Privacy Policy',       route: `${base}/privacy_policy` },
        { icon: 'document-text-outline',    iconColor: '#6366F1', iconBg: '#EEF2FF', label: 'Terms & Conditions',   route: `${base}/terms_conditions` },
        { icon: 'clipboard-outline',        iconColor: '#F59E0B', iconBg: '#FFFBEB', label: 'Community Guidelines', route: `${base}/community_guidelines` },
        { icon: 'cash-outline',             iconColor: '#EF4444', iconBg: '#FEF2F2', label: 'Refund & Payment Policy', route: `${base}/refund_policy` },
        { icon: 'scan-outline',             iconColor: '#64748B', iconBg: '#F1F5F9', label: 'Cookie Policy',        route: `${base}/cookie_policy` },
        { icon: 'image-outline',            iconColor: '#8B5CF6', iconBg: '#F5F3FF', label: 'Intellectual Property', route: `${base}/ip_policy` },
        { icon: 'lock-closed-outline',      iconColor: '#0EA5E9', iconBg: '#F0F9FF', label: 'Acceptable Use Policy', route: `${base}/acceptable_use` },
        { icon: 'phone-portrait-outline',   iconColor: '#374151', iconBg: '#F9FAFB', label: 'End User License Agreement (EULA)', route: `${base}/eula` },
        { icon: 'trash-outline',            iconColor: '#DC2626', iconBg: '#FEF2F2', label: 'Data Deletion Request', route: `${base}/data_deletion` },
      ],
    },
  ];

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

      {/* Header */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => router.back()} style={S.back} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#0F0F1A" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Settings</Text>
        <View style={S.spacer} />
      </View>

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* Brand banner */}
        <View style={S.banner}>
          <View style={S.logoWrap}>
            <Text style={S.logoText}>C</Text>
          </View>
          <Text style={S.bannerName}>ClippaPay</Text>
          <Text style={S.bannerSub}>Africa's Creator Economy Platform</Text>
          <Text style={S.bannerVersion}>Version 1.0.0 · Clippa Digital Hub LTD</Text>
        </View>

        {/* Groups */}
        {GROUPS.map((group) => (
          <View key={group.title} style={S.group}>
            <Text style={S.groupTitle}>{group.title}</Text>
            <View style={S.card}>
              {group.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[S.row, idx < group.items.length - 1 && S.rowBorder]}
                  onPress={() => item.route ? go(item.route) : item.action?.()}
                  activeOpacity={0.7}
                >
                  <View style={[S.iconBox, { backgroundColor: item.iconBg }]}>
                    <Ionicons name={item.icon} size={18} color={item.iconColor} />
                  </View>
                  <Text style={S.rowLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Social Media */}
        <View style={S.group}>
          <Text style={S.groupTitle}>Follow Us</Text>
          <View style={S.socialsGrid}>
            {SOCIALS.map((s) => (
              <TouchableOpacity
                key={s.label}
                style={S.socialItem}
                onPress={() => Linking.openURL(s.url)}
                activeOpacity={0.75}
              >
                <View style={[S.socialIcon, { backgroundColor: s.bg }]}>
                  <Ionicons name={s.icon} size={22} color={s.color} />
                </View>
                <Text style={S.socialLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={S.copyright}>
          © {new Date().getFullYear()} Clippa Digital Hub LTD. All rights reserved.{'\n'}
          Registered in Nigeria · Lagos
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const S = StyleSheet.create({
  safe:          { flex: 1, backgroundColor: '#FAFAFA' },
  header:        {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#FFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  back:          { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle:   { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#0F0F1A' },
  spacer:        { width: 36 },
  scroll:        { padding: 16, paddingBottom: 48 },

  banner: {
    backgroundColor: '#0F0F1A',
    borderRadius: 16,
    alignItems: 'center',
    paddingVertical: 28,
    marginBottom: 24,
  },
  logoWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoText:      { color: '#FFF', fontSize: 30, fontWeight: '900' },
  bannerName:    { color: '#FFF', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  bannerSub:     { color: '#9CA3AF', fontSize: 13, marginBottom: 6 },
  bannerVersion: { color: '#6B7280', fontSize: 11 },

  group:         { marginBottom: 20 },
  groupTitle:    { fontSize: 12, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.8, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  card:          { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  row:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  rowBorder:     { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  iconBox:       { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  rowLabel:      { flex: 1, fontSize: 15, color: '#0F0F1A', fontWeight: '500' },

  socialsGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  socialItem:    { width: '30%', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, paddingVertical: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  socialIcon:    { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
  socialLabel:   { fontSize: 12, color: '#374151', fontWeight: '600' },

  copyright:     { textAlign: 'center', fontSize: 11, color: '#9CA3AF', lineHeight: 18, marginTop: 8 },
});
