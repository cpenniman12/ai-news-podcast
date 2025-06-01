#!/usr/bin/env node

const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

// Test headlines similar to what the user provided
const testHeadlines = [
  "**Telegram & xAI Announce $300M Grok AI Deal - WinBuzzer** (Wed May 28 2025)",
  "**OpenAI GPT-5 Release Timeline Update** (Thu May 29 2025)"
];

async function testEnhancedPodcastGeneration() {
  console.log('🧪 Testing Enhanced Podcast Generation Pipeline');
  console.log('=' .repeat(60));
  
  try {
    // Step 1: Test detailed script generation
    console.log('\n🔬 STEP 1: Testing Detailed Script Generation');
    console.log('📰 Test headlines:', testHeadlines.length);
    testHeadlines.forEach((headline, i) => {
      console.log(`  ${i + 1}. ${headline.slice(0, 80)}...`);
    });
    
    const scriptStartTime = Date.now();
    console.log('\n🚀 Calling /api/generate-detailed-script...');
    
    const scriptResponse = await axios.post(`${SERVER_URL}/api/generate-detailed-script`, {
      headlines: testHeadlines
    }, {
      timeout: 180000 // 3 minute timeout
    });
    
    const scriptDuration = (Date.now() - scriptStartTime) / 1000;
    console.log(`✅ Script generation completed in ${scriptDuration.toFixed(1)} seconds`);
    
    const { script, stats } = scriptResponse.data;
    console.log('\n📊 Script Generation Stats:');
    console.log(`  - Stories processed: ${stats.storiesProcessed}`);
    console.log(`  - Script length: ${stats.scriptLength} characters`);
    console.log(`  - Estimated duration: ${stats.estimatedDuration} minutes`);
    console.log(`  - Script preview: "${script.substring(0, 200)}..."`);
    
    // Step 2: Test audio generation
    console.log('\n🔬 STEP 2: Testing Audio Generation');
    const audioStartTime = Date.now();
    console.log('🚀 Calling /api/generate-audio...');
    
    const audioResponse = await axios.post(`${SERVER_URL}/api/generate-audio`, {
      script: script
    }, {
      timeout: 120000 // 2 minute timeout
    });
    
    const audioDuration = (Date.now() - audioStartTime) / 1000;
    console.log(`✅ Audio generation completed in ${audioDuration.toFixed(1)} seconds`);
    
    const { audioUrl } = audioResponse.data;
    console.log(`🎵 Audio file created: ${audioUrl}`);
    
    // Summary
    const totalDuration = (Date.now() - scriptStartTime) / 1000;
    console.log('\n🎉 PIPELINE TEST RESULTS');
    console.log('=' .repeat(60));
    console.log(`✅ Total processing time: ${totalDuration.toFixed(1)} seconds`);
    console.log(`📝 Script generation: ${scriptDuration.toFixed(1)}s`);
    console.log(`🎵 Audio generation: ${audioDuration.toFixed(1)}s`);
    console.log(`📊 Script quality: ${stats.scriptLength} chars, ~${stats.estimatedDuration} min`);
    console.log(`🔗 Final audio URL: ${SERVER_URL}${audioUrl}`);
    console.log('\n🎯 Pipeline Status: SUCCESS!');
    
  } catch (error) {
    console.error('\n❌ Pipeline Test FAILED:');
    console.error('Error details:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    
    console.log('\n🔍 Troubleshooting tips:');
    console.log('  - Check if development server is running on port 3000');
    console.log('  - Verify API keys are valid');
    console.log('  - Check network connectivity');
    console.log('  - Review server logs for detailed error information');
  }
}

// Run the test
testEnhancedPodcastGeneration(); 