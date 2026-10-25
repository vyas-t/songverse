import { Track, GameLevelNumber } from '../types';
import { GAME_LEVELS } from '../config/gameConfig';

export interface AudioProviderAdapter {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly isAuthorizedForTriviaGames: boolean;
  readonly requiresUserSubscription: boolean;
  readonly status: 'ready' | 'missing_credentials' | 'prohibited_by_policy' | 'unavailable';
  readonly policyNotice?: string;
  readonly supportedLicenceTypes: string[];
  canPlay(track: Track): boolean;
}

export const AUDIO_PROVIDER_ADAPTERS: AudioProviderAdapter[] = [
  {
    id: 'html5_streaming',
    name: 'HTML5 Streaming Audio Adapter',
    description: 'Direct streaming of pre-cleared audio clips (Apple iTunes 30s previews, Jamendo CC, Open Audio Project, and authorized recordings) with hardware-precise duration cutoffs.',
    isAuthorizedForTriviaGames: true,
    requiresUserSubscription: false,
    status: 'ready',
    supportedLicenceTypes: [
      'Apple iTunes Promotional Preview (30s)',
      'Creative Commons 0',
      'CC-BY-4.0',
      'Public Domain Dedication',
      'Direct Authorized Stream',
      'B2B Pre-Cleared (Feed.fm / 7digital)'
    ],
    canPlay: (track: Track) => track.playbackStatus === 'verified_audio' && Boolean(track.audioUrl || track.audioAssetUrl)
  },
  {
    id: 'webaudio_synthesis',
    name: 'Procedural Web Audio Synthesis Adapter',
    description: 'Pure browser-synthesized harmonic and melodic audio cues generated procedurally with zero external network or licensing dependencies.',
    isAuthorizedForTriviaGames: true,
    requiresUserSubscription: false,
    status: 'ready',
    supportedLicenceTypes: ['Creative Commons 0', 'Procedural Synthesis Engine'],
    canPlay: (track: Track) => track.playbackStatus === 'verified_audio' && Boolean(track.audioSynthesizerPreset)
  },
  {
    id: 'spotify_sdk',
    name: 'Spotify Web Playback SDK (Policy Gated)',
    description: 'Commercial Spotify audio integration.',
    isAuthorizedForTriviaGames: false,
    requiresUserSubscription: true,
    status: 'prohibited_by_policy',
    policyNotice: 'PROHIBITED BY POLICY: Spotify Developer Terms (Section II.3) strictly prohibit utilizing Spotify playback streams in interactive games, trivia contests, or quizzes without an explicit custom commercial synchronization agreement. End-user Spotify Premium accounts do not grant game sync rights.',
    supportedLicenceTypes: [],
    canPlay: () => false
  },
  {
    id: 'apple_musickit',
    name: 'Apple MusicKit JS (Credential & Terms Gated)',
    description: 'Full-length interactive streaming via Apple Music Web SDK.',
    isAuthorizedForTriviaGames: false,
    requiresUserSubscription: true,
    status: 'missing_credentials',
    policyNotice: 'UNAVAILABLE: Requires Apple Developer Program membership, MusicKit private key (.p8), developer tokens, and user Apple Music subscriptions. Consumer streaming rights do not grant trivia guessing clearance.',
    supportedLicenceTypes: [],
    canPlay: () => false
  }
];

type PlaybackStateListener = (isPlaying: boolean, currentSeconds: number, maxSeconds: number) => void;
type WaveformListener = (amplitudes: number[]) => void;

class AudioEngineService {
  private audioCtx: AudioContext | null = null;
  private currentSourceNodes: AudioNode[] = [];
  private isPlaying: boolean = false;
  private playbackTimer: number | null = null;
  private progressInterval: number | null = null;
  private startTime: number = 0;
  private maxDurationSeconds: number = 1.0;
  private currentLevel: GameLevelNumber = 1;
  private playbackListeners: Set<PlaybackStateListener> = new Set();
  private waveformListeners: Set<WaveformListener> = new Set();
  private simulatedAmplitudes: number[] = new Array(32).fill(0.15);

  private activeAudioElement: HTMLAudioElement | null = null;
  private audioAnalyzer: AnalyserNode | null = null;
  private playbackSessionId: number = 0;

