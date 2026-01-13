/**
 * Trigger headline refresh by calling the cron endpoint
 * This can call either the local dev server or the production URL
 *
 * Usage:
 *   node scripts/trigger-refresh.js
 *   node scripts/trigger-refresh.js https://your-app.onrender.com
 */

const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

async function triggerRefresh() {
  // Get base URL from args or default to localhost
  const baseUrl = process.argv[2] || 'http://localhost:3000';
  const secret = process.env.CRON_SECRET || 'dev-secret-change-in-production';

  const url = `${baseUrl}/api/cron/refresh-headlines?secret=${encodeURIComponent(secret)}`;

  console.log('🚀 Triggering headline refresh...');
  console.log(`📡 Calling: ${baseUrl}/api/cron/refresh-headlines`);
  console.log(`⏰ Time: ${new Date().toISOString()}\n`);

  try {
    console.log('⏳ Sending request... (this may take 60-120 seconds)');
    const startTime = Date.now();

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    const data = await response.json();

    console.log(`\n📊 Response received in ${duration}s`);
    console.log(`Status: ${response.status} ${response.statusText}\n`);

    if (response.ok) {
      console.log('✅ Success!');
      console.log(`   - Headlines fetched: ${data.count}`);
      console.log(`   - Duration: ${data.duration}`);
      console.log(`   - Timestamp: ${data.timestamp}`);
      if (data.previousCache) {
        console.log(`   - Previous cache: ${data.previousCache.count} headlines from ${data.previousCache.lastFetch}`);
      }
    } else {
      console.error('❌ Error response:');
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Error triggering refresh:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);

      if (error.message.includes('ECONNREFUSED')) {
        console.error('\n💡 Tip: Make sure your dev server is running with: npm run dev');
        console.error('   Or provide a production URL: node scripts/trigger-refresh.js https://your-app.onrender.com');
      }
    }
    process.exit(1);
  }
}

// Check if we're calling localhost and warn user
const targetUrl = process.argv[2] || 'http://localhost:3000';
if (targetUrl.includes('localhost')) {
  console.log('ℹ️  Targeting local dev server. Make sure you have "npm run dev" running in another terminal.');
  console.log('ℹ️  Or specify production URL: node scripts/trigger-refresh.js https://your-app.onrender.com\n');
}

triggerRefresh();
