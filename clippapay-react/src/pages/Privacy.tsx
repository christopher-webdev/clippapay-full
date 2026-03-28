// src/pages/Privacy.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
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
        ];

export default function Privacy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div style={{ background: '#060608', minHeight: '100vh', fontFamily: "'Outfit', sans-serif", color: '#e5e7eb' }}>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 200, background: '#060608CC', backdropFilter: 'blur(16px)', borderBottom: '2px solid #ffffff14', padding: '18px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontSize: 22, fontWeight: 800, background: 'linear-gradient(135deg, #FF5F38, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ClippaPay
          </span>
        </Link>
        <Link to="/" style={{ textDecoration: 'none', fontSize: 14, fontWeight: 600, color: '#9ca3af', border: '1.5px solid #ffffff22', borderRadius: 10, padding: '8px 18px' }}>
          ← Back to Home
        </Link>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '64px 24px 0' }}>
        <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#A78BFA', background: '#A78BFA18', borderRadius: 8, padding: '4px 12px', marginBottom: 20, textTransform: 'uppercase' }}>
          Legal
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 16, letterSpacing: -1 }}>
          Privacy Policy
        </h1>
        <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.7, marginBottom: 8 }}>
          Effective date: <strong style={{ color: '#e5e7eb' }}>1 April 2025</strong>
        </p>
        <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.7, marginBottom: 48 }}>
          Operated by <strong style={{ color: '#e5e7eb' }}>Clippa Digital Hub LTD</strong>
        </p>
      </div>

      {/* Divider */}
      <div style={{ maxWidth: 760, margin: '0 auto 48px', padding: '0 24px' }}>
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #ffffff22, transparent)' }} />
      </div>

      {/* Content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px 100px' }}>
        {SECTIONS.map((section, i) => (
          <div key={i} style={{ marginBottom: 40 }}>
            {section.heading && (
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 12, paddingLeft: 16, borderLeft: '3px solid #A78BFA' }}>
                {section.heading}
              </h2>
            )}
            <p style={{ fontSize: 16, color: '#9ca3af', lineHeight: 1.8, paddingLeft: section.heading ? 16 : 0 }}>
              {section.body}
            </p>
          </div>
        ))}

        {/* Footer note */}
        <div style={{ marginTop: 64, padding: '28px 32px', background: '#ffffff08', borderRadius: 16, border: '1.5px solid #ffffff14', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 16 }}>
            Also available in our mobile app
          </p>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/terms" style={{ fontSize: 14, fontWeight: 600, color: '#FF5F38', textDecoration: 'none' }}>
              Terms of Service →
            </Link>
            <Link to="/login" style={{ fontSize: 14, fontWeight: 600, color: '#FF5F38', textDecoration: 'none' }}>
              Log In →
            </Link>
            <Link to="/signup" style={{ fontSize: 14, fontWeight: 600, color: '#34d399', textDecoration: 'none' }}>
              Sign Up →
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '2px solid #ffffff14', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <span style={{ fontSize: 14, color: '#4b5563' }}>© 2026 Clippa Digital Hub LTD. All rights reserved.</span>
        <div style={{ display: 'flex', gap: 20 }}>
          <Link to="/terms" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>Terms</Link>
          <Link to="/privacy" style={{ fontSize: 14, color: '#6b7280', textDecoration: 'none' }}>Privacy</Link>
        </div>
      </footer>
    </div>
  );
}