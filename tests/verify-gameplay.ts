/**
 * Automated Verification Script for SongVerse
 * Tests the 18 core scenarios specified in Section 15 of the specification.
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

import { runAutomatedTestSuite } from '../src/services/gameTests';

async function main() {
  console.log('====================================================');
  console.log('  SONGVERSE — 30-SCENARIO AUTOMATED TEST SUITE');
  console.log('====================================================\n');

  const results = await runAutomatedTestSuite();
  let passedCount = 0;

  results.forEach(res => {
    const symbol = res.passed ? '✓ PASS' : '✗ FAIL';
    console.log(`[${symbol}] Scenario ${res.scenarioNumber}: ${res.title} (${res.durationMs}ms)`);
    console.log(`       Expected: ${res.expected}`);
    console.log(`       Details:  ${res.details}\n`);
    if (res.passed) passedCount++;
  });

  console.log('----------------------------------------------------');
  console.log(`Final Verification Score: ${passedCount} / ${results.length} Scenarios Passed.`);
  console.log('====================================================');

  if (passedCount !== results.length) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