  public getProviderAdapters(): AudioProviderAdapter[] {
    return [...AUDIO_PROVIDER_ADAPTERS];
  }

  public getAdapterForTrack(track: Track): AudioProviderAdapter | undefined {
    return AUDIO_PROVIDER_ADAPTERS.find(adapter => adapter.canPlay(track));
  }

  constructor() {
    // AudioContext will be initialized on first user interaction
  }

  private initAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public subscribePlayback(listener: PlaybackStateListener): () => void {
    this.playbackListeners.add(listener);
    return () => this.playbackListeners.delete(listener);
  }

  public subscribeWaveform(listener: WaveformListener): () => void {
    this.waveformListeners.add(listener);
    return () => this.waveformListeners.delete(listener);
  }

  private notifyPlayback(isPlaying: boolean, currentSeconds: number, maxSeconds: number) {
    this.playbackListeners.forEach(listener => listener(isPlaying, currentSeconds, maxSeconds));
  }

  private notifyWaveform(amps: number[]) {
    this.waveformListeners.forEach(listener => listener(amps));
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Completely and immediately halts all active music sources.
   * Cancels timeouts, progress intervals, unhooks event listeners,
   * silences Web Audio oscillators, and resets HTMLAudioElement.
   */
  public stop() {
    // Increment session ID to immediately invalidate all pending callbacks,
    // timers, intervals, and promise reactions from previous playback.
    this.playbackSessionId++;

    if (this.playbackTimer) {
      window.clearTimeout(this.playbackTimer);
      this.playbackTimer = null;
    }
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (this.activeAudioElement) {
      const audio = this.activeAudioElement;
      // CRITICAL: Strip all event listeners BEFORE pausing or changing src.
      // Setting src='' on an HTMLMediaElement with an onerror listener fires an error event,
      // which previously triggered unintentional procedural synth demo playback!
      audio.onerror = null;
      audio.onended = null;
      audio.oncanplay = null;
      audio.onplaying = null;
      audio.onpause = null;
      audio.ontimeupdate = null;
      audio.onstalled = null;
      audio.onsuspend = null;

      try {
        audio.pause();
        audio.volume = 0;
        audio.currentTime = 0;
        audio.removeAttribute('src');
        // Cleanly reset media element state
        audio.load();
      } catch {
        // Ignored
      }
      this.activeAudioElement = null;
    }

    this.currentSourceNodes.forEach(node => {
      try {
        if ('gain' in node && (node as GainNode).gain) {
          (node as GainNode).gain.cancelScheduledValues(0);
          (node as GainNode).gain.setValueAtTime(0, this.audioCtx ? this.audioCtx.currentTime : 0);
        }
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Node already stopped or disconnected
      }
    });
    this.currentSourceNodes = [];
    this.isPlaying = false;
    this.notifyPlayback(false, 0, this.maxDurationSeconds);
    this.notifyWaveform(new Array(32).fill(0.15));
  }

  /**
   * Play the authorized clip for the current unlocked level.
   * STRICT ENFORCEMENT: Duration is exactly GAME_LEVELS[level].durationSeconds (1s, 3s, 5s, 10s).
   * Cumulative start at clipStartSeconds (or 0s).
   * Only one music source can be active at any given moment.
   * Rejects if track is metadata_only.
   */
  public playClip(track: Track, level: GameLevelNumber): Promise<void> {
    return new Promise((resolve, reject) => {
      if (track.playbackStatus === 'metadata_only') {
        this.stop();
        const err = new Error('AUDIO_UNAVAILABLE: This track contains open metadata only. Audio rounds are restricted to authorized recordings.');
        reject(err);
        return;
      }

      // Stop previous audio and invalidate prior session tokens
      this.stop();

      const sessionId = ++this.playbackSessionId;
      this.currentLevel = level;
      this.maxDurationSeconds = GAME_LEVELS[level].durationSeconds;

      const audioSourceUrl = track.audioAssetUrl || track.audioUrl;
      let hasEndedOrFailed = false;

      const finishClip = () => {
        if (this.playbackSessionId !== sessionId || hasEndedOrFailed) return;
        hasEndedOrFailed = true;
        this.stop();
        resolve();
      };

      const handlePlaybackError = (err?: unknown) => {
        if (this.playbackSessionId !== sessionId || hasEndedOrFailed) return;
        hasEndedOrFailed = true;

        if (this.activeAudioElement) {
          this.activeAudioElement.onerror = null;
          this.activeAudioElement.onended = null;
        }

        // Only fall back to procedural synth if track is explicitly synthetic or in fallback mode
        if (track.audioSynthesizerPreset && track.availabilityStatus !== 'available') {
          this.fallbackToProceduralSynth(track, resolve, sessionId);
        } else {
          this.stop();
          const errorMsg = (err as Error)?.message || 'Audio preview could not be loaded. Please tap to retry.';
          reject(new Error(errorMsg));
        }
      };

      if (audioSourceUrl && typeof window !== 'undefined' && typeof window.Audio !== 'undefined') {
        try {
          const audio = new Audio();
          audio.crossOrigin = 'anonymous';
          audio.preload = 'auto';
          this.activeAudioElement = audio;

          audio.onerror = (e) => {
            if (this.playbackSessionId !== sessionId) return;
            handlePlaybackError(e);
          };

          audio.onended = () => {
            if (this.playbackSessionId !== sessionId) return;
            finishClip();
          };

          const startOffset = track.clipStartSeconds || 0;
          audio.currentTime = startOffset;
          audio.src = audioSourceUrl;
          this.isPlaying = true;

          const playPromise = audio.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              if (this.playbackSessionId !== sessionId) {
                try {
                  audio.pause();
                  audio.removeAttribute('src');
                } catch {
                  // Ignored
                }
                return;
              }

              const startWallClock = performance.now();
              this.progressInterval = window.setInterval(() => {
                if (this.playbackSessionId !== sessionId) {
                  if (this.progressInterval) {
                    window.clearInterval(this.progressInterval);
                    this.progressInterval = null;
                  }
                  return;
                }
                const elapsed = (performance.now() - startWallClock) / 1000;
                const currentSeconds = Math.min(elapsed, this.maxDurationSeconds);
                this.notifyPlayback(true, currentSeconds, this.maxDurationSeconds);

                if (this.isPlaying) {
                  const amps = this.generateWaveformBars(elapsed, track.audioSynthesizerPreset || 'synthpop');
                  this.notifyWaveform(amps);
                }
              }, 50);

              // Hard stop precisely at maxDurationSeconds (1s, 3s, 5s, 10s)
              this.playbackTimer = window.setTimeout(() => {
                finishClip();
              }, this.maxDurationSeconds * 1000);
            }).catch((err: any) => {
              if (this.playbackSessionId !== sessionId || err?.name === 'AbortError') {
                return;
              }
              handlePlaybackError(err);
            });
          }

          return;
        } catch (err) {
          if (this.playbackSessionId !== sessionId) return;
          handlePlaybackError(err);
          return;
        }
      }

      // Procedural authorized audio synthesis if track has preset
      if (track.audioSynthesizerPreset) {
        this.fallbackToProceduralSynth(track, resolve, sessionId);
      } else {
        this.stop();
        reject(new Error('AUDIO_UNAVAILABLE: No audio stream found for this track.'));
      }
    });
  }

  private fallbackToProceduralSynth(track: Track, resolve: () => void, sessionId?: number) {
    const token = sessionId ?? ++this.playbackSessionId;
    if (this.playbackSessionId !== token) return;

    if (this.activeAudioElement) {
      try {
        this.activeAudioElement.pause();
        this.activeAudioElement.removeAttribute('src');
      } catch {
        // Ignored
      }
      this.activeAudioElement = null;
    }

    const ctx = this.initAudioContext();
    this.isPlaying = true;
    this.startTime = ctx.currentTime;

    // Synthesize authorized musical clip according to track preset
    this.synthesizeTrackAudio(ctx, track, this.maxDurationSeconds);

    // Start progress tracking
    const startWallClock = performance.now();
    this.progressInterval = window.setInterval(() => {
      if (this.playbackSessionId !== token) {
        if (this.progressInterval) {
          window.clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
        return;
      }
      const elapsed = (performance.now() - startWallClock) / 1000;
      const currentSeconds = Math.min(elapsed, this.maxDurationSeconds);
      this.notifyPlayback(true, currentSeconds, this.maxDurationSeconds);

      // Generate dynamic waveform amplitudes synchronized with beat
      if (this.isPlaying) {
        const amps = this.generateWaveformBars(elapsed, track.audioSynthesizerPreset || 'synthpop');
        this.notifyWaveform(amps);
      }
    }, 50);

    // Stop exactly at maxDurationSeconds
    this.playbackTimer = window.setTimeout(() => {
      if (this.playbackSessionId !== token) return;
      this.stop();
      resolve();
    }, this.maxDurationSeconds * 1000);
  }


  /**
   * High-fidelity Web Audio Synthesizer:
   * Plays unique, melodically and harmonically rich musical cues corresponding to the track's preset.
   */
  private synthesizeTrackAudio(ctx: AudioContext, track: Track, duration: number) {
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.35, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.35, ctx.currentTime + Math.max(0, duration - 0.15));
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    masterGain.connect(ctx.destination);
    this.currentSourceNodes.push(masterGain);

    const now = ctx.currentTime;
    const preset = track.audioSynthesizerPreset;

    // Define harmonic progressions based on track preset
    let chordProgression: number[][]; // Frequencies in Hz
    let bassNotes: number[];
    let tempoBpm: number;

    switch (preset) {
      case 'synthpop':
        chordProgression = [
          [220, 261.63, 329.63, 440], // Am7
          [174.61, 220, 261.63, 349.23], // Fmaj7
          [130.81, 196, 261.63, 329.63], // Cmaj7
          [196, 246.94, 293.66, 392]  // G
        ];
        bassNotes = [55, 43.65, 32.7, 49];
        tempoBpm = 124;
        break;
      case 'city-pop':
        chordProgression = [
          [246.94, 311.13, 369.99, 440], // Bmaj9
          [220, 277.18, 329.63, 415.30], // A#m7
          [196, 246.94, 293.66, 392],    // G#m7
          [146.83, 220, 261.63, 329.63]  // F#11
        ];
        bassNotes = [61.74, 58.27, 51.91, 46.25];
        tempoBpm = 118;
        break;
      case 'latin-guitar':
        chordProgression = [
          [164.81, 246.94, 329.63, 392], // Em
          [146.83, 220, 293.66, 369.99], // D
          [130.81, 196, 261.63, 329.63], // C
          [123.47, 185, 246.94, 311.13]  // B7
        ];
        bassNotes = [41.2, 36.71, 32.7, 30.87];
        tempoBpm = 110;
        break;
      case 'chanson-strings':
        chordProgression = [
          [220, 261.63, 329.63], // Am
          [146.83, 220, 261.63], // Dm
          [164.81, 246.94, 329.63], // E7
          [220, 261.63, 329.63]  // Am
        ];
        bassNotes = [55, 36.71, 41.2, 55];
        tempoBpm = 88;
        break;
      case 'disco-groove':
        chordProgression = [
          [293.66, 349.23, 440, 523.25], // Dm7
          [196, 246.94, 293.66, 392],    // G7
          [261.63, 329.63, 392, 493.88], // Cmaj7
          [220, 261.63, 329.63, 440]     // Am7
        ];
        bassNotes = [36.71, 49, 32.7, 55];
        tempoBpm = 120;
        break;
      case 'lofi-piano':
        chordProgression = [
          [174.61, 220, 261.63, 329.63], // Fmaj7
          [164.81, 196, 246.94, 293.66], // Em7
          [146.83, 174.61, 220, 261.63], // Dm7
          [130.81, 164.81, 196, 246.94]  // Cmaj7
        ];
        bassNotes = [43.65, 41.2, 36.71, 32.7];
        tempoBpm = 78;
        break;
      default:
        chordProgression = [
          [220, 277.18, 329.63], // A
          [164.81, 220, 261.63], // F#m
          [146.83, 185, 220],    // D
          [164.81, 207.65, 246.94] // E
        ];
        bassNotes = [55, 46.25, 36.71, 41.2];
        tempoBpm = 112;
        break;
    }

    const beatDuration = 60 / tempoBpm;
    const barDuration = beatDuration * 4;

    // Schedule chords & arpeggios
    chordProgression.forEach((chord, chordIdx) => {
      const chordStart = now + chordIdx * barDuration;
      if (chordStart >= now + duration) return;

      // Polyphonic pad voices
      chord.forEach((freq, noteIdx) => {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();

        osc.type = (preset === 'synthpop' || preset === 'electronic-bass') ? 'sawtooth' : (preset === 'city-pop' ? 'triangle' : 'sine');
        osc.frequency.setValueAtTime(freq, chordStart);

        // Filter for warmth
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1600, chordStart);
        filter.Q.setValueAtTime(2.0, chordStart);

        noteGain.gain.setValueAtTime(0.001, chordStart);
        noteGain.gain.linearRampToValueAtTime(0.06 - noteIdx * 0.01, chordStart + 0.15);
        noteGain.gain.linearRampToValueAtTime(0.04, chordStart + barDuration - 0.1);
        noteGain.gain.exponentialRampToValueAtTime(0.001, Math.min(now + duration, chordStart + barDuration));

        osc.connect(filter);
        filter.connect(noteGain);
        noteGain.connect(masterGain);

        osc.start(chordStart);
        osc.stop(Math.min(now + duration, chordStart + barDuration));
        this.currentSourceNodes.push(osc, filter, noteGain);
      });

      // Bass note
      const bassFreq = bassNotes[chordIdx % bassNotes.length];
      const bassOsc = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(bassFreq, chordStart);

      bassGain.gain.setValueAtTime(0.001, chordStart);
      bassGain.gain.linearRampToValueAtTime(0.18, chordStart + 0.05);
      bassGain.gain.exponentialRampToValueAtTime(0.001, Math.min(now + duration, chordStart + barDuration));

      bassOsc.connect(bassGain);
      bassGain.connect(masterGain);

      bassOsc.start(chordStart);
      bassOsc.stop(Math.min(now + duration, chordStart + barDuration));
      this.currentSourceNodes.push(bassOsc, bassGain);

      // Drum kick on every beat
      for (let b = 0; b < 4; b++) {
        const beatTime = chordStart + b * beatDuration;
        if (beatTime < now + duration) {
          this.triggerKick(ctx, masterGain, beatTime);
          if (b % 2 === 1) {
            this.triggerSnare(ctx, masterGain, beatTime);
          }
        }
      }
    });
  }

  private triggerKick(ctx: AudioContext, dest: AudioNode, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(38, time + 0.08);

    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.12);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.13);
    this.currentSourceNodes.push(osc, gain);
  }

  private triggerSnare(ctx: AudioContext, dest: AudioNode, time: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(180, time);

    gain.gain.setValueAtTime(0.12, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.09);

    osc.connect(gain);
    gain.connect(dest);

    osc.start(time);
    osc.stop(time + 0.1);
    this.currentSourceNodes.push(osc, gain);
  }

  /**
   * Sound effect for a correct guess: high pleasant chime
   */
  public playCorrectSound() {
    const ctx = this.initAudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const time = ctx.currentTime + idx * 0.08;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.15, time + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(time);
      osc.stop(time + 0.42);
    });
  }

  /**
   * Sound effect for an incorrect guess: gentle descending buzz
   */
  public playIncorrectSound() {
    const ctx = this.initAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const time = ctx.currentTime;

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, time);
    osc.frequency.linearRampToValueAtTime(110, time + 0.28);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(500, time);

    gain.gain.setValueAtTime(0.14, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.32);
  }

  /**
   * Sound effect for unlocking next level
   */
  public playLevelUnlockSound() {
    const ctx = this.initAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const time = ctx.currentTime;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(349.23, time);
    osc.frequency.exponentialRampToValueAtTime(587.33, time + 0.16);

    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(time);
    osc.stop(time + 0.26);
  }

  private generateWaveformBars(elapsedSecs: number, preset: string): number[] {
    const bars: number[] = [];
    const count = 32;
    for (let i = 0; i < count; i++) {
      const freqFactor = (i + 1) * 0.4;
      const wave = Math.sin(elapsedSecs * 6 + freqFactor) * 0.35 + 0.55;
      const noise = (Math.random() - 0.5) * 0.15;
      const height = Math.max(0.15, Math.min(1.0, wave + noise));
      bars.push(height);
    }
    return bars;
  }
}

export const audioEngine = new AudioEngineService();
