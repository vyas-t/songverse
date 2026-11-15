import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useSpring } from 'motion/react';
import {
  Play,
  Calendar,
  Users,
  Sparkles,
  Volume2,
  VolumeX,
  Globe,
  ArrowRight,
  ArrowUp,
  Disc3,
  Flame,
  Zap,
  Headphones,
  Check,
  ChevronDown,
  Award,
  Music
} from 'lucide-react';
import { GameMode } from '../../types';
import { audioEngine } from '../../services/audioEngine';
import {
  HeroSkyAndMountains,
  HeroForegroundHill,
  TranquilityWaterfallScene,
  BiodiversityForestScene
} from './LandingVisuals';

interface LandingPageProps {
  onStartPlay: (mode?: GameMode) => void;
  onNavigate: (view: string, mode?: GameMode) => void;
  onOpenGuide?: () => void;
}

// 9 Global Languages featured in SongVerse
const GLOBAL_LANGUAGES = [
  { code: 'en', label: 'English', flag: '🇺🇸', sample: 'The Weeknd · Taylor Swift', count: '15 tracks' },
  { code: 'hi', label: 'Hindi', flag: '🇮🇳', sample: 'Arijit Singh · Pritam', count: '14 tracks' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸', sample: 'Bad Bunny · Rosalía', count: '10 tracks' },
  { code: 'pa', label: 'Punjabi', flag: '🇮🇳', sample: 'Karan Aujla · Diljit Dosanjh', count: '10 tracks' },
  { code: 'ta', label: 'Tamil', flag: '🇮🇳', sample: 'Anirudh · A.R. Rahman', count: '8 tracks' },
  { code: 'te', label: 'Telugu', flag: '🇮🇳', sample: 'Devi Sri Prasad · Keeravani', count: '7 tracks' },
  { code: 'ko', label: 'Korean', flag: '🇰🇷', sample: 'BTS · NewJeans · LE SSERAFIM', count: '6 tracks' },
  { code: 'fr', label: 'French', flag: '🇫🇷', sample: 'Stromae · Daft Punk · Indila', count: '5 tracks' },
  { code: 'ja', label: 'Japanese', flag: '🇯🇵', sample: 'YOASOBI · Fujii Kaze · Eve', count: '5 tracks' },
];

// Progressive 6-Tier Guessing Engine showcase
const TIME_TIERS = [
  { level: 1, duration: '1.0s', points: 100, label: 'Instant Instinct', color: 'from-amber-400 to-amber-600', badge: 'Diamond' },
  { level: 2, duration: '1.5s', points: 80, label: 'Rhythm Catch', color: 'from-purple-400 to-purple-600', badge: 'Gold' },
  { level: 3, duration: '2.5s', points: 60, label: 'Beat Drop', color: 'from-cyan-400 to-cyan-600', badge: 'Silver' },
  { level: 4, duration: '4.0s', points: 40, label: 'Melody Lock', color: 'from-emerald-400 to-emerald-600', badge: 'Bronze' },
  { level: 5, duration: '7.0s', points: 20, label: 'Vocal Clue', color: 'from-rose-400 to-rose-600', badge: 'Iron' },
  { level: 6, duration: '12.0s', points: 10, label: 'Full Anthem', color: 'from-slate-400 to-slate-600', badge: 'Base' },
];

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartPlay,
  onNavigate,
  onOpenGuide
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPlayingAudition, setIsPlayingAudition] = useState(false);
  const [activeAuditionTier, setActiveAuditionTier] = useState<number>(1);
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  // Measure overall scroll progress along the 4 cinematic scenes
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  // Physics spring for weighted, cinematic scroll glide (Notosan / VISITE style)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 70,
    damping: 18,
    restDelta: 0.001
  });

  // -------------------------------------------------------------------------
  // SECTION 1 PARALLAX TRANSFORMS (HERO / THE SONIC JOURNEY)
  // -------------------------------------------------------------------------
  // Sky moves slowly
  const heroSkyY = useTransform(smoothProgress, [0, 0.35], ['0%', '18%']);
  // Mountains move at mid speed
  const heroFarMountainsY = useTransform(smoothProgress, [0, 0.35], ['0%', '32%']);
  // Giant title "SONGVERSE" sinks into the terrain behind foreground hill
  const heroTitleY = useTransform(smoothProgress, [0, 0.28], [0, 240]);
  const heroTitleScale = useTransform(smoothProgress, [0, 0.28], [1, 0.88]);
  const heroTitleOpacity = useTransform(smoothProgress, [0, 0.22, 0.32], [1, 0.8, 0]);
  // Foreground hill & traveler glide faster and part
  const heroForegroundY = useTransform(smoothProgress, [0, 0.35], ['0%', '45%']);
  const heroForegroundScale = useTransform(smoothProgress, [0, 0.35], [1, 1.1]);
  // Hero subtitle and action buttons fade gracefully
  const heroUiY = useTransform(smoothProgress, [0, 0.2], [0, -70]);
  const heroUiOpacity = useTransform(smoothProgress, [0, 0.16], [1, 0]);

  // -------------------------------------------------------------------------
  // SECTION 2 PARALLAX TRANSFORMS (TRANQUILITY / WATERFALL SANCTUARY)
  // -------------------------------------------------------------------------
  const tranquilityOpacity = useTransform(smoothProgress, [0.18, 0.32, 0.54, 0.64], [0, 1, 1, 0]);
  const tranquilityY = useTransform(smoothProgress, [0.18, 0.32, 0.54, 0.64], [120, 0, 0, -120]);
  const tranquilityScale = useTransform(smoothProgress, [0.18, 0.34, 0.58], [0.94, 1, 1.05]);

  // -------------------------------------------------------------------------
  // SECTION 3 PARALLAX TRANSFORMS (BIODIVERSITY / ENCHANTED FOREST & ARENA)
  // -------------------------------------------------------------------------
  const biodiversityOpacity = useTransform(smoothProgress, [0.50, 0.64, 0.82, 0.92], [0, 1, 1, 0]);
  const biodiversityY = useTransform(smoothProgress, [0.50, 0.64, 0.82, 0.92], [120, 0, 0, -120]);
  const biodiversityScale = useTransform(smoothProgress, [0.50, 0.66, 0.88], [0.94, 1, 1.05]);

  // -------------------------------------------------------------------------
  // SECTION 4 PARALLAX TRANSFORMS (THE HORIZON / GAME LAUNCHPAD)
  // -------------------------------------------------------------------------
  const horizonOpacity = useTransform(smoothProgress, [0.78, 0.90, 1.0], [0, 1, 1]);
  const horizonY = useTransform(smoothProgress, [0.78, 0.90, 1.0], [90, 0, 0]);

  // Clean unmount audio lifecycle
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  // Live 1.0s Audio Teaser Audition directly on the page
  const handleAuditionClip = async (tierLevel: number = 1) => {
    setActiveAuditionTier(tierLevel);

    if (isPlayingAudition) {
      audioEngine.stop();
      setIsPlayingAudition(false);
      return;
    }

    setIsPlayingAudition(true);
    const demoTrack = {
      id: 'songverse_hero_audition_blinding',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/7e/ea/81/7eea8129-87a4-9457-37a5-d8cf01b44ec2/mzaf_15783300898555806670.plus.aac.p.m4a',
      playbackStatus: 'verified_audio' as const,
      availabilityStatus: 'available' as const,
      durationSeconds: 210,
      clipStartSeconds: 16
    };

    try {
      await audioEngine.playClip(demoTrack as any, tierLevel as any);
    } catch {
      // Audio engine handles gracefully
    } finally {
      setIsPlayingAudition(false);
    }
  };

  const handleLaunchMode = (mode: GameMode) => {
    audioEngine.stop();
    setIsPlayingAudition(false);
    onStartPlay(mode);
  };

  const handleNavigateClean = (view: string) => {
    audioEngine.stop();
    setIsPlayingAudition(false);
    onNavigate(view);
  };

  const scrollToSection = (percentage: number) => {
    if (!containerRef.current) return;
    const totalHeight = containerRef.current.scrollHeight - window.innerHeight;
    window.scrollTo({
      top: totalHeight * percentage,
      behavior: 'smooth'
    });
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  return (
    <div
      ref={containerRef}
      className="sv-parallax-experience relative w-full bg-[#070414] text-white selection:bg-sv-red/30 selection:text-sv-warm-orange overflow-x-hidden"
      style={{ height: '420vh' }}
    >
      {/* ===================================================================
          FIXED STICKY VIEWPORT CONTAINER (Pinning all 3D layers)
          =================================================================== */}
      <div className="sticky top-0 left-0 w-full h-screen overflow-hidden flex flex-col justify-between z-10 pointer-events-none">

        {/* -----------------------------------------------------------------
            SCENE 1: HERO SKY & HORIZON LAYER
            ----------------------------------------------------------------- */}
        <motion.div
          className="absolute inset-0 w-full h-full pointer-events-none z-0"
          style={{ y: heroSkyY }}
        >
          <HeroSkyAndMountains className="w-full h-full" />
        </motion.div>

        {/* -----------------------------------------------------------------
            SCENE 1: GIANT 3D CINEMATIC TYPOGRAPHY (Tucks behind foreground)
            ----------------------------------------------------------------- */}
        <motion.div
          className="absolute inset-x-0 top-[18vh] sm:top-[20vh] flex flex-col items-center justify-center text-center pointer-events-none z-10 select-none px-4"
          style={{
            y: heroTitleY,
            scale: heroTitleScale,
            opacity: heroTitleOpacity
          }}
        >
          <p className="text-[11px] sm:text-xs md:text-sm font-mono tracking-[0.35em] uppercase text-amber-200/90 drop-shadow-sm mb-2">
            The Sonic Odyssey
          </p>
          <h1
            className="font-cinzel text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black tracking-[0.22em] uppercase leading-none bg-gradient-to-b from-[#FFFDF7] via-[#FED68A] to-[#E0633B] bg-clip-text text-transparent drop-shadow-[0_12px_45px_rgba(224,99,59,0.45)]"
          >
            SONGVERSE
          </h1>
          <p className="mt-3 text-xs sm:text-sm md:text-base font-serif italic text-amber-100/70 tracking-widest max-w-xl">
            Where one second of music echoes across eternity
          </p>
        </motion.div>

        {/* -----------------------------------------------------------------
            SCENE 1: FOREGROUND HILL & TRAVELER SILHOUETTE
            ----------------------------------------------------------------- */}
        <motion.div
          className="absolute inset-x-0 bottom-0 w-full h-[55vh] sm:h-[65vh] pointer-events-none z-20"
          style={{
            y: heroForegroundY,
            scale: heroForegroundScale
          }}
        >
          <HeroForegroundHill className="w-full h-full" />
        </motion.div>

        {/* -----------------------------------------------------------------
            SCENE 1: HERO INTERACTIVE HUD / ACTION BUTTONS
            ----------------------------------------------------------------- */}
        <motion.div
          className="absolute inset-x-0 bottom-[10vh] sm:bottom-[12vh] flex flex-col items-center justify-center text-center z-30 pointer-events-auto px-4 gap-4"
          style={{
            y: heroUiY,
            opacity: heroUiOpacity
          }}
        >
          {/* Pill Badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-md border border-amber-500/30 text-amber-200 text-xs font-semibold shadow-lg">
            <Zap className="w-3.5 h-3.5 text-amber-400 fill-current animate-pulse" />
            <span>Can you identify the song in 1 second?</span>
            <span className="text-amber-500/50">•</span>
            <span className="font-mono text-amber-300">80+ Global Hits</span>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-1">
            <button
              onClick={() => handleLaunchMode('classic')}
              className="group relative inline-flex items-center gap-3 px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-500 via-rose-500 to-purple-600 hover:from-amber-400 hover:via-rose-400 hover:to-purple-500 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_35px_rgba(245,158,66,0.45)] hover:shadow-[0_0_50px_rgba(245,158,66,0.7)] transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
              <span>Start The Journey</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            {onOpenGuide && (
              <button
                onClick={onOpenGuide}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white text-xs font-bold uppercase tracking-wider shadow-md transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>How It Works</span>
              </button>
            )}
          </div>

          {/* Scroll Down Prompt Indicator (Notosan / VISITE style) */}
          <button
            onClick={() => scrollToSection(0.33)}
            className="flex flex-col items-center gap-1.5 text-amber-200/80 hover:text-amber-100 transition-colors mt-3 cursor-pointer group"
          >
            <span className="text-[10px] font-mono tracking-[0.25em] uppercase">
              Scroll Down To Explore
            </span>
            <div className="w-5 h-8 rounded-full border-2 border-amber-300/40 flex items-start justify-center p-1 group-hover:border-amber-300">
              <motion.div
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                animate={{ y: [0, 12, 0] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </button>
        </motion.div>

        {/* -----------------------------------------------------------------
            SCENE 2: "TRANQUILITY" — THE SOUND SANCTUARY
            ----------------------------------------------------------------- */}
        <motion.div
          className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-20"
          style={{
            opacity: tranquilityOpacity,
            y: tranquilityY,
            scale: tranquilityScale
          }}
        >
          {/* Waterfall Gorge Canvas Layer */}
          <TranquilityWaterfallScene className="absolute inset-0 w-full h-full" />

          {/* Tranquility Narrative & Interactive Audition Card */}
          <div className="relative z-30 max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6 pointer-events-auto">
            {/* Serif Section Title matching the video */}
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-cyan-300">
                Chapter I
              </p>
              <h2 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[0.18em] bg-gradient-to-b from-white via-cyan-100 to-teal-400 bg-clip-text text-transparent drop-shadow-[0_8px_30px_rgba(6,182,212,0.4)]">
                TRANQUILITY
              </h2>
              <p className="text-sm sm:text-base font-serif italic text-cyan-200/80 tracking-widest">
                The Sound Sanctuary
              </p>
            </div>

            <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-light backdrop-blur-xs">
              Tune out the chaos. Step into acoustic stillness. Train your auditory reflex across 6 razor-sharp clip tiers — from a lightning 1.0-second beat drop to the full song climax.
            </p>

            {/* LIVE 1.0s AUDIO TEASER AUDITION WIDGET */}
            <div className="p-5 sm:p-6 rounded-3xl bg-black/60 backdrop-blur-xl border border-cyan-500/30 shadow-[0_20px_50px_rgba(6,182,212,0.2)] max-w-2xl mx-auto space-y-4">
              <div className="flex items-center justify-between gap-3 border-b border-cyan-500/20 pb-3">
                <div className="flex items-center gap-2.5 text-left">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                    <Headphones className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-mono font-bold uppercase tracking-wider text-cyan-300">
                      Live Audio Audition
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Experience the exact 1.0s guess difficulty
                    </p>
                  </div>
                </div>

                {/* Audition Trigger Button */}
                <button
                  onClick={() => handleAuditionClip(activeAuditionTier)}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-md ${
                    isPlayingAudition
                      ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                      : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-slate-950 font-extrabold'
                  }`}
                >
                  {isPlayingAudition ? (
                    <>
                      <VolumeX className="w-4 h-4" />
                      <span>Stop Clip</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-4 h-4" />
                      <span>Audition 1.0s</span>
                    </>
                  )}
                </button>
              </div>

              {/* Dynamic Soundwave Equalizer when playing */}
              <div className="flex items-center justify-center gap-1.5 h-8 py-1">
                {[18, 45, 80, 30, 95, 60, 25, 75, 90, 40, 85, 50, 35, 70, 90, 20].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1 rounded-full transition-all duration-200 ${
                      isPlayingAudition
                        ? 'bg-gradient-to-t from-cyan-400 to-teal-200'
                        : 'bg-cyan-950/60'
                    }`}
                    style={{
                      height: isPlayingAudition ? `${h}%` : '20%',
                      animation: isPlayingAudition
                        ? `visualizer-bounce 0.6s ease-in-out infinite ${i * 0.05}s`
                        : 'none'
                    }}
                  />
                ))}
              </div>

              {/* 6 Time Tiers Selector */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1 text-left">
                {TIME_TIERS.map(tier => (
                  <button
                    key={tier.level}
                    onClick={() => handleAuditionClip(tier.level)}
                    className={`p-2 rounded-xl text-center border transition-all cursor-pointer ${
                      activeAuditionTier === tier.level
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-xs'
                        : 'bg-white/5 border-white/10 hover:border-white/20 text-slate-400'
                    }`}
                  >
                    <p className="text-[10px] font-mono text-cyan-300 font-bold">{tier.duration}</p>
                    <p className="text-xs font-black text-white">{tier.points} pts</p>
                    <p className="text-[9px] text-slate-400 truncate">{tier.label}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Next Section Arrow */}
            <button
              onClick={() => scrollToSection(0.66)}
              className="inline-flex items-center gap-1.5 text-xs text-cyan-300/80 hover:text-cyan-200 transition-colors cursor-pointer group"
            >
              <span>Explore The Global Stage</span>
              <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* -----------------------------------------------------------------
            SCENE 3: "BIODIVERSITY" — THE GLOBAL SOUNDSCAPE & ARENA
            ----------------------------------------------------------------- */}
        <motion.div
          className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none z-20"
          style={{
            opacity: biodiversityOpacity,
            y: biodiversityY,
            scale: biodiversityScale
          }}
        >
          {/* Enchanted Forest & Sonic Stag Canvas Layer */}
          <BiodiversityForestScene className="absolute inset-0 w-full h-full" />

          {/* Biodiversity Narrative & 9 Languages Grid */}
          <div className="relative z-30 max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6 pointer-events-auto">
            <div className="space-y-1">
              <p className="text-xs sm:text-sm font-mono tracking-[0.3em] uppercase text-purple-300">
                Chapter II
              </p>
              <h2 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[0.18em] bg-gradient-to-b from-white via-purple-100 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-[0_8px_30px_rgba(192,132,252,0.4)]">
                BIODIVERSITY
              </h2>
              <p className="text-sm sm:text-base font-serif italic text-purple-200/80 tracking-widest">
                9 Languages · One Global Stage
              </p>
            </div>

            <p className="max-w-2xl mx-auto text-xs sm:text-sm md:text-base text-slate-300 leading-relaxed font-light backdrop-blur-xs">
              Music knows no borders. Explore curated sonic realms across North America, Bollywood, Latin beats, K-Pop, Punjabi pop, and Japanese synthwaves.
            </p>

            {/* 9 Language Pills Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2 max-w-4xl mx-auto pt-2">
              {GLOBAL_LANGUAGES.map(lang => (
                <div
                  key={lang.code}
                  className="p-2.5 rounded-2xl bg-black/50 backdrop-blur-md border border-purple-500/20 hover:border-purple-400/50 hover:bg-purple-950/40 transition-all text-center flex flex-col items-center justify-center group"
                >
                  <span className="text-xl group-hover:scale-110 transition-transform mb-1">{lang.flag}</span>
                  <p className="text-xs font-bold text-white tracking-wide">{lang.label}</p>
                  <p className="text-[10px] font-mono text-purple-300/80">{lang.count}</p>
                </div>
              ))}
            </div>

            {/* Feature Highlights: Seeded Daily & Multiplayer Arena */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto pt-2 text-left">
              {/* Daily Seeded Card */}
              <div
                onClick={() => handleNavigateClean('daily')}
                className="p-4 sm:p-5 rounded-3xl bg-black/60 backdrop-blur-xl border border-amber-500/30 hover:border-amber-400 transition-all cursor-pointer group shadow-lg"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 group-hover:scale-105 transition-transform">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                      Daily Seeded Challenge
                    </h4>
                    <p className="text-[11px] font-mono text-amber-200/70">5 Songs · Same Drop Globally</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Every midnight UTC, the entire world gets the identical audio seed. Preserve your daily streak and earn legendary trophies.
                </p>
              </div>

              {/* Multiplayer Arena Card */}
              <div
                onClick={() => handleNavigateClean('multiplayer')}
                className="p-4 sm:p-5 rounded-3xl bg-black/60 backdrop-blur-xl border border-fuchsia-500/30 hover:border-fuchsia-400 transition-all cursor-pointer group shadow-lg"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-300 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-white group-hover:text-fuchsia-300 transition-colors">
                      Live Multiplayer Arena
                    </h4>
                    <p className="text-[11px] font-mono text-fuchsia-200/70">Up to 8 Players · Instant Buzzer</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Host private party rooms or compete in live public showdowns. First to hit the buzzer and type the artist takes the gold.
                </p>
              </div>
            </div>

            {/* Quick Next Section Arrow */}
            <button
              onClick={() => scrollToSection(1.0)}
              className="inline-flex items-center gap-1.5 text-xs text-purple-300/80 hover:text-purple-200 transition-colors cursor-pointer group"
            >
              <span>Enter The Game Portal</span>
              <ChevronDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* -----------------------------------------------------------------
            SCENE 4: "THE HORIZON" — INSTANT GAME LAUNCHPAD FINALE
            ----------------------------------------------------------------- */}
        <motion.div
          className="absolute inset-0 w-full h-full flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8 z-30 pointer-events-auto bg-gradient-to-b from-transparent via-[#09041a]/90 to-[#070214]"
          style={{
            opacity: horizonOpacity,
            y: horizonY
          }}
        >
          {/* Header Title */}
          <div className="text-center space-y-2 pt-4">
            <p className="text-xs font-mono tracking-[0.35em] uppercase text-amber-300">
              Your Turn At The Mic
            </p>
            <h2 className="font-cinzel text-4xl sm:text-6xl md:text-7xl font-black uppercase tracking-[0.16em] bg-gradient-to-r from-amber-200 via-rose-300 to-purple-300 bg-clip-text text-transparent drop-shadow-[0_8px_30px_rgba(245,158,66,0.35)]">
              ENTER SONGVERSE
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto font-light">
              Choose your arena. Test your ears against world-class music lovers.
            </p>
          </div>

          {/* 3 Main Game Launch Modes */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto w-full my-auto">
            {/* Solo Classic Mode */}
            <div
              onClick={() => handleLaunchMode('classic')}
              className="group relative p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white/10 to-black/80 hover:from-white/15 hover:to-black/90 border-2 border-amber-500/40 hover:border-amber-400 transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1.5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 group-hover:scale-110 transition-transform">
                  <Play className="w-6 h-6 fill-current" />
                </div>
                <div>
                  <div className="inline-block text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-amber-500/30 text-amber-200 font-bold mb-2">
                    Most Popular
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-amber-300 transition-colors">
                    Classic Solo Trivia
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    6 tiers of progressive clips across all 9 languages. Start with 1.0 second. Can you guess before the beat fades?
                  </p>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between text-amber-300 font-black text-xs uppercase tracking-wider">
                <span>Launch Solo</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>

            {/* Daily Seeded Challenge */}
            <div
              onClick={() => handleNavigateClean('daily')}
              className="group relative p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white/10 to-black/80 hover:from-white/15 hover:to-black/90 border-2 border-rose-500/40 hover:border-rose-400 transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1.5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400/40 flex items-center justify-center text-rose-300 group-hover:scale-110 transition-transform">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-block text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-rose-500/30 text-rose-200 font-bold mb-2">
                    Daily Streak
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-rose-300 transition-colors">
                    Daily Seeded
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    A universal daily 5-song drop. Compete with global friends on equal footing. Keep your winning streak burning!
                  </p>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between text-rose-300 font-black text-xs uppercase tracking-wider">
                <span>Play Daily Drop</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>

            {/* Live Multiplayer Arena */}
            <div
              onClick={() => handleNavigateClean('multiplayer')}
              className="group relative p-6 sm:p-7 rounded-3xl bg-gradient-to-b from-white/10 to-black/80 hover:from-white/15 hover:to-black/90 border-2 border-purple-500/40 hover:border-purple-400 transition-all duration-300 cursor-pointer shadow-xl hover:-translate-y-1.5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-block text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 font-bold mb-2">
                    Live Showdown
                  </div>
                  <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors">
                    Multiplayer Battles
                  </h3>
                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                    Live synchronized buzzer battles. Create a room code, invite your crew, and see who truly knows their music best.
                  </p>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between text-purple-300 font-black text-xs uppercase tracking-wider">
                <span>Enter Arena</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </div>

          {/* Quick Footer Links & "Back to Top" */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 max-w-5xl mx-auto w-full text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <button
                onClick={() => handleNavigateClean('discovery')}
                className="hover:text-amber-300 transition-colors cursor-pointer"
              >
                Explore Catalogue
              </button>
              <span>•</span>
              <button
                onClick={() => handleNavigateClean('leaderboard')}
                className="hover:text-amber-300 transition-colors cursor-pointer"
              >
                Leaderboard
              </button>
              {onOpenGuide && (
                <>
                  <span>•</span>
                  <button
                    onClick={onOpenGuide}
                    className="hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    Guide
                  </button>
                </>
              )}
            </div>

            <button
              onClick={scrollToTop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 transition-all cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5" />
              <span>Back To Top</span>
            </button>
          </div>
        </motion.div>

      </div>
    </div>
  );
};
