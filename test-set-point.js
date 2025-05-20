import fetch from 'node-fetch';

// Test creating a set and point for an existing match
async function testCreateSetAndPoint() {
  try {
    const matchId = '8b6f60e8-aa18-4998-82f0-a6badacf3cb7'; // tsw match ID
    
    // Create a set
    console.log(`Creating set for match ${matchId}...`);
    const setResponse = await fetch('http://localhost:3001/api/sets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match_id: matchId,
        set_number: 1,
        score: '1-0',
        player_score: 1,
        opponent_score: 0
      })
    });
    
    if (!setResponse.ok) {
      const errorText = await setResponse.text();
      throw new Error(`Failed to create set: ${setResponse.status} ${errorText}`);
    }
    
    const set = await setResponse.json();
    console.log('Set created successfully:', set);
    
    // Create a point for the set
    console.log(`Creating point for set ${set.id}...`);
    const pointResponse = await fetch('http://localhost:3001/api/points', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        set_id: set.id,
        point_number: 1,
        winner: 'player',
        winning_shot: 'smash',
        other_shot: 'loop',
        notes: 'Manual test point'
      })
    });
    
    if (!pointResponse.ok) {
      const errorText = await pointResponse.text();
      throw new Error(`Failed to create point: ${pointResponse.status} ${errorText}`);
    }
    
    const point = await pointResponse.json();
    console.log('Point created successfully:', point);
    
    console.log('Test completed successfully');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testCreateSetAndPoint();