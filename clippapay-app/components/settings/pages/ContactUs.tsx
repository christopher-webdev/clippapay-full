import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SettingsLayout from '../SettingsLayout';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ContactItem {
  icon: IconName;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  action: () => void;
}

const CONTACTS: ContactItem[] = [
  {
    icon: 'mail-outline', iconColor: '#6366F1', iconBg: '#EEF2FF',
    label: 'General Enquiries', value: 'reach@clippapay.com',
    action: () => Linking.openURL('mailto:reach@clippapay.com'),
  },
  {
    icon: 'shield-checkmark-outline', iconColor: '#10B981', iconBg: '#ECFDF5',
    label: 'Privacy & Data', value: 'reach@clippapay.com',
    action: () => Linking.openURL('mailto:reach@clippapay.com'),
  },
  {
    icon: 'cash-outline', iconColor: '#F59E0B', iconBg: '#FFFBEB',
    label: 'Payments & Payouts', value: 'reach@clippapay.com',
    action: () => Linking.openURL('mailto:reach@clippapay.com'),
  },
  {
    icon: 'document-text-outline', iconColor: '#8B5CF6', iconBg: '#F5F3FF',
    label: 'Legal & Compliance', value: 'reach@clippapay.com',
    action: () => Linking.openURL('mailto:reach@clippapay.com'),
  },
  {
    icon: 'flag-outline', iconColor: '#EF4444', iconBg: '#FEF2F2',
    label: 'Report a Violation', value: 'reach@clippapay.com',
    action: () => Linking.openURL('mailto:reach@clippapay.com'),
  },
  {
    icon: 'logo-whatsapp', iconColor: '#25D366', iconBg: '#F0FDF4',
    label: 'WhatsApp Support', value: '+234 805 335 3964',
    action: () => Linking.openURL('https://wa.me/2348053353964'),
  },
  {
    icon: 'globe-outline', iconColor: '#0EA5E9', iconBg: '#F0F9FF',
    label: 'Website', value: 'clippapay.com',
    action: () => Linking.openURL('https://clippapay.com'),
  },
];

export default function ContactUs() {
  return (
    <SettingsLayout title="Contact Us">
      <Text style={S.intro}>
        We're here to help. Reach out through any of the channels below and our team will
        respond as quickly as possible. Support hours: Monday–Friday, 9am–6pm WAT.
      </Text>

      <View style={S.card}>
        {CONTACTS.map((c, idx) => (
          <TouchableOpacity
            key={c.label}
            style={[S.row, idx < CONTACTS.length - 1 && S.border]}
            onPress={c.action}
            activeOpacity={0.7}
          >
            <View style={[S.iconBox, { backgroundColor: c.iconBg }]}>
              <Ionicons name={c.icon} size={18} color={c.iconColor} />
            </View>
            <View style={S.textCol}>
              <Text style={S.label}>{c.label}</Text>
              <Text style={S.value}>{c.value}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        ))}
      </View>

      <View style={S.addressBox}>
        <Text style={S.addressTitle}>📍 Office Address</Text>
        <Text style={S.addressText}>
          Clippa Digital Hub LTD{'\n'}
          HSE 2, Kpaduma 1, Asokoro, Abuja, Nigeria{'\n'}
          RC: 8770280
        </Text>
      </View>
    </SettingsLayout>
  );
}

const S = StyleSheet.create({
  intro: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB', marginBottom: 20 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  textCol: { flex: 1 },
  label: { fontSize: 13, fontWeight: '600', color: '#0F0F1A', marginBottom: 2 },
  value: { fontSize: 13, color: '#6366F1' },
  addressBox: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E5E7EB' },
  addressTitle: { fontSize: 14, fontWeight: '700', color: '#0F0F1A', marginBottom: 8 },
  addressText: { fontSize: 14, color: '#374151', lineHeight: 22 },
});
