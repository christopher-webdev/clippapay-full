import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function IPPolicy() {
  return (
    <SettingsLayout title="Intellectual Property">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
          { body: 'This Intellectual Property Policy explains how ownership of content, trademarks, and creative work is handled on the ClippaPay platform.' },
          { heading: '1. Creator-Owned Content', body: 'Creators retain full ownership of original content they produce. By submitting content to a campaign, you represent that you are the original creator and own all necessary rights, including any music, visuals, or third-party material included.' },
          { heading: '2. Licence Granted to Brands', body: 'Upon content approval and payment, creators grant the commissioning brand a non-exclusive, royalty-free, worldwide licence to use the content for the campaign duration and scope specified in the brief. Extended or perpetual usage rights must be negotiated separately.' },
          { heading: '3. ClippaPay Platform Content', body: 'All ClippaPay branding, logos, design, code, and platform content are the exclusive property of Clippa Digital Hub LTD. You may not reproduce or distribute our brand assets without written permission.' },
          { heading: '4. Copyright Infringement', body: 'Do not submit content that infringes third-party copyright — including using copyrighted music, video clips, images, or trademarked material without a valid licence. Violations will result in content removal, earnings withholding, and account suspension.' },
          { heading: '5. Copyright Takedown', body: 'If you believe your copyrighted work has been used without authorisation, submit a request to legal@clippapay.com with: (a) description of the work; (b) location of the infringing content; (c) your contact details; (d) a statement of good faith belief.' },
          { heading: '6. Contact', body: 'IP and copyright queries: legal@clippapay.com' },
        ]}
      />
    </SettingsLayout>
  );
}
