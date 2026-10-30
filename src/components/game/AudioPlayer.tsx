import React, { useEffect, useState } from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Sparkles, Disc3, Radio } from 'lucide-react';
import { Track, GameLevelNumber } from '../../types';
import { audioEngine } from '../../services/audioEngine';
import { GAME_LEVELS } from '../../config/gameConfig';

interface AudioPlayerProps {
  track: Track;
  level: GameLevelNumber;
  roundStatus: 'playing' | 'won' | 'lost';
  onClipFinished?: () => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  track,
  level,
  roundStatus,
  onClipFinished
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(new Array(32).fill(0.18));
  const [isMuted, setIsMuted] = useState(false);

  const levelConfig = GAME_LEVELS[level];
  const maxDuration = levelConfig.durationSeconds;

  // Reset errors when level or track changes
  useEffect(() => {
    setAudioError(null);
    setIsLoading(false);
  }, [track.id, level]);

  useEffect(() => {
    const unsubPlayback = audioEngine.subscribePlayback((playing, curTime) => {
      setIsPlaying(playing);
      setCurrentTime(curTime);
      if (playing) {
        setIsLoading(false);
      }
      if (!playing && curTime >= maxDuration - 0.05) {
        onClipFinished?.();
      }
    });

    const unsubWave = audioEngine.subscribeWaveform((amps) => {
      setWaveformBars(amps);
    });

    return () => {
      audioEngine.stop();
      unsubPlayback();
      unsubWave();
    };
  }, [level, maxDuration, onClipFinished]);

