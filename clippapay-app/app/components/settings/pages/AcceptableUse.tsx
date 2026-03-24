import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function AcceptableUse() {
  return (
    <SettingsLayout title="Acceptable Use Policy">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
          { body: 'This Acceptable Use Policy ("AUP") sets out the rules for using the ClippaPay platform. All users — creators, brands, and visitors — must comply with this AUP.' },
          { heading: '1. Permitted Use', body: 'The Platform may only be used for its intended purpose: connecting brands with content creators for legitimate marketing campaigns, content production, and affiliate marketing activities.' },
          { heading: '2. Prohibited Content', body: 'You must not use ClippaPay to create, submit, or promote: (a) illegal content under Nigerian or applicable international law; (b) content promoting violence, terrorism, or extremism; (c) sexually explicit material; (d) content harmful to minors; (e) misleading advertising that violates Nigerian consumer protection laws; (f) defamatory or abusive content.' },
          { heading: '3. Prohibited Technical Activities', body: 'You must not: hack or reverse engineer the Platform; use bots to artificially inflate metrics; scrape Platform data without written permission; introduce malware; or attempt to gain unauthorised access to other accounts.' },
          { heading: '4. Prohibited Commercial Activities', body: 'Using the Platform to operate competing services, spam other users, or circumvent the platform to conduct off-platform deals with ClippaPay-matched partners within 12 months is strictly prohibited.' },
          { heading: '5. Compliance with Law', body: 'Users must comply with all applicable Nigerian laws including the Nigeria Data Protection Act 2023, Consumer Protection Council Act, Copyright Act, and guidelines issued by the Advertising Regulatory Council of Nigeria (ARCON).' },
          { heading: '6. Enforcement', body: 'Violation of this AUP may result in content removal, account suspension, withholding of earnings, and legal action. We reserve the right to report illegal activity to appropriate authorities.' },
          { heading: '7. Contact', body: 'To report AUP violations: trust@clippapay.com' },
        ]}
      />
    </SettingsLayout>
  );
}
