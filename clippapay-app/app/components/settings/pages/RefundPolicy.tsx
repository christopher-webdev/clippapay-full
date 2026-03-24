import React from 'react';
import SettingsLayout from '../SettingsLayout';
import LegalPage from '../LegalPage';

export default function RefundPolicy() {
  return (
    <SettingsLayout title="Refund & Payment Policy">
      <LegalPage
        effectiveDate="1 April 2025"
        sections={[
          { body: 'This policy governs all financial transactions on the ClippaPay platform, including campaign funding, creator payouts, and refund requests.' },
          { heading: '1. Campaign Funding (Brands)', body: 'Brands must fund a campaign in full before it is published. Funds are held in escrow by ClippaPay and only released to creators upon content approval or verified performance milestones.' },
          { heading: '2. Creator Payouts', body: 'Approved UGC earnings are processed within 3–7 business days to your verified Nigerian bank account. Clipper (view-based) earnings are calculated weekly every Monday for the prior week and paid within 5 business days. Affiliate commissions are processed 30 days after a verified sale.' },
          { heading: '3. Platform Fees', body: 'ClippaPay charges a service fee on each transaction, disclosed at campaign creation (for brands) and at campaign acceptance (for creators). Fees are non-refundable once a campaign is active.' },
          { heading: '4. Brand Refunds', body: 'Brands may request a full refund of undisbursed campaign funds if: no creator has been assigned within 14 days of campaign publication; or the campaign is cancelled before any creator begins work. Partial refunds may be issued for unused portions after creator work has begun, subject to review. Refunds are processed within 7–14 business days.' },
          { heading: '5. Creator Earnings Disputes', body: 'If you believe your earnings have been incorrectly calculated, raise a dispute within 14 days of the payout date by emailing payments@clippapay.com with relevant evidence. ClippaPay will review and respond within 5 business days.' },
          { heading: '6. Fraud', body: 'Any account found to have engaged in fraudulent transactions, fake views, or payment fraud will have all pending earnings forfeited and the account permanently terminated.' },
          { heading: '7. Contact', body: 'For payment queries: payments@clippapay.com | reach@clippapay.com | +234 805 335 3964' },
        ]}
      />
    </SettingsLayout>
  );
}
