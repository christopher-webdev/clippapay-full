import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function EULA() {
  return (
    <SettingsLayout title="End User License Agreement">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
          { body: 'This End User License Agreement ("EULA") is a legal agreement between you and Clippa Digital Hub LTD ("Company") for use of the ClippaPay mobile application ("App"). By downloading or using the App, you agree to be bound by this EULA.' },
          { heading: '1. Licence Grant', body: 'The Company grants you a limited, non-exclusive, non-transferable, revocable licence to install and use the App on devices you own or control, solely for your personal or business use in accordance with this EULA.' },
          { heading: '2. Restrictions', body: 'You may not: copy, modify, or distribute the App; reverse engineer or attempt to extract source code; rent, lease, or lend the App to third parties; remove any proprietary notices; or use the App in any way that violates applicable law.' },
          { heading: '3. App Store Terms', body: 'If you downloaded the App from the Google Play Store or Apple App Store, the relevant store\'s terms of service also apply. In the event of a conflict, this EULA governs your relationship with Clippa Digital Hub LTD.' },
          { heading: '4. Updates', body: 'The Company may provide updates to the App from time to time. Updates may be automatic. By continuing to use the App after an update, you agree to the updated terms.' },
          { heading: '5. Intellectual Property', body: 'The App and all content, features, and functionality are owned by Clippa Digital Hub LTD and protected by Nigerian and international intellectual property laws. This EULA does not grant you any ownership rights.' },
          { heading: '6. Termination', body: 'This licence is effective until terminated. Your rights under this EULA will terminate automatically without notice if you fail to comply with any term. Upon termination, you must stop using and delete the App.' },
          { heading: '7. Disclaimer of Warranties', body: 'The App is provided "as is" without warranties of any kind. The Company does not warrant that the App will be uninterrupted, error-free, or free of viruses.' },
          { heading: '8. Limitation of Liability', body: 'To the maximum extent permitted by Nigerian law, the Company shall not be liable for any indirect, incidental, or consequential damages arising from your use of the App.' },
          { heading: '9. Governing Law', body: 'This EULA is governed by the laws of the Federal Republic of Nigeria.' },
          { heading: '10. Contact', body: 'For EULA enquiries: reach@clippapay.com' },
        ]}
      />
    </SettingsLayout>
  );
}
