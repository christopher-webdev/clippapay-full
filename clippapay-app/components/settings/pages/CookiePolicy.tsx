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
          { heading: '1. What Are Cookies?', body: 'Cookies are small data files stored on your device that help us recognise you, remember your preferences, and understand how you use our platform. In our mobile app, we use similar technologies including local storage and device identifiers.' },
          { heading: '2. Types of Technologies We Use', body: 'Essential technologies: Required for the app to function, including session tokens and authentication data. Analytics technologies: We use tools like Google Analytics and similar services to understand user behaviour, track feature usage, and improve the platform. Marketing technologies: Used to measure the effectiveness of our campaigns and retarget users on third-party platforms including Meta (Facebook/Instagram) and Google.' },
          { heading: '3. Affiliate Tracking', body: 'For our UGC Affiliate model, we use tracking cookies and attribution links with a 30-day window to accurately credit creators for sales they generate. This tracking is essential to our affiliate payout system.' },
          { heading: '4. Your Choices', body: 'You can manage analytics and marketing tracking in your device settings or by contacting us. Note that disabling essential tracking technologies may affect the functionality of the app. Affiliate tracking cannot be disabled if you are participating in affiliate campaigns, as it is necessary to calculate your earnings.' },
          { heading: '5. Third-Party Cookies', body: 'Some features of our platform integrate with third-party services (e.g., Meta Pixel for ad measurement, Paystack for payments). These third parties may set their own cookies or tracking technologies governed by their respective privacy policies.' },
          { heading: '6. Updates', body: 'We may update this policy as we add new features or tracking technologies. We will notify you of material changes in the app.' },
          { heading: '7. Contact', body: 'For questions about tracking: reach@clippapay.com' },
        ]}
      />
    </SettingsLayout>
  );
}
