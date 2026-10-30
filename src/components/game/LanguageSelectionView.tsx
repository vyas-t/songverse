import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Globe,
  Play,
  ArrowLeft,
  Check,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Disc3,
  Info,
  Sparkles
} from 'lucide-react';
import { musicCatalogue } from '../../services/musicCatalogue';

export interface SupportedLanguageInfo {
  id: string;
  name: string;
  nativeScript: string;
  region: string;
}

export const SUPPORTED_LANGUAGES: SupportedLanguageInfo[] = [
  { id: 'English', name: 'English', nativeScript: 'English', region: 'Global' },
  { id: 'Telugu', name: 'Telugu', nativeScript: 'తెలుగు', region: 'South India' },
  { id: 'Hindi', name: 'Hindi', nativeScript: 'हिन्दी', region: 'North / Central India' },
  { id: 'Tamil', name: 'Tamil', nativeScript: 'தமிழ்', region: 'South India' },
  { id: 'Malayalam', name: 'Malayalam', nativeScript: 'മലയാളം', region: 'South India' },
  { id: 'Kannada', name: 'Kannada', nativeScript: 'ಕನ್ನಡ', region: 'South India' },
  { id: 'Bengali', name: 'Bengali', nativeScript: 'বাংলা', region: 'East India' },
  { id: 'Punjabi', name: 'Punjabi', nativeScript: 'ਪੰਜਾਬੀ', region: 'North India' },
  { id: 'Spanish', name: 'Spanish', nativeScript: 'Español', region: 'Ibero-America' }
];

const ALL_LANGUAGE_IDS = SUPPORTED_LANGUAGES.map(l => l.id);
const STORAGE_KEY_LANGUAGES = 'songverse_preferred_languages_v1';
const STORAGE_KEY_MIX = 'songverse_mix_languages_v1';

interface LanguageSelectionViewProps {
  onStartGame: (selectedLanguages: string[]) => void;
  onBackToHome: () => void;
}

