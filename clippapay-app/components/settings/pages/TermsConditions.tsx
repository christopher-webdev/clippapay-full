import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function TermsConditions() {
  return (
    <SettingsLayout title="Terms & Conditions">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
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
        ]}
      />
    </SettingsLayout>
  );
}
