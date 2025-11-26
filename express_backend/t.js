// test-telegram.js - Run this to test your Telegram integration
import { sendTelegramCampaignAlert, getBotInfo, getChatUpdates } from './utils/telegram.js';

// Test campaign data
const testCampaign = {
  _id: '657a1b2c3d4e5f6a7b8c9d0e',
  title: '🚀 Test Campaign - Amazing Product Launch',
  kind: 'ugc',
  clipperPayoutRate: 7500,
  desiredVideos: 25,
  totalViews: 100000,
  status: 'active'
};

async function runTests() {
  console.log('🧪 Starting Telegram Integration Tests...\n');
  
  try {
    // Test 1: Check bot token
    console.log('1. Testing bot token...');
    await getBotInfo();
    console.log('✅ Bot token is valid\n');
    
    // Test 2: Get channel updates to find correct ID
    console.log('2. Checking for channel updates...');
    const updates = await getChatUpdates();
    
    if (updates.length > 0) {
      console.log('✅ Found updates. Check the Chat IDs above.\n');
    } else {
      console.log('ℹ️  No updates found. Make sure to:\n');
      console.log('   - Add your bot to your channel as admin');
      console.log('   - Send a message in the channel');
      console.log('   - Then run this test again\n');
    }
    
    // Test 3: Send test campaign alert
    console.log('3. Sending test campaign alert...');
    const result = await sendTelegramCampaignAlert(testCampaign);
    console.log('✅ Test campaign alert sent successfully!\n');
    
    console.log('🎉 ALL TESTS PASSED! Your Telegram integration is working correctly.');
    
  } catch (error) {
    console.error('\n💥 TESTS FAILED:', error.message);
    
    // Provide specific solutions based on the error
    if (error.response?.data?.description?.includes('chat not found')) {
      console.log('\n💡 SOLUTION:');
      console.log('1. Get your correct channel ID by:');
      console.log('   - Adding @userinfobot to your channel');
      console.log('   - Sending any message in the channel');
      console.log('   - The bot will reply with the correct Chat ID');
      console.log('2. Update CHANNEL_ID in utils/telegram.js');
      console.log('3. Run this test again');
    } else if (error.response?.data?.description?.includes('bot was blocked')) {
      console.log('\n💡 SOLUTION:');
      console.log('1. Unblock the bot in your channel settings');
      console.log('2. Make sure the bot has "Post Messages" permission');
    } else if (error.response?.data?.description?.includes('Not Found')) {
      console.log('\n💡 SOLUTION:');
      console.log('1. Check your BOT_TOKEN is correct');
      console.log('2. Make sure the bot exists and is activated');
    }
    
    process.exit(1);
  }
}

// Run the tests
runTests();