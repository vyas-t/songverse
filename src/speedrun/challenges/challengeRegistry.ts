// =========================================================================
// SPEEDRUN EVERYTHING — CHALLENGE REGISTRY & GENERATOR
// =========================================================================

import { ActiveChallenge, ChallengeCategory, SpeedrunMode } from '../types';

// Funny Victory Messages
export const VICTORY_MESSAGES = [
  '⚡ Sonic the Hedgehog is taking notes right now.',
  '🚀 Bro is literally overclocked.',
  '🤖 Human Aim-bot detected. NASA notified.',
  '👑 Absolutely filthy execution. 10/10.',
  '🔥 Hands so fast your keyboard caught fire.',
  '🏆 Olympic Gold Medalist in Random Nonsense.',
  '⏱️ Speedrun verified. Any% World Record.',
  '💎 Certified reflex deity.',
];

// Funny Failure Messages
export const FAILURE_MESSAGES = [
  '💀 My grandma scrolls Instagram faster than that.',
  '🐢 Are you running on 2G dial-up from 1998?',
  '💤 Did your brain disconnect from Bluetooth?',
  '🐌 That was slower than a sloth on sleep medication.',
  '📉 Negative aura. We pretend we didn’t see that.',
  '🪦 F in the chat for that reaction time.',
  '🦥 Even Internet Explorer finished before you.',
  '🥔 Playing on a literal potato.',
];

// Tongue twisters and typing prompts
const TYPING_PROMPTS = [
  { text: 'she sells seashells by the seashore', title: 'Seashells Hustle' },
  { text: 'peter piper picked a peck of pickled peppers', title: 'Pickled Pepper Panic' },
  { text: 'how much wood would a woodchuck chuck', title: 'Woodchuck Dilemma' },
  { text: 'i am speed incarnate lightning fast reflex god', title: 'Ego Boost' },
  { text: 'gg ez no re clap that speedrun champion', title: 'Gamer Chant' },
  { text: 'red lorry yellow lorry red lorry yellow lorry', title: 'Lorry Chaos' },
  { text: 'fuzzy wuzzy was a bear fuzzy wuzzy had no hair', title: 'Fuzzy Wuzzy' },
  { text: 'six slippery snails slid slowly seaward', title: 'Slippery Snails' },
];

// Odd emoji sets (common vs odd)
const ODD_EMOJI_SETS = [
  { common: '🐱', odd: '🦁', name: 'Find The Big Cat' },
  { common: '🍎', odd: '🍒', name: 'Fruit Imposter' },
  { common: '😜', odd: '🤪', name: 'Slightly Crazier' },
  { common: '🚗', odd: '🏎️', name: 'Speed Demon' },
  { common: '⭐', odd: '✨', name: 'Extra Sparkle' },
  { common: '🍕', odd: '🍔', name: 'Burger Spy' },
  { common: '🐶', odd: '🐺', name: 'Lone Wolf' },
  { common: '🚀', odd: '🛸', name: 'Alien Infiltration' },
];

// Emoji sequence bank
const EMOJI_BANK = ['⚡', '💎', '🔥', '🚀', '🍕', '🎸', '👑', '🌈', '🛸', '🎯', '👾', '🏆'];

// Color tokens for Brain Glitch (Stroop test)
export interface StroopColor {
  id: string;
  name: string;
  hex: string;
  bgClass: string;
  borderClass: string;
}

export const STROOP_COLORS: StroopColor[] = [
  { id: 'red', name: 'RED', hex: '#ef4444', bgClass: 'bg-red-500', borderClass: 'border-red-400' },
  { id: 'lime', name: 'LIME', hex: '#84cc16', bgClass: 'bg-lime-500', borderClass: 'border-lime-400' },
  { id: 'blue', name: 'BLUE', hex: '#38bdf8', bgClass: 'bg-sky-400', borderClass: 'border-sky-400' },
  { id: 'yellow', name: 'YELLOW', hex: '#facc15', bgClass: 'bg-amber-400', borderClass: 'border-amber-400' },
];

// Wire defusal rules bank
export interface WireRule {
  directive: string;
  targetWireIndex: number; // 0: Red, 1: Lime, 2: Blue, 3: Yellow
  explanation: string;
}

