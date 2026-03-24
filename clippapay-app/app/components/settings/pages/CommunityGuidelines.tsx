import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function CommunityGuidelines() {
  return (
    <SettingsLayout title="Community Guidelines">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
          { body: 'ClippaPay is a professional creator economy platform connecting African creators and brands. These Community Guidelines exist to ensure a safe, fair, and high-quality environment for everyone.' },
          { heading: '1. Be Authentic', body: 'All content submitted on ClippaPay must be genuine. Do not submit AI-generated content as original UGC, misrepresent your engagement metrics, or artificially inflate views, clicks, or conversions. Fraudulent activity will result in immediate account suspension and withholding of earnings.' },
          { heading: '2. Respect All Users', body: 'Treat every brand partner, fellow creator, and ClippaPay team member with respect. Harassment, hate speech, or discrimination based on ethnicity, religion, gender, sexual orientation, or disability will not be tolerated.' },
          { heading: '3. Create Quality Content', body: 'Content submitted to campaigns must be well-produced, on-brief, and represent the brand positively and truthfully. Do not make false claims about products. Adhere to advertising disclosure requirements (e.g. #ad, #sponsored) as required by Nigerian Consumer Protection law.' },
          { heading: '4. Protect Privacy', body: 'Do not include identifiable individuals in your content without their explicit consent. Do not share personal information about other users or third parties without authorisation.' },
          { heading: '5. No Harmful Content', body: 'Content promoting violence, illegal activities, explicit sexual material, drug use, self-harm, or content harmful to minors is strictly prohibited and will be reported to relevant authorities.' },
          { heading: '6. Honour Your Commitments', body: 'If you accept a campaign brief, complete it by the agreed deadline. Consistently abandoning campaigns or missing deadlines will result in reduced campaign access and potential account suspension.' },
          { heading: '7. No Platform Circumvention', body: 'Attempting to take brand deals or creator relationships off-platform to avoid ClippaPay fees within 12 months of a match is a breach of these guidelines and our Terms of Service.' },
          { heading: '8. Reporting Violations', body: 'Report violations through the in-app report function or email trust@clippapay.com. We investigate all reports and take appropriate action.' },
        ]}
      />
    </SettingsLayout>
  );
}
