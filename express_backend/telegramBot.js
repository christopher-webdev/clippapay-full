// express_backend/telegramBot.js
import axios from 'axios';
import User from './models/User.js';

const BOT_TOKEN = '8387831510:AAFXC2lPWwPXlgWnW8BeA_G_kzYOwTfCekY';
const CHANNEL_ID = '@clippapay'; // Your public channel

export async function handleTelegramUpdate(update) {

  const chatId = update.message.from.id.toString();
  const telegramUsername = update.message.from.username ? `@${update.message.from.username}` : null;

  // Get payload after /start (this will be base64-encoded phone digits)
  const payload = update.message.text.trim().split(' ')[1];
  let phoneFromPayload = null;

  if (payload) {
    try {
      const decoded = Buffer.from(payload, 'base64').toString('utf-8');
      // Keep only digits
      const digitsOnly = decoded.replace(/\D/g, '');
      if (digitsOnly.length >= 10) {
        phoneFromPayload = digitsOnly;
      }
    } catch (e) {
      console.log("Invalid base64 payload");
    }
  }

  try {
    // Check if user is in the channel
    const memberCheck = await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/getChatMember`, {
      params: { chat_id: CHANNEL_ID, user_id: chatId },
      timeout: 8000,
    });

    const status = memberCheck.data.result?.status;
    const isMember = ['member', 'administrator', 'creator'].includes(status);

    if (!isMember) {
      return await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: `Please join our channel first to get verified!\n\nAfter joining, tap /start again.`,
        reply_markup: {
          inline_keyboard: [[{ text: 'Join ClippaPay Channel', url: 'https://t.me/clippapay' }]]
        }
      });
    }

    // USER IS IN CHANNEL → MARK AS VERIFIED USING PHONE
    let updated = false;

    if (phoneFromPayload) {
      const result = await User.updateOne(
        { phone: { $regex: phoneFromPayload, $options: 'i' }, role: 'clipper' }, // flexible match
        {
          $set: {
            telegramId: chatId,
            telegramUsername,
            hasJoinedTelegram: true,
          }
        }
      );
      if (result.matchedCount > 0) updated = true;
    }

    // Fallback: if phone not found, still mark this Telegram ID as verified
    if (!updated) {
      await User.updateOne(
        { telegramId: chatId },
        {
          $set: {
            telegramUsername,
            hasJoinedTelegram: true,
          }
        }
      );
    }

    // Success message
    await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      chat_id: chatId,
      text: `Success! Your Telegram is verified!\n\nYou can now close this chat and go back to ClippaPay.`,
      reply_markup: {
        inline_keyboard: [[{ text: 'Open ClippaPay', url: 'https://clippapay.com/dashboard' }]]
      }
    });

  } catch (err) {
    console.error('Telegram Bot Error:', err.response?.data || err.message);

    try {
      await axios.post(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: `Error occurred. Please try again later.`,
      });
    } catch {}
  }
}