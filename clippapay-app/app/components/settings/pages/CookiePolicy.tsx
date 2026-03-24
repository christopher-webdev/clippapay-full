import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function CookiePolicy() {
  return (
    <SettingsLayout title="Cookie Policy">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
          { body: 'This Cookie Policy explains how ClippaPay (operated by Clippa Digital Hub LTD) uses cookies and similar tracking technologies in our mobile application and website.' },
          { heading: '1. What Are Cookies?', body: 'Cookies are small data files stored on your device that help us recognise you and understand how you use our platform. In our mobile app, we use similar technologies including local storage and device identifiers.' },
          { heading: '2. Types We Use', body: 'Essential: Required for the app to function, including session tokens and authentication data. Analytics: Tools like Google Analytics to understand user behaviour and improve the platform. Marketing: Used to measure campaign effectiveness and retarget users on Meta (Facebook/Instagram) and Google.' },
          { heading: '3. Affiliate Tracking', body: 'For our UGC Affiliate model, we use tracking cookies with a 30-day window to accurately credit creators for sales they generate. This tracking is essential to our affiliate payout system.' },
          { heading: '4. Your Choices', body: 'You can manage analytics and marketing tracking in your device settings. Affiliate tracking cannot be disabled if you are participating in affiliate campaigns, as it is necessary to calculate your earnings.' },
          { heading: '5. Third-Party Cookies', body: 'Some features integrate with third-party services (e.g. Meta Pixel, Paystack). These third parties may set their own tracking technologies governed by their own privacy policies.' },
          { heading: '6. Contact', body: 'For questions about tracking: privacy@clippapay.com' },
        ]}
      />
    </SettingsLayout>
  );
}
