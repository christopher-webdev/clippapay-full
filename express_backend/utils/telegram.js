// utils/telegram.js
import axios from 'axios';

const BOT_TOKEN = '8224906351:AAG0izS9EGbl4yVIfP3Y4r4PA9cug83uxb4';
// IMPORTANT: Replace with your actual channel ID (starts with -100 for public channels)
const CHANNEL_ID = '-1003029768996'; 

/**
 * Send campaign alert to Telegram channel using HTML formatting
 */
export async function sendTelegramCampaignAlert(campaign) {
  try {
    console.log('📢 Sending Telegram alert for campaign:', campaign.title);
    
    const kind = campaign.kind === 'pgc' ? 'PGC (Professional Video)' 
               : campaign.kind === 'ugc' ? 'UGC (Create Your Own)' 
               : campaign.kind === 'normal' ? 'Normal Video' 
               : 'Unknown Type';

    const payout = campaign.clipperPayoutRate 
      ? `₦${Number(campaign.clipperPayoutRate).toLocaleString()} per 1k views`
      : campaign.payPerView 
      ? `₦${Number(campaign.payPerView).toLocaleString()} per 1k views`
      : 'Check details';

    const total = campaign.desiredVideos 
      ? `${campaign.desiredVideos} videos needed`
      : campaign.totalViews 
      ? `${Number(campaign.totalViews).toLocaleString()} views`
      : 'Unlimited';

    const link = `https://clippapay.com/campaigns/${campaign._id}`;

    const message = `
<b>🎯 NEW CAMPAIGN ALERT!</b>

<b>${campaign.title}</b>
🏷️ <b>Type:</b> ${kind}
💰 <b>Reward:</b> ${payout}
🎯 <b>Goal:</b> ${total}

⚡ Join fast before it's full!

<a href="${link}">📱 Open Campaign Now</a>
    `.trim();

    console.log('Telegram message prepared:', message);

    const response = await axios.post(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        chat_id: CHANNEL_ID,
        text: message,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      },
      {
        timeout: 10000
      }
    );

    console.log('✅ Telegram alert sent successfully!');
    console.log('Message ID:', response.data.result.message_id);
    return response.data;
    
  } catch (err) {
    const errorDetails = {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
      channelId: CHANNEL_ID
    };
    
    console.error('❌ Failed to send Telegram message:', errorDetails);
    
    // More specific error messages
    if (err.response?.data?.description?.includes('chat not found')) {
      console.error('💡 Solution: Check your CHANNEL_ID - it should start with -100 for public channels');
    } else if (err.response?.data?.description?.includes('bot was blocked')) {
      console.error('💡 Solution: The bot was blocked by the channel. Unblock it first.');
    } else if (err.response?.data?.description?.includes('Not Found')) {
      console.error('💡 Solution: Check your BOT_TOKEN - it might be invalid');
    }
    
    throw err;
  }
}

/**
 * Get bot info to verify token is working
 */
export async function getBotInfo() {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getMe`,
      { timeout: 5000 }
    );
    console.log('🤖 Bot Info:', response.data.result);
    return response.data;
  } catch (err) {
    console.error('❌ Failed to get bot info:', err.response?.data || err.message);
    throw err;
  }
}

/**
 * Get recent updates to find correct channel ID
 */
export async function getChatUpdates() {
  try {
    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`,
      { timeout: 5000 }
    );
    
    console.log('📋 Recent updates:');
    const updates = response.data.result;
    
    if (updates.length === 0) {
      console.log('No updates found. Send a message to your channel first.');
      return [];
    }
    
    updates.forEach((update, index) => {
      console.log(`\n--- Update ${index + 1} ---`);
      if (update.channel_post) {
        console.log('📢 CHANNEL POST:');
        console.log('   Chat ID:', update.channel_post.chat.id);
        console.log('   Chat Title:', update.channel_post.chat.title);
        console.log('   Chat Type:', update.channel_post.chat.type);
      } else if (update.message) {
        console.log('💬 MESSAGE:');
        console.log('   Chat ID:', update.message.chat.id);
        console.log('   Chat Title:', update.message.chat.title || update.message.chat.first_name);
        console.log('   Chat Type:', update.message.chat.type);
      }
    });
    
    return updates;
  } catch (err) {
    console.error('❌ Failed to get updates:', err.response?.data || err.message);
    throw err;
  }
}