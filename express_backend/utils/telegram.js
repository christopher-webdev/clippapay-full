// utils/telegram.js
import axios from 'axios';

const BOT_TOKEN = '8387831510:AAFXC2lPWwPXlgWnW8BeA_G_kzYOwTfCekY'; //82206563
const CHANNEL_ID = '8387831510';           // ← Replace with your channel ID

export async function sendTelegramCampaignAlert(campaign) {
  const title = campaign.title;
  const kind = campaign.kind === 'pgc' ? 'PGC (Professional Video)' 
             : campaign.kind === 'ugc' ? 'UGC (Create Your Own)' 
             : campaign.kind === 'normal' ? 'Normal Video' 
             : 'Unknown Type';

  const payout = campaign.clipperPayoutRate 
    ? `₦${campaign.clipperPayoutRate.toLocaleString()} per 1k views`
    : campaign.payPerView 
    ? `₦${campaign.payPerView.toLocaleString()} per 1k views`
    : 'Check details';

  const total = campaign.desiredVideos 
    ? `${campaign.desiredVideos} videos needed`
    : campaign.totalViews 
    ? `${campaign.totalViews.toLocaleString()} views`
    : 'Unlimited';

  const link = `https://clippapay.com/campaigns/${campaign._id}`;  // ← Change to your real domain

  const message = `
*NEW CAMPAIGN ALERT!*

*${title}*  
Type: ${kind}
Reward: ${payout}
Goal: ${total}

Join fast before it's full!

[Open Campaign Now](${link})
  `.trim();

  try {
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: CHANNEL_ID,
      text: message,
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
    console.log('Telegram alert sent!');
  } catch (err) {
    console.error('Failed to send Telegram message:', err.response?.data || err.message);
  }
}