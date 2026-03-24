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
          { heading: '1. Campaign Funding (Brands)', body: 'Brands must fund a campaign in full before it is published and made available to creators. Funds are held in escrow by ClippaPay and are only released to creators upon content approval or verified performance milestones.' },
          { heading: '2. Creator Payouts', body: 'Approved earnings are processed within 3 business days to your verified Nigerian bank account or USDT wallet. Clipper (view-based) earnings are calculated once views are verified and can be withdrawn immediately.' },
          { heading: '3. Platform Fees', body: 'ClippaPay shares from the campaign funds as a service fee on each campaign.' },
          { heading: '4. Brand Refunds', body: 'Brands may request a full refund of undisbursed campaign funds if: no creator has been assigned within 14 days of campaign publication; or the campaign is cancelled before any creator begins work. Partial refunds may be issued for unused portions of a campaign after creator work has begun, subject to review. Refunds are processed within 3-7 business days.' },
          { heading: '5. Creator Earnings Disputes', body: 'If you believe your earnings have been incorrectly calculated, you must raise a dispute within 14 days of the payout date by emailing reach@clippapay.com with relevant evidence. ClippaPay will review and respond within 5 business days.' },
          { heading: '6. Fraud & Chargebacks', body: 'Any account found to have engaged in fraudulent transactions, fake views, or payment fraud will have all pending earnings forfeited and the account permanently terminated. ClippaPay reserves the right to pursue legal action for financial losses caused by fraud.' },
          { heading: '7. Payment Methods', body: 'ClippaPay currently supports Nigerian bank account transfers and crypto USDT for paying and payout transactions. Additional payment methods including USD payouts will be added as the platform expands.' },
          { heading: '8. Contact', body: 'For payment queries: payments@clippapay.com | reach@clippapay.com | +234 805 335 3964' },
        ]}
      />
    </SettingsLayout>
  );
}
