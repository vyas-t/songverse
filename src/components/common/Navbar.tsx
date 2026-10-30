import React, { useState, useEffect } from 'react';
import { Music, Menu, X, Sun, Moon, Laptop, Users, Calendar, Disc3, Trophy, Flame, Sparkles } from 'lucide-react';
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

  const navLinks = [
    { id: 'game', label: 'Play', view: 'language_select', mode: 'classic' as GameMode, isActive: currentView === 'game' || currentView === 'language_select' },
    { id: 'daily', label: 'Daily', view: 'daily', isActive: currentView === 'daily' },
    { id: 'multiplayer', label: 'Multiplayer', view: 'multiplayer', isActive: currentView === 'multiplayer' },
    { id: 'discovery', label: 'Discover', view: 'discovery', isActive: currentView === 'discovery' },
    { id: 'leaderboard', label: 'Leaderboard', view: 'leaderboard', isActive: currentView === 'leaderboard' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/85 dark:bg-sv-midnight/85 backdrop-blur-xl border-b border-black/[0.06] dark:border-sv-burgundy/60 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Zone 1: Brand Wordmark with glow badge */}
        <button
          onClick={() => handleNav('landing')}
          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none shrink-0"
        >
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sv-red via-sv-red-orange to-sv-amber flex items-center justify-center text-white shadow-md shadow-sv-red/30 group-hover:scale-105 group-hover:shadow-sv-red/40 transition-all duration-300">
              <Music className="w-5 h-5 fill-current" />
            </div>
            <div className="absolute -inset-0.5 rounded-2xl bg-gradient-to-tr from-sv-red to-sv-gold opacity-0 group-hover:opacity-40 blur-xs transition-opacity -z-10" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1">
              <span className="text-xl font-black tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                SongVerse
              </span>
              <span className="w-2 h-2 rounded-full bg-sv-orange animate-pulse" />
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-sv-red dark:text-sv-warm-orange font-mono">
              Live Trivia
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links with active pill highlights */}
        <nav className="hidden md:flex items-center gap-1 p-1 bg-black/[0.03] dark:bg-sv-burgundy-deep/60 border border-black/[0.04] dark:border-sv-burgundy rounded-2xl text-sm font-semibold text-slate-600 dark:text-slate-300">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.view, link.mode)}
              className={`relative px-4 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                link.isActive
                  ? 'text-white bg-sv-red shadow-sm shadow-sv-red/25'
                  : 'hover:text-slate-900 dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-sv-burgundy/40'
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Zone 3: Actions + Theme Selector + Profile */}
        <div className="hidden md:flex items-center gap-2.5 shrink-0">
          
          {/* Theme Selector Toggle */}
          <button
            onClick={cycleTheme}
            className="p-2 rounded-xl bg-slate-100/80 hover:bg-slate-200/80 dark:bg-sv-burgundy-deep/80 dark:hover:bg-sv-burgundy text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-200/60 dark:border-sv-burgundy/80 transition-all cursor-pointer"
            title={`Theme: ${themePref} (Click to switch)`}
            aria-label="Toggle theme mode"
          >
            {themePref === 'dark' ? (
              <Moon className="w-4 h-4 text-sv-gold transition-transform hover:-rotate-12" />
            ) : themePref === 'light' ? (
              <Sun className="w-4 h-4 text-sv-orange transition-transform hover:rotate-45" />
            ) : (
              <Laptop className="w-4 h-4 text-slate-500 dark:text-slate-300" />
            )}
            <span className="capitalize hidden lg:inline">{themePref}</span>
          </button>

          {/* Streak indicator badge */}
          {streak > 0 && (
            <div className="flex items-center gap-1 text-xs font-bold text-sv-amber bg-sv-amber/10 dark:bg-sv-amber/15 px-2.5 py-1.5 rounded-xl border border-sv-amber/30 tabular-nums shadow-xs">
              <Flame className="w-3.5 h-3.5 fill-current text-sv-orange animate-bounce" />
              <span>{streak}</span>
            </div>
          )}

          {/* Guest Sign In Prompt */}
          {isGuest && onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-sv-red dark:hover:text-sv-gold transition-colors cursor-pointer px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-sv-burgundy/40"
            >
              Sign In
            </button>
          )}

          {/* User Profile Pill */}
          <button
            onClick={() => handleNav('profile')}
            className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100/80 hover:bg-slate-200/80 dark:bg-sv-burgundy-deep/80 dark:hover:bg-sv-burgundy px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-sv-burgundy/80 transition-all cursor-pointer"
          >
            <Trophy className="w-3.5 h-3.5 text-sv-gold shrink-0" />
            <span className="font-mono tabular-nums">{userScore} pts</span>
          </button>

          {/* Primary Play Button */}
          <button
            onClick={() => handleNav('language_select', 'classic')}
            className="px-4 py-2 text-xs font-extrabold text-white bg-gradient-to-r from-sv-red to-sv-red-orange hover:from-sv-crimson hover:to-sv-red active:scale-95 rounded-xl shadow-md shadow-sv-red/25 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Play Now</span>
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={cycleTheme}
            className="p-2 text-slate-600 dark:text-slate-300 rounded-xl bg-slate-100 dark:bg-sv-burgundy-deep"
            aria-label="Toggle theme"
          >
            {effectiveTheme === 'dark' ? <Moon className="w-4 h-4 text-sv-gold" /> : <Sun className="w-4 h-4 text-sv-orange" />}
          </button>
          <button
            onClick={() => handleNav('language_select', 'classic')}
            className="px-3 py-1.5 text-xs font-extrabold text-white bg-sv-red rounded-xl shadow-xs"
          >
            Play
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-slate-700 dark:text-slate-200 rounded-xl bg-slate-100 dark:bg-sv-burgundy-deep focus:outline-none"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 dark:border-sv-burgundy bg-white/95 dark:bg-sv-midnight/95 backdrop-blur-xl px-4 pt-3 pb-5 space-y-1.5 shadow-lg animate-in slide-in-from-top duration-200">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.view, link.mode)}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold rounded-xl transition-colors ${
                link.isActive
                  ? 'bg-sv-red text-white'
                  : 'text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-sv-burgundy'
              }`}
            >
              {link.label}
            </button>
          ))}
          <div className="pt-2 border-t border-slate-200/80 dark:border-sv-burgundy/60 flex items-center justify-between">
            <button
              onClick={() => handleNav('profile')}
              className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 p-2"
            >
              <Trophy className="w-4 h-4 text-sv-gold" />
              <span>Profile ({userScore} pts)</span>
            </button>
            {isGuest && onOpenAuth && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAuth();
                }}
                className="text-xs font-bold text-sv-red dark:text-sv-warm-orange p-2"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
