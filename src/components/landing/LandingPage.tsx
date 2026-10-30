import React, { useState, useEffect } from 'react';
import {
  Play,
  Calendar,
  Users,
  Sparkles,
  Radio,
  CheckCircle2,
  Volume2,
  Globe,
  Award,
  ArrowRight,
  Disc3,
  Flame,
  Zap,
  VolumeX,
  Headphones
} from 'lucide-react';
import { GameMode } from '../../types';
import { GAME_LEVELS } from '../../config/gameConfig';
import { audioEngine } from '../../services/audioEngine';

interface LandingPageProps {
  onStartPlay: (mode?: GameMode) => void;
  onNavigate: (view: string, mode?: GameMode) => void;
}

// Real curated artist/album artwork cards for the floating perimeter
const FLOATING_ARTISTS_LEFT = [
  {
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/a4/09/cc/a409cc92-308d-f75e-c687-f827282b04f4/20UMGIM10189.rgb.jpg/600x600bb.jpg',
    genre: 'Synthwave',
    year: '2020',
    animationClass: 'animate-float-slow'
  },
  {
    title: 'Anti-Hero',
    artist: 'Taylor Swift',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/e5/a0/0e/e5a00e57-23f2-1715-fcfb-ee787e6717eb/22UMGIM92404.rgb.jpg/600x600bb.jpg',
    genre: 'Pop',
    year: '2022',
    animationClass: 'animate-float-medium'
  },
  {
    title: 'Kesariya',
    artist: 'Arijit Singh',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/91/97/35/919735d4-2aa4-9c8a-eb2b-871d3c06d8a4/8902894361590.jpg/600x600bb.jpg',
    genre: 'Hindi Pop',
    year: '2022',
    animationClass: 'animate-float-reverse'
  },
  {
    title: 'Tití Me Preguntó',
    artist: 'Bad Bunny',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/4a/01/be/4a01be9c-7e62-c178-59ea-c4e207d57187/196626945068.jpg/600x600bb.jpg',
    genre: 'Latin / Urban',
    year: '2022',
    animationClass: 'animate-float-slow'
  }
];

const FLOATING_ARTISTS_RIGHT = [
  {
    title: '24K Magic',
    artist: 'Bruno Mars',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e3/47/a0/e347a0cc-87ce-5d05-d560-176c7d48f66e/075679904119.jpg/600x600bb.jpg',
    genre: 'Pop / Funk',
    year: '2016',
    animationClass: 'animate-float-medium'
  },
  {
    title: 'Levitating',
    artist: 'Dua Lipa',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music116/v4/6c/11/d6/6c11d681-aa3a-d59e-4c2e-f77e181026ab/190295092665.jpg/600x600bb.jpg',
    genre: 'Nu-Disco',
    year: '2020',
    animationClass: 'animate-float-slow'
  },
  {
    title: 'Ashke',
    artist: 'Karan Aujla',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music211/v4/f7/6d/78/f76d78c5-cc9c-f2d6-8603-ba690eaa5c7d/5064089826918_cover.jpg/600x600bb.jpg',
    genre: 'Punjabi Pop',
    year: '2026',
    animationClass: 'animate-float-reverse'
  },
  {
    title: 'BUTTERFLY EFFECT',
    artist: 'Travis Scott',
    artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e7/49/8f/e7498f65-df8f-bead-d6e3-2a8d4d642a79/886447235317.jpg/600x600bb.jpg',
    genre: 'Hip-Hop / Rap',
    year: '2017',
    animationClass: 'animate-float-medium'
  }
];

