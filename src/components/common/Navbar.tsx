import React, { useState, useEffect } from 'react';
import { Music, Menu, X, Sun, Moon, Laptop, Users, Calendar, Disc3, Trophy, Flame } from 'lucide-react';
import { GameMode } from '../../types';
import { themeManager, ThemePreference } from '../../services/themeManager';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string, mode?: GameMode) => void;
  userScore: number;
  streak: number;
  isGuest?: boolean;
  onOpenAuth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  userScore,
  streak,
  isGuest,
  onOpenAuth
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>(themeManager.getPreference());
  const [effectiveTheme, setEffectiveTheme] = useState<'dark' | 'light'>(themeManager.getEffectiveTheme());

  useEffect(() => {
    const unsub = themeManager.subscribe((pref, effective) => {
      setThemePref(pref);
      setEffectiveTheme(effective);
    });
    return () => unsub();
  }, []);

  const handleNav = (view: string, mode?: GameMode) => {
    onNavigate(view, mode);
    setMobileMenuOpen(false);
  };

  const cycleTheme = () => {
    if (themePref === 'dark') themeManager.setPreference('light');
    else if (themePref === 'light') themeManager.setPreference('system');
    else themeManager.setPreference('dark');
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/90 dark:bg-sv-navy/90 backdrop-blur-md border-b border-slate-200/80 dark:border-sv-burgundy transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark with 10-color gradient */}
        <button
          onClick={() => handleNav('landing')}
          className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none shrink-0"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sv-red to-sv-orange flex items-center justify-center text-white shadow-sm shadow-sv-red/30 group-hover:scale-105 transition-transform">
            <Music className="w-5 h-5 fill-current" />
          </div>
          <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
            SongVerse
          </span>
        </button>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
          <button
            onClick={() => handleNav('language_select', 'classic')}
            className={`whitespace-nowrap hover:text-sv-red dark:hover:text-sv-warm-orange transition-colors cursor-pointer py-1 ${
              currentView === 'game' || currentView === 'language_select'
                ? 'text-sv-red dark:text-sv-warm-orange font-bold border-b-2 border-sv-red'
                : ''
            }`}
          >
            Play
          </button>
          <button
            onClick={() => handleNav('daily')}
            className={`whitespace-nowrap hover:text-sv-red dark:hover:text-sv-warm-orange transition-colors cursor-pointer py-1 ${
              currentView === 'daily' ? 'text-sv-red dark:text-sv-warm-orange font-bold border-b-2 border-sv-red' : ''
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => handleNav('multiplayer')}
            className={`whitespace-nowrap hover:text-sv-red dark:hover:text-sv-warm-orange transition-colors cursor-pointer py-1 ${
              currentView === 'multiplayer' ? 'text-sv-red dark:text-sv-warm-orange font-bold border-b-2 border-sv-red' : ''
            }`}
          >
            Multiplayer
          </button>
          <button
            onClick={() => handleNav('discovery')}
            className={`whitespace-nowrap hover:text-sv-red dark:hover:text-sv-warm-orange transition-colors cursor-pointer py-1 ${
              currentView === 'discovery' ? 'text-sv-red dark:text-sv-warm-orange font-bold border-b-2 border-sv-red' : ''
            }`}
          >
            Discover
          </button>
          <button
            onClick={() => handleNav('leaderboard')}
            className={`whitespace-nowrap hover:text-sv-red dark:hover:text-sv-warm-orange transition-colors cursor-pointer py-1 ${
              currentView === 'leaderboard' ? 'text-sv-red dark:text-sv-warm-orange font-bold border-b-2 border-sv-red' : ''
            }`}
          >
            Leaderboard
          </button>
        </nav>

        {/* Zone 3: Actions + Theme Selector */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {/* Theme Selector Toggle (Dark, Light, System) */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-sv-burgundy/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title={`Theme: ${themePref} (Click to switch)`}
            aria-label="Toggle theme mode"
          >
            {themePref === 'dark' ? (
              <Moon className="w-4 h-4 text-sv-gold" />
            ) : themePref === 'light' ? (
              <Sun className="w-4 h-4 text-sv-orange" />
            ) : (
              <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            )}
            <span className="capitalize">{themePref}</span>
          </button>

          {streak > 0 && (
            <span className="text-xs font-bold text-sv-orange bg-sv-orange/10 px-2.5 py-1 rounded-lg border border-sv-orange/20 tabular-nums">
              🔥 {streak}
            </span>
          )}

          {isGuest && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-sv-red transition-colors cursor-pointer px-2"
            >
              Sign In
            </button>
          )}

          <button
            onClick={() => handleNav('profile')}
            className="text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-sv-red transition-colors cursor-pointer px-2 py-1"
          >
            Profile ({userScore} pts)
          </button>

          <button
            onClick={() => handleNav('language_select', 'classic')}
            className="px-4 py-2 text-xs font-bold text-white bg-sv-red hover:bg-sv-crimson active:bg-sv-burgundy rounded-xl shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            Play Now
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={cycleTheme}
            className="p-2 text-slate-600 dark:text-slate-300"
            aria-label="Toggle theme"
          >
            {effectiveTheme === 'dark' ? <Moon className="w-4 h-4 text-sv-gold" /> : <Sun className="w-4 h-4 text-sv-orange" />}
          </button>
          <button
            onClick={() => handleNav('language_select', 'classic')}
            className="px-3 py-1.5 text-xs font-bold text-white bg-sv-red rounded-lg"
          >
            Play
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-600 dark:text-slate-300 rounded-lg focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-sv-burgundy bg-white/95 dark:bg-sv-navy/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-2">
          <button
            onClick={() => handleNav('language_select', 'classic')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-sv-burgundy rounded-lg"
          >
            Play Classic
          </button>
          <button
            onClick={() => handleNav('daily')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-sv-burgundy rounded-lg"
          >
            Daily Challenge
          </button>
          <button
            onClick={() => handleNav('multiplayer')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-sv-burgundy rounded-lg"
          >
            Multiplayer Room
          </button>
          <button
            onClick={() => handleNav('discovery')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-sv-burgundy rounded-lg"
          >
            Song Search & Catalogue
          </button>
          <button
            onClick={() => handleNav('leaderboard')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-sv-burgundy rounded-lg"
          >
            Leaderboard
          </button>
          <button
            onClick={() => handleNav('profile')}
            className="w-full text-left px-3 py-2 text-sm font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-sv-burgundy rounded-lg"
          >
            My Profile ({userScore} pts)
          </button>
        </div>
      )}
    </header>
  );
};
