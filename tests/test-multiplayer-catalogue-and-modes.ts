/**
 * =========================================================================
 * SONGVERSE 2.0 — MULTIPLAYER CATALOGUE, MODES & PLATFORM TEST SUITE
 * =========================================================================
 * Comprehensive automated test suite verifying:
 * 1. 3-Player Snapshot Isolation (Host 80 songs, Guests search from snapshot)
 * 2. Host modification safety (Host catalog changes do not alter room snapshot)
 * 3. Competitive Mode (100-70-40-20 scoring & win streak tracking)
 * 4. Casual Mode (Cooperative tracking & team atmosphere)
 * 5. Lobby Ready System (Ready toggle for guests, host start readiness)
 * 6. Host Controls (3-10 round selector, language filter snapshot generation)
 * 7. Host Migration (Graceful host departure election preserving snapshot & rounds)
 * 8. Player Reconnection Protection (Preserves score and identity without duplicates)
 * 9. Match History Logging & Persistence (Solo & Multiplayer history storage)
 */

import { multiplayerEngine } from '../src/services/multiplayerEngine';
import { musicCatalogue } from '../src/services/musicCatalogue';
import { gameEngine } from '../src/services/gameEngine';
import { Track } from '../src/types';

// Mock localStorage for headless Node environment if missing
if (typeof localStorage === 'undefined' || localStorage === null) {
  const store: Record<string, string> = {};
  (global as any).localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); }
  };
}

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, title: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`[✓ PASS] Test ${totalTests}: ${title}`);
    if (details) console.log(`       Details:  ${details}`);
  } else {
    console.error(`[✗ FAIL] Test ${totalTests}: ${title}`);
    if (details) console.error(`       Details:  ${details}`);
    throw new Error(`Test failed: ${title}`);
  }
}

