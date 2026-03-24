import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function PrivacyPolicy() {
  return (
    <SettingsLayout title="Privacy Policy">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
          { body: 'ClippaPay, operated by Clippa Digital Hub LTD ("we", "our", or "us"), is committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and share your data when you use our mobile application and services.' },
          { heading: '1. Information We Collect', body: 'We collect information you provide directly, including your name, email address, phone number, bank account details, BVN (for identity verification where required), profile photo, and business information. We also automatically collect device information, IP address, usage data, and content you upload or create on the platform.' },
          { heading: '2. How We Use Your Information', body: 'We use your information to: create and manage your account; process payments and payouts; match creators with brand campaigns; verify your identity and prevent fraud; send notifications about campaigns and earnings; improve our platform and services; and comply with applicable Nigerian law and regulatory requirements including the Nigeria Data Protection Act 2023 (NDPA).' },
          { heading: '3. Data Sharing', body: 'We do not sell your personal data. We may share your information with brand partners for campaign purposes (limited to what is strictly necessary), payment processors such as Paystack, identity verification providers, and government authorities where required by Nigerian law. All third parties are contractually bound by confidentiality obligations.' },
          { heading: '4. Data Storage & Security', body: 'Your data is stored on secure servers protected by industry-standard encryption (TLS/SSL) for data in transit and at rest. We retain your data for as long as your account is active or as required by law. You may request deletion of your account and associated data at any time.' },
          { heading: '5. Your Rights Under the NDPA', body: 'You have the right to: access your personal data held by us; correct inaccurate information; request erasure of your data; object to processing; withdraw consent for marketing communications; and lodge a complaint with the Nigeria Data Protection Commission (NDPC) at ndpc.gov.ng.' },
          { heading: '6. Cookies & Tracking', body: 'Our app uses analytics tools and tracking technologies to understand usage patterns and improve user experience. See our Cookie Policy for full details.' },
          { heading: '7. Children\'s Privacy', body: 'ClippaPay is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If we become aware of such data, we will delete it immediately.' },
          { heading: '8. Changes to This Policy', body: 'We may update this Privacy Policy from time to time. We will notify you of material changes via the app or by email. Continued use of the platform after changes constitute acceptance.' },
          { heading: '9. Contact', body: 'For privacy enquiries: reach@clippapay.com | +234 805 335 3964' },
        ]}
      />
    </SettingsLayout>
  );
}
