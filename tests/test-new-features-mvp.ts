/**
 * Comprehensive Test Suite for SongVerse New Features:
 * 1. Quick Match 1v1 Blitz (Elo engine, rank tiers, match lifecycle)
 * 3. Immersive Game SFX & Dynamic Reaction Audio (Mute toggle, volume, synthesis)
 * 4. Wordle-Style Share Card & Social Export (Emoji matrix, format generation)
 * 5. Curated Battle Themes & Themed Audio Visualizers (Categories, styles)
 * Explicit Assertion: Party Power-Ups & Sabotages (Suggestion 2) strictly NOT present.
 */

import { rankedBlitzService, calculateEloDelta, getRankTier } from '../src/services/rankedBlitzService';
import { soundEffectsService } from '../src/services/soundEffectsService';
import { CURATED_BATTLE_THEMES } from '../src/config/battleThemes';
import { formatShareCardText } from '../src/components/common/ShareResultModal';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${msg}`);
    failedTests++;
  }
}

async function runTests() {
  console.log('\n=== RUNNING NEW FEATURES TEST SUITE ===\n');

  // ----------------------------------------------------
  // TEST 1: Elo Rating Engine & Rank Tiers (Feature 1)
  // ----------------------------------------------------
  console.log('--- Feature 1: Ranked 1v1 Blitz Elo Engine & Tiers ---');
  
  assert(getRankTier(950) === 'Bronze', 'Rating 950 is Bronze tier');
  assert(getRankTier(1150) === 'Silver', 'Rating 1150 is Silver tier');
  assert(getRankTier(1350) === 'Gold', 'Rating 1350 is Gold tier');
  assert(getRankTier(1550) === 'Platinum', 'Rating 1550 is Platinum tier');
  assert(getRankTier(1800) === 'Maestro', 'Rating 1800 is Maestro tier');

  const winDelta = calculateEloDelta(1000, 1000, true, 2);
  assert(winDelta.delta > 20, `Win elo delta should be positive (+${winDelta.delta})`);
  assert(winDelta.newRating > 1000, `New rating after win should be > 1000 (${winDelta.newRating})`);

  const lossDelta = calculateEloDelta(1000, 1000, false, 0);
  assert(lossDelta.delta < 0, `Loss elo delta should be negative (${lossDelta.delta})`);
  assert(lossDelta.newRating < 1000, `New rating after loss should be < 1000 (${lossDelta.newRating})`);

  const stats = rankedBlitzService.getStats();
  assert(typeof stats.rating === 'number', 'Ranked Blitz stats contains numeric rating');
  assert(typeof stats.wins === 'number', 'Ranked Blitz stats contains numeric wins');
  assert(typeof stats.losses === 'number', 'Ranked Blitz stats contains numeric losses');
  assert(typeof stats.tier === 'string', 'Ranked Blitz stats contains string tier');

  // Test Matchmaking queue simulator
  let matchStatus: string | null = null;
  const match = await rankedBlitzService.findMatch((s) => {
    matchStatus = s;
  });
  assert(Boolean(match.opponent && match.opponent.displayName), 'Matched with simulated opponent');
  assert(match.totalRounds === 3, '1v1 Blitz consists of authoritative 3 rounds');
  assert(Boolean(matchStatus && matchStatus.includes('challenger')), 'Match status updated through matchmaking sequence');

  // ----------------------------------------------------
  // TEST 2: Pure Web Audio SFX Service (Feature 3)
  // ----------------------------------------------------
  console.log('\n--- Feature 3: Web Audio SFX Engine & Reaction Audio ---');

  const initialMute = soundEffectsService.getIsMuted();
  const toggled = soundEffectsService.toggleMute();
  assert(toggled === !initialMute, 'Toggle mute flips the boolean state');
  assert(soundEffectsService.getIsMuted() === toggled, 'getIsMuted reflects updated state');
  
  soundEffectsService.setMuted(false);
  assert(!soundEffectsService.getIsMuted(), 'setMuted(false) resets mute to false');

  // Verification that calling synthesis methods in Node/SSR environment does not throw
  let sfxThrew = false;
  try {
    soundEffectsService.playCorrectChime(3);
    soundEffectsService.playWrongBuzz();
    soundEffectsService.playLevelUpWhoosh();
    soundEffectsService.playEmojiPop('🔥');
    soundEffectsService.playCountdownTick(false);
    soundEffectsService.playCountdownTick(true);
    soundEffectsService.playGameVictoryFanfare();
  } catch (e) {
    sfxThrew = true;
  }
  assert(!sfxThrew, 'Web Audio SFX methods safely handle non-DOM environment without throwing');

  // ----------------------------------------------------
  // TEST 3: Wordle-Style Share Card & Social Matrix (Feature 4)
  // ----------------------------------------------------
  console.log('\n--- Feature 4: Wordle-Style Share Result Card ---');

  const sampleHistory = [
    { round: 1, won: true, attempts: 1 },
    { round: 2, won: true, attempts: 2 },
    { round: 3, won: false, attempts: 4 },
    { round: 4, won: true, attempts: 1 }
  ];

  const shareText = formatShareCardText({
    gameMode: 'solo',
    score: 850,
    totalScore: 1000,
    streak: 3,
    history: sampleHistory
  });

  assert(shareText.includes('Solo Classic Arena'), 'Share text mentions game mode');
  assert(shareText.includes('Score: 850 / 1000 pts'), 'Share text contains accurate score summary');
  assert(shareText.includes('Streak: 🔥 3'), 'Share text contains streak info');
  assert(shareText.includes('🟩') && shareText.includes('🟥'), 'Share text contains Wordle emoji matrix (🟩 for win, 🟥 for loss)');
  assert(shareText.includes('songverse.pages.dev'), 'Share text contains production link');

  // ----------------------------------------------------
  // TEST 4: Curated Battle Themes & Visualizers (Feature 5)
  // ----------------------------------------------------
  console.log('\n--- Feature 5: Curated Battle Themes & Visualizer Styles ---');

  assert(CURATED_BATTLE_THEMES.length >= 6, `Defined ${CURATED_BATTLE_THEMES.length} curated battle themes (expected >= 6)`);
  
  const themeIds = CURATED_BATTLE_THEMES.map(t => t.id);
  assert(themeIds.includes('pop_2010s'), 'Includes 2010s Pop Anthems theme');
  assert(themeIds.includes('rock_classics'), 'Includes Classic Rock & Grunge theme');
  assert(themeIds.includes('hiphop_heavyweights'), 'Includes Hip-Hop & Trap theme');
  assert(themeIds.includes('bollywood_melodies'), 'Includes Bollywood Golden Hits theme');
  assert(themeIds.includes('edm_bass'), 'Includes EDM & Festival Drops theme');
  assert(themeIds.includes('anime_gaming'), 'Includes Anime & Gaming OSTs theme');

  const validStyles = new Set(['cyberpunk', 'vinyl', 'cassette']);
  const allVisualizersValid = CURATED_BATTLE_THEMES.every(t => validStyles.has(t.visualizerTheme));
  assert(allVisualizersValid, 'All battle themes map to valid visualizer styles (cyberpunk, vinyl, cassette)');

  // ----------------------------------------------------
  // TEST 5: Verification that Suggestion 2 is Strictly Omitted
  // ----------------------------------------------------
  console.log('\n--- Strict Constraint: Suggestion 2 (Power-Ups & Sabotages) Omission ---');
  
  // Verify no power-up or sabotage files were introduced
  const fs = await import('fs');
  const powerupExists = fs.existsSync('src/services/powerupService.ts') || fs.existsSync('src/components/multiplayer/PowerupsModal.tsx');
  assert(!powerupExists, 'Power-ups and Sabotages services/components are strictly NOT created');

  console.log(`\n===========================================`);
  console.log(`TOTAL PASSED: ${passedTests} | TOTAL FAILED: ${failedTests}`);
  console.log(`===========================================\n`);

  if (failedTests > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
