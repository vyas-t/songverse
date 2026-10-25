import React, { useState, useEffect, useRef } from 'react';
import { Search, Music, Disc3, X, RefreshCw } from 'lucide-react';
import { Track } from '../../types';
import { musicCatalogue } from '../../services/musicCatalogue';

interface SongSearchInputProps {
  onSelectTrack: (track: Track) => void;
  selectedTrack: Track | null;
  onClearSelection: () => void;
  disabled?: boolean;
}

export const SongSearchInput: React.FC<SongSearchInputProps> = ({
  onSelectTrack,
  selectedTrack,
  onClearSelection,
  disabled = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Track[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounced hybrid search: Local Catalogue + Apple iTunes API discovery
  useEffect(() => {
    if (selectedTrack) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // 1. Instant local search
    const localMatches = musicCatalogue.searchTracks(trimmed, 8);
    setResults(localMatches);
    setIsOpen(true);
    setSelectedIndex(-1);

    // 2. If query is 2+ chars, query live iTunes search to offer rich global suggestions
    const timer = setTimeout(async () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
      const ctrl = new AbortController();
      abortControllerRef.current = ctrl;

      setIsLoadingLive(true);
      try {
        const params = new URLSearchParams();
        params.set('q', trimmed);
        params.set('limit', '8');

        const res = await fetch(`/api/music/search?${params.toString()}`, { signal: ctrl.signal });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.results)) {
            const mappedLive: Track[] = data.results.map((r: any) => ({
              id: r.id,
              provider: r.source || 'apple-itunes',
              providerTrackId: r.providerTrackId || r.id,
              title: r.title,
              artist: r.artist,
              album: r.album || 'Single',
              releaseYear: r.releaseYear || 2024,
              decade: `${Math.floor((r.releaseYear || 2024) / 10) * 10}s`,
              country: r.country || 'Global',
              language: r.language || 'English',
              genre: r.genre || 'Pop',
              artworkUrl: r.artworkUrl,
              artworkGradient: 'from-sv-red to-sv-orange',
              audioUrl: r.audioUrl,
              audioAssetUrl: r.audioUrl,
              playbackStatus: r.playbackStatus,
              availabilityStatus: r.audioAvailability || 'available',
              durationSeconds: 210,
              clipStartSeconds: 15,
              licenceReference: r.licenceReference || `ITUNES-${r.providerTrackId}`,
              licenceType: r.licenceType || 'Apple iTunes Promotional Preview',
              attributionText: r.attributionText || `Track by ${r.artist}`,
              regionRestrictions: [],
              aliases: [r.title, `${r.artist} ${r.title}`]
            }));

            // Merge deduplicated
            setResults(prev => {
              const combined = [...prev];
              for (const liveTrack of mappedLive) {
                const exists = combined.some(
                  c => c.id === liveTrack.id ||
                       (c.title.toLowerCase() === liveTrack.title.toLowerCase() &&
                        c.artist.toLowerCase() === liveTrack.artist.toLowerCase())
                );
                if (!exists) combined.push(liveTrack);
              }
              return combined.slice(0, 10);
            });
          }
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          // Ignore
        }
      } finally {
        setIsLoadingLive(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [query, selectedTrack]);

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

  const handlePick = (track: Track) => {
    // Add track into catalogue if not present so gameEngine can reference it
    if (!musicCatalogue.getTrackById(track.id)) {
      musicCatalogue.addTrack(track);
    }
    onSelectTrack(track);
    setQuery(`${track.title} – ${track.artist}`);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onClearSelection();
    inputRef.current?.focus();
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-center">
        <div className="absolute left-3.5 text-sv-red dark:text-[#F48C06] pointer-events-none">
          {isLoadingLive ? (
            <RefreshCw className="w-4 h-4 animate-spin text-sv-red dark:text-[#F48C06]" />
          ) : (
            <Search className="w-4 h-4" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={selectedTrack ? `${selectedTrack.title} — ${selectedTrack.artist}` : query}
          onChange={(e) => {
            if (selectedTrack) onClearSelection();
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (query.trim().length > 0 && results.length > 0) {
              setIsOpen(true);
            }
          }}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Type song title or artist name to guess..."
          aria-label="Guess song title or artist"
          aria-expanded={isOpen}
          className="w-full pl-10 pr-10 py-3 text-sm bg-white dark:bg-[#370617] border-2 border-slate-300 dark:border-[#6A040F] rounded-xl shadow-xs placeholder:text-slate-400 dark:placeholder:text-[#F48C06]/65 text-slate-900 dark:text-[#FFBA08] focus:outline-none focus:border-sv-red dark:focus:border-[#F48C06] transition-all disabled:bg-slate-100 dark:disabled:bg-[#370617]/40 disabled:cursor-not-allowed"
        />

        {(query || selectedTrack) && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 text-slate-400 hover:text-slate-600 dark:text-[#FAA307]/80 dark:hover:text-[#FFBA08] cursor-pointer"
            title="Clear guess"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Autocomplete Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          className="absolute z-50 left-0 right-0 mt-1.5 bg-white dark:bg-[#03071E] border border-slate-200 dark:border-[#6A040F] rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto animate-in fade-in"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              No matching tracks found. Try typing another song title or artist.
            </div>
          ) : (
            results.map((track, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={track.id}
                  type="button"
                  onClick={() => handlePick(track)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full text-left p-2.5 sm:p-3 flex items-center justify-between gap-3 border-b border-slate-100 dark:border-[#6A040F]/40 last:border-b-0 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-sv-red/10 dark:bg-sv-crimson/40 text-sv-red dark:text-[#FFBA08]'
                      : 'hover:bg-slate-50 dark:hover:bg-[#370617]/50 text-slate-900 dark:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    {track.artworkUrl ? (
                      <img
                        src={track.artworkUrl}
                        alt={track.album}
                        className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-sv-burgundy"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sv-red to-sv-orange flex items-center justify-center text-white shrink-0">
                        <Music className="w-4 h-4" />
                      </div>
                    )}
                    <div className="truncate">
                      <p className="text-xs font-bold truncate">
                        {track.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {track.artist} · <span className="font-semibold text-sv-orange">{track.language}</span>
                      </p>
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                    {track.releaseYear || ''}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