  const handlePlayClip = async () => {
    if (isPlaying) {
      audioEngine.stop();
    } else {
      setAudioError(null);
      setIsLoading(true);
      try {
        await audioEngine.playClip(track, level);
      } catch (err: unknown) {
        setAudioError((err as Error).message || 'Audio playback error. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleToggleMute = () => {
    setIsMuted(prev => !prev);
  };

  const progressPercent = Math.min(100, (currentTime / maxDuration) * 100);

  return (
    <div className="bg-white/95 dark:bg-sv-burgundy-deep/95 border border-slate-200/90 dark:border-sv-burgundy rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden transition-all duration-200">
      
      {/* Background glow based on track gradient */}
      <div
        className={`absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-bl ${track.artworkGradient || 'from-sv-red to-sv-orange'} opacity-[0.07] dark:opacity-20 blur-3xl pointer-events-none rounded-full`}
      />

      {/* Header row: Clip duration & level badge + mute */}
      <div className="flex items-center justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-black uppercase tracking-wider text-sv-red dark:text-sv-gold bg-sv-red/10 dark:bg-sv-midnight/90 border border-sv-red/25 dark:border-sv-burgundy px-3 py-1 rounded-xl tabular-nums shadow-xs">
            Level {level} · {levelConfig.label}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-mono font-medium">
            Excerpt: 0.0s – {maxDuration.toFixed(1)}s
          </span>
        </div>

        <button
          onClick={handleToggleMute}
          className="text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 bg-slate-100/70 hover:bg-slate-200/70 dark:bg-sv-midnight/70 p-2 rounded-xl border border-slate-200/60 dark:border-sv-burgundy/80 transition-all cursor-pointer focus:outline-none"
          title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          aria-label={isMuted ? 'Unmute Audio' : 'Mute Audio'}
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Metadata-Only Warning (if applicable) */}
      {track.playbackStatus === 'metadata_only' ? (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-2xl p-4 mb-6 flex items-start gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
            <VolumeX className="w-4 h-4" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-bold text-amber-900 dark:text-amber-200">
              Audio Excerpt Unavailable (Metadata-Only Entry)
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-relaxed">
              This track is indexed for metadata discovery only. Clear trivia gameplay uses authorized recordings only.
            </p>
          </div>
        </div>
      ) : (
        /* Dynamic Equalizer Visualizer Display */
        <div className="h-32 sm:h-36 bg-slate-50/90 dark:bg-sv-midnight/80 border border-slate-200/70 dark:border-sv-burgundy rounded-2xl px-4 py-3 flex items-center justify-center gap-1.5 sm:gap-2 mb-5 shadow-inner relative overflow-hidden">
          {waveformBars.map((amp, idx) => {
            const barHeight = Math.max(14, Math.round(amp * 100));
            const isActive = isPlaying;
            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center justify-center h-full"
              >
                <div
                  style={{ height: `${barHeight}%` }}
                  className={`w-full rounded-full transition-all duration-75 ${
                    isActive
                      ? 'bg-gradient-to-t from-sv-red via-sv-red-orange to-sv-gold shadow-xs'
                      : 'bg-slate-200 dark:bg-sv-burgundy/80'
                  }`}
                />
              </div>
            );
          })}

          {/* Subdued vinyl overlay effect while playing */}
          {isPlaying && (
            <div className="absolute right-4 bottom-3 flex items-center gap-1.5 text-[10px] font-mono font-bold text-sv-red dark:text-sv-gold bg-white/90 dark:bg-sv-midnight/90 px-2 py-0.5 rounded-lg border border-sv-red/20 shadow-xs">
              <Radio className="w-3 h-3 text-sv-red animate-pulse" />
              <span>LIVE AUDIO</span>
            </div>
          )}
        </div>
      )}

      {/* Playback Progress Scrubber Track */}
      {track.playbackStatus === 'verified_audio' && (
        <div className="space-y-1.5 mb-6 relative z-10">
          <div className="w-full bg-slate-100 dark:bg-sv-midnight h-2.5 rounded-full overflow-hidden border border-slate-200/60 dark:border-sv-burgundy/60 shadow-inner">
            <div
              className="bg-gradient-to-r from-sv-red to-sv-amber h-full rounded-full transition-all duration-75 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 dark:text-slate-400 font-semibold px-0.5">
            <span>{currentTime.toFixed(1)}s</span>
            <span>{maxDuration.toFixed(1)}s window limit</span>
          </div>
        </div>
      )}

      {/* Audio Error Banner */}
      {audioError && (
        <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl p-3.5 mb-5 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200 relative z-10">
          <div className="flex items-center gap-2">
            <VolumeX className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{audioError}</span>
          </div>
          <button
            onClick={handlePlayClip}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shrink-0 cursor-pointer transition-colors shadow-xs"
          >
            Retry Clip
          </button>
        </div>
      )}

      {/* Action Controls Cluster */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <div className="text-xs text-slate-500 dark:text-slate-300 max-w-sm text-center sm:text-left">
          {track.playbackStatus === 'metadata_only' ? (
            <span className="text-slate-500 dark:text-slate-400">
              Audio excerpt unavailable. You may search for this track in Level 4 or skip this round.
            </span>
          ) : isLoading ? (
            <span className="text-sv-red dark:text-sv-gold font-bold flex items-center justify-center sm:justify-start gap-1.5 animate-pulse">
              <RotateCcw className="w-4 h-4 animate-spin" />
              Loading verified audio excerpt...
            </span>
          ) : isPlaying ? (
            <span className="text-sv-warm-orange dark:text-sv-gold font-bold flex items-center justify-center sm:justify-start gap-1.5 animate-pulse">
              <Sparkles className="w-4 h-4" />
              Listening to {maxDuration.toFixed(1)}s clip...
            </span>
          ) : (
            <span>
              Press play to listen. You can replay the currently unlocked {maxDuration.toFixed(1)}s window as many times as you need.
            </span>
          )}
        </div>

        <button
          onClick={handlePlayClip}
          disabled={roundStatus !== 'playing' || track.playbackStatus === 'metadata_only' || isLoading}
          className={`px-7 py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer ${
            track.playbackStatus === 'metadata_only'
              ? 'bg-slate-200 dark:bg-sv-burgundy text-slate-400 dark:text-slate-500 cursor-not-allowed shadow-none'
              : isPlaying
              ? 'bg-gradient-to-r from-sv-warm-orange to-sv-amber text-slate-900 shadow-sv-warm-orange/30 active:scale-95'
              : 'bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber text-white shadow-sv-red/30 hover:shadow-lg hover:shadow-sv-red/40 active:scale-95'
          } ${roundStatus !== 'playing' ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          {track.playbackStatus === 'metadata_only' ? (
            <>
              <VolumeX className="w-4 h-4" />
              <span>Audio Unavailable</span>
            </>
          ) : isLoading ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Loading Clip...</span>
            </>
          ) : isPlaying ? (
            <>
              <RotateCcw className="w-4 h-4 animate-spin" />
              <span>Stop Audio</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>{currentTime > 0 ? 'Replay Clip' : `Play ${maxDuration.toFixed(1)}s Clip`}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
};
