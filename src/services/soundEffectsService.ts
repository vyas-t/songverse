/**
 * SongVerse Immersive Synthesized Game SFX & Reaction Audio Service
 * Pure Web Audio API synthesized sound effects: zero asset downloads, zero latency, offline-ready.
 */

class SoundEffectsService {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.6;
  private listeners: Set<(muted: boolean) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const storedMute = localStorage.getItem('songverse_sfx_muted');
        this.isMuted = storedMute === 'true';
        const storedVol = localStorage.getItem('songverse_sfx_volume');
        if (storedVol) {
          this.volume = parseFloat(storedVol) || 0.6;
        }
      } catch {}
    }
  }

  public subscribe(fn: (muted: boolean) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn(this.isMuted));
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    try {
      localStorage.setItem('songverse_sfx_muted', String(this.isMuted));
    } catch {}
    this.notify();
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    try {
      localStorage.setItem('songverse_sfx_muted', String(this.isMuted));
    } catch {}
    this.notify();
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  private getAudioContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;

    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return null;
        this.audioCtx = new AudioCtxClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * 1. Correct Guess Victory Chime (Major Chord with pitch scaling for high streaks)
   */
  public playCorrectChime(streakCount: number = 0): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // Base frequency ascends slightly with higher streaks (e.g. C5 -> D5 -> E5)
      const baseFreq = 523.25 * Math.min(1.4, 1 + (streakCount * 0.05)); // C5
      const chordOffsets = [1, 1.25, 1.5, 2]; // Root, Major 3rd, 5th, Octave

      chordOffsets.forEach((ratio, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(baseFreq * ratio, now + idx * 0.06);

        gain.gain.setValueAtTime(0, now + idx * 0.06);
        gain.gain.linearRampToValueAtTime(0.2 * this.volume, now + idx * 0.06 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.06 + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.06);
        osc.stop(now + idx * 0.06 + 0.5);
      });
    } catch {}
  }

  /**
   * 2. Wrong Guess Soft Thud / Buzz (Muted, subtle, satisfying low frequency)
   */
  public playWrongBuzz(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(75, now + 0.22);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, now);

      gain.gain.setValueAtTime(0.25 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.26);
    } catch {}
  }

  /**
   * 3. Level Up / Progression Sweep Whoosh
   */
  public playLevelUpWhoosh(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(900, now + 0.18);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.18 * this.volume, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {}
  }

  /**
   * 4. Emoji Reaction Bubble Pop (Dynamic pitch drop sine wave depending on emoji)
   */
  public playEmojiPop(emoji: string = '🔥'): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      let startFreq = 750;
      let endFreq = 280;

      if (emoji.includes('🔥') || emoji.includes('⚡')) {
        startFreq = 880;
        endFreq = 340;
      } else if (emoji.includes('👑') || emoji.includes('🏆')) {
        startFreq = 950;
        endFreq = 480;
      } else if (emoji.includes('😱') || emoji.includes('💀')) {
        startFreq = 540;
        endFreq = 180;
      }

      osc.type = 'sine';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.12);

      gain.gain.setValueAtTime(0.28 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.14);
    } catch {}
  }

  /**
   * 5. Countdown Tick / Heartbeat (Plays for final 3 seconds of a round)
   */
  public playCountdownTick(isFinalSecond: boolean = false): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = isFinalSecond ? 880 : 587;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.18 * this.volume, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch {}
  }

  /**
   * 6. Game Over Victory Fanfare Cadence
   */
  public playGameVictoryFanfare(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      // C5, E5, G5, C6 triumphant fanfare
      const notes = [523.25, 659.25, 783.99, 1046.50];
      const durations = [0.12, 0.12, 0.14, 0.45];

      let elapsed = 0;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + elapsed);

        gain.gain.setValueAtTime(0, now + elapsed);
        gain.gain.linearRampToValueAtTime(0.24 * this.volume, now + elapsed + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + elapsed + durations[idx]);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + elapsed);
        osc.stop(now + elapsed + durations[idx] + 0.05);

        elapsed += durations[idx] * 0.85;
      });
    } catch {}
  }
}

export const soundEffectsService = new SoundEffectsService();
