import { MultiplayerRoom, MultiplayerPlayer, Track, PlayerGuessEvent } from '../types';
import { musicCatalogue } from './musicCatalogue';

type RoomListener = (room: MultiplayerRoom) => void;

export const MULTIPLAYER_ROUND_DURATION_MS = 30000; // Strict 30-second round limit
export const MULTIPLAYER_ROUND_RESULTS_DURATION_MS = 5000; // 5-second results transition window
export const MULTIPLAYER_MIN_ROUNDS = 3;
export const MULTIPLAYER_MAX_ROUNDS = 10;

const PEER_PREFIX = 'songverse-room-';
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' }
];

async function getPeerClass(): Promise<any> {
  if (typeof window === 'undefined' || typeof window.RTCPeerConnection === 'undefined') {
    return null;
  }
  if ((window as any).Peer) {
    return (window as any).Peer;
  }

  return new Promise((resolve) => {
    if (typeof document === 'undefined') {
      return resolve(null);
    }
    const existing = document.querySelector('script[data-peerjs]');
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).Peer || null));
      existing.addEventListener('error', () => resolve(null));
      return;
    }

    const script = document.createElement('script');
    script.setAttribute('data-peerjs', 'true');
    script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    script.async = true;

    const timeout = setTimeout(() => {
      resolve((window as any).Peer || null);
    }, 4000);

    script.onload = () => {
      clearTimeout(timeout);
      resolve((window as any).Peer || null);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      const fallback = document.createElement('script');
      fallback.src = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js';
      fallback.onload = () => resolve((window as any).Peer || null);
      fallback.onerror = () => resolve(null);
      document.head.appendChild(fallback);
    };

    document.head.appendChild(script);
  });
}

class MultiplayerEngineService {
  private activeRoom: MultiplayerRoom | null = null;
  private hostToken: string | null = null;
  private currentUserId: string | null = null;
  private roomListeners: Set<RoomListener> = new Set();
  private pollInterval: any = null;
  private heartbeatInterval: any = null;
  private roundTimerInterval: any = null;
  private isEndingRound: boolean = false;
  private broadcastChannel: BroadcastChannel | null = null;

  // Cross-device WebRTC PeerJS fields
  private hostPeer: any = null;
  private guestPeer: any = null;
  private hostConnection: any = null;
  private guestConnections: Map<string, any> = new Map();

  constructor() {
    this.initBroadcastSync();
  }