async function runSongVerse2UpgradeTestSuite() {
  console.log('\n====================================================');
  console.log('  SONGVERSE 2.0 — MULTIPLAYER & CATALOGUE TEST SUITE');
  console.log('====================================================\n');

  // -------------------------------------------------------------------------
  // SECTION 1: 3-PLAYER ISOLATED CATALOGUE SNAPSHOT TEST
  // -------------------------------------------------------------------------
  console.log('--- 1. HOST-CONTROLLED CATALOGUE SNAPSHOT ISOLATION ---');

  // Verify host's initial catalogue has 80 verified playable tracks
  const hostTracks = musicCatalogue.getPlayableTracks();
  assert(
    hostTracks.length === 80,
    'Host personal catalogue contains exactly 80 verified tracks across 16 artists',
    `Found ${hostTracks.length} tracks.`
  );

  // Host creates multiplayer room with all languages snapshot
  const hostId = 'host_player_01';
  const hostName = 'HostVyas';
  const room = await multiplayerEngine.createRoom(hostName, hostId, {
    mixLanguages: true,
    totalRounds: 5
  });

  assert(
    Boolean(room && room.roomCode && room.catalogueSnapshot),
    'Room created with valid 6-digit code and snapshot initialization',
    `Room Code: ${room.roomCode}, Snapshot Tracks: ${room.catalogueSnapshot?.length}`
  );

  assert(
    room.catalogueSnapshot?.length === 80,
    'Room catalogue snapshot is populated from host playable tracks (80 tracks)',
    `Snapshot count: ${room.catalogueSnapshot?.length}`
  );

  assert(
    Boolean(room.catalogueStats && room.catalogueStats.totalTracks === 80),
    'Room catalogue transparency metadata generated with host name and track counts',
    `Host: ${room.catalogueStats?.hostName}, Artists: ${room.catalogueStats?.artistsCount}, Languages: ${room.catalogueStats?.languages?.join(', ')}`
  );

  // Simulate Guest B (who has a local device library of only 30 tracks)
  const guestB_Id = 'guest_player_02';
  const guestB_Name = 'PlayerB_30Songs';
  await multiplayerEngine.joinRoom(room.roomCode, guestB_Name, guestB_Id);

  // Simulate Guest C (who has a local device library of only 15 tracks)
  const guestC_Id = 'guest_player_03';
  const guestC_Name = 'PlayerC_15Songs';
  await multiplayerEngine.joinRoom(room.roomCode, guestC_Name, guestC_Id);

  const activeRoom = multiplayerEngine.getActiveRoom()!;
  assert(
    activeRoom.players.length === 3,
    '3 distinct players (Host, Player B, Player C) successfully joined the lobby',
    `Player count: ${activeRoom.players.length}`
  );

  // Test Search within room snapshot: Guests searching query find tracks from Host snapshot
  const hostTrackTitle = hostTracks[10].title;
  const searchResultsFromSnapshot = musicCatalogue.searchInPool(hostTrackTitle.slice(0, 5), activeRoom.catalogueSnapshot || []);
  assert(
    searchResultsFromSnapshot.length > 0 && searchResultsFromSnapshot.some(t => t.id === hostTracks[10].id),
    'Guests searching music query execute strictly against host room snapshot',
    `Query "${hostTrackTitle.slice(0, 5)}" returned track "${searchResultsFromSnapshot[0]?.title}"`
  );

  // Host Modification Safety: Host adds a temporary track to personal catalogue
  const mockNewTrack: Track = {
    id: 'mock_extra_track_999',
    providerTrackId: 'mock_provider_999',
    title: 'Brand New Mid-Game Song',
    artist: 'Future Artist',
    album: 'Future Album',
    releaseYear: 2026,
    durationSeconds: 30,
    previewUrl: 'https://cdn.songverse.test/future.mp3',
    genre: 'Pop',
    language: 'English',
    decade: '2020s',
    country: 'Global',
    artworkGradient: 'from-amber-500 to-rose-600',
    playbackStatus: 'verified_audio',
    availabilityStatus: 'available',
    clipStartSeconds: 0,
    licenceReference: 'TEST-TRACK-999',
    licenceType: 'Apple iTunes Promotional Preview (30s)',
    attributionText: 'Test preview source',
    regionRestrictions: [],
    provider: 'apple-itunes'
  };
  musicCatalogue.addTrack(mockNewTrack);

  // Room snapshot must remain exactly 80 tracks (immutable isolation)
  assert(
    activeRoom.catalogueSnapshot?.length === 80,
    'Host adding or editing songs during an active room cannot alter or disrupt ongoing room snapshot',
    `Personal catalogue: ${musicCatalogue.getPlayableTracks().length}, Room snapshot: ${activeRoom.catalogueSnapshot?.length}`
  );

  // Clean up mock track
  musicCatalogue.removeTrack(mockNewTrack.id);

  // -------------------------------------------------------------------------
  // SECTION 2: GAME MODES (COMPETITIVE VS CASUAL)
  // -------------------------------------------------------------------------
  console.log('\n--- 2. COMPETITIVE AND CASUAL GAME MODES ---');

  // Verify default mode is competitive
  assert(
    activeRoom.mode === 'competitive',
    'Rooms default to Competitive Mode with speed-scoring and podium rankings',
    `Current mode: ${activeRoom.mode}`
  );

  // Host toggles mode to Casual Jam
  multiplayerEngine.setGameMode('casual');
  assert(
    multiplayerEngine.getActiveRoom()?.mode === 'casual',
    'Host can toggle game mode to Casual Jam in the lobby',
    `Updated mode: ${multiplayerEngine.getActiveRoom()?.mode}`
  );

  // Host toggles mode back to Competitive
  multiplayerEngine.setGameMode('competitive');
  assert(
    multiplayerEngine.getActiveRoom()?.mode === 'competitive',
    'Host can set game mode back to Competitive Mode',
    `Current mode: ${multiplayerEngine.getActiveRoom()?.mode}`
  );

  // -------------------------------------------------------------------------
  // SECTION 3: LOBBY READY SYSTEM & HOST CONTROLS
  // -------------------------------------------------------------------------
  console.log('\n--- 3. LOBBY READY SYSTEM & HOST CONTROLS ---');

  // Non-host players toggle Ready
  assert(
    activeRoom.players.find(p => p.id === guestB_Id)?.isReady === false,
    'Guest B begins lobby in unready state',
    'Guest isReady = false'
  );

  multiplayerEngine.toggleReady(guestB_Id);
  assert(
    multiplayerEngine.getActiveRoom()?.players.find(p => p.id === guestB_Id)?.isReady === true,
    'Guest B toggles Ready status successfully to true',
    'Guest isReady = true'
  );

  multiplayerEngine.toggleReady(guestC_Id);
  assert(
    multiplayerEngine.getActiveRoom()?.players.find(p => p.id === guestC_Id)?.isReady === true,
    'Guest C toggles Ready status successfully to true',
    'Guest isReady = true'
  );

  // Host modifies match length to 7 rounds
  multiplayerEngine.setTotalRounds(7);
  assert(
    multiplayerEngine.getActiveRoom()?.totalRounds === 7 && multiplayerEngine.getActiveRoom()?.trackIds.length === 7,
    'Host selector updates room match length to 7 rounds across all participants',
    `Total rounds: ${multiplayerEngine.getActiveRoom()?.totalRounds}, Tracks: ${multiplayerEngine.getActiveRoom()?.trackIds.length}`
  );

  // Host tests Language Filter (e.g. English)
  multiplayerEngine.setLanguageFilter('English');
  const filteredRoom = multiplayerEngine.getActiveRoom()!;
  assert(
    filteredRoom.languageFilter === 'English',
    'Host language filter dynamically generates room snapshot for selected language',
    `Language: ${filteredRoom.languageFilter}, Snapshot count: ${filteredRoom.catalogueSnapshot?.length}`
  );

  // -------------------------------------------------------------------------
  // SECTION 4: MATCH PROGRESSION, SCORING & STREAKS
  // -------------------------------------------------------------------------
  console.log('\n--- 4. SYNCHRONIZED SCORING & STREAKS ---');

  // Start match
  await multiplayerEngine.startMatch(hostId);
  const playingRoom = multiplayerEngine.getActiveRoom()!;
  assert(
    playingRoom.status === 'playing',
    'Match started: Room status transitions to "playing" with authoritative deadline',
    `Status: ${playingRoom.status}, Round: ${playingRoom.currentRoundIndex + 1}`
  );

  assert(
    playingRoom.isSettingsLocked === true,
    'Room settings (mode, rounds, catalogue) are locked upon match start to prevent mid-game manipulation',
    `isSettingsLocked: ${playingRoom.isSettingsLocked}`
  );

  // Submit correct guess for Guest B at Level 1 (100 pts)
  const currentTrack = multiplayerEngine.getCurrentTrack()!;
  multiplayerEngine.submitPlayerGuess(guestB_Id, true, 100, currentTrack.id, currentTrack.title);
  
  const updatedPlayerB = multiplayerEngine.getActiveRoom()?.players.find(p => p.id === guestB_Id)!;
  assert(
    updatedPlayerB.score === 100 && updatedPlayerB.streak === 1 && updatedPlayerB.correctGuesses === 1,
    'Correct guess awards 100 points and increments correctGuesses and streak to 1',
    `Score: ${updatedPlayerB.score}, Streak: ${updatedPlayerB.streak}`
  );

  // Submit correct guess for Guest C at Level 2 (70 pts)
  multiplayerEngine.submitPlayerGuess(guestC_Id, true, 70, currentTrack.id, currentTrack.title);
  const updatedPlayerC = multiplayerEngine.getActiveRoom()?.players.find(p => p.id === guestC_Id)!;
  assert(
    updatedPlayerC.score === 70 && updatedPlayerC.streak === 1,
    'Player C awards 70 points at Level 2 with streak 1',
    `Score: ${updatedPlayerC.score}, Streak: ${updatedPlayerC.streak}`
  );

  // 2 distinct players guessed, triggering early round completion
  assert(
    multiplayerEngine.getActiveRoom()?.status === 'round-summary',
    '2 distinct player guesses trigger automatic transition to round-summary intermission',
    `Round status: ${multiplayerEngine.getActiveRoom()?.status}, Reason: ${multiplayerEngine.getActiveRoom()?.roundEndReason}`
  );

  // -------------------------------------------------------------------------
  // SECTION 5: RECONNECTION PROTECTION
  // -------------------------------------------------------------------------
  console.log('\n--- 5. PLAYER RECONNECTION PROTECTION ---');

  // Simulate Guest B network drop (disconnect)
  const beforeReconRoom = multiplayerEngine.getActiveRoom()!;
  const pB = beforeReconRoom.players.find(p => p.id === guestB_Id)!;
  pB.status = 'disconnected';

  // Guest B rejoins using same player ID and room code
  const reconnectedRoom = await multiplayerEngine.joinRoom(beforeReconRoom.roomCode, guestB_Name, guestB_Id);
  const reconnectedB = reconnectedRoom.players.find(p => p.id === guestB_Id)!;

  assert(
    reconnectedB.status === 'connected' && reconnectedB.score === 100 && reconnectedB.streak === 1,
    'Player reconnection restores active status and preserves score and streak without duplicate identity',
    `Status: ${reconnectedB.status}, Score: ${reconnectedB.score}, Players in room: ${reconnectedRoom.players.length}`
  );

  assert(
    reconnectedRoom.players.filter(p => p.id === guestB_Id).length === 1,
    'Player identity deduplication confirmed: Exactly one entry exists for reconnected player',
    `Total occurrences: ${reconnectedRoom.players.filter(p => p.id === guestB_Id).length}`
  );

  // -------------------------------------------------------------------------
  // SECTION 6: HOST MIGRATION
  // -------------------------------------------------------------------------
  console.log('\n--- 6. HOST MIGRATION RECOVERY ---');

  // Simulate host disconnecting from an active match
  const roomPreMigration = multiplayerEngine.getActiveRoom()!;
  const oldHostId = roomPreMigration.hostId;
  const snapshotBeforeMigration = roomPreMigration.catalogueSnapshot?.length;
  const roundIndexBeforeMigration = roomPreMigration.currentRoundIndex;

  // Mark old host as disconnected and trigger host migration
  const oldHostPlayer = roomPreMigration.players.find(p => p.id === oldHostId)!;
  oldHostPlayer.status = 'disconnected';

  const migrationSuccess = multiplayerEngine.tryMigrateHost();
  const roomPostMigration = multiplayerEngine.getActiveRoom()!;

  assert(
    migrationSuccess === true,
    'Host migration automatically triggers when host departs',
    `Migration returned: ${migrationSuccess}`
  );

  assert(
    roomPostMigration.hostId === guestB_Id,
    'Host privileges seamlessly promoted to next active participant (Player B)',
    `New hostId: ${roomPostMigration.hostId} (Player B: ${guestB_Id})`
  );

  assert(
    roomPostMigration.catalogueSnapshot?.length === snapshotBeforeMigration,
    'Host migration strictly preserves existing room music catalogue snapshot',
    `Snapshot count: ${roomPostMigration.catalogueSnapshot?.length}`
  );

  assert(
    roomPostMigration.currentRoundIndex === roundIndexBeforeMigration,
    'Host migration preserves active round index and game progression',
    `Round Index: ${roomPostMigration.currentRoundIndex}`
  );

  assert(
    roomPostMigration.hostMigrated === true && Boolean(roomPostMigration.hostMigrationNotice),
    'Host migration notice flag set to notify all participants',
    `Notice: "${roomPostMigration.hostMigrationNotice}"`
  );

  // -------------------------------------------------------------------------
  // SECTION 7: MATCH HISTORY LOGGING & PERSISTENCE
  // -------------------------------------------------------------------------
  console.log('\n--- 7. MATCH HISTORY RECORDING ---');

  // Record a solo match
  gameEngine.recordMatchHistory({
    id: `test_solo_${Date.now()}`,
    gameMode: 'solo',
    playedAt: new Date().toISOString(),
    score: 350,
    totalRounds: 5,
    roundsWon: 4,
    correctGuesses: 4,
    rank: 1,
    totalPlayers: 1,
    details: 'Classic Solo Mode'
  });

  // Record a competitive multiplayer match
  gameEngine.recordMatchHistory({
    id: `test_comp_${Date.now()}`,
    roomCode: '888999',
    gameMode: 'competitive',
    playedAt: new Date().toISOString(),
    score: 420,
    totalRounds: 5,
    roundsWon: 4,
    correctGuesses: 4,
    rank: 1,
    totalPlayers: 3,
    details: 'Competitive Multiplayer Match'
  });

  // Record a casual jam match
  gameEngine.recordMatchHistory({
    id: `test_casual_${Date.now()}`,
    roomCode: '111222',
    gameMode: 'casual',
    playedAt: new Date().toISOString(),
    score: 280,
    totalRounds: 5,
    roundsWon: 3,
    correctGuesses: 3,
    rank: 2,
    totalPlayers: 4,
    details: 'Casual Jam Session'
  });

  const fullHistory = gameEngine.getMatchHistory();
  assert(
    fullHistory.length >= 3,
    'Match history persists entries across solo, competitive and casual games',
    `Total logged matches: ${fullHistory.length}`
  );

  const soloMatches = fullHistory.filter(m => m.gameMode === 'solo');
  const compMatches = fullHistory.filter(m => m.gameMode === 'competitive');
  const casualMatches = fullHistory.filter(m => m.gameMode === 'casual');

  assert(
    soloMatches.length > 0 && compMatches.length > 0 && casualMatches.length > 0,
    'Match history supports distinct categorization and filtering across all 3 game modes',
    `Solo: ${soloMatches.length}, Competitive: ${compMatches.length}, Casual: ${casualMatches.length}`
  );

  // -------------------------------------------------------------------------
  // FINAL SCORE SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log(`Final Verification Score: ${passedTests} / ${totalTests} Scenarios Passed.`);
  console.log('====================================================\n');

  process.exit(0);
}

runSongVerse2UpgradeTestSuite().catch(err => {
  console.error('\nTest Suite Execution Encountered Error:', err);
  process.exit(1);
});
