import { MultiplayerRoom, MultiplayerPlayer, Track } from '../types';
import { musicCatalogue } from './musicCatalogue';

type RoomListener = (room: MultiplayerRoom) => void;

class MultiplayerEngineService {
  private activeRoom: MultiplayerRoom | null = null;
  private hostToken: string | null = null;
  private roomListeners: Set<RoomListener> = new Set();
  private pollInterval: number | null = null;
  private heartbeatInterval: number | null = null;

  public subscribeRoom(listener: RoomListener): () => void {
    this.roomListeners.add(listener);
    if (this.activeRoom) {
      listener(this.activeRoom);
    }
    return () => this.roomListeners.delete(listener);
  }

  private notify() {
    if (this.activeRoom) {
      this.roomListeners.forEach(listener => listener({ ...this.activeRoom! }));
    }
  }

  public getActiveRoom(): MultiplayerRoom | null {
    return this.activeRoom ? { ...this.activeRoom } : null;
  }

  public getHostToken(): string | null {
    return this.hostToken;
  }

  public isCurrentUserHost(userId: string): boolean {
    return Boolean(this.activeRoom && this.activeRoom.hostId === userId);
  }

  /**
   * Generate random 6-digit code from 000000 to 999999 preserving leading zeros
   */
  public generate6DigitCode(): string {
    const num = Math.floor(Math.random() * 1000000);
    return String(num).padStart(6, '0');
  }

