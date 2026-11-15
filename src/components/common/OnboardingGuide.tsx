import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Music,
  Users,
  Award,
  ChevronRight,
  ChevronLeft,
  X,
  Volume2,
  VolumeX,
  Play,
  SkipForward,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Flame,
  Radio,
  RotateCcw,
  Search,
  Zap,
  Globe
} from 'lucide-react';

interface OnboardingGuideProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: (view: string) => void;
}

const ONBOARDING_STORAGE_KEY = 'songverse_onboarding_dismissed_v1';

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onNavigate
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // Interactive Live UI states for the tutorial sandbox
  const [interactiveLevel, setInteractiveLevel] = useState<1 | 2 | 3 | 4>(1);
  const [interactiveScore, setInteractiveScore] = useState<number>(0);
  const [interactiveStreak, setInteractiveStreak] = useState<number>(0);
  const [interactiveStatus, setInteractiveStatus] = useState<'playing' | 'wrong' | 'won' | 'skipped'>('playing');
  const [interactiveSearchInput, setInteractiveSearchInput] = useState<string>('');
  const [selectedMockTrack, setSelectedMockTrack] = useState<string | null>(null);
  const [isSimulatingAudio, setIsSimulatingAudio] = useState<boolean>(false);
  const [simulatedAudioProgress, setSimulatedAudioProgress] = useState<number>(0);

  // Auto show for first-time visitors
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!dismissed && controlledIsOpen === undefined) {
        const timer = setTimeout(() => {
          setInternalIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [controlledIsOpen]);

  // Audio simulation timer
  useEffect(() => {
    let interval: any;
    if (isSimulatingAudio) {
      setSimulatedAudioProgress(0);
      const totalMs = interactiveLevel === 1 ? 1000 : interactiveLevel === 2 ? 3000 : interactiveLevel === 3 ? 5000 : 10000;
      const stepMs = 50;
      interval = setInterval(() => {
        setSimulatedAudioProgress((prev) => {
          const next = prev + (stepMs / totalMs) * 100;
          if (next >= 100) {
            setIsSimulatingAudio(false);
            return 100;
          }
          return next;
        });
      }, stepMs);
    } else {
      setSimulatedAudioProgress(0);
    }
    return () => clearInterval(interval);
  }, [isSimulatingAudio, interactiveLevel]);

  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : internalIsOpen;

  const handleDismiss = (forever: boolean = true) => {
    if (forever) {
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      } catch {}
    }
    if (controlledOnClose) {
      controlledOnClose();
    } else {
      setInternalIsOpen(false);
    }
  };

  const handleNext = () => {
    if (currentStep < 3) {
      setSlideDirection('next');
      setCurrentStep(s => s + 1);
    } else {
      handleDismiss(true);
      if (onNavigate) {
        onNavigate('language_select');
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setSlideDirection('prev');
      setCurrentStep(s => s - 1);
    }
  };

  const handleStepClick = (idx: number) => {
    setSlideDirection(idx > currentStep ? 'next' : 'prev');
    setCurrentStep(idx);
  };

  // --- INTERACTIVE TUTORIAL ACTIONS ---
  const handlePlayClip = () => {
    setIsSimulatingAudio(true);
  };

  const handleInteractiveWrongGuess = () => {
    if (interactiveLevel < 4) {
      setInteractiveLevel((l) => (l + 1) as any);
      setInteractiveStatus('wrong');
    } else {
      setInteractiveStatus('skipped');
    }
  };

  const handleInteractiveCorrectGuess = () => {
    const points = interactiveLevel === 1 ? 100 : interactiveLevel === 2 ? 70 : interactiveLevel === 3 ? 40 : 20;
    setInteractiveScore((s) => s + points);
    setInteractiveStreak((st) => st + 1);
    setInteractiveStatus('won');
  };

  const handleInteractiveSkip = () => {
    if (interactiveLevel < 4) {
      setInteractiveLevel((l) => (l + 1) as any);
      setInteractiveStatus('playing');
    } else {
      setInteractiveStatus('skipped');
    }
  };

  const handleInteractiveReset = () => {
    setInteractiveLevel(1);
    setInteractiveStatus('playing');
    setInteractiveSearchInput('');
    setSelectedMockTrack(null);
    setIsSimulatingAudio(false);
  };

  if (!isOpen) return null;

  const pointsMap = { 1: 100, 2: 70, 3: 40, 4: 20 };
  const durationMap = { 1: '1s', 2: '3s', 3: '5s', 4: '10s' };

  return (
    <div className="sv-modal-viewport fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="sv-modal-surface relative w-full max-w-xl bg-white dark:bg-sv-burgundy-deep border border-black/10 dark:border-sv-burgundy/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Gradient Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber" />

        {/* Header: Badges & Close */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-100 dark:border-sv-burgundy">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-sv-red/10 text-sv-red dark:bg-sv-red/20 dark:text-sv-warm-orange border border-sv-red/20">
              {currentStep === 0 && '🎮 Interactive Sandbox'}
              {currentStep === 1 && '🌍 Game Modes'}
              {currentStep === 2 && '👥 Multiplayer PvP'}
              {currentStep === 3 && '🏆 Social & Leaderboard'}
            </span>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              {currentStep + 1} / 4
            </span>
          </div>

          <button
            onClick={() => handleDismiss(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sv-burgundy transition-colors cursor-pointer"
            title="Close Guide"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sliding Step Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div
            key={currentStep}
            className={`transition-all duration-300 ease-out transform ${
              slideDirection === 'next'
                ? 'animate-in slide-in-from-right-8 fade-in'
                : 'animate-in slide-in-from-left-8 fade-in'
            }`}
          >
            {/* STEP 1: INTERACTIVE LIVE SANDBOX */}
            {currentStep === 0 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    How SongVerse Works
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Try the buttons below! Guess the song from short audio clips to earn maximum points.
                  </p>
                </div>

                {/* LIVE SIMULATED GAME CARD */}
                <div className="p-4 bg-slate-50 dark:bg-sv-midnight rounded-2xl border-2 border-sv-red/30 space-y-3 shadow-inner">
                  {/* Status header */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-sv-red font-mono uppercase font-black">Level {interactiveLevel} / 4</span>
                      <span className="text-slate-400">({durationMap[interactiveLevel]} clip)</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono font-bold">
                      <span className="text-sv-orange flex items-center gap-0.5">
                        <Flame className="w-3.5 h-3.5 fill-current" /> {interactiveStreak}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        {pointsMap[interactiveLevel]} Pts
                      </span>
                    </div>
                  </div>

                  {/* Simulated Audio Waveform Bar */}
                  <div className="p-3 bg-white dark:bg-sv-burgundy-deep rounded-xl border border-slate-200 dark:border-sv-burgundy space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span>Preview: "Blinding Lights - The Weeknd"</span>
                      <span>{durationMap[interactiveLevel]}</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-sv-red to-sv-amber h-full transition-all duration-100"
                        style={{ width: `${simulatedAudioProgress}%` }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handlePlayClip}
                      disabled={isSimulatingAudio}
                      className="w-full py-2 bg-sv-red hover:bg-sv-crimson text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 transition-all"
                    >
                      {isSimulatingAudio ? (
                        <>
                          <Volume2 className="w-4 h-4 animate-bounce" />
                          <span>Listening to {durationMap[interactiveLevel]} clip...</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Play Audio ({durationMap[interactiveLevel]})</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Interactive Action Buttons (NOW FULLY WORKING!) */}
                  {interactiveStatus === 'playing' && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-500 font-semibold text-center">
                        Simulate your answer or skip to unlock more audio:
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={handleInteractiveCorrectGuess}
                          className="py-2.5 px-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center shadow-xs"
                        >
                          <CheckCircle2 className="w-4 h-4 mb-0.5" />
                          <span>Correct Guess</span>
                          <span className="text-[9px] opacity-80">+{pointsMap[interactiveLevel]} pts</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleInteractiveWrongGuess}
                          className="py-2.5 px-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center shadow-xs"
                        >
                          <XCircle className="w-4 h-4 mb-0.5" />
                          <span>Wrong Guess</span>
                          <span className="text-[9px] opacity-80">Unlocks Level {Math.min(4, interactiveLevel + 1)}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleInteractiveSkip}
                          className="py-2.5 px-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-xl text-xs font-bold cursor-pointer transition-all active:scale-95 flex flex-col items-center justify-center shadow-xs"
                        >
                          <SkipForward className="w-4 h-4 mb-0.5" />
                          <span>Skip Level</span>
                          <span className="text-[9px] opacity-80">More clues</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {interactiveStatus === 'won' && (
                    <div className="p-3 bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-xl text-center space-y-2 animate-in zoom-in-95">
                      <p className="text-xs font-black text-emerald-800 dark:text-emerald-200">
                        🎉 Correct! You scored {pointsMap[interactiveLevel]} points!
                      </p>
                      <button
                        type="button"
                        onClick={handleInteractiveReset}
                        className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer hover:bg-emerald-700 transition-all flex items-center gap-1 mx-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Try Again</span>
                      </button>
                    </div>
                  )}

                  {interactiveStatus === 'wrong' && (
                    <div className="p-3 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-xl text-center space-y-2 animate-in zoom-in-95">
                      <p className="text-xs font-black text-amber-900 dark:text-amber-200">
                        Wrong guess! Level {interactiveLevel} unlocked ({durationMap[interactiveLevel]} preview).
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInteractiveStatus('playing')}
                          className="px-3 py-1 bg-sv-red text-white rounded-lg text-xs font-bold cursor-pointer hover:bg-sv-crimson"
                        >
                          Continue Guessing
                        </button>
                        <button
                          type="button"
                          onClick={handleInteractiveReset}
                          className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-xs font-bold cursor-pointer"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  )}

                  {interactiveStatus === 'skipped' && (
                    <div className="p-3 bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 rounded-xl text-center space-y-2 animate-in zoom-in-95">
                      <p className="text-xs font-black text-rose-900 dark:text-rose-200">
                        Round complete! Mystery song revealed: "Blinding Lights".
                      </p>
                      <button
                        type="button"
                        onClick={handleInteractiveReset}
                        className="px-4 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1 mx-auto"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Replay Sandbox</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* STEP 2: GAME MODES */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Solo & Daily Seeded Challenges
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Two distinct single-player modes tailored to your rhythm.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-sv-red/10 text-sv-red flex items-center justify-center font-bold">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Classic Solo Mode</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Choose from 9 languages (English, Hindi, Punjabi, Telugu, Spanish...) or mix them all. Play at your own pace with unlimited rounds.
                    </p>
                  </div>

                  <div className="p-4 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy space-y-2">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold">
                      <Radio className="w-4 h-4" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Daily Global Seed</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      5 identical tracks released every 24 hours (midnight UTC). Every player on earth gets the exact same songs!
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-start gap-2 text-xs text-amber-900 dark:text-amber-200">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>Pro Tip:</strong> Guessing in Level 1 earns 100 points and builds your streak. Streaks award bonus achievement badges!
                  </p>
                </div>
              </div>
            )}

            {/* STEP 3: LIVE MULTIPLAYER */}
            {currentStep === 2 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Real-time PvP Multiplayer
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Host or join rooms with zero lag using WebRTC DataChannels.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-sv-red text-white flex items-center justify-center text-xs font-mono font-bold">
                      #
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">6-Digit Room Codes & Passcodes</h4>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Create a lobby and share the 6-digit code. You can also lock private games with an optional 4-digit PIN!
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-medium pt-1">
                    <div className="p-2.5 rounded-xl bg-white dark:bg-sv-burgundy/40 border border-slate-200/80 dark:border-sv-burgundy/80">
                      ⚡ <strong>Competitive Mode:</strong> 30s timers, speed-based scores, and live winner's podium.
                    </div>
                    <div className="p-2.5 rounded-xl bg-white dark:bg-sv-burgundy/40 border border-slate-200/80 dark:border-sv-burgundy/80">
                      🎶 <strong>Casual Jam:</strong> Relaxed vibes, shared scores, and music appreciation.
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-start gap-2 text-xs text-indigo-900 dark:text-indigo-200">
                  <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <p>
                    <strong>New Feature:</strong> Send live emoji reactions (🔥, 🤯, 👏, 😭, ⚡) during results and export the match playlist directly to Spotify or Apple Music!
                  </p>
                </div>
              </div>
            )}

            {/* STEP 4: SOCIAL & LEADERBOARD */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Friends, Profiles & Ranks
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Connect with friends and climb the global leaderboards.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <div className="p-3 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sv-red/10 text-sv-red flex items-center justify-center font-bold">
                      @
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">Unique Usernames (@username)</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Choose a unique handle to let friends find and invite you into rooms.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">Online Presence & 1-Click Invites</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">See who is online and send room invites directly from your lobby.</p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-sv-gold/20 text-sv-gold flex items-center justify-center font-bold">
                      <Award className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-slate-900 dark:text-white">Friends Leaderboard Comparison</p>
                      <p className="text-slate-500 dark:text-slate-400 text-[11px]">Compare scores specifically against your accepted friends network.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step Indicator Dots */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {[0, 1, 2, 3].map((idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleStepClick(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStep
                  ? 'w-7 bg-sv-red shadow-xs'
                  : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
              }`}
              title={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-t border-slate-100 dark:border-sv-burgundy bg-slate-50/50 dark:bg-sv-midnight/40">
          <button
            type="button"
            onClick={() => handleDismiss(true)}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-3 py-2 rounded-xl cursor-pointer transition-colors"
          >
            Skip Tutorial
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handlePrev}
                className="flex items-center gap-1 px-3.5 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 bg-gradient-to-r from-sv-red to-sv-red-orange hover:from-sv-crimson hover:to-sv-red text-white rounded-xl text-xs font-black cursor-pointer shadow-md shadow-sv-red/25 transition-all active:scale-95"
            >
              <span>{currentStep === 3 ? 'Start Playing SongVerse!' : 'Next Step'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
