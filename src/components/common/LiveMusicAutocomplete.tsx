import React, { useState, useEffect, useRef } from 'react';
import { Search, Disc3, Volume2, VolumeX, RefreshCw, X, Music } from 'lucide-react';
import { Track } from '../../types';

export interface AutocompleteTrackResult {
  id: string;
  providerTrackId: string;
  title: string;
  artist: string;
  album: string;
  releaseYear: number;
  country: string;
  genre: string;
  language: string;
  artworkUrl?: string;
  audioUrl?: string;
  hasAuthorizedAudio: boolean;
  playbackStatus: 'verified_audio' | 'metadata_only';
  audioAvailability: 'available' | 'restricted';
  licenceType: string;
  licenceReference: string;
  attributionText: string;
  source: string;
  isrc?: string;
}

interface LiveMusicAutocompleteProps {
  onSelectTrack: (track: AutocompleteTrackResult) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

export const LiveMusicAutocomplete: React.FC<LiveMusicAutocompleteProps> = ({
  onSelectTrack,
  placeholder = 'Search by song title, artist, or groove...',
  className = '',
  autoFocus = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AutocompleteTrackResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const activeAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      setIsOpen(false);
      setSelectedIndex(-1);
      setErrorMessage(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    const timer = setTimeout(async () => {
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      const controller = new AbortController();
      activeAbortRef.current = controller;

      try {
        const params = new URLSearchParams();
        params.set('q', trimmed);
        params.set('limit', '8');

        const res = await fetch(`/api/music/search?${params.toString()}`, {
          signal: controller.signal
        });

        if (!res.ok) {
          throw new Error(`Music search returned HTTP ${res.status}`);
        }

        const data = await res.json();
        const incoming = Array.isArray(data.results) ? data.results : [];
        setResults(incoming);
        setIsOpen(true);
        setSelectedIndex(-1);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setErrorMessage(err.message || 'Search query failed');
          setResults([]);
        }
      } finally {
        setIsLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
    };
  }, [query]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        handlePick(results[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  const handlePick = (track: AutocompleteTrackResult) => {
    onSelectTrack(track);
    setQuery(`${track.title} – ${track.artist}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative w-full ${className}`}>
      <div className="relative flex items-center">
        <div className="absolute left-4 text-sv-red dark:text-[#F48C06] pointer-events-none">
          {isLoading ? (
            <RefreshCw className="w-5 h-5 animate-spin text-sv-red dark:text-[#F48C06]" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Search songs and artists"
          aria-expanded={isOpen}
          className="w-full pl-12 pr-10 py-3.5 sm:py-4 text-sm sm:text-base bg-white dark:bg-[#370617] border-2 border-slate-200 dark:border-[#6A040F] rounded-2xl shadow-sm text-slate-900 dark:text-[#FFBA08] placeholder:text-slate-400 dark:placeholder:text-[#F48C06]/65 focus:outline-none focus:border-sv-red dark:focus:border-[#F48C06] transition-all"
        />

        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3.5 p-1 text-slate-400 hover:text-slate-600 dark:text-[#FAA307]/80 dark:hover:text-[#FFBA08] rounded-lg cursor-pointer transition-colors"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-2 bg-white dark:bg-[#03071E] border border-slate-200 dark:border-[#6A040F] rounded-2xl shadow-xl overflow-hidden max-h-80 overflow-y-auto animate-in fade-in"
        >
          {errorMessage && (
            <div className="p-4 text-xs text-rose-600 dark:text-rose-400 text-center">
              {errorMessage}
            </div>
          )}

          {!isLoading && results.length === 0 && !errorMessage && (
            <div className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching tracks found on Apple iTunes API for &ldquo;{query}&rdquo;
            </div>
          )}

          {results.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handlePick(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full text-left p-3 sm:p-3.5 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-[#6A040F]/40 last:border-b-0 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-sv-crimson/15 dark:bg-sv-crimson/40 text-sv-red dark:text-[#FFBA08]'
                    : 'hover:bg-slate-50 dark:hover:bg-[#370617]/50 text-slate-900 dark:text-white'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.artworkUrl ? (
                    <img
                      src={item.artworkUrl}
                      alt={item.album}
                      className="w-11 h-11 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-sv-burgundy"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-sv-red to-sv-orange flex items-center justify-center text-white shrink-0">
                      <Music className="w-5 h-5" />
                    </div>
                  )}

                  <div className="truncate">
                    <p className="text-xs sm:text-sm font-bold truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
                      {item.artist} · <span className="font-semibold text-sv-orange">{item.language}</span> ({item.releaseYear})
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {item.hasAuthorizedAudio ? (
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200 dark:border-emerald-800">
                      <Volume2 className="w-3 h-3" />
                      <span>Preview</span>
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <VolumeX className="w-3 h-3" />
                      <span>Meta</span>
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
