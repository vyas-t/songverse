import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Radio, Waves, Activity, Sparkles, Disc3, Disc, Sliders, Layers } from 'lucide-react';

export type VisualizerStyle = 'cyberpunk' | 'vinyl' | 'cassette';

interface MusicVisualizerProps {
  waveformBars: number[];
  isPlaying: boolean;
  isLoading?: boolean;
  artworkGradient?: string;
  className?: string;
  defaultStyle?: VisualizerStyle;
}

export const MusicVisualizer: React.FC<MusicVisualizerProps> = ({
  waveformBars,
  isPlaying,
  isLoading = false,
  className = '',
  defaultStyle = 'cyberpunk'
}) => {
  const [style, setStyle] = useState<VisualizerStyle>(defaultStyle);
  const peaksRef = useRef<number[]>(new Array(32).fill(0.18));
  const [, setTick] = useState(0);

  // Peak hold array with gravity decay for authentic equalizer physics
  useEffect(() => {
    if (!isPlaying) {
      peaksRef.current = new Array(32).fill(0.18);
      return;
    }

    const nextPeaks = peaksRef.current.map((peak, idx) => {
      const currentAmp = waveformBars[idx] ?? 0.18;
      if (currentAmp >= peak) {
        return currentAmp;
      }
      return Math.max(0.18, peak - 0.035);
    });

    peaksRef.current = nextPeaks;
    setTick((t) => (t + 1) % 1000);
  }, [waveformBars, isPlaying]);

  // Average energy across bands for reactive aura bloom
  const avgEnergy = useMemo(() => {
    if (!waveformBars.length) return 0.18;
    return waveformBars.reduce((sum, val) => sum + val, 0) / waveformBars.length;
  }, [waveformBars]);

  // Floating audio particle coordinates
  const particles = useMemo(
    () => [
      { left: '10%', delay: '0.1s', size: 'w-1 h-1' },
      { left: '22%', delay: '0.9s', size: 'w-1.5 h-1.5' },
      { left: '35%', delay: '1.7s', size: 'w-1 h-1' },
      { left: '48%', delay: '0.4s', size: 'w-2 h-2' },
      { left: '60%', delay: '1.2s', size: 'w-1 h-1' },
      { left: '72%', delay: '2.1s', size: 'w-1.5 h-1.5' },
      { left: '84%', delay: '0.7s', size: 'w-1 h-1' },
      { left: '92%', delay: '1.5s', size: 'w-1.5 h-1.5' },
    ],
    []
  );

  const cycleStyle = () => {
    const nextStyle: Record<VisualizerStyle, VisualizerStyle> = {
      cyberpunk: 'vinyl',
      vinyl: 'cassette',
      cassette: 'cyberpunk'
    };
    setStyle(nextStyle[style]);
  };

  return (
    <div
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800/80 dark:border-sv-burgundy/60 p-3 sm:p-5 select-none transition-all duration-300 shadow-inner ${className}`}
      style={{
        boxShadow: isPlaying
          ? `0 0 ${Math.round(avgEnergy * 35)}px rgba(234, 88, 12, ${Math.min(0.35, avgEnergy * 0.55)})`
          : undefined,
      }}
    >
      {/* Dynamic Background Audio Glow */}
      <div
        className="absolute inset-0 transition-opacity duration-300 pointer-events-none"
        style={{
          background: isPlaying
            ? style === 'vinyl'
              ? 'radial-gradient(circle at center, rgba(234,88,12,0.18) 0%, rgba(11,14,20,0.95) 70%)'
              : style === 'cassette'
              ? 'radial-gradient(circle at center, rgba(245,158,11,0.15) 0%, rgba(11,14,20,0.95) 70%)'
              : 'radial-gradient(circle at 50% 100%, rgba(225,29,72,0.22) 0%, rgba(234,88,12,0.14) 45%, rgba(11,14,20,0.95) 85%)'
            : 'radial-gradient(circle at 50% 100%, rgba(255,255,255,0.03) 0%, rgba(11,14,20,0.98) 85%)',
          opacity: isPlaying ? Math.min(1, 0.4 + avgEnergy) : 0.25,
        }}
      />

      {/* Top Header Indicators & Theme Switcher */}
      <div className="relative flex items-center justify-between pb-2 z-20">
        <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider font-semibold text-slate-400">
          <Waves className="w-3 h-3 text-sv-red-orange animate-pulse" />
          <span className="uppercase">{style} VISUALIZER</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Style Selector Pill */}
          <button
            type="button"
            onClick={cycleStyle}
            className="flex items-center gap-1 text-[10px] font-mono font-bold text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 px-2 py-0.5 rounded-lg border border-white/10 transition-colors cursor-pointer"
            title="Switch visualizer theme (Cyberpunk / Vinyl / Cassette)"
          >
            <Layers className="w-3 h-3 text-sv-gold" />
            <span className="capitalize">{style}</span>
          </button>

          {isPlaying ? (
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-sv-red dark:text-sv-gold bg-white/90 dark:bg-sv-midnight/90 px-2 py-0.5 rounded-lg border border-sv-red/20 shadow-xs">
              <Radio className="w-3 h-3 text-sv-red animate-pulse" />
              <span>LIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[10px] font-mono font-semibold text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded-lg border border-slate-700/40">
              <Activity className="w-3 h-3 text-slate-400" />
              <span>READY</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading Laser Scan Beam */}
      {isLoading && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-30 flex items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="relative flex items-center gap-2 bg-slate-900/95 border border-sv-gold/40 px-3.5 py-1.5 rounded-full text-xs font-mono font-bold text-sv-gold shadow-xl">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>SYNCING AUDIO STREAM...</span>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* THEME 1: CYBERPUNK 32-BAND EQUALIZER                         */}
      {/* ============================================================ */}
      {style === 'cyberpunk' && (
        <div className="h-28 sm:h-32 flex items-end justify-center gap-1 sm:gap-1.5 relative z-10 pt-2 pb-1">
          {/* Floating Embers */}
          {isPlaying && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {particles.map((p, i) => (
                <div
                  key={i}
                  className={`absolute bottom-6 rounded-full bg-gradient-to-t from-sv-gold to-sv-red shadow-[0_0_8px_rgba(255,186,8,0.8)] animate-particle-drift ${p.size}`}
                  style={{ left: p.left, animationDelay: p.delay }}
                />
              ))}
            </div>
          )}

          {waveformBars.map((amp, idx) => {
            let barHeight = Math.max(14, Math.round(amp * 100));
            const peak = peaksRef.current[idx] ?? amp;
            const peakHeight = Math.max(barHeight + 4, Math.min(100, Math.round(peak * 100)));

            if (!isPlaying && !isLoading) {
              const idleSine = Math.sin((idx / 32) * Math.PI * 2) * 8 + 22;
              barHeight = Math.round(idleSine);
            }

            return (
              <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full relative">
                {isPlaying && (
                  <div
                    style={{ bottom: `${peakHeight}%` }}
                    className="absolute w-1.5 sm:w-2 h-1 rounded-full bg-sv-gold shadow-[0_0_6px_rgba(255,186,8,0.9)] transition-all duration-100 ease-out pointer-events-none"
                  />
                )}
                <div
                  style={{ height: `${barHeight}%` }}
                  className={`w-full rounded-t-sm transition-all duration-75 ease-out ${
                    isPlaying
                      ? 'bg-gradient-to-t from-sv-crimson via-sv-red to-sv-gold shadow-[0_0_10px_rgba(225,29,72,0.5)]'
                      : 'bg-slate-700/50'
                  }`}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* ============================================================ */}
      {/* THEME 2: REALISTIC ROTATING VINYL TURNTABLE                   */}
      {/* ============================================================ */}
      {style === 'vinyl' && (
        <div className="h-28 sm:h-32 flex items-center justify-center relative z-10 py-1">
          <div className="relative flex items-center justify-center">
            {/* Vinyl Disc Body */}
            <div
              className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-zinc-950 border-4 border-zinc-800 shadow-2xl flex items-center justify-center relative transition-transform ${
                isPlaying ? 'animate-spin' : ''
              }`}
              style={{
                animationDuration: '3.5s',
                boxShadow: isPlaying
                  ? `0 0 25px rgba(249,115,22,${Math.min(0.5, avgEnergy)})`
                  : undefined
              }}
            >
              {/* Concentric Grooves */}
              <div className="absolute inset-2 rounded-full border border-zinc-800/80" />
              <div className="absolute inset-4 rounded-full border border-zinc-800/60" />
              <div className="absolute inset-6 rounded-full border border-zinc-800/40" />

              {/* Center Vinyl Label */}
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-tr from-sv-red via-sv-warm-orange to-sv-gold flex items-center justify-center shadow-md">
                <div className="w-2.5 h-2.5 rounded-full bg-black border border-white/40" />
              </div>
            </div>

            {/* Tonearm */}
            <div
              className={`absolute -top-2 right-4 w-12 h-16 border-r-2 border-t-2 border-slate-300 rounded-tr-xl pointer-events-none transition-transform origin-top-right ${
                isPlaying ? 'rotate-12' : '-rotate-6'
              }`}
            >
              <div className="absolute bottom-0 right-0 w-2.5 h-4 bg-sv-red rounded-xs" />
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* THEME 3: RETRO CASSETTE TAPE & VU METERS                     */}
      {/* ============================================================ */}
      {style === 'cassette' && (
        <div className="h-28 sm:h-32 flex flex-col items-center justify-center relative z-10 py-1">
          <div className="w-56 sm:w-64 bg-zinc-900 border-2 border-zinc-700 rounded-xl p-2.5 shadow-xl relative">
            {/* Top Tape Brand Stripe */}
            <div className="bg-gradient-to-r from-sv-red via-sv-warm-orange to-sv-gold h-2 rounded-sm mb-2" />

            {/* Center Cassette Spool Window */}
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-2 flex items-center justify-around relative">
              {/* Left Spool */}
              <div
                className={`w-8 h-8 rounded-full border-2 border-dashed border-zinc-500 flex items-center justify-center bg-zinc-900 ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '2s' }}
              >
                <div className="w-2 h-2 rounded-full bg-zinc-400" />
              </div>

              {/* Magnetic Tape Ribbon */}
              <div className="h-3 w-16 bg-amber-950/80 rounded-xs border-t border-b border-amber-800/50" />

              {/* Right Spool */}
              <div
                className={`w-8 h-8 rounded-full border-2 border-dashed border-zinc-500 flex items-center justify-center bg-zinc-900 ${
                  isPlaying ? 'animate-spin' : ''
                }`}
                style={{ animationDuration: '2s' }}
              >
                <div className="w-2 h-2 rounded-full bg-zinc-400" />
              </div>
            </div>

            {/* Analog Volume VU Level */}
            <div className="flex items-center gap-1.5 mt-2 px-1">
              <span className="text-[9px] font-mono text-zinc-400">VU</span>
              <div className="flex-1 bg-zinc-950 h-2 rounded-full overflow-hidden flex gap-0.5 p-0.5">
                {new Array(16).fill(0).map((_, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-xs transition-opacity duration-75 ${
                      i < 10
                        ? 'bg-emerald-500'
                        : i < 13
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{
                      opacity: isPlaying && (avgEnergy * 16 > i) ? 1 : 0.2
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
