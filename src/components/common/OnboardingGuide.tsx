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
  HelpCircle,
  Play,
  Flame,
  Radio,
  Compass,
  CheckCircle2
} from 'lucide-react';

interface GuideStep {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  badge: string;
  tip: string;
}

const GUIDE_STEPS: GuideStep[] = [
  {
    title: 'How It Works: 4 Audio Levels',
    subtitle: 'Identify the song before time runs out',
    description:
      'Each round plays a snippet of a mystery song. You start with 1 second (Level 1, 100 pts). If you need more clues, wrong guesses or skips unlock longer previews (3s, 5s, 10s) with fewer points.',
    icon: <Volume2 className="w-8 h-8 text-sv-red" />,
    badge: 'Core Gameplay',
    tip: 'Skip level if you are unsure to preserve streak points!'
  },
  {
    title: 'Solo & Daily Challenges',
    subtitle: 'Practice with any language or play the daily global song',
    description:
      'Choose from English, Hindi, Punjabi, Telugu, Spanish and more in Solo Play. Compete once every day in the Daily Challenge where everyone around the world guesses the exact same track!',
    icon: <Play className="w-8 h-8 text-sv-orange" />,
    badge: 'Game Modes',
    tip: 'Daily challenges reset every 24 hours at midnight UTC.'
  },
  {
    title: 'Live Multiplayer Rooms',
    subtitle: 'Play against friends in real-time PvP with 6-digit room codes',
    description:
      'Create a private lobby, choose Competitive or Casual mode, pick round counts (3 to 10), and invite friends with direct links or 6-digit codes. Everyone hears the music simultaneously!',
    icon: <Users className="w-8 h-8 text-amber-500" />,
    badge: 'Real-time PvP',
    tip: 'Hosts control the music catalogue and can customize language filters.'
  },
  {
    title: 'Friends & Leaderboards',
    subtitle: 'Compare scores, send room invites, and climb the ranks',
    description:
      'Create a unique username (@username), search for friends, see who is online, and compare your trivia victories on the dedicated Friends Leaderboard.',
    icon: <Award className="w-8 h-8 text-sv-gold" />,
    badge: 'Social & Ranks',
    tip: 'Sign up or log in to sync your profile and high scores across all your devices.'
  }
];

const ONBOARDING_STORAGE_KEY = 'songverse_onboarding_dismissed_v1';

interface OnboardingGuideProps {
  isOpen?: boolean;
  onClose?: () => void;
  onNavigate?: (view: string) => void;
}

export const OnboardingGuide: React.FC<OnboardingGuideProps> = ({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  onNavigate
}) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if first-time visitor
  useEffect(() => {
    try {
      const dismissed = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!dismissed && controlledIsOpen === undefined) {
        // Auto show for first-time visitors after a gentle 1.2s delay
        const timer = setTimeout(() => {
          setInternalIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [controlledIsOpen]);

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
    if (currentStep < GUIDE_STEPS.length - 1) {
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
      setCurrentStep(s => s - 1);
    }
  };

  if (!isOpen) return null;

  const step = GUIDE_STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-white dark:bg-sv-burgundy-deep border border-black/10 dark:border-sv-burgundy/80 rounded-3xl shadow-2xl p-6 sm:p-8 space-y-6 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
      >
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber" />
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-sv-red/10 dark:bg-sv-red/20 rounded-full blur-2xl pointer-events-none" />

        {/* Top Header: Badge, Progress & Close Button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase px-2.5 py-0.5 rounded-full bg-sv-red/10 text-sv-red dark:bg-sv-red/20 dark:text-sv-warm-orange border border-sv-red/20">
              {step.badge}
            </span>
            <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400">
              Step {currentStep + 1} of {GUIDE_STEPS.length}
            </span>
          </div>

          <button
            onClick={() => handleDismiss(true)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-sv-burgundy transition-colors cursor-pointer"
            title="Skip Guide (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Visual Card */}
        <div className="flex flex-col items-center text-center space-y-4 pt-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-slate-100 to-slate-200 dark:from-sv-burgundy/60 dark:to-sv-burgundy flex items-center justify-center shadow-inner border border-slate-200 dark:border-sv-burgundy">
            {step.icon}
          </div>

          <div className="space-y-1.5 max-w-md">
            <h3 id="guide-title" className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {step.title}
            </h3>
            <p className="text-xs font-bold text-sv-red dark:text-sv-warm-orange">
              {step.subtitle}
            </p>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1">
              {step.description}
            </p>
          </div>
        </div>

        {/* Pro Tip Callout */}
        <div className="p-3 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-900 dark:text-amber-200 font-medium leading-snug">
            <span className="font-bold">Pro Tip: </span>
            {step.tip}
          </p>
        </div>

        {/* Dots Navigation */}
        <div className="flex items-center justify-center gap-1.5 pt-1">
          {GUIDE_STEPS.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === currentStep
                  ? 'w-6 bg-sv-red shadow-xs'
                  : 'w-1.5 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
              }`}
              title={`Go to step ${idx + 1}`}
            />
          ))}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-sv-burgundy">
          <button
            onClick={() => handleDismiss(true)}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 px-3 py-2 rounded-xl hover:bg-slate-100 dark:hover:bg-sv-burgundy transition-colors cursor-pointer"
          >
            Skip Tour
          </button>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-sv-burgundy dark:hover:bg-sv-burgundy/80 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            )}

            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-orange hover:opacity-95 shadow-md shadow-sv-red/30 transition-all cursor-pointer"
            >
              <span>{currentStep === GUIDE_STEPS.length - 1 ? 'Start Playing!' : 'Next'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
