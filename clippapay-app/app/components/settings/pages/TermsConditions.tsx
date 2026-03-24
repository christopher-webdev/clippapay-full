import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function TermsConditions() {
  return (
    <SettingsLayout title="Terms & Conditions">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
          { body: 'These Terms & Conditions ("Terms") govern your use of the ClippaPay platform operated by Clippa Digital Hub LTD. By creating an account or using the Platform, you agree to these Terms.' },
          { heading: '1. Eligibility', body: 'You must be at least 18 years old and capable of entering a legally binding agreement under Nigerian law to use ClippaPay.' },
          { heading: '2. Platform Services', body: 'ClippaPay provides three core services: (a) UGC Creation — brands post campaigns and vetted creators bid to produce authentic short-form content; (b) Clipping — creators clip long-form brand content into short-form videos, earning per verified view; (c) UGC Affiliate — creators earn commissions on sales via unique referral links.' },
          { heading: '3. Creator Obligations', body: 'Creators agree to: produce original content that meets campaign briefs; not engage in view fraud, bot traffic, or artificial inflation of metrics; only submit work they own or have rights to; comply with Community Guidelines; and accurately report performance data.' },
          { heading: '4. Brand Obligations', body: 'Brands agree to: fund campaigns in full before creator work begins; provide clear and lawful campaign briefs; approve or request revisions within 5 business days of content submission.' },
          { heading: '5. Payments & Fees', body: 'Brand payments are held in escrow and released upon content approval. ClippaPay charges a platform service fee disclosed at campaign creation. Creator payouts are processed within 3–7 business days to verified Nigerian bank accounts.' },
          { heading: '6. Intellectual Property', body: 'Creators retain ownership of original content. By submitting to a campaign, creators grant the brand a non-exclusive, royalty-free licence for the agreed scope and duration.' },
          { heading: '7. Prohibited Activities', body: 'Users may not submit fraudulent data, harass other users, distribute illegal content, or attempt to circumvent the platform to conduct off-platform deals with matched partners within 12 months of matching.' },
          { heading: '8. Termination', body: 'ClippaPay may suspend or terminate your account for violation of these Terms. Users may terminate their account at any time by contacting support.' },
          { heading: '9. Limitation of Liability', body: 'To the maximum extent permitted by Nigerian law, our total liability shall not exceed the total fees paid by you in the 3 months preceding the claim.' },
          { heading: '10. Governing Law', body: 'These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes shall be resolved by the courts of Lagos State.' },
          { heading: '11. Contact', body: 'For Terms-related queries: legal@clippapay.com | reach@clippapay.com' },
        ]}
      />
    </SettingsLayout>
  );
}