export const LanguageSelectionView: React.FC<LanguageSelectionViewProps> = ({
  onStartGame,
  onBackToHome
}) => {
  // Load saved preferences from localStorage or default to English
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_LANGUAGES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // Ignore
    }
    return ['English'];
  });

  const [isMixLanguages, setIsMixLanguages] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_MIX) === 'true';
    } catch {
      return false;
    }
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Save changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_LANGUAGES, JSON.stringify(selectedLanguages));
      localStorage.setItem(STORAGE_KEY_MIX, String(isMixLanguages));
    } catch {
      // Storage unavailable
    }
  }, [selectedLanguages, isMixLanguages]);

  // Subscribe to live catalogue changes
  const [catalogueTick, setCatalogueTick] = useState(0);
  useEffect(() => {
    const unsub = musicCatalogue.subscribe(() => setCatalogueTick(t => t + 1));
    return () => unsub();
  }, []);

  // Real catalogue query for live language counts
  const languageCounts = useMemo(() => {
    return musicCatalogue.getPlayableCountsByLanguage();
  }, [catalogueTick]);

  // Effective active languages: if Mix Languages is enabled, all languages are included
  const activeLanguages = useMemo(() => {
    return isMixLanguages ? ALL_LANGUAGE_IDS : selectedLanguages;
  }, [isMixLanguages, selectedLanguages]);

  // Calculate total playable tracks available for this session
  const totalPlayableCount = useMemo(() => {
    return musicCatalogue.getPlayableTracksByLanguages(activeLanguages).length;
  }, [activeLanguages, catalogueTick]);

  // Filter languages in dropdown search
  const filteredLanguages = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.nativeScript.toLowerCase().includes(q) ||
        l.region.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const toggleLanguage = (langId: string) => {
    if (isMixLanguages) {
      // Turning off Mix Languages when user chooses individual selection
      setIsMixLanguages(false);
      setSelectedLanguages([langId]);
      return;
    }

    setSelectedLanguages(prev => {
      if (prev.includes(langId)) {
        // Prevent deselecting last language
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== langId);
      } else {
        return [...prev, langId];
      }
    });
  };

  const removeChip = (langId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMixLanguages) {
      setIsMixLanguages(false);
      setSelectedLanguages(ALL_LANGUAGE_IDS.filter(id => id !== langId));
      return;
    }
    if (selectedLanguages.length > 1) {
      setSelectedLanguages(prev => prev.filter(id => id !== langId));
    }
  };

  const toggleMixLanguages = () => {
    const nextState = !isMixLanguages;
    setIsMixLanguages(nextState);
    if (nextState) {
      setSelectedLanguages(ALL_LANGUAGE_IDS);
    }
  };

  const handleSelectAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMixLanguages(true);
    setSelectedLanguages(ALL_LANGUAGE_IDS);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMixLanguages(false);
    setSelectedLanguages(['English']);
  };

  const [isDiscovering, setIsDiscovering] = useState(false);

  const handleStartGame = () => {
    if (totalPlayableCount === 0 || activeLanguages.length === 0) return;
    onStartGame(activeLanguages);
  };

  const handleAutoDiscoverAndPlay = async () => {
    setIsDiscovering(true);
    try {
      await musicCatalogue.autoDiscoverSongs(activeLanguages);
      onStartGame(activeLanguages);
    } catch {
      // Ignored
    } finally {
      setIsDiscovering(false);
    }
  };

  const isCatalogueEmpty = totalPlayableCount === 0;

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12 animate-in fade-in duration-200">
      
      {/* Back button */}
      <div className="mb-6">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Main Card */}
      <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200/90 dark:border-sv-burgundy rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Header */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-sv-red dark:text-sv-warm-orange font-mono">
            Song Preferences
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Choose Your Languages
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-300 leading-relaxed font-medium">
            Select one or more languages for your upcoming song-guessing session.
          </p>
        </div>

        {/* Mix Languages Mode Toggle (Compact) */}
        <div
          onClick={toggleMixLanguages}
          role="switch"
          aria-checked={isMixLanguages}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleMixLanguages();
            }
          }}
          className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
            isMixLanguages
              ? 'bg-sv-red/10 dark:bg-sv-crimson/25 border-sv-red/30 dark:border-sv-burgundy text-slate-900 dark:text-white shadow-xs'
              : 'bg-slate-50/70 dark:bg-sv-midnight/60 hover:bg-slate-100/70 dark:hover:bg-sv-midnight/80 border-slate-200 dark:border-sv-burgundy text-slate-700 dark:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-3.5">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm transition-colors shadow-xs ${
              isMixLanguages ? 'bg-sv-red text-white' : 'bg-white dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy text-slate-600 dark:text-slate-300'
            }`}>
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-900 dark:text-white">
                  🌍 Mix Languages
                </span>
                {isMixLanguages && (
                  <span className="text-[10px] font-black text-sv-red dark:text-sv-gold bg-sv-red/10 dark:bg-sv-burgundy px-2 py-0.5 rounded-md font-mono">
                    All Active
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Include songs from every eligible language in a single global game.
              </p>
            </div>
          </div>

          {/* Toggle pill */}
          <div className={`w-11 h-6 rounded-full p-0.5 transition-colors relative shrink-0 ${
            isMixLanguages ? 'bg-sv-red' : 'bg-slate-300 dark:bg-slate-700'
          }`}>
            <div className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform duration-200 ease-out ${
              isMixLanguages ? 'translate-x-5' : 'translate-x-0'
            }`} />
          </div>
        </div>

        {/* Searchable Multi-Select Dropdown Container */}
        <div className="space-y-2 relative" ref={dropdownRef}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Language Filter
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sv-red dark:text-sv-warm-orange hover:underline cursor-pointer font-medium"
              >
                Select all
              </button>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white font-medium hover:underline cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>

          {/* Dropdown Trigger Box */}
          <div
            onClick={() => setIsDropdownOpen(prev => !prev)}
            tabIndex={0}
            role="button"
            aria-expanded={isDropdownOpen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsDropdownOpen(prev => !prev);
              }
            }}
            className={`w-full min-h-[46px] p-2 bg-white dark:bg-sv-navy border rounded-xl flex items-center justify-between gap-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sv-red/20 ${
              isDropdownOpen ? 'border-sv-red ring-2 ring-sv-red/10' : 'border-slate-200 dark:border-sv-burgundy hover:border-slate-300'
            }`}
          >
            {/* Chips Container */}
            <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0 pr-1">
              {isMixLanguages ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-sv-red/10 dark:bg-sv-burgundy text-sv-red dark:text-sv-gold border border-sv-red/20 dark:border-sv-burgundy">
                  <Globe className="w-3 h-3 text-sv-red dark:text-sv-warm-orange" />
                  <span>All 9 Languages Selected</span>
                </span>
              ) : selectedLanguages.length === 0 ? (
                <span className="text-xs text-slate-400 dark:text-slate-500 pl-1">
                  Select languages...
                </span>
              ) : (
                selectedLanguages.map(langId => {
                  const info = SUPPORTED_LANGUAGES.find(l => l.id === langId);
                  const count = languageCounts[langId] || 0;
                  return (
                    <span
                      key={langId}
                      className="inline-flex items-center gap-1.5 pl-2 pr-1.5 py-0.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-sv-burgundy/80 text-slate-800 dark:text-sv-gold border border-slate-200/80 dark:border-sv-burgundy"
                    >
                      <span>{info?.name || langId}</span>
                      <span className="text-[10px] text-slate-400 dark:text-sv-gold/60 font-mono">({count})</span>
                      <button
                        type="button"
                        onClick={(e) => removeChip(langId, e)}
                        className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-sm hover:bg-slate-200/60 dark:hover:bg-sv-navy/60 transition-colors"
                        aria-label={`Remove ${langId}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })
              )}
            </div>

            {/* Chevron icon */}
            <div className="text-slate-400 dark:text-sv-warm-orange shrink-0 pr-1">
              {isDropdownOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>

          {/* Dropdown Menu Overlay */}
          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 z-20 mt-1.5 bg-white dark:bg-sv-navy border border-slate-200 dark:border-sv-burgundy rounded-xl shadow-lg p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
              
              {/* Search input inside dropdown */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-sv-warm-orange absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search languages..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 bg-slate-50 dark:bg-sv-burgundy-deep border border-slate-200 dark:border-sv-burgundy rounded-lg focus:outline-none focus:border-sv-red dark:focus:border-sv-warm-orange"
                  autoFocus
                />
              </div>

              {/* Languages List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-0.5">
                {filteredLanguages.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    No languages match &ldquo;{searchQuery}&rdquo;
                  </div>
                ) : (
                  filteredLanguages.map((lang) => {
                    const isSelected = activeLanguages.includes(lang.id);
                    const count = languageCounts[lang.id] || 0;

                    return (
                      <div
                        key={lang.id}
                        onClick={() => toggleLanguage(lang.id)}
                        role="checkbox"
                        aria-checked={isSelected}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            toggleLanguage(lang.id);
                          }
                        }}
                        className={`flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer select-none ${
                          isSelected
                            ? 'bg-sv-red/10 dark:bg-sv-crimson/30 text-sv-red dark:text-sv-gold font-medium'
                            : 'hover:bg-slate-50 dark:hover:bg-sv-burgundy/30 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          {/* Custom Checkbox */}
                          <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border transition-colors ${
                            isSelected
                              ? 'bg-sv-red border-sv-red text-white'
                              : 'border-slate-300 dark:border-sv-burgundy bg-white dark:bg-sv-burgundy-deep'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 stroke-[2.5]" />}
                          </div>

                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{lang.name}</span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-400 ml-1.5">
                              {lang.nativeScript}
                            </span>
                          </div>
                        </div>

                        {/* Count Badge */}
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                          count > 0
                            ? 'text-sv-red dark:text-sv-gold bg-sv-red/10 dark:bg-sv-burgundy font-semibold'
                            : 'text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-sv-navy/60'
                        }`}>
                          {count} {count === 1 ? 'song' : 'songs'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Dropdown footer summary */}
              <div className="pt-2 border-t border-slate-100 dark:border-sv-burgundy/50 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1">
                <span>{activeLanguages.length} of 9 languages selected</span>
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(false)}
                  className="font-semibold text-sv-red dark:text-sv-warm-orange hover:underline cursor-pointer"
                >
                  Done
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Empty Catalogue Polished Banner */}
        {isCatalogueEmpty ? (
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-sv-navy/70 border border-slate-200/90 dark:border-sv-burgundy text-left space-y-2">
            <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
              <Disc3 className="w-4 h-4 text-sv-red dark:text-sv-warm-orange" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                Your playlist is waiting 🎵
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Songs will appear here once added. The active song catalogue has been cleared and contains 0 tracks. Add songs via CSV or catalogue ingestion to enable active rounds.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-400 font-mono pt-1">
              <Info className="w-3.5 h-3.5 shrink-0 text-slate-400" />
              <span>Available songs for all languages: 0</span>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-sv-red/5 dark:bg-sv-burgundy/40 border border-sv-red/20 dark:border-sv-burgundy flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-300">Eligible tracks for this session:</span>
            <span className="font-bold text-sv-red dark:text-sv-gold font-mono">{totalPlayableCount} Playable Tracks</span>
          </div>
        )}

        {/* Action Button: Start Game */}
        <div className="pt-2 space-y-2">
          <button
            type="button"
            onClick={handleStartGame}
            disabled={isCatalogueEmpty || activeLanguages.length === 0}
            className={`w-full py-4 px-4 rounded-2xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 transition-all ${
              isCatalogueEmpty || activeLanguages.length === 0
                ? 'bg-slate-100 dark:bg-sv-burgundy/40 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-sv-burgundy cursor-not-allowed shadow-none'
                : 'bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber hover:from-sv-crimson hover:to-sv-red active:scale-95 text-white shadow-md shadow-sv-red/25 cursor-pointer'
            }`}
          >
            <Play className={`w-4 h-4 ${isCatalogueEmpty ? 'fill-slate-400' : 'fill-white'}`} />
            <span>
              {isCatalogueEmpty
                ? 'Start Game (0 Songs Available)'
                : `Start Game (${totalPlayableCount} Songs)`}
            </span>
          </button>

          {isCatalogueEmpty && (
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleAutoDiscoverAndPlay}
                disabled={isDiscovering}
                className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold bg-sv-red hover:bg-sv-crimson text-white shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4 text-sv-gold" />
                <span>{isDiscovering ? 'Discovering Playable Songs...' : 'Auto-Discover Playable Songs & Play'}</span>
              </button>
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-400">
                Start Game is disabled because there are no playable songs in the active catalogue. Click Auto-Discover to load songs from Apple iTunes API.
              </p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