  private isWebRTCSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.RTCPeerConnection !== 'undefined'
    );
  }

  private initBroadcastSync() {
    if (typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('songverse_multiplayer_bus');
        this.broadcastChannel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
      } catch {
        // Fallback to storage event
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key && e.key.startsWith('songverse_room_state_') && e.newValue) {
          try {
            const room: MultiplayerRoom = JSON.parse(e.newValue);
            if (this.activeRoom && this.activeRoom.roomCode === room.roomCode) {
              this.activeRoom = room;
              this.notify();
            }
          } catch {}
        }
      });
    }
  }

  private broadcastMessage(data: any) {
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(data);
      }
    } catch {}
  }

  private handleBroadcastMessage(data: any) {
    if (!data) return;
    if (data.type === 'ROOM_CLOSED' && this.activeRoom?.roomCode === data.roomCode) {
      this.leaveRoom();
      return;
    }
    if (data.room && this.activeRoom && this.activeRoom.roomCode === data.room.roomCode) {
      this.activeRoom = data.room;
      this.notify();
    }
  }

  private getLocalRoomState(code: string): MultiplayerRoom | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(`songverse_room_state_${code}`);
        if (raw) return JSON.parse(raw);
      }
    } catch {}
    return null;
  }

  private saveLocalRoomState(room: MultiplayerRoom) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(`songverse_room_state_${room.roomCode}`, JSON.stringify(room));
      }
    } catch {}
  }

  private removeLocalRoomState(code: string) {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(`songverse_room_state_${code}`);
      }
    } catch {}
  }

  public subscribeRoom(listener: RoomListener): () => void {
    this.roomListeners.add(listener);
    if (this.activeRoom) {
      listener({ ...this.activeRoom });
    }
    return () => this.roomListeners.delete(listener);
  }

  private notify() {
    if (this.activeRoom) {
      const snapshot: MultiplayerRoom = JSON.parse(JSON.stringify(this.activeRoom));
      this.roomListeners.forEach(listener => {
        try {
          listener(snapshot);
        } catch (err) {
          console.warn('[MultiplayerEngine] Listener error:', err);
        }
      });
    }
  }

  public getActiveRoom(): MultiplayerRoom | null {
    return this.activeRoom ? JSON.parse(JSON.stringify(this.activeRoom)) : null;
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
   * Initialize Host PeerJS WebRTC instance
   */
  private async initHostPeer(roomCode: string): Promise<boolean> {
    if (!this.isWebRTCSupported()) return false;
    const PeerClass = await getPeerClass();
    if (!PeerClass) return false;

    return new Promise((resolve) => {
      try {
        const peerId = `${PEER_PREFIX}${roomCode}`;
        this.cleanupHostPeer();

        this.hostPeer = new PeerClass(peerId, {
          config: { iceServers: ICE_SERVERS }
        });

        const openTimeout = setTimeout(() => {
          resolve(false);
        }, 6000);

        this.hostPeer.on('open', (id: string) => {
          clearTimeout(openTimeout);
          console.log(`[MultiplayerEngine] Host WebRTC peer opened: ${id}`);
          resolve(true);
        });

        this.hostPeer.on('connection', (conn: any) => {
          this.handleIncomingGuestConnection(conn);
        });

        this.hostPeer.on('error', (err: any) => {
          console.warn('[MultiplayerEngine] Host peer error:', err);
          clearTimeout(openTimeout);
          resolve(false);
        });
      } catch (err) {
        console.warn('[MultiplayerEngine] Failed to initialize host peer:', err);
        resolve(false);
      }
    });
  }

  /**
   * Handle incoming guest connection on host
   */
  private handleIncomingGuestConnection(conn: any) {
    conn.on('open', () => {
      console.log(`[MultiplayerEngine] Guest connected via DataChannel: ${conn.peer}`);
      if (this.activeRoom) {
        conn.send({ type: 'ROOM_STATE', room: this.activeRoom });
      }
    });

    conn.on('data', (raw: any) => {
      this.handleHostDataReceived(raw, conn);
    });

    conn.on('close', () => {
      console.log(`[MultiplayerEngine] Guest disconnected: ${conn.peer}`);
      // Find guest in connections map
      for (const [pId, c] of this.guestConnections.entries()) {
        if (c === conn) {
          this.guestConnections.delete(pId);
          if (this.activeRoom) {
            const player = this.activeRoom.players.find(p => p.id === pId);
            if (player) {
              player.status = 'disconnected';
              this.broadcastRoomToPeers();
              this.notify();
            }
          }
          break;
        }
      }
    });

    conn.on('error', (err: any) => {
      console.warn('[MultiplayerEngine] Guest connection error:', err);
    });
  }

  /**
   * Host processes data received from guests
   */
  private handleHostDataReceived(data: any, conn: any) {
    if (!data || !this.activeRoom) return;

    switch (data.type) {
      case 'JOIN_REQUEST': {
        const guestPlayer = data.player;
        if (!guestPlayer || !guestPlayer.id) return;

        if (this.activeRoom.players.length >= 20) {
          conn.send({ type: 'ERROR', message: 'Room has reached the maximum capacity of 20 participants.' });
          conn.close();
          return;
        }

        this.guestConnections.set(guestPlayer.id, conn);

        const existing = this.activeRoom.players.find(p => p.id === guestPlayer.id);
        if (existing) {
          existing.displayName = guestPlayer.displayName || existing.displayName;
          existing.status = 'connected';
        } else {
          this.activeRoom.players.push({
            id: guestPlayer.id,
            displayName: (guestPlayer.displayName || 'Player').trim().slice(0, 30),
            avatarSeed: 'p_' + guestPlayer.id.slice(0, 4),
            isReady: false,
            isHost: false,
            score: 0,
            currentLevel: 1,
            hasGuessedThisRound: false,
            status: 'connected'
          });
        }

        this.saveLocalRoomState(this.activeRoom);
        this.broadcastMessage({ type: 'PLAYER_JOINED', room: this.activeRoom });
        this.broadcastRoomToPeers();
        this.notify();
        break;
      }

      case 'READY_TOGGLE': {
        const player = this.activeRoom.players.find(p => p.id === data.playerId);
        if (player) {
          player.isReady = !player.isReady;
          this.saveLocalRoomState(this.activeRoom);
          this.broadcastRoomToPeers();
          this.notify();
        }
        break;
      }

      case 'SKIP_LEVEL': {
        const player = this.activeRoom.players.find(p => p.id === data.playerId);
        if (player && player.currentLevel < 4) {
          player.currentLevel = (player.currentLevel + 1) as 1 | 2 | 3 | 4;
          this.saveLocalRoomState(this.activeRoom);
          this.broadcastRoomToPeers();
          this.notify();
        }
        break;
      }

      case 'GUESS': {
        if (!this.activeRoom || this.activeRoom.status !== 'playing') return;
        if (this.activeRoom.roundDeadline && Date.now() >= this.activeRoom.roundDeadline) return;

        // Reject stale round guess
        if (data.roundIndex !== undefined && data.roundIndex !== this.activeRoom.currentRoundIndex) {
          console.warn('[MultiplayerEngine] Stale round guess rejected:', data.roundIndex, 'current:', this.activeRoom.currentRoundIndex);
          return;
        }

        const player = this.activeRoom.players.find(p => p.id === data.playerId);
        if (!player || player.hasGuessedThisRound) return;

        // Verify connection ownership to prevent impersonation
        const expectedConn = this.guestConnections.get(data.playerId);
        if (expectedConn && conn && expectedConn !== conn) {
          console.warn('[MultiplayerEngine] Impersonation attempt rejected for player:', data.playerId);
          return;
        }

        const level = (player.currentLevel || 1) as number;
        const currentTrack = this.getCurrentTrack();
        const normalize = (s: string) => (s || '').toLowerCase().replace(/[^\w]/g, '');
        const isCorrect = Boolean(
          currentTrack && (
            (data.guessTrackId && currentTrack.id === data.guessTrackId) ||
            (data.guessTrackId && currentTrack.providerTrackId === data.guessTrackId) ||
            (data.guessTitle && normalize(data.guessTitle) === normalize(currentTrack.title))
          )
        );

        const pointsMap: Record<number, number> = { 1: 100, 2: 70, 3: 40, 4: 20 };
        const points = isCorrect ? (pointsMap[level] || 20) : 0;

        // Track distinct player identities who submitted a guess this round
        if (!this.activeRoom.roundGuessedPlayerIds) {
          this.activeRoom.roundGuessedPlayerIds = [];
        }
        if (!this.activeRoom.roundGuessedPlayerIds.includes(data.playerId)) {
          this.activeRoom.roundGuessedPlayerIds.push(data.playerId);
        }

        player.hasGuessedThisRound = true;
        player.score += points;
        player.lastGuessCorrect = isCorrect;
        player.lastGuessTitle = data.guessTitle || (isCorrect ? currentTrack?.title : 'Skipped / Unknown') || 'Unknown';
        player.lastGuessPoints = points;
        player.lastGuessTrackId = data.guessTrackId;

        const guessEvent: PlayerGuessEvent = {
          playerId: data.playerId,
          playerName: player.displayName,
          roundIndex: this.activeRoom.currentRoundIndex,
          guessTitle: player.lastGuessTitle || 'Skipped / Unknown',
          isCorrect,
          points,
          timestamp: Date.now()
        };

        if (!this.activeRoom.recentGuesses) {
          this.activeRoom.recentGuesses = [];
        }
        this.activeRoom.recentGuesses.push(guessEvent);

        this.saveLocalRoomState(this.activeRoom);
        this.broadcastMessage({ type: 'GUESS_SUBMITTED', guess: guessEvent, room: this.activeRoom });
        this.broadcastRoomToPeers({ type: 'GUESS_SUBMITTED', guess: guessEvent, room: this.activeRoom });
        this.notify();

        // End round early when at least TWO distinct players have submitted a guess
        if (this.activeRoom.roundGuessedPlayerIds.length >= 2) {
          this.endCurrentRound('two_players_guessed');
        }
        break;
      }

      case 'LEAVE': {
        if (data.playerId) {
          this.guestConnections.delete(data.playerId);
          this.activeRoom.players = this.activeRoom.players.filter(p => p.id !== data.playerId);
          this.saveLocalRoomState(this.activeRoom);
          this.broadcastRoomToPeers();
          this.notify();
        }
        break;
      }
    }
  }

  /**
   * Broadcast state to all connected WebRTC peers
   */
  private broadcastRoomToPeers(customPayload?: any) {
    if (!this.activeRoom) return;
    const payload = customPayload || { type: 'ROOM_STATE', room: this.activeRoom };
    for (const [_, conn] of this.guestConnections.entries()) {
      try {
        if (conn.open) {
          conn.send(payload);
        }
      } catch (err) {
        console.warn('[MultiplayerEngine] Peer send error:', err);
      }
    }
  }

  /**
   * Create a new room with a random 6-digit room code (000000 - 999999)
   * Capacity: 20 participants max. Zero bots.
   */
  public async createRoom(
    hostPlayerName: string,
    hostPlayerId: string,
    settings?: { language?: string; mixLanguages?: boolean; totalRounds?: number }
  ): Promise<MultiplayerRoom> {
    this.leaveRoom();
    this.currentUserId = hostPlayerId;

    let roomCode = this.generate6DigitCode();
    const totalRounds = settings?.totalRounds
      ? Math.min(MULTIPLAYER_MAX_ROUNDS, Math.max(MULTIPLAYER_MIN_ROUNDS, settings.totalRounds))
      : 3;

    // Prepare verified playable tracks
    const availableTracks = musicCatalogue.getAvailableTracks();
    const shuffled = [...availableTracks].sort(() => 0.5 - Math.random());
    const trackIds = shuffled.slice(0, totalRounds).map(t => t.id);
    const initialTrack = trackIds.length > 0 ? musicCatalogue.getTrackById(trackIds[0]) : undefined;

    const hostPlayer: MultiplayerPlayer = {
      id: hostPlayerId,
      displayName: (hostPlayerName || 'HostPlayer').trim().slice(0, 30),
      avatarSeed: 'host_' + hostPlayerId.slice(0, 4),
      isReady: true,
      isHost: true,
      score: 0,
      currentLevel: 1,
      hasGuessedThisRound: false,
      status: 'connected'
    };

    // Try server-side room creation first
    try {
      const res = await fetch('/api/multiplayer/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hostId: hostPlayerId,
          displayName: hostPlayerName,
          language: settings?.language || 'English',
          mixLanguages: Boolean(settings?.mixLanguages),
          totalRounds
        })
      });

      if (res.ok) {
        const data = await res.json();
        roomCode = data.roomCode;
        this.hostToken = data.hostToken || null;
      }
    } catch {
      // In offline / standalone preview, roomCode is used directly
    }

    this.activeRoom = {
      roomCode,
      hostId: hostPlayerId,
      status: 'lobby',
      totalRounds,
      trackIds,
      currentTrack: initialTrack,
      currentRoundIndex: 0,
      players: [hostPlayer],
      roundStartedAt: 0,
      roundDeadline: 0,
      roundGuessedPlayerIds: [],
      createdAt: Date.now()
    };

    this.saveLocalRoomState(this.activeRoom);
    this.broadcastMessage({ type: 'ROOM_CREATED', room: this.activeRoom });

    // Initialize Host WebRTC peer for cross-device guests
    if (this.isWebRTCSupported()) {
      await this.initHostPeer(roomCode);
    }

    this.startSyncPolling(roomCode, hostPlayerId);
    this.notify();
    return this.activeRoom;
  }

  /**
   * Set total number of match rounds (Host choice: 3 to 10)
   */
  public setTotalRounds(rounds: number): void {
    if (!this.activeRoom || this.activeRoom.status !== 'lobby') return;
    const count = Math.min(MULTIPLAYER_MAX_ROUNDS, Math.max(MULTIPLAYER_MIN_ROUNDS, Math.round(rounds)));
    this.activeRoom.totalRounds = count;

    const availableTracks = musicCatalogue.getAvailableTracks();
    const shuffled = [...availableTracks].sort(() => 0.5 - Math.random());
    this.activeRoom.trackIds = shuffled.slice(0, count).map(t => t.id);
    if (this.activeRoom.trackIds.length > 0) {
      this.activeRoom.currentTrack = musicCatalogue.getTrackById(this.activeRoom.trackIds[0]);
    }

    this.saveLocalRoomState(this.activeRoom);
    this.broadcastMessage({ type: 'ROOM_SETTINGS_UPDATED', room: this.activeRoom });
    this.broadcastRoomToPeers({ type: 'ROOM_SETTINGS_UPDATED', room: this.activeRoom });
    this.notify();
  }

  /**
   * Join an existing room with 6-digit code across devices
   */
  public async joinRoom(roomCode: string, playerName: string, playerId: string): Promise<MultiplayerRoom> {
    const cleanCode = String(roomCode).trim().padStart(6, '0');
    this.currentUserId = playerId;

    // 1. Try WebRTC DataChannel connection directly to host (real cross-device)
    if (this.isWebRTCSupported()) {
      try {
        const roomFromPeer = await this.connectGuestViaWebRTC(cleanCode, playerName, playerId);
        if (roomFromPeer) {
          this.activeRoom = roomFromPeer;
          this.saveLocalRoomState(this.activeRoom);
          this.broadcastMessage({ type: 'PLAYER_JOINED', room: this.activeRoom });
          this.startSyncPolling(cleanCode, playerId);
          this.notify();
          return this.activeRoom;
        }
      } catch (err: any) {
        if (err.message && (err.message.includes('capacity') || err.message.includes('kicked'))) {
          throw err;
        }
        // Fall through to server API & local storage
      }
    }

    // 2. Try server-side room join (Cloudflare Pages / Express backend)
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
          trackIds: data.room.trackIds || [],
          currentRoundIndex: data.room.currentRoundIndex || 0,
          players: data.room.players || [],
          roundStartedAt: data.room.roundStartedAt || 0,
          currentTrack: data.room.currentTrack,
          createdAt: data.room.createdAt || Date.now()
        };
        this.saveLocalRoomState(this.activeRoom);
        this.broadcastMessage({ type: 'PLAYER_JOINED', room: this.activeRoom });
        this.startSyncPolling(cleanCode, playerId);
        this.notify();
        return this.activeRoom;
      } else {
        const errData = await res.json().catch(() => ({}));
        if (errData.error === 'ROOM_FULL' || errData.error === 'ACCESS_REVOKED') {
          throw new Error(errData.message);
        }
      }
    } catch (err: any) {
      if (err.message && (err.message.includes('capacity') || err.message.includes('kicked'))) {
        throw err;
      }
    }

    // 3. Shared local storage join (for multi-tab / same-machine preview)
    const localRoom = this.getLocalRoomState(cleanCode) || (this.activeRoom?.roomCode === cleanCode ? this.activeRoom : null);
    if (localRoom) {
      if (localRoom.players.length >= 20) {
        throw new Error('This room has reached the maximum capacity of 20 participants.');
      }
      const existing = localRoom.players.find(p => p.id === playerId);
      if (!existing) {
        localRoom.players.push({
          id: playerId,
          displayName: (playerName || 'Player').trim().slice(0, 30),
          avatarSeed: 'p_' + playerId.slice(0, 4),
          isReady: false,
          isHost: false,
          score: 0,
          currentLevel: 1,
          hasGuessedThisRound: false,
          status: 'connected'
        });
      } else {
        existing.status = 'connected';
      }
      this.activeRoom = localRoom;
      this.saveLocalRoomState(this.activeRoom);
      this.broadcastMessage({ type: 'PLAYER_JOINED', room: this.activeRoom });
      this.startSyncPolling(cleanCode, playerId);
      this.notify();
      return this.activeRoom;
    }

    // Never silently spawn a phantom room when join fails
    throw new Error(`Unable to join room ${cleanCode}. Please check the code and ensure the host is online.`);
  }

  /**
   * Connect Guest to Host via WebRTC DataChannel
   */
  private async connectGuestViaWebRTC(cleanCode: string, playerName: string, playerId: string): Promise<MultiplayerRoom | null> {
    const PeerClass = await getPeerClass();
    if (!PeerClass) return null;

    return new Promise((resolve, reject) => {
      try {
        this.cleanupGuestPeer();

        this.guestPeer = new PeerClass({
          config: { iceServers: ICE_SERVERS }
        });

        const targetHostPeerId = `${PEER_PREFIX}${cleanCode}`;
        let connTimeout: number | null = null;
        let isResolved = false;

        const safeResolve = (room: MultiplayerRoom | null) => {
          if (isResolved) return;
          isResolved = true;
          if (connTimeout) clearTimeout(connTimeout);
          resolve(room);
        };

        const safeReject = (err: Error) => {
          if (isResolved) return;
          isResolved = true;
          if (connTimeout) clearTimeout(connTimeout);
          reject(err);
        };

        // 3.5s timeout for fast WebRTC lookup
        connTimeout = setTimeout(() => {
          safeResolve(null);
        }, 3500) as any;

        this.guestPeer.on('open', (id: string) => {
          console.log(`[MultiplayerEngine] Guest peer initialized: ${id}`);
          const conn = this.guestPeer!.connect(targetHostPeerId, { reliable: true });
          this.hostConnection = conn;

          conn.on('open', () => {
            console.log(`[MultiplayerEngine] Connected to host peer: ${targetHostPeerId}`);
            conn.send({
              type: 'JOIN_REQUEST',
              player: { id: playerId, displayName: playerName }
            });
          });

          conn.on('data', (raw: any) => {
            this.handleGuestDataReceived(raw, safeResolve, safeReject);
          });

          conn.on('close', () => {
            console.log('[MultiplayerEngine] Host connection closed.');
            this.hostConnection = null;
          });

          conn.on('error', (err: any) => {
            console.warn('[MultiplayerEngine] Guest conn error:', err);
            safeResolve(null);
          });
        });

        this.guestPeer.on('error', (err: any) => {
          console.warn('[MultiplayerEngine] Guest peer error:', err);
          if (err.type === 'peer-unavailable') {
            safeResolve(null);
          } else {
            safeResolve(null);
          }
        });
      } catch (err) {
        console.warn('[MultiplayerEngine] WebRTC guest init error:', err);
        resolve(null);
      }
    });
  }

  /**
   * Guest processes messages received from Host
   */
  private handleGuestDataReceived(
    data: any,
    onJoinResolved?: (room: MultiplayerRoom) => void,
    onJoinRejected?: (err: Error) => void
  ) {
    if (!data) return;

    if (data.type === 'ERROR') {
      if (onJoinRejected) {
        onJoinRejected(new Error(data.message || 'Room error.'));
      }
      return;
    }

    if (
      data.type === 'ROOM_STATE' ||
      data.type === 'MATCH_STARTED' ||
      data.type === 'NEXT_ROUND' ||
      data.type === 'ROUND_ENDED' ||
      data.type === 'MATCH_COMPLETED' ||
      data.type === 'ROOM_SETTINGS_UPDATED' ||
      data.type === 'PLAYER_UPDATE' ||
      data.type === 'GUESS_SUBMITTED'
    ) {
      if (data.room) {
        this.activeRoom = data.room;
        this.saveLocalRoomState(data.room);
        this.notify();
        if (this.activeRoom && (this.activeRoom.status === 'playing' || this.activeRoom.status === 'round-summary')) {
          this.startAuthoritativeRoundLoop();
        }
        if (onJoinResolved) {
          onJoinResolved(data.room);
        }
      }
      return;
    }

    if (data.type === 'KICKED') {
      this.leaveRoom();
      if (typeof window !== 'undefined' && typeof window.alert === 'function') {
        window.alert('You have been removed from the room by the host.');
      }
      return;
    }

    if (data.type === 'ROOM_CLOSED') {
      this.leaveRoom();
    }
  }

  /**
   * Synchronized server polling and keepalive
   */
  private startSyncPolling(code: string, playerId: string) {
    this.stopSyncPolling();

    // Heartbeat every 15s
    this.heartbeatInterval = setInterval(() => {
      if (this.hostConnection && this.hostConnection.open) {
        this.hostConnection.send({ type: 'HEARTBEAT', playerId });
      }
      fetch(`/api/multiplayer/rooms/${code}/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      }).catch(() => {});
    }, 15000);

    // State poll every 3s as background safety net
    this.pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/multiplayer/rooms/${code}`);
        if (res.ok) {
          const data = await res.json();
          if (this.activeRoom && this.activeRoom.roomCode === code) {
            // Only adopt server players if host is not syncing via WebRTC DataChannel
            if (this.guestConnections.size === 0) {
              this.activeRoom.status = data.status;
              this.activeRoom.hostId = data.hostId;
              if (Array.isArray(data.players) && data.players.length > 0) {
                this.activeRoom.players = data.players;
              }
              this.activeRoom.currentRoundIndex = data.currentRoundIndex || 0;
              this.activeRoom.roundStartedAt = data.roundStartedAt || 0;
              if (data.currentTrack) {
                this.activeRoom.currentTrack = data.currentTrack;
              }
              this.saveLocalRoomState(this.activeRoom);
              this.notify();
            }
          }
        }
      } catch {
        const localState = this.getLocalRoomState(code);
        if (localState && this.activeRoom && this.activeRoom.roomCode === code) {
          this.activeRoom = localState;
          this.notify();
        }
      }
    }, 3000);
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
   * Evaluates authoritative round rules (30s deadline, 2-player early completion, 5s results review)
   */
  public checkAuthoritativeRoundStatus(): void {
    if (!this.activeRoom) {
      this.stopAuthoritativeRoundLoop();
      return;
    }

    const now = Date.now();

    // Active round state check
    if (this.activeRoom.status === 'playing') {
      const distinctGuessedCount = this.activeRoom.roundGuessedPlayerIds?.length || 0;

      // Rule 1: End round early if at least TWO distinct players have submitted a guess
      if (distinctGuessedCount >= 2) {
        this.endCurrentRound('two_players_guessed');
        return;
      }

      // Rule 2: End round automatically when authoritative 30-second deadline expires
      if (this.activeRoom.roundDeadline && now >= this.activeRoom.roundDeadline) {
        this.endCurrentRound('timeout');
        return;
      }
    }

    // Round summary state check: Auto-transition to next round after 5 seconds
    if (this.activeRoom.status === 'round-summary') {
      if (this.activeRoom.roundResultsUntil && now >= this.activeRoom.roundResultsUntil) {
        this.advanceToNextRound();
        return;
      }
    }
  }

  /**
   * Start Authoritative Round Synchronization Loop
   * Enforces 30-second round deadline, two-player early round-end, and 5-second automatic round transition
   */
  private startAuthoritativeRoundLoop() {
    this.stopAuthoritativeRoundLoop();

    this.roundTimerInterval = setInterval(() => {
      this.checkAuthoritativeRoundStatus();
    }, 150);
  }

  private stopAuthoritativeRoundLoop() {
    if (this.roundTimerInterval !== null) {
      clearInterval(this.roundTimerInterval);
      this.roundTimerInterval = null;
    }
  }

  /**
   * End the current round and transition to round results
   * Triggered by:
   * 1. Authoritative 30-second timeout
   * 2. At least two distinct players submitting a guess
   */
  public endCurrentRound(reason: 'timeout' | 'two_players_guessed' | 'all_guessed' = 'timeout'): void {
    if (!this.activeRoom || this.activeRoom.status !== 'playing' || this.isEndingRound) return;
    this.isEndingRound = true;

    const now = Date.now();
    this.activeRoom.status = 'round-summary';
    this.activeRoom.roundEndReason = reason;
    this.activeRoom.roundResultsUntil = now + MULTIPLAYER_ROUND_RESULTS_DURATION_MS;
    this.activeRoom.targetTrackRevealed = this.getCurrentTrack();

    this.saveLocalRoomState(this.activeRoom);
    this.broadcastMessage({ type: 'ROUND_ENDED', reason, room: this.activeRoom });
    this.broadcastRoomToPeers({ type: 'ROUND_ENDED', reason, room: this.activeRoom });
    this.notify();

    this.isEndingRound = false;
  }

  /**
   * Automatically advance to the next round or complete match
   */
  public advanceToNextRound(): void {
    if (!this.activeRoom || this.activeRoom.status !== 'round-summary' || this.isEndingRound) return;
    this.isEndingRound = true;

    const totalRounds = this.activeRoom.totalRounds || this.activeRoom.trackIds.length || 3;
    const hasMoreRounds = this.activeRoom.currentRoundIndex < this.activeRoom.trackIds.length - 1 &&
                          this.activeRoom.currentRoundIndex < totalRounds - 1;

    if (hasMoreRounds) {
      this.activeRoom.currentRoundIndex += 1;
      const now = Date.now();
      this.activeRoom.status = 'playing';
      this.activeRoom.roundStartedAt = now;
      this.activeRoom.roundDeadline = now + MULTIPLAYER_ROUND_DURATION_MS;
      this.activeRoom.roundGuessedPlayerIds = [];
      this.activeRoom.roundEndReason = undefined;
      this.activeRoom.roundResultsUntil = undefined;
      this.activeRoom.targetTrackRevealed = undefined;
      this.activeRoom.recentGuesses = [];

      const nextId = this.activeRoom.trackIds[this.activeRoom.currentRoundIndex];
      this.activeRoom.currentTrack = musicCatalogue.getTrackById(nextId);

      this.activeRoom.players.forEach(p => {
        p.hasGuessedThisRound = false;
        p.currentLevel = 1;
        p.lastGuessCorrect = undefined;
        p.lastGuessTitle = undefined;
        p.lastGuessPoints = undefined;
        p.lastGuessTrackId = undefined;
      });

      this.saveLocalRoomState(this.activeRoom);
      this.broadcastMessage({ type: 'NEXT_ROUND', room: this.activeRoom });
      this.broadcastRoomToPeers({ type: 'NEXT_ROUND', room: this.activeRoom });
      this.notify();
    } else {
      this.activeRoom.status = 'completed';
      this.activeRoom.roundEndReason = 'completed';
      this.saveLocalRoomState(this.activeRoom);
      this.broadcastMessage({ type: 'MATCH_COMPLETED', room: this.activeRoom });
      this.broadcastRoomToPeers({ type: 'MATCH_COMPLETED', room: this.activeRoom });
      this.notify();
    }

    this.isEndingRound = false;
  }

  /**
   * Host Controls: Start Match
   * Begins authoritative 30-second round countdown
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
        // Handled locally
      }
    }

    const totalRounds = this.activeRoom.totalRounds || 3;
    if (!this.activeRoom.trackIds || this.activeRoom.trackIds.length < totalRounds) {
      const availableTracks = musicCatalogue.getAvailableTracks();
      const shuffled = [...availableTracks].sort(() => 0.5 - Math.random());
      this.activeRoom.trackIds = shuffled.slice(0, totalRounds).map(t => t.id);
    }

    const now = Date.now();
    this.activeRoom.currentTrack = musicCatalogue.getTrackById(this.activeRoom.trackIds[0]);
    this.activeRoom.status = 'playing';
    this.activeRoom.roundStartedAt = now;
    this.activeRoom.roundDeadline = now + MULTIPLAYER_ROUND_DURATION_MS;
    this.activeRoom.currentRoundIndex = 0;
    this.activeRoom.roundGuessedPlayerIds = [];
    this.activeRoom.roundEndReason = undefined;
    this.activeRoom.roundResultsUntil = undefined;
    this.activeRoom.targetTrackRevealed = undefined;
    this.activeRoom.recentGuesses = [];

    this.activeRoom.players.forEach(p => {
      p.currentLevel = 1;
      p.hasGuessedThisRound = false;
      p.lastGuessCorrect = undefined;
      p.lastGuessTitle = undefined;
      p.lastGuessPoints = undefined;
      p.lastGuessTrackId = undefined;
    });

    this.saveLocalRoomState(this.activeRoom);
    this.broadcastMessage({ type: 'MATCH_STARTED', room: this.activeRoom });
    this.broadcastRoomToPeers({ type: 'MATCH_STARTED', room: this.activeRoom });
    this.startAuthoritativeRoundLoop();
    this.notify();
  }

  /**
   * Host Controls: Kick Participant & Revoke Access
   */
  public async kickParticipant(targetPlayerId: string): Promise<boolean> {
    if (!this.activeRoom) return false;

    // Notify guest via DataChannel
    const guestConn = this.guestConnections.get(targetPlayerId);
    if (guestConn) {
      try {
        guestConn.send({ type: 'KICKED' });
        guestConn.close();
      } catch {}
      this.guestConnections.delete(targetPlayerId);
    }

    if (this.hostToken) {
      try {
        await fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/host/kick`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostToken: this.hostToken, targetPlayerId })
        });
      } catch {}
    }

    this.activeRoom.players = this.activeRoom.players.filter(p => p.id !== targetPlayerId);
    this.saveLocalRoomState(this.activeRoom);
    this.broadcastMessage({ type: 'PLAYER_UPDATE', room: this.activeRoom });
    this.broadcastRoomToPeers();
    this.notify();
    return true;
  }

  /**
   * Host Controls: Close Room
   */
  public async closeRoom(): Promise<void> {
    if (!this.activeRoom) return;
    const code = this.activeRoom.roomCode;

    this.stopAuthoritativeRoundLoop();

    // Send close event to all guests
    this.broadcastRoomToPeers({ type: 'ROOM_CLOSED', roomCode: code });

    if (this.hostToken) {
      try {
        await fetch(`/api/multiplayer/rooms/${code}/host/close`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hostToken: this.hostToken })
        });
      } catch {}
    }

    this.removeLocalRoomState(code);
    this.broadcastMessage({ type: 'ROOM_CLOSED', roomCode: code });
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
    } catch {}

    this.saveLocalRoomState(this.activeRoom);
    this.broadcastRoomToPeers();
    this.notify();
  }

  public toggleReady(playerId: string) {
    if (!this.activeRoom) return;
    const player = this.activeRoom.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = !player.isReady;
      this.saveLocalRoomState(this.activeRoom);
      this.broadcastMessage({ type: 'PLAYER_UPDATE', room: this.activeRoom });
      this.broadcastRoomToPeers();
      this.notify();
    }

    // If guest, send to host via DataChannel
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({ type: 'READY_TOGGLE', playerId });
    }
  }

  public async skipLevel(playerId: string): Promise<number> {
    if (!this.activeRoom) return 1;
    const player = this.activeRoom.players.find(p => p.id === playerId);
    if (player && player.currentLevel < 4) {
      player.currentLevel = (player.currentLevel + 1) as 1 | 2 | 3 | 4;
    }

    // Guest sends to host via DataChannel
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({ type: 'SKIP_LEVEL', playerId });
    }

    if (this.activeRoom.roomCode) {
      fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/skip-level`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId })
      }).catch(() => {});
    }

    this.saveLocalRoomState(this.activeRoom);
    this.broadcastMessage({ type: 'PLAYER_UPDATE', room: this.activeRoom });
    this.broadcastRoomToPeers();
    this.notify();
    return player?.currentLevel || 1;
  }

  public submitPlayerGuess(playerId: string, isCorrect: boolean, points: number, guessTrackId?: string, guessTitle?: string) {
    if (!this.activeRoom) return;
    if (this.activeRoom.status !== 'playing') return;
    if (this.activeRoom.roundDeadline && Date.now() >= this.activeRoom.roundDeadline) return;

    const player = this.activeRoom.players.find(p => p.id === playerId);
    if (!player || player.hasGuessedThisRound) return;

    const level = player.currentLevel || 1;
    const currentTrack = this.getCurrentTrack();
    const resolvedTitle = (guessTitle || (isCorrect ? currentTrack?.title : 'Skipped / Unknown')) || 'Unknown';

    // Track distinct player identities who submitted a guess this round
    if (!this.activeRoom.roundGuessedPlayerIds) {
      this.activeRoom.roundGuessedPlayerIds = [];
    }
    if (!this.activeRoom.roundGuessedPlayerIds.includes(playerId)) {
      this.activeRoom.roundGuessedPlayerIds.push(playerId);
    }

    // Guest sends to host via DataChannel
    if (this.hostConnection && this.hostConnection.open) {
      this.hostConnection.send({
        type: 'GUESS',
        playerId,
        isCorrect,
        points,
        guessTrackId,
        guessTitle: resolvedTitle,
        level,
        roundIndex: this.activeRoom.currentRoundIndex
      });
    }

    if (this.activeRoom.roomCode) {
      fetch(`/api/multiplayer/rooms/${this.activeRoom.roomCode}/guess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId,
          guessTrackId: guessTrackId || (isCorrect ? 'correct' : 'wrong'),
          title: resolvedTitle,
          level,
          points,
          isCorrect
        })
      }).catch(() => {});
    }

    player.hasGuessedThisRound = true;
    player.score += points;
    player.lastGuessCorrect = isCorrect;
    player.lastGuessTitle = resolvedTitle;
    player.lastGuessPoints = points;
    player.lastGuessTrackId = guessTrackId;

    const guessEvent: PlayerGuessEvent = {
      playerId,
      playerName: player.displayName,
      roundIndex: this.activeRoom.currentRoundIndex,
      guessTitle: resolvedTitle,
      isCorrect,
      points,
      timestamp: Date.now()
    };

    if (!this.activeRoom.recentGuesses) {
      this.activeRoom.recentGuesses = [];
    }
    this.activeRoom.recentGuesses.push(guessEvent);

    this.saveLocalRoomState(this.activeRoom);
    this.broadcastMessage({ type: 'GUESS_SUBMITTED', guess: guessEvent, room: this.activeRoom });
    this.broadcastRoomToPeers({ type: 'GUESS_SUBMITTED', guess: guessEvent, room: this.activeRoom });
    this.notify();

    // End round early when at least TWO distinct players have submitted a guess
    if (this.activeRoom.roundGuessedPlayerIds.length >= 2) {
      this.endCurrentRound('two_players_guessed');
    }
  }

  /**
   * Safe next round handler.
   * Fair Host Permissions: Disallows manual host skipping during an active round.
   * Automatic round transitions govern all gameplay progression.
   */
  public async nextRound(): Promise<void> {
    if (!this.activeRoom) return;

    // Disallow manual skip while round is actively playing (preserves fair rules)
    if (this.activeRoom.status === 'playing') {
      console.warn('[MultiplayerEngine] Manual round advance blocked during active play; rounds transition automatically.');
      return;
    }

    if (this.activeRoom.status === 'round-summary') {
      this.advanceToNextRound();
    }
  }

  public getRemainingSeconds(): number {
    if (!this.activeRoom || this.activeRoom.status !== 'playing' || !this.activeRoom.roundDeadline) {
      return 0;
    }
    const diff = this.activeRoom.roundDeadline - Date.now();
    return Math.max(0, Math.ceil(diff / 1000));
  }

  public getResultsCountdownSeconds(): number {
    if (!this.activeRoom || this.activeRoom.status !== 'round-summary' || !this.activeRoom.roundResultsUntil) {
      return 0;
    }
    const diff = this.activeRoom.roundResultsUntil - Date.now();
    return Math.max(0, Math.ceil(diff / 1000));
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

  private cleanupHostPeer() {
    for (const [_, conn] of this.guestConnections.entries()) {
      try { conn.close(); } catch {}
    }
    this.guestConnections.clear();
    if (this.hostPeer) {
      try { this.hostPeer.destroy(); } catch {}
      this.hostPeer = null;
    }
  }

  private cleanupGuestPeer() {
    if (this.hostConnection) {
      try { this.hostConnection.close(); } catch {}
      this.hostConnection = null;
    }
    if (this.guestPeer) {
      try { this.guestPeer.destroy(); } catch {}
      this.guestPeer = null;
    }
  }

  public leaveRoom(): void {
    if (this.activeRoom && this.currentUserId) {
      if (this.hostConnection && this.hostConnection.open) {
        try {
          this.hostConnection.send({ type: 'LEAVE', playerId: this.currentUserId });
        } catch {}
      }
    }

    this.stopSyncPolling();
    this.stopAuthoritativeRoundLoop();
    this.cleanupGuestPeer();
    this.cleanupHostPeer();

    this.activeRoom = null;
    this.hostToken = null;
    this.currentUserId = null;
    this.notify();
  }
}

export const multiplayerEngine = new MultiplayerEngineService();
