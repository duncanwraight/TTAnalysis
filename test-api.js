import fetch from 'node-fetch';

// Test creating a match
async function testCreateMatch() {
  try {
    console.log('Testing API: Creating a match...');
    
    const response = await fetch('http://localhost:3001/api/matches', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: '00000000-0000-0000-0000-000000000001',
        opponent_name: 'API Test Opponent',
        date: new Date().toISOString().split('T')[0],
        match_score: '0-0',
        notes: 'Test match from API test script',
        initial_server: 'player'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const match = await response.json();
    console.log('Match created successfully:', match);
    
    return match;
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
}

// Test creating a set
async function testCreateSet(matchId) {
  try {
    console.log(`Testing API: Creating a set for match ${matchId}...`);
    
    const response = await fetch('http://localhost:3001/api/sets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        match_id: matchId,
        set_number: 1,
        score: '11-5',
        player_score: 11,
        opponent_score: 5
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const set = await response.json();
    console.log('Set created successfully:', set);
    
    return set;
  } catch (error) {
    console.error('Error creating set:', error);
    throw error;
  }
}

// Test creating a point
async function testCreatePoint(setId) {
  try {
    console.log(`Testing API: Creating a point for set ${setId}...`);
    
    const response = await fetch('http://localhost:3001/api/points', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        set_id: setId,
        point_number: 1,
        winner: 'player',
        winning_shot: 'forehand',
        other_shot: 'backhand',
        notes: 'Test point from API test script'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const point = await response.json();
    console.log('Point created successfully:', point);
    
    return point;
  } catch (error) {
    console.error('Error creating point:', error);
    throw error;
  }
}

// Run the tests
async function runTests() {
  try {
    // Test creating a match
    const match = await testCreateMatch();
    
    // Test creating a set
    const set = await testCreateSet(match.id);
    
    // Test creating a point
    const point = await testCreatePoint(set.id);
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Tests failed:', error);
  }
}

runTests();