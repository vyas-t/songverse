process.env.NODE_ENV = 'test';
import http from 'http';
import { app } from '../server';

let server: http.Server;
let baseUrl: string;

async function startTestServer(): Promise<void> {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address === 'object') {
        baseUrl = `http://127.0.0.1:${address.port}`;
        resolve();
      }
    });
  });
}

async function stopTestServer(): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve());
  });
}

async function runMultiplayerE2ETests() {
  console.log('--- STARTING MULTIPLAYER E2E TEST SUITE ---');
  process.env.NODE_ENV = 'test';
  await startTestServer();

  try {
    // 1. Create Room
    console.log('[Test 1] Host creates room...');
    const createRes = await fetch(`${baseUrl}/api/multiplayer/rooms/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hostId: 'guest_host_1234',
        displayName: 'Guest_HOST',
        language: 'English'
      })
    });
    if (!createRes.ok) throw new Error(`Create room failed: ${createRes.status}`);
    const createData = await createRes.json();
    if (!createData.roomCode || createData.roomCode.length !== 6) {
      throw new Error(`Expected 6-digit room code, got: ${createData.roomCode}`);
    }
    if (!createData.hostToken) {
      throw new Error('Expected hostToken in creation response');
    }
    const { roomCode, hostToken } = createData;
    console.log(`  -> Room created successfully: ${roomCode}`);

    // 2. Client B joins Room
    console.log('[Test 2] Client B joins room...');
    const joinRes = await fetch(`${baseUrl}/api/multiplayer/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode,
        playerId: 'guest_join_5678',
        displayName: 'Guest_JOIN'
      })
    });
    if (!joinRes.ok) throw new Error(`Join room failed: ${joinRes.status}`);
    const joinData = await joinRes.json();
    if (joinData.room.players.length !== 2) {
      throw new Error(`Expected 2 players, got ${joinData.room.players.length}`);
    }
    // Verify no bots
    for (const p of joinData.room.players) {
      if (p.isBot) throw new Error(`Found unexpected bot player: ${p.displayName}`);
    }
    console.log(`  -> Joined room. Total real players: ${joinData.room.players.length}. Zero bots.`);

    // 3. Joining Non-Existent Room Fails With 404 (No Phantom Room)
    console.log('[Test 3] Joining non-existent room should fail with 404...');
    const invalidJoinRes = await fetch(`${baseUrl}/api/multiplayer/rooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode: '999999',
        playerId: 'guest_phantom_test',
        displayName: 'PhantomTester'
      })
    });
    if (invalidJoinRes.status !== 404) {
      throw new Error(`Expected 404 for invalid room, got ${invalidJoinRes.status}`);
    }
    console.log('  -> Invalid room rejected with 404 as expected (no phantom room).');

    // 4. Host Starts Match
    console.log('[Test 4] Host starts game...');
    const startRes = await fetch(`${baseUrl}/api/multiplayer/rooms/${roomCode}/host/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken })
    });
    if (!startRes.ok) throw new Error(`Start game failed: ${startRes.status}`);
    const startData = await startRes.json();
    if (startData.status !== 'playing') {
      throw new Error(`Expected status 'playing', got ${startData.status}`);
    }

    // Fetch room state to inspect synchronized game track
    const roomStateRes = await fetch(`${baseUrl}/api/multiplayer/rooms/${roomCode}`);
    if (!roomStateRes.ok) throw new Error(`Failed to fetch room state: ${roomStateRes.status}`);
    const roomState = await roomStateRes.json();
    if (!roomState.currentTrack) {
      throw new Error('Expected currentTrack in round data');
    }
    console.log(`  -> Match started. Obfuscated trivia title: "${roomState.currentTrack.title}"`);
    console.log(`  -> Audio URL: ${roomState.currentTrack.audioUrl ? 'Verified preview stream present' : 'Missing'}`);

    // 5. Player B Skips Snippet Level (1 -> 2)
    console.log('[Test 5] Player B skips snippet level (1s -> 2s)...');
    const skipRes = await fetch(`${baseUrl}/api/multiplayer/rooms/${roomCode}/skip-level`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: 'guest_join_5678' })
    });
    if (!skipRes.ok) throw new Error(`Skip level failed: ${skipRes.status}`);
    const skipData = await skipRes.json();
    const playerB = skipData.players.find((p: any) => p.id === 'guest_join_5678');
    if (!playerB || playerB.currentLevel !== 2) {
      throw new Error(`Expected Player B level 2, got ${playerB?.currentLevel}`);
    }
    console.log(`  -> Player B skipped to Level ${playerB.currentLevel}.`);

    // 6. Host Submits Correct Guess
    console.log('[Test 6] Host submits correct guess...');
    const guessRes = await fetch(`${baseUrl}/api/multiplayer/rooms/${roomCode}/guess`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        playerId: 'guest_host_1234',
        guessTrackId: roomState.currentTrack.id,
        level: 1
      })
    });
    if (!guessRes.ok) throw new Error(`Guess failed: ${guessRes.status}`);
    const guessData = await guessRes.json();
    if (!guessData.isCorrect || guessData.playerScore <= 0 || guessData.pointsAwarded !== 100) {
      throw new Error(`Expected correct guess with 100 points, got: ${JSON.stringify(guessData)}`);
    }
    console.log(`  -> Guess accepted. Points awarded: ${guessData.pointsAwarded}, Host score: ${guessData.playerScore}.`);

    // 7. Host Closes Room
    console.log('[Test 7] Host closes room...');
    const closeRes = await fetch(`${baseUrl}/api/multiplayer/rooms/${roomCode}/host/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostToken })
    });
    if (!closeRes.ok) throw new Error(`Close room failed: ${closeRes.status}`);
    console.log('  -> Room closed cleanly.');

    console.log('\n>>> ALL MULTIPLAYER E2E TESTS PASSED (7 / 7) <<<\n');
    process.exit(0);
  } finally {
    await stopTestServer();
  }
}

runMultiplayerE2ETests().catch(err => {
  console.error('Multiplayer test error:', err);
  process.exit(1);
});
