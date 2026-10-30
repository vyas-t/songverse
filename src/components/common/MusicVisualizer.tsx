import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Radio, Waves, Activity, Sparkles } from 'lucide-react';

interface MusicVisualizerProps {
  waveformBars: number[];
  isPlaying: boolean;
  isLoading?: boolean;
  artworkGradient?: string;
  className?: string;
}

export const MusicVisualizer: React.FC<MusicVisualizerProps> = ({
  waveformBars,
  isPlaying,
  isLoading = false,
  className = '',
}) => {
  // Peak hold array with gravity decay for authentic equalizer physics
  const peaksRef = useRef<number[]>(new Array(32).fill(0.18));
  const [, setTick] = useState(0);

  // Update peaks on each waveform change
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
      // Gravity decay rate
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

  // Fixed floating audio particle coordinates
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

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-sv-burgundy/80 bg-slate-900/95 dark:bg-sv-midnight/90 px-3 sm:px-5 pt-7 pb-3 shadow-inner select-none transition-colors duration-300 ${className}`}
      aria-label="Music Audio Reactive Visualizer"
    >
      {/* Dynamic Audio Aura Glow - expands & pulses with beat intensity */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: isPlaying
            ? `radial-gradient(ellipse 70% 60% at 50% 65%, rgba(232, 93, 4, ${0.18 + avgEnergy * 0.32}), rgba(208, 0, 0, ${0.1 + avgEnergy * 0.2}) 45%, transparent 75%)`
            : 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(208, 0, 0, 0.06), transparent 70%)',
        }}
      />

      {/* Subtle Horizontal Frequency Grid Lines */}
      <div className="absolute inset-x-0 top-1/4 border-t border-white/[0.04] dark:border-white/[0.03] pointer-events-none" />
      <div className="absolute inset-x-0 top-2/4 border-t border-white/[0.05] dark:border-white/[0.04] pointer-events-none" />
      <div className="absolute inset-x-0 top-3/4 border-t border-white/[0.03] dark:border-white/[0.02] pointer-events-none" />

      {/* Floating Audio Particles / Embers */}
      {isPlaying && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p, i) => (
            <div
              key={i}
              className={`absolute bottom-6 rounded-full bg-gradient-to-t from-sv-gold to-sv-red shadow-[0_0_8px_rgba(255,186,8,0.8)] animate-particle-drift ${p.size}`}
              style={{
                left: p.left,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>
      )}

      {/* Top Header Indicators: Spectrum Info & Mode */}
      <div className="absolute top-2.5 inset-x-3 sm:inset-x-5 flex items-center justify-between pointer-events-none z-10">
        <div className="flex items-center gap-1.5 text-[10px] font-mono tracking-wider font-semibold text-slate-400/80 dark:text-slate-400/70">
          <Waves className="w-3 h-3 text-sv-red-orange animate-pulse" />
          <span className="hidden xs:inline">SPECTRUM EQUALIZER</span>
          <span className="xs:hidden">SPECTRUM</span>
          <span className="opacity-40">·</span>
          <span>32 BANDS</span>
        </div>

        {isPlaying ? (
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-sv-red dark:text-sv-gold bg-white/90 dark:bg-sv-midnight/90 px-2 py-0.5 rounded-lg border border-sv-red/20 shadow-xs">
            <Radio className="w-3 h-3 text-sv-red animate-pulse" />
            <span>LIVE AUDIO</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[10px] font-mono font-semibold text-slate-400 bg-slate-800/60 dark:bg-sv-midnight/60 px-2 py-0.5 rounded-lg border border-slate-700/40 dark:border-sv-burgundy/40">
            <Activity className="w-3 h-3 text-slate-400" />
            <span>30s CLIP READY</span>
          </div>
        )}
      </div>

      {/* Loading Laser Scan Beam */}
      {isLoading && (
        <div className="absolute inset-x-0 inset-y-0 pointer-events-none overflow-hidden z-20 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <div className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-sv-gold/40 to-transparent animate-scan-beam" />
          <div className="relative flex items-center gap-2 bg-slate-900/90 border border-sv-gold/30 px-3 py-1.5 rounded-full text-xs font-mono font-semibold text-sv-gold shadow-lg">
            <Sparkles className="w-3.5 h-3.5 animate-spin" />
            <span>SYNCING AUDIO STREAM...</span>
          </div>
        </div>
      )}

      {/* Primary 32-Band Visualizer Stage */}
      <div className="h-28 sm:h-32 flex items-end justify-center gap-1 sm:gap-1.5 relative z-10 pt-2 pb-1">
        {waveformBars.map((amp, idx) => {
          // Calculate dynamic height
          let barHeight = Math.max(14, Math.round(amp * 100));
          const peak = peaksRef.current[idx] ?? amp;
          const peakHeight = Math.max(barHeight + 4, Math.min(100, Math.round(peak * 100)));

          // Idle subtle sine curve if paused/idle
          if (!isPlaying && !isLoading) {
            const idleSine = Math.sin((idx / 32) * Math.PI * 2) * 8 + 22;
            barHeight = Math.round(idleSine);
          }

          return (
            <div
              key={idx}
              className="flex-1 flex flex-col items-center justify-end h-full relative"
            >
              {/* Floating Peak Hold Dot */}
              {isPlaying && (
                <div
                  style={{ bottom: `${peakHeight}%` }}
                  className="absolute w-1.5 sm:w-2 h-1 rounded-full bg-sv-gold shadow-[0_0_6px_rgba(255,186,8,0.9)] transition-all duration-100 ease-out pointer-events-none"
                />
              )}

              {/* Main Vertical Frequency Bar */}
              <div
                style={{ height: `${barHeight}%` }}
                className={`w-full rounded-t-full rounded-b-sm transition-all duration-75 ${
                  isPlaying
                    ? 'bg-gradient-to-t from-sv-red via-sv-red-orange to-sv-gold shadow-[0_0_10px_rgba(232,93,4,0.4)]'
                    : 'bg-slate-700/60 dark:bg-sv-burgundy/70 animate-idle-harmonic'
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* Glass Floor Horizon Reflection */}
      <div
        className="h-3.5 sm:h-4 flex items-start justify-center gap-1 sm:gap-1.5 opacity-25 dark:opacity-30 blur-[1px] scale-y-[-1] pointer-events-none overflow-hidden"
        aria-hidden="true"
      >
        {waveformBars.map((amp, idx) => {
          const reflectHeight = Math.max(10, Math.round((isPlaying ? amp : 0.2) * 45));
          return (
            <div key={`refl-${idx}`} className="flex-1 flex flex-col items-center justify-start h-full">
              <div
                style={{ height: `${reflectHeight}%` }}
                className={`w-full rounded-b-full ${
                  isPlaying
                    ? 'bg-gradient-to-b from-sv-red via-sv-red-orange to-transparent'
                    : 'bg-slate-600/40 dark:bg-sv-burgundy/40'
                }`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};