export const WIRE_RULES: WireRule[] = [
  {
    directive: 'RULE: Cut the WIRE between Lime and Yellow!',
    targetWireIndex: 2, // Blue
    explanation: 'Blue wire is physically between Lime and Yellow.',
  },
  {
    directive: 'RULE: If Wire 1 is RED, cut the LAST wire! Otherwise cut Wire 2.',
    targetWireIndex: 3, // Yellow
    explanation: 'Wire 1 is Red, so the condition triggers the last wire (Yellow).',
  },
  {
    directive: 'RULE: Cut the ELECTRIC LIME wire before detonation!',
    targetWireIndex: 1, // Lime
    explanation: 'Cut the Electric Lime wire directly.',
  },
  {
    directive: 'RULE: Cut the SECOND wire from the left!',
    targetWireIndex: 1, // Lime
    explanation: 'The 2nd wire is Lime.',
  },
  {
    directive: 'RULE: Cut the wire matching the EMERGENCY BEACON (RED)!',
    targetWireIndex: 0, // Red
    explanation: 'Cut the primary Red wire.',
  },
  {
    directive: 'RULE: Cut the wire furthest from Red!',
    targetWireIndex: 3, // Yellow
    explanation: 'Yellow is the furthest wire on the right.',
  },
];

export class ChallengeGenerator {
  // Generate a random challenge according to the mode or difficulty
  public static generateChallenge(mode: SpeedrunMode = 'random', index: number = 0): ActiveChallenge {
    if (mode === 'typing') {
      return this.createTypingChallenge();
    }
    if (mode === 'reaction') {
      return this.createReactionChallenge();
    }
    if (mode === 'memory') {
      return this.createMemoryChallenge();
    }
    if (mode === 'brain_glitch' || mode === 'math') {
      return this.createBrainGlitchChallenge();
    }
    if (mode === 'wire_defuse') {
      return this.createWireDefuseChallenge();
    }
    if (mode === 'precision') {
      return this.createPrecisionChallenge();
    }
    if (mode === 'impossible') {
      return this.createImpossibleChallenge();
    }
    if (mode === 'daily') {
      return this.createDailyChallenge();
    }

    // For random / endless mode: pick from all high-octane adult/gamer categories
    const pools = [
      'typing',
      'reaction',
      'memory',
      'brain_glitch',
      'wire_defuse',
      'qte_arrows',
      'precision',
      'impossible',
    ];
    const chosen = pools[Math.floor(Math.random() * pools.length)];

    switch (chosen) {
      case 'typing':
        return this.createTypingChallenge();
      case 'reaction':
        return this.createReactionChallenge();
      case 'memory':
        return this.createMemoryChallenge();
      case 'brain_glitch':
        return this.createBrainGlitchChallenge();
      case 'wire_defuse':
        return this.createWireDefuseChallenge();
      case 'qte_arrows':
        return this.createQteArrowsChallenge();
      case 'precision':
        return this.createPrecisionChallenge();
      case 'impossible':
      default:
        return this.createImpossibleChallenge();
    }
  }

  // 1. TYPING CHALLENGE
  public static createTypingChallenge(): ActiveChallenge {
    const prompt = TYPING_PROMPTS[Math.floor(Math.random() * TYPING_PROMPTS.length)];
    const wordCount = prompt.text.split(' ').length;
    const timeLimitMs = Math.max(6000, wordCount * 1400); // Fair typing allowance

    return {
      id: `typing_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: prompt.title,
      description: 'Type the exact sentence before the clock runs out!',
      instructions: 'Type precisely into the box. Spelling and spaces matter!',
      category: 'typing',
      difficulty: 'medium',
      timeLimitMs,
      parTimeMs: Math.floor(timeLimitMs * 0.55),
      pointsBase: 120,
      type: 'typing_sentence',
      payload: {
        targetSentence: prompt.text,
      },
    };
  }

  // 2. REACTION CHALLENGE
  public static createReactionChallenge(): ActiveChallenge {
    // Random delay between 1.5s and 4.2s
    const greenDelayMs = Math.floor(1500 + Math.random() * 2700);

    return {
      id: `reaction_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'Neon Green Trigger',
      description: 'Wait for RED to turn ELECTRIC GREEN, then click instantly!',
      instructions: 'Do NOT click on Red. Clicking early triggers a False Start disqualification!',
      category: 'reaction',
      difficulty: 'hard',
      timeLimitMs: greenDelayMs + 2500, // 2.5s window after green appears
      parTimeMs: 250, // Sub-250ms is god tier
      pointsBase: 150,
      type: 'reaction_light',
      payload: {
        greenDelayMs,
      },
    };
  }

