import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  RotateCcw,
  ArrowRight,
  Flame,
  Zap,
  Timer,
  Trophy,
  AlertTriangle,
  Award,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle
} from 'lucide-react';
import { ActiveChallenge, SpeedrunMode, SpeedrunResult } from '../types';
import { speedrunAudio } from '../audio';
import { speedrunEngine } from '../engine/speedrunEngine';
import { ChallengeGenerator } from '../challenges/challengeRegistry';

interface GameArenaProps {
  mode: SpeedrunMode;
  onSelectMode: (mode: SpeedrunMode) => void;
  onViewLeaderboard: () => void;
}

export const GameArena: React.FC<GameArenaProps> = ({ mode, onSelectMode, onViewLeaderboard }) => {
  const [challenge, setChallenge] = useState<ActiveChallenge>(() => ChallengeGenerator.generateChallenge(mode));
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'active' | 'result'>('idle');
  const [countdownVal, setCountdownVal] = useState<number>(3);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [result, setResult] = useState<SpeedrunResult | null>(null);

  // Dynamic Challenge Sub-States
  // 1. Typing
  const [typedInput, setTypedInput] = useState('');
  const typingInputRef = useRef<HTMLInputElement>(null);

  // 2. Reaction
  const [reactionReady, setReactionReady] = useState(false);
  const [reactionGreenTime, setReactionGreenTime] = useState<number>(0);
  const reactionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 3. Memory
  const [memoryShowing, setMemoryShowing] = useState(true);
  const [userSequence, setUserSequence] = useState<string[]>([]);

  // 4. Math
  const [currentMathIndex, setCurrentMathIndex] = useState(0);

  // 5. Target Click
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [targetsRemaining, setTargetsRemaining] = useState(8);

  // 6. Rapid Click
  const [rapidClicks, setRapidClicks] = useState(0);

  // 7. Dodge Button
  const [dodgePos, setDodgePos] = useState({ x: 50, y: 50 });
  const [dodgeClicks, setDodgeClicks] = useState(0);

  // Precision timer loop refs
  const startTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Initialize or reset challenge
  const setupNewChallenge = (targetMode: SpeedrunMode = mode) => {
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    const newCh = ChallengeGenerator.generateChallenge(targetMode);
    setChallenge(newCh);
    setPhase('idle');
    setElapsedMs(0);
    setResult(null);
    setTypedInput('');
    setReactionReady(false);
    setUserSequence([]);
    setCurrentMathIndex(0);
    setRapidClicks(0);
    setDodgeClicks(0);
    setDodgePos({ x: 50, y: 50 });

    if (newCh.type === 'target_click') {
      setTargetsRemaining(newCh.payload.targetCount || 8);
      randomizeTargetPos();
    }
  };

  const randomizeTargetPos = () => {
    setTargetPos({
      x: Math.floor(15 + Math.random() * 70),
      y: Math.floor(20 + Math.random() * 60),
    });
  };

  // Start Countdown
  const startCountdown = () => {
    setPhase('countdown');
    setCountdownVal(3);
    speedrunAudio.playTick(660);

    let count = 3;
    const interval = setInterval(() => {
      count -= 1;
      if (count > 0) {
        setCountdownVal(count);
        speedrunAudio.playTick(660 + (3 - count) * 100);
      } else {
        clearInterval(interval);
        speedrunAudio.playGo();
        launchActiveGame();
      }
    }, 650);
  };

  // Launch Active Game
  const launchActiveGame = () => {
    setPhase('active');
    startTimeRef.current = performance.now();
    setElapsedMs(0);

    // Setup specific challenge mechanics
    if (challenge.type === 'typing_sentence') {
      setTypedInput('');
      setTimeout(() => typingInputRef.current?.focus(), 50);
    } else if (challenge.type === 'reaction_light') {
      setReactionReady(false);
      const delay = challenge.payload.greenDelayMs || 2200;
      reactionTimerRef.current = setTimeout(() => {
        setReactionReady(true);
        setReactionGreenTime(performance.now());
        speedrunAudio.playTick(1200);
      }, delay);
    } else if (challenge.type === 'emoji_sequence') {
      setMemoryShowing(true);
      setUserSequence([]);
      setTimeout(() => {
        setMemoryShowing(false);
      }, challenge.payload.displayTimeMs || 2200);
    } else if (challenge.type === 'dont_click') {
      // Don't click automatically completes if time limit expires
    }

    // Precise high-res Stopwatch Loop
    const tick = () => {
      const now = performance.now();
      const currentElapsed = now - startTimeRef.current;
      setElapsedMs(currentElapsed);

      // Check timeout
      if (currentElapsed >= challenge.timeLimitMs) {
        if (challenge.type === 'dont_click') {
          // Survived the don't click challenge!
          finishChallenge(true, currentElapsed);
        } else {
          finishChallenge(false, currentElapsed);
        }
        return;
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  // Finish Challenge
  const finishChallenge = (success: boolean, finalTimeMs: number, extraMeta: any = {}) => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);

    if (success) {
      speedrunAudio.playSuccess();
    } else {
      speedrunAudio.playFailure();
    }

    const recorded = speedrunEngine.recordResult({
      challengeId: challenge.id,
      challengeTitle: challenge.title,
      category: challenge.category,
      mode,
      success,
      timeElapsedMs: finalTimeMs,
      timeLimitMs: challenge.timeLimitMs,
      pointsBase: challenge.pointsBase,
      parTimeMs: challenge.parTimeMs,
      ...extraMeta,
    });

    setResult(recorded);
    setPhase('result');
  };

  // -------------------------------------------------------------------------
  // INTERACTION HANDLERS FOR CHALLENGE TYPES
  // -------------------------------------------------------------------------

  // 1. Typing Input Change
  const handleTypingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypedInput(val);
    const target = challenge.payload.targetSentence;

    if (val === target) {
      const finalTime = performance.now() - startTimeRef.current;
      const wordCount = target.split(' ').length;
      const wpm = (wordCount / (finalTime / 60000));
      finishChallenge(true, finalTime, { wpm });
    }
  };

  // 2. Reaction Click
  const handleReactionClick = () => {
    if (phase !== 'active') return;

    if (!reactionReady) {
      // False start / clicked early!
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
      finishChallenge(false, elapsedMs, { accuracyPercent: 0 });
    } else {
      // Valid reaction!
      const reactionMs = performance.now() - reactionGreenTime;
      finishChallenge(true, elapsedMs, { reactionMs });
    }
  };

  // 3. Emoji Memory Sequence Click
  const handleEmojiClick = (emoji: string) => {
    if (memoryShowing || phase !== 'active') return;

    const newSeq = [...userSequence, emoji];
    setUserSequence(newSeq);
    speedrunAudio.playTargetHit(newSeq.length);

    const targetSeq = challenge.payload.sequence as string[];
    const currentIndex = newSeq.length - 1;

    // Check if wrong emoji clicked
    if (newSeq[currentIndex] !== targetSeq[currentIndex]) {
      finishChallenge(false, performance.now() - startTimeRef.current);
      return;
    }

    // Check if completed full sequence
    if (newSeq.length === targetSeq.length) {
      finishChallenge(true, performance.now() - startTimeRef.current);
    }
  };

  // 4. Math Option Click
  const handleMathChoice = (choice: number) => {
    if (phase !== 'active') return;

    const currentEq = challenge.payload.equations[currentMathIndex];
    if (choice === currentEq.answer) {
      speedrunAudio.playTargetHit(currentMathIndex + 1);
      if (currentMathIndex + 1 >= challenge.payload.equations.length) {
        finishChallenge(true, performance.now() - startTimeRef.current);
      } else {
        setCurrentMathIndex(currentMathIndex + 1);
      }
    } else {
      // Wrong answer fails
      finishChallenge(false, performance.now() - startTimeRef.current);
    }
  };

  // 5. Target Click
  const handleTargetClick = () => {
    if (phase !== 'active') return;

    const remaining = targetsRemaining - 1;
    setTargetsRemaining(remaining);
    speedrunAudio.playTargetHit(8 - remaining);

    if (remaining <= 0) {
      finishChallenge(true, performance.now() - startTimeRef.current);
    } else {
      randomizeTargetPos();
    }
  };

  // 6. Find Odd Emoji Click
  const handleOddEmojiClick = (idx: number) => {
    if (phase !== 'active') return;

    if (idx === challenge.payload.oddIndex) {
      finishChallenge(true, performance.now() - startTimeRef.current);
    } else {
      finishChallenge(false, performance.now() - startTimeRef.current);
    }
  };

  // 7. Don't Click Touch
  const handleDontClickTouch = () => {
    if (phase !== 'active') return;
    // User failed by clicking the forbidden button!
    finishChallenge(false, elapsedMs);
  };

  // 8. Rapid Click Mash
  const handleRapidClickMash = () => {
    if (phase !== 'active') return;

    const newCount = rapidClicks + 1;
    setRapidClicks(newCount);
    speedrunAudio.playTargetHit(newCount % 5);

    if (newCount >= (challenge.payload.clicksRequired || 20)) {
      finishChallenge(true, performance.now() - startTimeRef.current);
    }
  };

  // 9. Dodge Cursor
  const handleDodgeHover = () => {
    if (phase !== 'active') return;
    // Move to random location inside bounds
    setDodgePos({
      x: Math.floor(10 + Math.random() * 80),
      y: Math.floor(15 + Math.random() * 70),
    });
  };

  const handleDodgeClick = () => {
    if (phase !== 'active') return;
    const clicks = dodgeClicks + 1;
    setDodgeClicks(clicks);
    speedrunAudio.playTargetHit(clicks * 2);

    if (clicks >= (challenge.payload.requiredClicks || 3)) {
      finishChallenge(true, performance.now() - startTimeRef.current);
    } else {
      handleDodgeHover();
    }
  };

  // Format Milliseconds helper `00:02.431`
  const formatTime = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const millis = Math.floor(ms % 1000);
    const formattedSecs = String(totalSecs).padStart(2, '0');
    const formattedMillis = String(millis).padStart(3, '0');
    return `${formattedSecs}.${formattedMillis}s`;
  };

  // Hotkey listener (Space to start/next, R to retry)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (phase === 'idle' && e.code === 'Space') {
        e.preventDefault();
        startCountdown();
      } else if (phase === 'result') {
        if (e.code === 'Space') {
          e.preventDefault();
          setupNewChallenge();
          startCountdown();
        } else if (e.key === 'r' || e.key === 'R') {
          e.preventDefault();
          startCountdown();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase]);

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (reactionTimerRef.current) clearTimeout(reactionTimerRef.current);
    };
  }, []);

  return (
    <div className="relative w-full max-w-4xl mx-auto px-4 py-8 flex flex-col items-center select-none">
      
      {/* -----------------------------------------------------------------
          TOP HUD: MODE BADGE + TIMER + STREAK
          ----------------------------------------------------------------- */}
      <div className="w-full flex items-center justify-between gap-4 p-4 rounded-3xl bg-black/60 backdrop-blur-xl border border-purple-500/30 shadow-[0_10px_35px_rgba(155,92,235,0.15)] mb-6">
        
        {/* Mode & Category Tag */}
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 font-black">
                {mode.toUpperCase()} SPEEDRUN
              </span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-purple-500/30 text-purple-200">
                {challenge.difficulty}
              </span>
            </div>
            <h2 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs">
              {challenge.title}
            </h2>
          </div>
        </div>

        {/* Digital Millisecond Stopwatch HUD */}
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1.5 text-xs font-mono text-slate-400">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <span>TIME</span>
          </div>
          <span className="font-mono text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-purple-300 tracking-wider">
            {formatTime(elapsedMs)}
          </span>
        </div>

      </div>

      {/* -----------------------------------------------------------------
          TIMER PROGRESS GAUGE (Turns red as deadline approaches)
          ----------------------------------------------------------------- */}
      <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-6 border border-white/5">
        <div
          className={`h-full transition-all duration-75 ${
            (challenge.timeLimitMs - elapsedMs) < 2000
              ? 'bg-rose-500 shadow-[0_0_12px_#f43f5e]'
              : 'bg-gradient-to-r from-amber-400 via-rose-400 to-purple-500'
          }`}
          style={{
            width: `${Math.max(0, 100 - (elapsedMs / challenge.timeLimitMs) * 100)}%`,
          }}
        />
      </div>

      {/* -----------------------------------------------------------------
          MAIN GAME SCREEN ARENA
          ----------------------------------------------------------------- */}
      <div className="relative w-full h-[420px] sm:h-[460px] rounded-3xl bg-black/80 backdrop-blur-2xl border-2 border-purple-500/40 shadow-[0_0_50px_rgba(155,92,235,0.2)] overflow-hidden flex flex-col items-center justify-center p-6 text-center">

        {/* Background Ambient Grid Lines */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(245, 158, 66, 0.5) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }}
        />

        {/* ===============================================================
            PHASE 1: IDLE / PREVIEW STATE
            =============================================================== */}
        {phase === 'idle' && (
          <div className="relative z-10 flex flex-col items-center justify-center max-w-lg space-y-5 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-[0_0_35px_rgba(245,158,66,0.5)]">
              <Zap className="w-8 h-8 fill-current text-white" />
            </div>

            <div className="space-y-2">
              <h3 className="font-cinzel text-2xl sm:text-3xl font-black uppercase text-white tracking-wider">
                {challenge.title}
              </h3>
              <p className="text-sm text-slate-300 font-medium leading-relaxed">
                {challenge.description}
              </p>
              <p className="text-xs font-mono text-amber-300/80">
                Target Par Time: {formatTime(challenge.parTimeMs)} • Reward: {challenge.pointsBase} pts
              </p>
            </div>

            <button
              onClick={startCountdown}
              className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:via-rose-400 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_30px_rgba(245,158,66,0.5)] hover:shadow-[0_0_50px_rgba(245,158,66,0.8)] transition-all transform hover:scale-105 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>START SPEEDRUN (SPACE)</span>
            </button>
          </div>
        )}

        {/* ===============================================================
            PHASE 2: COUNTDOWN ("3... 2... 1...")
            =============================================================== */}
        {phase === 'countdown' && (
          <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
            <span className="font-cinzel text-8xl sm:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-rose-400 to-purple-500 animate-pulse">
              {countdownVal}
            </span>
            <p className="text-xs font-mono tracking-[0.3em] uppercase text-amber-300">
              PREPARE THY REFLEXES
            </p>
          </div>
        )}

        {/* ===============================================================
            PHASE 3: ACTIVE GAMEPLAY
            =============================================================== */}
        {phase === 'active' && (
          <div className="relative z-10 w-full h-full flex flex-col items-center justify-center">

            {/* A. TYPING CHALLENGE */}
            {challenge.type === 'typing_sentence' && (
              <div className="w-full max-w-xl space-y-6">
                <div className="p-5 rounded-2xl bg-black/60 border border-purple-500/30 text-left">
                  <p className="text-xs font-mono text-amber-400 font-bold uppercase mb-1">Type this prompt:</p>
                  <p className="text-base sm:text-xl font-bold tracking-wide font-mono text-white leading-relaxed">
                    {challenge.payload.targetSentence.split('').map((char: string, i: number) => {
                      const typedChar = typedInput[i];
                      let color = 'text-slate-400';
                      if (typedChar !== undefined) {
                        color = typedChar === char ? 'text-emerald-400' : 'text-rose-400 underline';
                      }
                      return (
                        <span key={i} className={color}>
                          {char}
                        </span>
                      );
                    })}
                  </p>
                </div>

                <input
                  ref={typingInputRef}
                  type="text"
                  value={typedInput}
                  onChange={handleTypingChange}
                  placeholder="Start typing immediately..."
                  autoComplete="off"
                  spellCheck="false"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/10 border-2 border-amber-400/60 focus:border-amber-400 text-white font-mono text-base outline-none shadow-lg"
                />
              </div>
            )}

            {/* B. REACTION LIGHT */}
            {challenge.type === 'reaction_light' && (
              <div
                onClick={handleReactionClick}
                className={`w-full h-full rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-colors duration-100 ${
                  reactionReady
                    ? 'bg-emerald-500 text-slate-950 shadow-[0_0_80px_#10b981]'
                    : 'bg-rose-950/90 text-rose-200 border-2 border-rose-500'
                }`}
              >
                <Zap className={`w-16 h-16 ${reactionReady ? 'animate-bounce' : 'animate-pulse'}`} />
                <h3 className="font-cinzel text-3xl sm:text-5xl font-black uppercase mt-3">
                  {reactionReady ? 'CLICK / TAP NOW!' : 'WAIT FOR GREEN...'}
                </h3>
                <p className="text-xs font-mono tracking-widest mt-2 uppercase font-bold">
                  {reactionReady ? 'RECORDING MILLISECONDS!' : 'DO NOT CLICK EARLY (DISQUALIFICATION)'}
                </p>
              </div>
            )}

            {/* C. MEMORY EMOJI SEQUENCE */}
            {challenge.type === 'emoji_sequence' && (
              <div className="w-full max-w-md space-y-6">
                {memoryShowing ? (
                  <div className="space-y-4">
                    <p className="text-xs font-mono text-amber-300 uppercase tracking-widest">
                      MEMORIZE THE SEQUENCE:
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      {(challenge.payload.sequence as string[]).map((em, idx) => (
                        <div
                          key={idx}
                          className="w-14 h-14 rounded-2xl bg-purple-500/20 border-2 border-purple-400 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(155,92,235,0.4)]"
                        >
                          {em}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs font-mono text-cyan-300 uppercase tracking-widest">
                      TAP IN EXACT ORDER ({userSequence.length} / {challenge.payload.sequence.length}):
                    </p>
                    {/* User Sequence Progress */}
                    <div className="flex items-center justify-center gap-2 h-12">
                      {challenge.payload.sequence.map((_: any, idx: number) => (
                        <div
                          key={idx}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl ${
                            userSequence[idx]
                              ? 'bg-emerald-500/20 border-emerald-400'
                              : 'bg-white/5 border-white/20'
                          }`}
                        >
                          {userSequence[idx] || '?'}
                        </div>
                      ))}
                    </div>
                    {/* Keypad */}
                    <div className="grid grid-cols-4 gap-2.5 pt-2">
                      {[...new Set([...challenge.payload.sequence, '⚡', '💎', '🔥', '🎸'])].slice(0, 8).map((em, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleEmojiClick(em)}
                          className="w-full h-14 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-md"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* D. RAPID MATH BLITZ */}
            {challenge.type === 'math_equations' && (
              <div className="w-full max-w-md space-y-6">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-amber-300 uppercase tracking-widest">
                    EQUATION {currentMathIndex + 1} OF {challenge.payload.equations.length}
                  </p>
                  <h3 className="font-mono text-4xl sm:text-5xl font-black text-white">
                    {challenge.payload.equations[currentMathIndex].prompt} = ?
                  </h3>
                </div>
                <div className="grid grid-cols-3 gap-3 pt-4">
                  {challenge.payload.equations[currentMathIndex].choices.map((ans: number, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleMathChoice(ans)}
                      className="py-4 rounded-2xl bg-gradient-to-b from-white/15 to-black/60 hover:from-white/25 hover:to-black/80 border-2 border-purple-500/40 hover:border-amber-400 text-white font-mono text-2xl font-black transition-all transform hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
                    >
                      {ans}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* E. TARGET CLICK 8x */}
            {challenge.type === 'target_click' && (
              <div className="relative w-full h-full">
                <p className="absolute top-2 left-2 text-xs font-mono text-amber-300 font-bold">
                  TARGETS REMAINING: {targetsRemaining}
                </p>
                <button
                  onClick={handleTargetClick}
                  className="absolute w-14 h-14 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 border-2 border-white flex items-center justify-center text-white shadow-[0_0_25px_rgba(245,158,66,0.8)] animate-pulse transition-transform active:scale-90 cursor-pointer"
                  style={{
                    left: `${targetPos.x}%`,
                    top: `${targetPos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <Zap className="w-7 h-7 fill-current" />
                </button>
              </div>
            )}

            {/* F. FIND ODD EMOJI */}
            {challenge.type === 'find_odd_emoji' && (
              <div className="space-y-3">
                <p className="text-xs font-mono text-amber-300 uppercase tracking-widest">
                  CLICK THE ONE DIFFERENT EMOJI!
                </p>
                <div className="grid grid-cols-4 gap-2.5 max-w-xs mx-auto">
                  {challenge.payload.grid.map((em: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleOddEmojiClick(idx)}
                      className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 text-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* G. DO NOT TOUCH ANYTHING */}
            {challenge.type === 'dont_click' && (
              <div className="space-y-4">
                <AlertTriangle className="w-16 h-16 text-amber-400 mx-auto animate-bounce" />
                <h3 className="font-cinzel text-3xl sm:text-4xl font-black text-rose-400 uppercase">
                  DO NOT TOUCH ANYTHING!
                </h3>
                <p className="text-xs font-mono text-slate-300">
                  Resist the temptation for {formatTime(challenge.timeLimitMs - elapsedMs)}!
                </p>
                <button
                  onClick={handleDontClickTouch}
                  className="px-10 py-5 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-black text-lg uppercase shadow-[0_0_40px_rgba(244,63,94,0.6)] cursor-pointer"
                >
                  DO NOT CLICK ME
                </button>
              </div>
            )}

            {/* H. RAPID MASH CLICKER */}
            {challenge.type === 'rapid_click' && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <p className="text-xs font-mono text-amber-300 uppercase tracking-widest">
                    MASH AS FAST AS POSSIBLE ({rapidClicks} / {challenge.payload.clicksRequired || 20})
                  </p>
                  <div className="w-64 h-3 bg-slate-900 rounded-full mx-auto overflow-hidden border border-white/10">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all"
                      style={{
                        width: `${(rapidClicks / (challenge.payload.clicksRequired || 20)) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                <button
                  onClick={handleRapidClickMash}
                  className="w-36 h-36 rounded-full bg-gradient-to-tr from-amber-400 via-rose-500 to-purple-600 hover:scale-105 active:scale-90 border-4 border-white text-white font-black text-2xl shadow-[0_0_50px_rgba(245,158,66,0.6)] transition-transform flex flex-col items-center justify-center mx-auto cursor-pointer"
                >
                  <Flame className="w-10 h-10 fill-current mb-1" />
                  <span>MASH!</span>
                </button>
              </div>
            )}

            {/* I. DODGE CURSOR BUTTON */}
            {challenge.type === 'dodge_cursor' && (
              <div className="relative w-full h-full">
                <p className="absolute top-2 left-2 text-xs font-mono text-amber-300 font-bold">
                  CORNERS CAUGHT: {dodgeClicks} / {challenge.payload.requiredClicks || 3}
                </p>
                <button
                  onMouseEnter={handleDodgeHover}
                  onClick={handleDodgeClick}
                  className="absolute px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm uppercase shadow-xl transition-all duration-150 cursor-pointer"
                  style={{
                    left: `${dodgePos.x}%`,
                    top: `${dodgePos.y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  CLICK ME!
                </button>
              </div>
            )}

          </div>
        )}

        {/* ===============================================================
            PHASE 4: RESULT SCREEN (VICTORY / DEFEAT)
            =============================================================== */}
        {phase === 'result' && result && (
          <div className="relative z-10 flex flex-col items-center justify-center max-w-lg space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Rating Badge */}
            <div className="flex items-center gap-3">
              <span
                className={`font-cinzel text-6xl sm:text-7xl font-black ${
                  result.success
                    ? 'text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-rose-300 to-purple-400 drop-shadow-[0_0_30px_rgba(245,158,66,0.7)]'
                    : 'text-rose-500 drop-shadow-[0_0_30px_rgba(244,63,94,0.7)]'
                }`}
              >
                RANK {result.rating}
              </span>
            </div>

            {/* Stats Breakdown */}
            <div className="space-y-1">
              <h3 className="font-bold text-lg sm:text-xl text-white">
                {result.success ? 'SPEEDRUN COMPLETED!' : 'RUN FAILED (TIMEOUT)'}
              </h3>
              <p className="text-xs sm:text-sm font-mono text-amber-300 font-semibold">
                Time: {formatTime(result.timeElapsedMs)} • Par: {formatTime(challenge.parTimeMs)}
              </p>
              <p className="text-xs font-serif italic text-slate-300 pt-1">
                "{result.funnyMessage}"
              </p>
            </div>

            {/* Points & Multiplier Badge */}
            {result.success && (
              <div className="flex items-center gap-3">
                <div className="px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-mono font-bold">
                  +{result.pointsEarned} Points
                </div>
                {result.comboMultiplier > 1.0 && (
                  <div className="px-3 py-1.5 rounded-full bg-rose-500/20 border border-rose-400/40 text-rose-300 text-xs font-mono font-bold flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 fill-current" />
                    <span>{result.comboMultiplier.toFixed(1)}x Combo</span>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setupNewChallenge();
                  startCountdown();
                }}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:via-rose-400 hover:to-purple-500 text-white font-black text-xs uppercase tracking-wider shadow-lg cursor-pointer"
              >
                <ArrowRight className="w-4 h-4" />
                <span>NEXT CHALLENGE (SPACE)</span>
              </button>

              <button
                onClick={() => {
                  startCountdown();
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>RETRY (R)</span>
              </button>

              <button
                onClick={onViewLeaderboard}
                className="inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 font-bold text-xs uppercase cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>Rankings</span>
              </button>
            </div>

          </div>
        )}

      </div>

      {/* -----------------------------------------------------------------
          BOTTOM FOOTER BAR: HINT & HOTKEYS
          ----------------------------------------------------------------- */}
      <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400 pt-4 px-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>{challenge.instructions}</span>
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <span>[SPACE] Start / Next</span>
          <span>•</span>
          <span>[R] Retry</span>
        </div>
      </div>

    </div>
  );
};
