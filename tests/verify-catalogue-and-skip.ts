/**
 * Automated Verification Script for Song Catalogue, MusicBrainz Integration,
 * Duplicate Prevention, and Skip Functionality in SongVerse.
 */

// Node.js localStorage polyfill
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {};
  globalThis.localStorage = {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
    key: (index: number) => Object.keys(store)[index] || null,
    length: 0
  } as Storage;
}

import { musicCatalogue } from '../src/services/musicCatalogue';
import { musicBrainzService } from '../src/services/musicbrainzService';
import { gameEngine } from '../src/services/gameEngine';

async function runVerification() {
  console.log('====================================================');
  console.log('  SONGVERSE — CATALOGUE, MUSICBRAINZ & SKIP TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function assert(title: string, condition: boolean, detail: string) {
    total++;
    if (condition) {
      passed++;
      console.log(`[✓ PASS] ${title}`);
      console.log(`       ${detail}\n`);
    } else {
      console.error(`[✗ FAIL] ${title}`);
      console.error(`       ${detail}\n`);
    }
  }

  // --- Test 1: MusicBrainz real API search for "Blinding Lights" ---
  console.log('--- Test 1: Querying MusicBrainz for "Blinding Lights" ---');
  try {
    const res = await musicBrainzService.searchRecordings('Blinding Lights', 5);
    const hasBlindingLights = res.recordings.some(r => r.title.toLowerCase().includes('blinding lights'));
    assert(
      'Search "Blinding Lights" returns real recordings from metadata API',
      res.recordings.length > 0 && hasBlindingLights,
      `Found ${res.count} total recordings. Top result: "${res.recordings[0]?.title}" by "${res.recordings[0]?.artist}" (MBID: ${res.recordings[0]?.id})`
    );
  } catch (err) {
    assert('Search "Blinding Lights" returns real recordings', false, String(err));
  }

  // --- Test 2: Search for "The Weeknd" and verify results are not repeated copies ---
  console.log('--- Test 2: Querying MusicBrainz for "The Weeknd" ---');
  try {
    // Wait 1.5s to respect rate limit
    await new Promise(r => setTimeout(r, 1500));
    const res = await musicBrainzService.searchRecordings('The Weeknd', 10);
    const ids = new Set(res.recordings.map(r => r.id));
    const hasUniqueIds = ids.size === res.recordings.length;
    assert(
      'Search for The Weeknd returns unique recordings without repeated copies',
      res.recordings.length > 0 && hasUniqueIds,
      `Received ${res.recordings.length} recordings with ${ids.size} unique MBIDs. Titles include: ${res.recordings.slice(0, 3).map(r => `"${r.title}"`).join(', ')}`
    );
  } catch (err) {
    assert('Search for The Weeknd returns unique recordings', false, String(err));
  }

  // --- Test 3: Pagination support on MusicBrainz search ---
  console.log('--- Test 3: Testing MusicBrainz Pagination ---');
  try {
    await new Promise(r => setTimeout(r, 1500));
    const page1 = await musicBrainzService.searchRecordings({ query: 'The Weeknd', limit: 5, offset: 0 });
    await new Promise(r => setTimeout(r, 1500));
    const page2 = await musicBrainzService.searchRecordings({ query: 'The Weeknd', limit: 5, offset: 5 });

    const page1Ids = page1.recordings.map(r => r.id);
    const page2Ids = page2.recordings.map(r => r.id);
    const hasOverlap = page1Ids.some(id => page2Ids.includes(id));

    assert(
      'MusicBrainz pagination offset delivers distinct pages without duplicate overlap',
      page1.recordings.length > 0 && page2.recordings.length > 0 && !hasOverlap,
      `Page 1 IDs: [${page1Ids.slice(0, 2).join(', ')}...], Page 2 IDs: [${page2Ids.slice(0, 2).join(', ')}...] (No overlap: ${!hasOverlap})`
    );
  } catch (err) {
    assert('MusicBrainz pagination offset works correctly', false, String(err));
  }

  // --- Test 4: Duplicate Prevention in Music Catalogue ---
  console.log('--- Test 4: Testing Duplicate Prevention in Music Catalogue ---');
  {
    const initialCount = musicCatalogue.getAllTracks().length;
    const testRec = {
      id: 'mb-uuid-test-blinding-lights-12345',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours',
      releaseYear: 2020,
      country: 'CA'
    };

    // First ingestion
    musicCatalogue.addMusicBrainzTrack(testRec);
    const countAfterFirst = musicCatalogue.getAllTracks().length;

    // Second ingestion with same MBID
    musicCatalogue.addMusicBrainzTrack(testRec);
    const countAfterSecond = musicCatalogue.getAllTracks().length;

    assert(
      'MusicBrainz recording ID prevents duplicate entries when imported repeatedly',
      countAfterSecond === countAfterFirst,
      `Count before: ${initialCount}, after 1st: ${countAfterFirst}, after 2nd: ${countAfterSecond} (No duplicate created)`
    );
  }

  // --- Test 5: Distinct recordings or covers of same song preserved ---
  console.log('--- Test 5: Distinct recordings of same song preserved ---');
  {
    const countBefore = musicCatalogue.getAllTracks().length;
    const recA = {
      id: 'mb-uuid-blinding-studio',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'After Hours (Studio)',
      releaseYear: 2020
    };
    const recB = {
      id: 'mb-uuid-blinding-live',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      album: 'Live at SoFi Stadium',
      releaseYear: 2023
    };

    musicCatalogue.addMusicBrainzTrack(recA);
    musicCatalogue.addMusicBrainzTrack(recB);
    const countAfter = musicCatalogue.getAllTracks().length;

    assert(
      'Genuinely different recordings with distinct MBIDs and releases are preserved',
      countAfter === countBefore + 2,
      `Both studio album and live concert recording indexed with unique MBIDs (Count increased by 2)`
    );
  }

  // --- Test 6: Skip Level Mechanics and Point Deduction ---
  console.log('--- Test 6: Testing Skip Level Mechanics and Point Deduction ---');
  {
    if (musicCatalogue.getPlayableTracks().length === 0) {
      musicCatalogue.restoreBaseline();
    }
    const session = gameEngine.startSession({ mode: 'practice', totalRounds: 1 });
    const round = session.rounds[0];

    // At Level 1, skip level
    const skip1 = gameEngine.skipCurrentLevel();
    const l2Unlocked = skip1.nextLevel === 2 && round.currentLevel === 2 && !skip1.roundCompleted;

    // At Level 2, guess correctly -> should award 70 points instead of 100 points (30 points deducted)
    const winL2 = gameEngine.submitGuess(round.targetTrackId);
    const pointsDeducted = winL2.pointsAwarded === 70 && session.totalScore === 70;

    assert(
      'Skip Level advances to Level 2 and deducts available round points (100 -> 70)',
      l2Unlocked && pointsDeducted,
      `Level 1 skipped -> Level 2 active. Won round at Level 2 with 70 pts (100 - 30 deducted).`
    );
  }

  // --- Test 7: Skip Entire Round immediately awards 0 points and reveals track ---
  console.log('--- Test 7: Testing Skip Entire Round ---');
  {
    const session = gameEngine.startSession({ mode: 'practice', totalRounds: 1 });
    const round = session.rounds[0];
    const targetTrackId = round.targetTrackId;

    const skipRoundResult = gameEngine.skipRound();
    const roundLost = skipRoundResult.round.status === 'lost';
    const zeroPoints = skipRoundResult.round.pointsAwarded === 0 && session.totalScore === 0;
    const targetRevealed = skipRoundResult.round.targetTrack?.id === targetTrackId;

    assert(
      'Skip Round immediately concludes round with 0 points and reveals target track',
      roundLost && zeroPoints && targetRevealed,
      `Round status: ${skipRoundResult.round.status}, Points awarded: ${skipRoundResult.round.pointsAwarded}, Track revealed: "${skipRoundResult.round.targetTrack?.title}"`
    );
  }

  console.log('====================================================');
  console.log(`Final Result: ${passed} / ${total} Verification Tests Passed.`);
  console.log('====================================================');

  if (passed !== total) {
    process.exit(1);
  }
}

runVerification().catch(err => {
  console.error('Test script error:', err);
  process.exit(1);
});