  // 3. MEMORY CHALLENGE
  public static createMemoryChallenge(): ActiveChallenge {
    // Pick 4 or 5 unique emojis
    const shuffled = [...EMOJI_BANK].sort(() => 0.5 - Math.random());
    const count = 4 + (Math.random() > 0.5 ? 1 : 0);
    const sequence = shuffled.slice(0, count);

    return {
      id: `memory_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'Emoji Sequence Recall',
      description: 'Memorize the emojis, then tap them in the exact order!',
      instructions: 'You have 2 seconds to memorize. Then click the matching icons below!',
      category: 'memory',
      difficulty: 'medium',
      timeLimitMs: 9000,
      parTimeMs: 4500,
      pointsBase: 130,
      type: 'emoji_sequence',
      payload: {
        sequence,
        displayTimeMs: 2200,
      },
    };
  }

  // 4. BRAIN GLITCH (STROOP COGNITIVE TRAP) — REPLACES BASIC MATH
  public static createBrainGlitchChallenge(): ActiveChallenge {
    // Generate 3 rapid Stroop rounds
    const rounds = [];
    const colorKeys: ('red' | 'lime' | 'blue' | 'yellow')[] = ['red', 'lime', 'blue', 'yellow'];

    for (let i = 0; i < 3; i++) {
      // Pick 2 distinct colors (one for word, one for ink font color)
      const shuffled = [...colorKeys].sort(() => 0.5 - Math.random());
      const wordKey = shuffled[0];
      const inkKey = shuffled[1];

      // Round 3 is the reverse trap!
      const isReverseTrap = i === 2;
      const rule = isReverseTrap
        ? '⚠️ TRAP ROUND: CLICK THE WRITTEN WORD (IGNORE INK!)'
        : '⚡ CLICK THE COLOR OF THE INK (NOT THE WORD!)';
      const target = isReverseTrap ? wordKey : inkKey;

      rounds.push({
        wordKey,
        wordText: wordKey.toUpperCase(),
        inkKey,
        inkHex: STROOP_COLORS.find(c => c.id === inkKey)!.hex,
        rule,
        target,
        isReverseTrap,
      });
    }

    return {
      id: `brain_glitch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'Brain Glitch (Stroop Trap)',
      description: 'Your brain will fight itself! Match the ink or word under extreme pressure.',
      instructions: 'Pay attention to the rule: click ink color for rounds 1-2, word for round 3!',
      category: 'brain_glitch',
      difficulty: 'hard',
      timeLimitMs: 6800,
      parTimeMs: 2800,
      pointsBase: 160,
      type: 'brain_glitch',
      payload: {
        rounds,
      },
    };
  }

  // 4B. WIRE DEFUSE (BOMB SQUAD LOGIC)
  public static createWireDefuseChallenge(): ActiveChallenge {
    const rule = WIRE_RULES[Math.floor(Math.random() * WIRE_RULES.length)];
    const wires = [
      { id: 'red', label: 'WIRE 1 (RED)', hex: '#ef4444', ringHex: '#dc2626' },
      { id: 'lime', label: 'WIRE 2 (LIME)', hex: '#84cc16', ringHex: '#65a30d' },
      { id: 'blue', label: 'WIRE 3 (BLUE)', hex: '#38bdf8', ringHex: '#0284c7' },
      { id: 'yellow', label: 'WIRE 4 (YELLOW)', hex: '#facc15', ringHex: '#ca8a04' },
    ];

    return {
      id: `wire_defuse_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'Defuse The Bomb',
      description: 'Read the tactical directive and snip the exact wire before detonation!',
      instructions: 'Click the single correct wire to disarm the explosive timer.',
      category: 'wire_defuse',
      difficulty: 'hard',
      timeLimitMs: 4500,
      parTimeMs: 1800,
      pointsBase: 175,
      type: 'wire_defuse',
      payload: {
        directive: rule.directive,
        targetWireIndex: rule.targetWireIndex,
        explanation: rule.explanation,
        wires,
      },
    };
  }

  // 4C. QTE ARROW RUSH (STREET FIGHTER / DDR COMBO)
  public static createQteArrowsChallenge(): ActiveChallenge {
    const directions: ('up' | 'down' | 'left' | 'right')[] = ['up', 'down', 'left', 'right'];
    const sequence: ('up' | 'down' | 'left' | 'right')[] = [];
    for (let i = 0; i < 5; i++) {
      sequence.push(directions[Math.floor(Math.random() * directions.length)]);
    }

    return {
      id: `qte_arrows_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: 'QTE Arrow Rush',
      description: 'Execute the 5-arrow combo with lightning speed using Arrow Keys, WASD, or Buttons!',
      instructions: 'Press the exact arrow sequence displayed on screen with zero mistakes.',
      category: 'precision',
      difficulty: 'hard',
      timeLimitMs: 3600,
      parTimeMs: 1600,
      pointsBase: 155,
      type: 'qte_arrows',
      payload: {
        sequence,
      },
    };
  }

  // Backward compatibility alias: replace basic arithmetic with Brain Glitch
  public static createMathChallenge(): ActiveChallenge {
    return this.createBrainGlitchChallenge();
  }

