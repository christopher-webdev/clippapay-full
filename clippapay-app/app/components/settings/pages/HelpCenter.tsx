import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Linking,
  LayoutAnimation, Platform, UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SettingsLayout from '../SettingsLayout';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const SECTIONS = [
  {
    title: 'For Creators & Clippers',
    faqs: [
      { q: 'How do I get started as a Creator?', a: 'Sign up, complete your profile, and browse available UGC campaigns. Submit a bid on any campaign that matches your content style. Once a brand approves your bid, complete the brief and submit your content for review.' },
      { q: 'How does the Clipping model work?', a: 'Brands upload long-form content (product launches, testimonials, interviews). You clip these into short-form videos (30-90 seconds) and post them to TikTok, Instagram Reels, or YouTube Shorts. You earn per verified view your clips generate.' },
      // { q: 'What is the UGC Affiliate model?', a: 'You receive a unique referral link for a brand product. Promote the product through your content and earn a commission on every verified sale made through your link within a 30-day tracking window.' },
      { q: 'When and how do I get paid?', a: 'UGC earnings are released within immediately after brand approval. Clipping and UGC earnings can be withdrawn immediately. All payouts go to your registered Nigerian bank account or USDT crypto wallet.' },
      { q: 'What counts as a verified view?', a: 'A verified view is a genuine, unique view tracked through our attribution system. Bot traffic, self-views, and artificially inflated views are excluded. Our system cross-references platform analytics to verify authenticity.' },
    ],
  },
  {
    title: 'For Brands & Advertisers',
    faqs: [
      { q: 'How do I post a UGC campaign?', a: 'Go to Campaigns then Create Campaign. Set your brief, budget, content requirements, and deadline. Your campaign goes live for creators to bid on. Review bids, select your preferred creator, and fund the campaign to begin.' },
      { q: 'How does campaign funding work?', a: 'Funds are held in escrow by ClippaPay and only released to the creator upon your approval of the final content. You only pay for content you are satisfied with.' },
      { q: 'Can I request revisions on creator content?', a: 'Yes. You can request up to 2 rounds of revisions per campaign. Revision requests must be submitted within 5 business days of content delivery.' },
      { q: 'How do I track campaign performance?', a: 'Your Campaign Analytics dashboard provides real-time data on views, engagement, creator performance, and spend. For Clipper campaigns, you can see per-creator view breakdowns.' },
    ],
  },
  {
    title: 'Payments & Account',
    faqs: [
      { q: 'How do I add my bank account for payouts?', a: 'Go to Wallet then Add Bank Account. Enter your Nigerian bank details. Your account will be verified via our payment partner (Paystack) before payouts can be processed.' },
      { q: 'What if my payout is delayed?', a: 'Check that your bank account is fully verified. If the issue persists, contact payments@clippapay.com with your transaction reference.' },
      { q: 'How do I delete my account?', a: 'Go to Settings then Data Deletion Request and submit the form. Ensure all pending payouts are settled before requesting deletion as this process is irreversible.' },
    ],
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={F.item}>
      <TouchableOpacity
        style={F.question}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setOpen(prev => !prev);
        }}
        activeOpacity={0.7}
      >
        <Text style={F.qText}>{q}</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color="#9CA3AF"
        />
      </TouchableOpacity>

      {open ? <Text style={F.answer}>{a}</Text> : null}
    </View>
  );
}

export default function HelpCenter() {
  return (
    <SettingsLayout title="Help Center / FAQ">
      <Text style={S.intro}>Find answers below, or contact our support team directly.</Text>
      <TouchableOpacity
        style={S.contactBtn}
        onPress={() => Linking.openURL('mailto:reach@clippapay.com')}
        activeOpacity={0.8}
      >
        <Ionicons name="mail-outline" size={16} color="#6366F1" />
        <Text style={S.contactBtnText}>Email Our Support Team</Text>
      </TouchableOpacity>

      {SECTIONS.map(section => (
        <View key={section.title} style={S.section}>
          <Text style={S.sectionTitle}>{section.title}</Text>
          <View style={S.card}>
            {section.faqs.map((faq, idx) => (
              <View key={idx} style={idx < section.faqs.length - 1 ? S.border : undefined}>
                <FAQItem q={faq.q} a={faq.a} />
              </View>
            ))}
          </View>
        </View>
      ))}
    </SettingsLayout>
  );
}

const S = StyleSheet.create({
  intro:          { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 12 },
  contactBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, marginBottom: 24 },
  contactBtnText: { color: '#6366F1', fontWeight: '600', fontSize: 14 },
  section:        { marginBottom: 20 },
  sectionTitle:   { fontSize: 14, fontWeight: '700', color: '#0F0F1A', marginBottom: 10 },
  card:           { backgroundColor: '#FFF', borderRadius: 14, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: '#E5E7EB' },
  border:         { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F3F4F6' },
});

const F = StyleSheet.create({
  item:     { paddingHorizontal: 16 },
  question: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, gap: 8 },
  qText:    { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F0F1A', lineHeight: 20 },
  answer:   { fontSize: 14, color: '#374151', lineHeight: 22, paddingBottom: 14 },
});
