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
  Zap
} from 'lucide-react';
import { GameMode } from '../../types';
import { GAME_LEVELS } from '../../config/gameConfig';
import { musicCatalogue } from '../../services/musicCatalogue';
import { audioEngine } from '../../services/audioEngine';
import { LiveMusicAutocomplete, AutocompleteTrackResult } from '../common/LiveMusicAutocomplete';

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
  const [selectedDemoTrack, setSelectedDemoTrack] = useState<AutocompleteTrackResult | null>(null);

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
    const audioTrack = selectedDemoTrack || {
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

  const handleAutocompletePick = (track: AutocompleteTrackResult) => {
    setSelectedDemoTrack(track);
    // Instant audition
    if (track.audioUrl) {
      audioEngine.playClip({
        ...track,
        durationSeconds: 210,
        clipStartSeconds: 15
      } as any, 2).catch(() => {});
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
      
      {/* LEFT FLOATING ARTIST CARDS (Desktop/Tablet) */}
      <div className="hidden lg:flex flex-col gap-6 absolute left-6 top-20 pointer-events-none z-10 w-56">
        {FLOATING_ARTISTS_LEFT.map((card, idx) => (
          <div
            key={card.title}
            className={`bg-white/90 dark:bg-sv-burgundy-deep/90 backdrop-blur-md border border-slate-200/90 dark:border-sv-burgundy p-3 rounded-2xl shadow-xl flex items-center gap-3 transition-transform ${card.animationClass}`}
            style={{ animationDelay: `${idx * 0.8}s` }}
          >
            <img
              src={card.artworkUrl}
              alt={card.title}
              className="w-12 h-12 rounded-xl object-cover shadow-xs border border-slate-100 dark:border-sv-burgundy shrink-0"
              loading="lazy"
            />
            <div className="truncate">
              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{card.title}</p>
              <p className="text-[11px] font-semibold text-sv-red dark:text-sv-warm-orange truncate">{card.artist}</p>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-300">{card.genre} · {card.year}</span>
            </div>
          </div>
        ))}
      </div>

      {/* RIGHT FLOATING ARTIST CARDS (Desktop/Tablet) */}
      <div className="hidden lg:flex flex-col gap-6 absolute right-6 top-20 pointer-events-none z-10 w-56">
        {FLOATING_ARTISTS_RIGHT.map((card, idx) => (
          <div
            key={card.title}
            className={`bg-white/90 dark:bg-sv-burgundy-deep/90 backdrop-blur-md border border-slate-200/90 dark:border-sv-burgundy p-3 rounded-2xl shadow-xl flex items-center gap-3 transition-transform ${card.animationClass}`}
            style={{ animationDelay: `${idx * 0.9 + 0.4}s` }}
          >
            <img
              src={card.artworkUrl}
              alt={card.title}
              className="w-12 h-12 rounded-xl object-cover shadow-xs border border-slate-100 dark:border-sv-burgundy shrink-0"
              loading="lazy"
            />
            <div className="truncate">
              <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{card.title}</p>
              <p className="text-[11px] font-semibold text-sv-orange dark:text-sv-gold truncate">{card.artist}</p>
              <span className="text-[9px] font-mono text-slate-400 dark:text-slate-300">{card.genre} · {card.year}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CENTRAL STABLE HERO SECTION */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-16 text-center space-y-8 z-20">
        
        {/* Brand Tag */}
        <div className="inline-flex items-center gap-2 text-xs font-extrabold text-sv-red dark:text-sv-warm-orange bg-sv-red/10 dark:bg-sv-burgundy px-4 py-1.5 rounded-full uppercase tracking-wider">
          <Zap className="w-3.5 h-3.5 fill-current" />
          <span>Multilingual Song Guessing Platform 2.0</span>
          <span aria-hidden="true">·</span>
          <span>Automatic Discovery</span>
        </div>

        {/* Bold Oversized Headline */}
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white uppercase leading-[1.08]">
          CAN YOU GUESS THE SONG IN <span className="text-sv-red dark:text-sv-warm-orange underline decoration-sv-amber decoration-4">1 SECOND?</span>
        </h1>

        {/* Concise Gameplay Instructions */}
        <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-xl mx-auto leading-relaxed">
          Listen to razor-thin clips from 1s to 10s. Guess the song before the groove ends to earn up to 100 points.
        </p>

        {/* Prominent Rounded Live Autocomplete Input */}
        <div className="max-w-xl mx-auto space-y-2">
          <LiveMusicAutocomplete
            onSelectTrack={handleAutocompletePick}
            placeholder="Type any song or artist (e.g. The Weeknd, Kesariya, Shape of You)..."
          />
          <p className="text-[11px] text-slate-400 dark:text-slate-400 text-center">
            Live autocomplete powered by real Apple iTunes API with 30s audio auditions
          </p>
        </div>

        {/* Primary Play CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={() => handleStartPlayClean('classic')}
            className="px-8 py-4 bg-sv-red hover:bg-sv-crimson active:bg-sv-burgundy text-white font-extrabold text-sm sm:text-base rounded-2xl shadow-lg shadow-sv-red/25 transition-all cursor-pointer flex items-center gap-3"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>Play Classic Mode (100 Pts)</span>
          </button>

          <button
            onClick={() => handleNavigateClean('daily')}
            className="px-6 py-4 bg-white dark:bg-sv-burgundy-deep hover:bg-slate-50 dark:hover:bg-sv-burgundy border-2 border-slate-200 dark:border-sv-burgundy text-slate-800 dark:text-white font-bold text-sm rounded-2xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <Calendar className="w-4 h-4 text-sv-orange" />
            <span>Daily Challenge</span>
          </button>

          <button
            onClick={() => handleNavigateClean('multiplayer')}
            className="px-6 py-4 bg-white dark:bg-sv-burgundy-deep hover:bg-slate-50 dark:hover:bg-sv-burgundy border-2 border-slate-200 dark:border-sv-burgundy text-slate-800 dark:text-white font-bold text-sm rounded-2xl shadow-xs transition-colors cursor-pointer flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-sv-red" />
            <span>Multiplayer (Up to 20)</span>
          </button>
        </div>

        {/* 4-LEVEL PROGRESSIVE SCORING MATRIX & INTERACTIVE AUDIO TEST */}
        <div className="bg-white dark:bg-sv-burgundy-deep border border-slate-200 dark:border-sv-burgundy rounded-3xl p-6 sm:p-7 shadow-sm max-w-xl mx-auto space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-sv-burgundy pb-3">
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-sv-red animate-pulse" />
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Audition 4 Difficulty Tiers
              </span>
            </div>
            <span className="text-[10px] font-mono text-sv-orange font-bold">
              100% Zero Cost · Real Audio
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as const).map((lvl) => {
              const cfg = GAME_LEVELS[lvl];
              const isSelected = demoLevel === lvl;
              return (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => handleTestSnippet(lvl)}
                  className={`p-3 rounded-2xl border-2 transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'border-sv-red bg-sv-red/10 dark:bg-sv-crimson/20 text-sv-red dark:text-sv-gold shadow-sm'
                      : 'border-slate-200 dark:border-sv-burgundy bg-slate-50 dark:bg-sv-navy/50 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <p className="text-[10px] font-bold uppercase tracking-wider">Level {lvl}</p>
                  <p className="text-base sm:text-lg font-black">{cfg.durationSeconds}s</p>
                  <span className="text-[10px] font-mono font-bold text-sv-orange">
                    {cfg.points} pts
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Volume2 className="w-4 h-4 text-sv-red" />
            <span>{isPlayingDemo ? 'Playing audio preview snippet...' : 'Click any tier above to test clip duration'}</span>
          </div>
        </div>

        {/* Feature Badges */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 dark:text-slate-400 font-medium pt-2">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Automatic Song Discovery</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>9 Languages & Mix Mode</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>No Sign-in Required</span>
          </div>
        </div>

      </div>

      <div className="h-6" />
    </div>
  );
};