  // 5. PRECISION CHALLENGE
  public static createPrecisionChallenge(): ActiveChallenge {
    const isOddEmoji = Math.random() > 0.4;

    if (isOddEmoji) {
      const set = ODD_EMOJI_SETS[Math.floor(Math.random() * ODD_EMOJI_SETS.length)];
      const totalTiles = 16; // 4x4 grid
      const oddIndex = Math.floor(Math.random() * totalTiles);
      const grid = Array(totalTiles).fill(set.common);
      grid[oddIndex] = set.odd;

      return {
        id: `precision_odd_${Date.now()}`,
        title: set.name,
        description: `Find the 1 odd emoji hiding among the ${set.common}!`,
        instructions: 'Scan the grid and click the odd one as fast as you can.',
        category: 'precision',
        difficulty: 'medium',
        timeLimitMs: 6000,
        parTimeMs: 2200,
        pointsBase: 125,
        type: 'find_odd_emoji',
        payload: {
          grid,
          oddIndex,
          common: set.common,
          odd: set.odd,
        },
      };
    }

    // Otherwise, 8 rapid click targets
    const targetCount = 8;
    return {
      id: `precision_targets_${Date.now()}`,
      title: 'Target Elimination 8x',
      description: `Pop ${targetCount} glowing neon targets as they appear!`,
      instructions: 'Click each target immediately as it spawns on screen.',
      category: 'precision',
      difficulty: 'hard',
      timeLimitMs: 7000,
      parTimeMs: 2900,
      pointsBase: 150,
      type: 'target_click',
      payload: {
        targetCount,
      },
    };
  }

  // 6. IMPOSSIBLE CHALLENGE
  public static createImpossibleChallenge(): ActiveChallenge {
    const r = Math.random();

    if (r < 0.35) {
      // Don't click challenge (Patience test)
      return {
        id: `impossible_dont_click_${Date.now()}`,
        title: 'DO NOT TOUCH ANYTHING',
        description: 'Whatever you do, DO NOT click for 3.5 seconds!',
        instructions: 'Hands off the mouse! Do not press any buttons.',
        category: 'impossible',
        difficulty: 'easy',
        timeLimitMs: 3500,
        parTimeMs: 3500,
        pointsBase: 100,
        type: 'dont_click',
        payload: {
          durationMs: 3500,
        },
      };
    } else if (r < 0.7) {
      // Dodge Cursor button
      return {
        id: `impossible_dodge_${Date.now()}`,
        title: 'The Evasive Button',
        description: 'Catch and click the button that dodges your mouse!',
        instructions: 'Hover close and corner it before time runs out.',
        category: 'impossible',
        difficulty: 'insane',
        timeLimitMs: 8000,
        parTimeMs: 3200,
        pointsBase: 180,
        type: 'dodge_cursor',
        payload: {
          requiredClicks: 3,
        },
      };
    } else {
      // Rapid Click Mash
      return {
        id: `impossible_mash_${Date.now()}`,
        title: 'Hyper Clicker 20x',
        description: 'Mash the turbo button 20 times in 4 seconds!',
        instructions: 'Click as rapidly as humanly possible!',
        category: 'impossible',
        difficulty: 'hard',
        timeLimitMs: 4500,
        parTimeMs: 2200,
        pointsBase: 160,
        type: 'rapid_click',
        payload: {
          clicksRequired: 20,
        },
      };
    }
  }

  // 7. DAILY CHALLENGE (Deterministic seed based on UTC date)
  public static createDailyChallenge(): ActiveChallenge {
    const today = new Date().toISOString().slice(0, 10);
    // Combine date string hash
    let hash = 0;
    for (let i = 0; i < today.length; i++) {
      hash = (hash << 5) - hash + today.charCodeAt(i);
      hash |= 0;
    }
    const seed = Math.abs(hash);

    const challengeTypes = ['typing', 'reaction', 'brain_glitch', 'wire_defuse', 'qte_arrows', 'precision', 'memory'];
    const chosen = challengeTypes[seed % challengeTypes.length];

    let base: ActiveChallenge;
    if (chosen === 'typing') base = this.createTypingChallenge();
    else if (chosen === 'reaction') base = this.createReactionChallenge();
    else if (chosen === 'brain_glitch') base = this.createBrainGlitchChallenge();
    else if (chosen === 'wire_defuse') base = this.createWireDefuseChallenge();
    else if (chosen === 'qte_arrows') base = this.createQteArrowsChallenge();
    else if (chosen === 'memory') base = this.createMemoryChallenge();
    else base = this.createPrecisionChallenge();

    base.id = `daily_${today}`;
    base.title = `⚡ DAILY DROP: ${base.title}`;
    base.description = `Official Daily Challenge for ${today}. Compete globally!`;
    base.pointsBase += 50; // Daily bonus!
    return base;
  }
}