  /**
   * Create a new room with a random 6-digit room code (000000 - 999999)
   * Capacity: 20 participants max. Zero bots.
   */
  public async createRoom(
    hostPlayerName: string,
    hostPlayerId: string,
    settings?: { language?: string; mixLanguages?: boolean }
  ): Promise<MultiplayerRoom> {
    this.leaveRoom();

    // Try server-side room creation
    try {
      const res = await fetch('/api/multiplayer/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: hostPlayerId,
          displayName: hostPlayerName,
          language: settings?.language || 'English',
          mixLanguages: Boolean(settings?.mixLanguages)
        })
      });

      if (res.ok) {
        const data = await res.json();
        this.hostToken = data.hostToken || null;
        this.activeRoom = {
          roomCode: data.roomCode,
          hostId: data.room.hostId,
          status: data.room.status,
          trackIds: [],
          currentRoundIndex: 0,
          players: data.room.players || [],
          roundStartedAt: 0,
          createdAt: Date.now()
        };
        this.startSyncPolling(data.roomCode, hostPlayerId);
        this.notify();
        return this.activeRoom;
      }
    } catch {
      // Offline fallback
    }

    // Local standalone creation (for tests and offline mode)
    const roomCode = this.generate6DigitCode();
    const availableTracks = musicCatalogue.getAvailableTracks();
    const shuffled = [...availableTracks].sort(() => 0.5 - Math.random());
    const trackIds = shuffled.slice(0, 3).map(t => t.id);

    const hostPlayer: MultiplayerPlayer = {
      id: hostPlayerId,
      displayName: hostPlayerName || 'HostPlayer',
      avatarSeed: 'host_' + hostPlayerId.slice(0, 4),
      isReady: true,
      isHost: true,
      score: 0,
      currentLevel: 1,
      hasGuessedThisRound: false
    };

    this.activeRoom = {
      roomCode,
      hostId: hostPlayerId,
      status: 'lobby',
      trackIds,
      currentRoundIndex: 0,
      players: [hostPlayer], // Zero bots as required
      roundStartedAt: 0,
      createdAt: Date.now()
    };

    this.notify();
    return this.activeRoom;
  }

  /**
   * Join an existing room with 6-digit code
   */
  public async joinRoom(roomCode: string, playerName: string, playerId: string): Promise<MultiplayerRoom> {
    const cleanCode = String(roomCode).trim().padStart(6, '0');

    // Try server-side room join
    try {
      const res = await fetch('/api/multiplayer/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomCode: cleanCode,
          playerId,
          displayName: playerName
        })
      });

      if (res.ok) {
        const data = await res.json();
        this.activeRoom = {
          roomCode: data.roomCode,
          hostId: data.room.hostId,
          status: data.room.status,
          trackIds: [],
          currentRoundIndex: data.room.currentRoundIndex || 0,
          players: data.room.players || [],
          roundStartedAt: 0,
          createdAt: Date.now()
        };
        this.startSyncPolling(data.roomCode, playerId);
        this.notify();
        return this.activeRoom;
      } else {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Failed to join room ${cleanCode}`);
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('capacity') || err.message.includes('revoked') || err.message.includes('exist'))) {
        throw err;
      }
    }

    // Local standalone join fallback (e.g. In unit tests)
    if (this.activeRoom && this.activeRoom.roomCode === cleanCode) {
      if (this.activeRoom.players.length >= 20) {
        throw new Error('This room has reached the maximum capacity of 20 participants.');
      }
      const existing = this.activeRoom.players.find(p => p.id === playerId);
      if (!existing) {
        this.activeRoom.players.push({
          id: playerId,
          displayName: playerName || 'Player',
          avatarSeed: 'p_' + playerId.slice(0, 4),
          isReady: false,
          isHost: false,
          score: 0,
          currentLevel: 1,
          hasGuessedThisRound: false
        });
      }
      this.notify();
      return this.activeRoom;
    }

    // Standalone test room creation with requested 6-digit code
    const availableTracks = musicCatalogue.getAvailableTracks();
    const shuffled = [...availableTracks].sort(() => 0.5 - Math.random());
    const trackIds = shuffled.slice(0, 3).map(t => t.id);

    const player: MultiplayerPlayer = {
      id: playerId,
      displayName: playerName || 'Player',
      avatarSeed: 'p_' + playerId.slice(0, 4),
      isReady: false,
      isHost: false,
      score: 0,
      currentLevel: 1,
      hasGuessedThisRound: false
    };

    this.activeRoom = {
      roomCode: cleanCode,
      hostId: 'host_external',
      status: 'lobby',
      trackIds,
      currentRoundIndex: 0,
      players: [player],
      roundStartedAt: 0,
      createdAt: Date.now()
    };

    this.notify();
    return this.activeRoom;
  }

  /**
   * Synchronized server polling and keepalive
   */
  private startSyncPolling(code: string, playerId: string) {
    this.stopSyncPolling();

    // Heartbeat every 15s
    this.heartbeatInterval = window.setInterval(() => {
      fetch(`/api/multiplayer/rooms/${code}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      }).catch(() => {});
    }, 15000);

    // State poll every 2.5s
    this.pollInterval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/multiplayer/rooms/${code}`);
        if (res.ok) {
          const data = await res.json();
          if (this.activeRoom && this.activeRoom.roomCode === code) {
            this.activeRoom.status = data.status;
            this.activeRoom.hostId = data.hostId;
            this.activeRoom.players = data.players || [];
            this.activeRoom.currentRoundIndex = data.currentRoundIndex || 0;
            this.activeRoom.roundStartedAt = data.roundStartedAt || 0;
            if (data.currentTrack) {
              this.activeRoom.currentTrack = data.currentTrack;
            }
            if (data.trackIds && data.trackIds.length > 0) {
              this.activeRoom.trackIds = data.trackIds;
            }
            this.notify();
          }
        } else if (res.status === 404 || res.status === 403) {
          this.leaveRoom();
        }
      } catch {
        // Network blip
      }
    }, 2500);
  }

  private stopSyncPolling() {
    if (this.pollInterval !== null) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.heartbeatInterval !== null) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Host Controls: Start Match
   */
  public async startMatch(hostId: string): Promise<void> {
    if (!this.activeRoom) return;

    if (this.hostToken) {
      try {
        await fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/host/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostToken: this.hostToken })
        });
      } catch {
        // Fallback
      }
    }

    this.activeRoom.status = 'playing';
    this.activeRoom.roundStartedAt = Date.now();
    this.activeRoom.currentRoundIndex = 0;
    this.notify();
  }

  /**
   * Host Controls: Kick Participant & Revoke Access
   */
  public async kickParticipant(targetPlayerId: string): Promise<boolean> {
    if (!this.activeRoom || !this.hostToken) return false;

    try {
      const res = await fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/host/kick`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostToken: this.hostToken, targetPlayerId })
      });
      if (res.ok) {
        this.activeRoom.players = this.activeRoom.players.filter(p => p.id !== targetPlayerId);
        this.notify();
        return true;
      }
    } catch {
      // Fallback
    }

    this.activeRoom.players = this.activeRoom.players.filter(p => p.id !== targetPlayerId);
    this.notify();
    return true;
  }

  /**
   * Host Controls: Close Room
   */
  public async closeRoom(): Promise<void> {
    if (!this.activeRoom) return;
    if (this.hostToken) {
      try {
        await fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/host/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostToken: this.hostToken })
        });
      } catch {
        // Fallback
      }
    }
    this.leaveRoom();
  }

  /**
   * Host Controls: Update Room Settings
   */
  public async updateSettings(language: string, mixLanguages: boolean): Promise<void> {
    if (!this.activeRoom || !this.hostToken) return;
    try {
      await fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/host/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostToken: this.hostToken, language, mixLanguages })
      });
    } catch {
      // Fallback
    }
  }

  public toggleReady(playerId: string) {
    if (!this.activeRoom) return;
    const player = this.activeRoom.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = !player.isReady;
      this.notify();
    }
  }

  public async skipLevel(playerId: string): Promise<number> {
    if (!this.activeRoom) return 1;
    const player = this.activeRoom.players.find(p => p.id === playerId);
    if (player && player.currentLevel < 4) {
      player.currentLevel = (player.currentLevel + 1) as 1 | 2 | 3 | 4;
      this.notify();
    }
    if (this.activeRoom.roomCode) {
      try {
        const res = await fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/skip-level`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.players && this.activeRoom) {
            this.activeRoom.players = data.players;
            this.notify();
          }
        }
      } catch {
        // Handled locally
      }
    }
    return player?.currentLevel || 1;
  }

  public submitPlayerGuess(playerId: string, isCorrect: boolean, points: number, guessTrackId?: string, guessTitle?: string) {
    if (!this.activeRoom) return;

    const player = this.activeRoom.players.find(p => p.id === playerId);
    const level = player?.currentLevel || 1;

    if (this.activeRoom.roomCode) {
      fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          guessTrackId: guessTrackId || (isCorrect ? 'correct' : 'wrong'),
          title: guessTitle,
          level
        })
      }).catch(() => {});
    }

    if (player && !player.hasGuessedThisRound) {
      player.hasGuessedThisRound = true;
      player.score += points;
      player.lastGuessCorrect = isCorrect;
      this.notify();
    }
  }

  public async nextRound(): Promise<void> {
    if (!this.activeRoom) return;

    if (this.hostToken && this.activeRoom.roomCode) {
      try {
        const res = await fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/host/next-round`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostToken: this.hostToken })
        });
        if (res.ok) {
          const data = await res.json();
          this.activeRoom.status = data.status;
          this.activeRoom.currentRoundIndex = data.currentRoundIndex;
          if (data.players) this.activeRoom.players = data.players;
          this.notify();
          return;
        }
      } catch {
        // Fallback below
      }
    }

    if (this.activeRoom.currentRoundIndex < this.activeRoom.trackIds.length - 1) {
      this.activeRoom.currentRoundIndex += 1;
      this.activeRoom.players.forEach(p => {
        p.hasGuessedThisRound = false;
        p.currentLevel = 1;
      });
    } else {
      this.activeRoom.status = 'completed';
    }
    this.notify();
  }

  public getCurrentTrack(): Track | undefined {
    if (!this.activeRoom) return undefined;
    if (this.activeRoom.currentTrack) {
      return this.activeRoom.currentTrack;
    }
    if (this.activeRoom.trackIds && this.activeRoom.trackIds.length > 0) {
      const currentId = this.activeRoom.trackIds[this.activeRoom.currentRoundIndex];
      return musicCatalogue.getTrackById(currentId);
    }
    return undefined;
  }

  public leaveRoom(): void {
    this.stopSyncPolling();
    this.activeRoom = null;
    this.hostToken = null;
    this.notify();
  }
}

export const multiplayerEngine = new MultiplayerEngineService();
