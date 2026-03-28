// src/pages/Terms.tsx
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';

const SECTIONS = [
          { body: 'These Terms & Conditions ("Terms") govern your use of the ClippaPay platform ("Platform") operated by Clippa Digital Hub LTD, a company registered in Nigeria ("Company"). By creating an account or using the Platform, you agree to these Terms.' },
          { heading: '1. Eligibility', body: 'You must be at least 18 years old and capable of entering a legally binding agreement under Nigerian law to use ClippaPay. By registering, you confirm that all information you provide is accurate and complete.' },
          { heading: '2. Platform Services', body: 'ClippaPay provides three core services: (a) UGC Creation — enabling brands to post campaigns and receive bids from vetted creators who produce authentic short-form content; (b) Clipping — enabling creators to clip long-form brand content into short-form videos distributed across social platforms, earning per verified view; (c) UGC Affiliate — enabling creators to earn commissions on sales generated via unique referral links.' },
          { heading: '3. Creator Obligations', body: 'Creators agree to: produce original content that meets campaign briefs; not engage in view fraud, bot traffic, or artificial inflation of performance metrics; only submit work that they own or have rights to; comply with the Community Guidelines; and accurately report performance data.' },
          { heading: '4. Brand/Advertiser Obligations', body: 'Brands agree to: fund campaigns in full before creator work begins; provide clear and lawful campaign briefs; approve or request revisions within 2 business days of content submission; not misuse creator-produced content beyond the agreed campaign scope.' },
          { heading: '5. Payments & Fees', body: 'Brand payments are held in escrow by ClippaPay and released to creators upon content approval or verified performance milestones. ClippaPay charges a platform service fee on each transaction as disclosed at the point of campaign creation. Creator payouts are processed within 3 business days of approval to verified Nigerian bank accounts or USDT wallets.' },
          { heading: '6. Intellectual Property', body: 'Creators retain ownership of original content they produce. By submitting content to a campaign, creators grant the commissioning brand a non-exclusive, royalty-free licence to use that content for the agreed campaign duration and scope. See our Intellectual Property Policy for full details.' },
          { heading: '7. Prohibited Activities', body: 'Users may not: submit fraudulent content or performance data; harass, impersonate, or defame other users; use the platform to distribute illegal content; attempt to bypass the platform to conduct off-platform deals with matched partners; or violate any applicable Nigerian or international law.' },
          { heading: '8. Termination', body: 'ClippaPay may suspend or terminate your account for violation of these Terms, fraud, or any conduct deemed harmful to the platform community. Users may terminate their account at any time by contacting support.' },
          { heading: '9. Limitation of Liability', body: 'To the maximum extent permitted by Nigerian law, Clippa Digital Hub LTD shall not be liable for indirect, incidental, or consequential damages arising from use of the Platform. Our total liability shall not exceed the total fees paid by you in the 3 months preceding the claim.' },
          { heading: '10. Governing Law', body: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved by the courts of Abuja, Nigeria.' },
          { heading: '11. Contact', body: 'For Terms-related queries: reach@clippapay.com' },
];

export default function Terms() {
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
        <div style={{ display: 'inline-block', fontSize: 12, fontWeight: 700, letterSpacing: 1.5, color: '#FF5F38', background: '#FF5F3818', borderRadius: 8, padding: '4px 12px', marginBottom: 20, textTransform: 'uppercase' }}>
          Legal
        </div>
        <h1 style={{ fontSize: 'clamp(32px, 6vw, 52px)', fontWeight: 800, color: '#fff', lineHeight: 1.1, marginBottom: 16, letterSpacing: -1 }}>
          Terms &amp; Conditions
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
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginBottom: 12, paddingLeft: 16, borderLeft: '3px solid #FF5F38' }}>
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
            <Link to="/privacy" style={{ fontSize: 14, fontWeight: 600, color: '#A78BFA', textDecoration: 'none' }}>
              Privacy Policy →
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