export const LandingPage: React.FC<LandingPageProps> = ({ onStartPlay, onNavigate }) => {
  const [demoLevel, setDemoLevel] = useState<1 | 2 | 3 | 4>(1);
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);

  // Cleanly stop any active demo playback when LandingPage unmounts
  useEffect(() => {
    return () => {
      audioEngine.stop();
    };
  }, []);

  const handleTestSnippet = async (level: 1 | 2 | 3 | 4) => {
    setDemoLevel(level);
    if (isPlayingDemo) {
      audioEngine.stop();
      setIsPlayingDemo(false);
      return;
    }

    setIsPlayingDemo(true);
    const audioTrack = {
      id: 'itunes_demo_blinding',
      title: 'Blinding Lights',
      artist: 'The Weeknd',
      audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/7e/ea/81/7eea8129-87a4-9457-37a5-d8cf01b44ec2/mzaf_15783300898555806670.plus.aac.p.m4a',
      playbackStatus: 'verified_audio' as const,
      availabilityStatus: 'available' as const,
      durationSeconds: 210,
      clipStartSeconds: 15
    };

    try {
      await audioEngine.playClip(audioTrack as any, level);
    } catch {
      // Audio engine error handled
    } finally {
      setIsPlayingDemo(false);
    }
  };

  const handleStartPlayClean = (mode: Parameters<typeof onStartPlay>[0]) => {
    audioEngine.stop();
    setIsPlayingDemo(false);
    onStartPlay(mode);
  };

  const handleNavigateClean = (view: string) => {
    audioEngine.stop();
    setIsPlayingDemo(false);
    onNavigate(view);
  };

  return (
    <div className="relative overflow-hidden min-h-[calc(100vh-80px)] flex flex-col justify-between">
      
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-gradient-to-tr from-sv-red/10 via-sv-orange/10 to-sv-gold/5 blur-[120px] pointer-events-none -z-10 rounded-full" />
      
      {/* LEFT FLOATING ARTIST CARDS (Desktop/Tablet) */}
      <div className="hidden xl:flex flex-col gap-5 absolute left-6 top-16 pointer-events-none z-10 w-56">
        {FLOATING_ARTISTS_LEFT.map((card, idx) => (
          <div
            key={card.title}
            className={`sv-glass-card p-3 rounded-2xl flex items-center gap-3 transition-transform ${card.animationClass}`}
            style={{ animationDelay: `${idx * 0.7}s` }}
          >
            <img
              src={card.artworkUrl}
              alt={card.title}
              className="w-12 h-12 rounded-xl object-cover shadow-sm border border-black/5 dark:border-white/10 shrink-0"
              loading="lazy"
            />
            <div className="truncate">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{card.title}</p>
              <p className="text-[11px] font-bold text-sv-red dark:text-sv-warm-orange truncate">{card.artist}</p>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{card.genre} · {card.year}</span>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT FLOATING ARTIST CARDS (Desktop/Tablet) */}
      <div className="hidden xl:flex flex-col gap-5 absolute right-6 top-16 pointer-events-none z-10 w-56">
        {FLOATING_ARTISTS_RIGHT.map((card, idx) => (
          <div
            key={card.title}
            className={`sv-glass-card p-3 rounded-2xl flex items-center gap-3 transition-transform ${card.animationClass}`}
            style={{ animationDelay: `${idx * 0.8 + 0.3}s` }}
          >
            <img
              src={card.artworkUrl}
              alt={card.title}
              className="w-12 h-12 rounded-xl object-cover shadow-sm border border-black/5 dark:border-white/10 shrink-0"
              loading="lazy"
            />
            <div className="truncate">
              <p className="text-xs font-black text-slate-900 dark:text-white truncate">{card.title}</p>
              <p className="text-[11px] font-bold text-sv-orange dark:text-sv-gold truncate">{card.artist}</p>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">{card.genre} · {card.year}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CENTRAL HERO SECTION */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-16 text-center space-y-9 z-20">
        
        {/* Brand Tag Pill */}
        <div className="inline-flex items-center gap-2.5 text-xs font-extrabold text-sv-red dark:text-sv-warm-orange bg-sv-red/10 dark:bg-sv-burgundy-deep/90 border border-sv-red/20 dark:border-sv-burgundy px-4 py-1.5 rounded-full uppercase tracking-wider shadow-xs">
          <Zap className="w-3.5 h-3.5 fill-current text-sv-red dark:text-sv-gold" />
          <span>Multilingual Song Guessing Platform 2.0</span>
          <span className="text-slate-300 dark:text-sv-burgundy" aria-hidden="true">•</span>
          <span className="text-slate-700 dark:text-slate-300 font-semibold lowercase">80+ verified tracks</span>
        </div>

        {/* Hero Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-[1.05]">
            CAN YOU GUESS THE SONG IN{' '}
            <span className="bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber bg-clip-text text-transparent underline decoration-sv-amber decoration-4 underline-offset-8">
              1 SECOND?
            </span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
            Listen to razor-thin audio excerpts from 1s to 10s. Name the artist or song title before the groove fades to earn up to 100 points!
          </p>
        </div>

        {/* GAME MODES SELECTION CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2 text-left">
          
          {/* Classic Solo Mode */}
          <button
            onClick={() => handleStartPlayClean('classic')}
            className="group relative p-5 rounded-3xl bg-gradient-to-b from-white to-slate-50/80 dark:from-sv-burgundy-deep dark:to-sv-midnight border-2 border-sv-red/40 dark:border-sv-red/50 shadow-md hover:shadow-xl hover:border-sv-red hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-4 right-4 text-[10px] font-black uppercase font-mono px-2 py-0.5 rounded-full bg-sv-red text-white shadow-xs">
              Popular
            </div>
            <div>
              <div className="w-10 h-10 rounded-2xl bg-sv-red text-white flex items-center justify-center shadow-md shadow-sv-red/30 mb-3 group-hover:scale-105 transition-transform">
                <Play className="w-5 h-5 fill-white" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Classic Solo
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Progressive 4-level tiers with instant scoring & celebrations.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sv-red dark:text-sv-warm-orange mt-4 pt-3 border-t border-slate-100 dark:border-sv-burgundy/60">
              <span>Play Now (100 Pts)</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Daily Seeded Challenge */}
          <button
            onClick={() => handleNavigateClean('daily')}
            className="group relative p-5 rounded-3xl bg-white dark:bg-sv-burgundy-deep/80 border border-slate-200 dark:border-sv-burgundy shadow-xs hover:shadow-lg hover:border-sv-orange hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-4 right-4 text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
              Daily Seed
            </div>
            <div>
              <div className="w-10 h-10 rounded-2xl bg-sv-orange/15 dark:bg-sv-orange/20 text-sv-orange flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Daily Challenge
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                5 synchronized tracks per day. Compete on global rankings.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sv-orange dark:text-sv-gold mt-4 pt-3 border-t border-slate-100 dark:border-sv-burgundy/60">
              <span>Enter Daily Match</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Multiplayer Room */}
          <button
            onClick={() => handleNavigateClean('multiplayer')}
            className="group relative p-5 rounded-3xl bg-white dark:bg-sv-burgundy-deep/80 border border-slate-200 dark:border-sv-burgundy shadow-xs hover:shadow-lg hover:border-sv-red hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
          >
            <div className="absolute top-4 right-4 text-[10px] font-bold uppercase font-mono px-2 py-0.5 rounded-full bg-sv-red/10 text-sv-red dark:text-sv-warm-orange border border-sv-red/20">
              Up to 20
            </div>
            <div>
              <div className="w-10 h-10 rounded-2xl bg-sv-red/15 dark:bg-sv-crimson/25 text-sv-red flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Multiplayer Room
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-snug">
                Host or join rooms with 6-digit codes. Real cross-device sync.
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sv-red dark:text-sv-warm-orange mt-4 pt-3 border-t border-slate-100 dark:border-sv-burgundy/60">
              <span>Create / Join Room</span>
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* 4-LEVEL PROGRESSIVE SCORING MATRIX & INTERACTIVE AUDIO TEST */}
        <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl p-6 sm:p-7 shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-sv-burgundy pb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-sv-red animate-ping" />
              <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Audition 4 Difficulty Tiers
              </span>
            </div>
            <span className="text-[11px] font-mono text-sv-orange font-bold flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5" />
              <span>Real Audio Previews</span>
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {([1, 2, 3, 4] as const).map((lvl) => {
              const cfg = GAME_LEVELS[lvl];
              const isSelected = demoLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleTestSnippet(lvl)}
                  className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer text-center relative overflow-hidden ${
                    isSelected
                      ? 'border-sv-red bg-sv-red/10 dark:bg-sv-crimson/25 text-sv-red dark:text-sv-gold shadow-sm ring-2 ring-sv-red/20'
                      : 'border-slate-200 dark:border-sv-burgundy bg-slate-50/70 dark:bg-sv-navy/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-sv-burgundy/80'
                  }`}
                >
                  <p className="text-[10px] font-extrabold uppercase tracking-wider opacity-80">Tier {lvl}</p>
                  <p className="text-lg sm:text-xl font-black font-mono my-0.5">{cfg.durationSeconds}s</p>
                  <span className="text-[11px] font-mono font-bold text-sv-orange block">
                    {cfg.points} pts
                  </span>
                  {isSelected && isPlayingDemo && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-sv-red to-sv-gold animate-shimmer" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 pt-1">
            {isPlayingDemo ? (
              <span className="text-sv-red dark:text-sv-warm-orange flex items-center gap-1.5 animate-pulse">
                <Volume2 className="w-4 h-4 animate-bounce" />
                Listening to {demoLevel}s audio clip... (tap again to stop)
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-sv-red" />
                Click any tier above to hear actual clip duration
              </span>
            )}
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-xs text-slate-500 dark:text-slate-400 font-semibold pt-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Automatic Song Discovery</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>9 Languages & Mix Mode</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Instant Guest Play</span>
          </div>
        </div>

      </div>

      <div className="h-4" />
    </div>
  );
};
