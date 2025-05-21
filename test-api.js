// Simple test script for API connection
import fetch from 'node-fetch';

const apiUrl = 'http://localhost:3001/api';

async function testApiConnection() {
  console.log('Testing API connection to:', apiUrl);
  
  try {
    const response = await fetch(apiUrl);
    console.log('Response status:', response.status);
    
    const responseText = await response.text();
    console.log('Response text:', responseText);
    
    try {
      const data = JSON.parse(responseText);
      console.log('Response JSON:', data);
      return { success: true, data };
    } catch (parseError) {
      console.error('Failed to parse response as JSON:', parseError);
      return { success: false, error: 'Not valid JSON', text: responseText };
    }
  } catch (error) {
    console.error('API connection failed:', error);
    return { success: false, error: error.message };
  }
}

async function testDirectRequest() {
  const testData = {
    opponent_name: 'Test Opponent',
    date: new Date().toISOString().split('T')[0],
    match_score: '0-0',
    notes: 'Created via test script',
    initial_server: 'player'
  };
  
  console.log('\nTesting direct match creation POST request...');
  console.log('Request data:', testData);
  
  try {
    const response = await fetch(`${apiUrl}/matches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No auth header needed with bypass enabled
      },
      body: JSON.stringify(testData)
    });
    
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Match created successfully:', data);
      return { success: true, data };
    } else {
      const text = await response.text();
      console.error('Failed to create match:', text);
      return { success: false, status: response.status, text };
    }
  } catch (error) {
    console.error('Match creation request failed:', error);
    return { success: false, error: error.message };
  }
}

// Run tests
async function main() {
  console.log('=== API CONNECTION TEST ===');
  await testApiConnection();
  console.log('\n=== MATCH CREATION TEST ===');
  await testDirectRequest();
}

main().catch(console.error);