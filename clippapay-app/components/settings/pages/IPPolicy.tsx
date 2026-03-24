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
          { heading: '1. Creator-Owned Content', body: 'Creators retain full ownership of the original content they produce. By submitting content to a campaign, you represent that you are the original creator and own all necessary rights to the content, including any music, visuals, or third-party material included until the content is approved for use by the commissioning brand.' },
          { heading: '2. Licence Granted to Brands', body: 'Upon content approval and release of payment, creators grant the commissioning brand a non-exclusive, royalty-free, worldwide licence to use, reproduce, and distribute the approved content for the campaign duration and scope specified in the brief. Extended or perpetual usage rights must be negotiated separately and compensated accordingly.' },
          { heading: '3. ClippaPay Platform Content', body: 'All ClippaPay branding, logos, design, code, and platform content are the exclusive property of Clippa Digital Hub LTD and protected under Nigerian and international intellectual property law. You may not reproduce, copy, or distribute our brand assets without written permission.' },
          { heading: '4. Copyright Infringement', body: 'Do not submit content that infringes third-party copyright — including using copyrighted music, video clips, images, or trademarked material without a valid licence. Copyright violations will result in content removal, earnings withholding, and account suspension. Repeat infringers will be permanently banned.' },
          { heading: '5. DMCA / Copyright Takedown', body: 'If you believe your copyrighted work has been used on ClippaPay without authorisation, submit a takedown request to: reach@clippapay.com with: (a) description of the work; (b) URL/location of the infringing content; (c) your contact details; (d) a statement of good faith belief; (e) your signature.' },
          { heading: '6. User-Generated Content Licence to ClippaPay', body: 'By uploading content to ClippaPay, you grant us a limited, non-exclusive licence to display, reproduce, and use your content solely for operating the platform (e.g., displaying campaign submissions to brands). We do not claim ownership of your content.' },
          { heading: '7. Contact', body: 'IP and copyright queries: reach@clippapay.com' },
        ]}
      />
    </SettingsLayout>
  );
}
