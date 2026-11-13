type RoomPlayer = {
  id: string;
  displayName: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  streak: number;
  correctGuesses: number;
  hasGuessedThisRound: boolean;
  status: 'connected' | 'disconnected';
  joinedAt: number;
  lastSeenAt: number;
};

type RoomState = {
  roomCode: string;
  hostId: string;
  status: 'lobby' | 'playing' | 'round-summary' | 'completed' | 'closed';
  players: RoomPlayer[];
  totalRounds: number;
  trackIds: string[];
  currentRoundIndex: number;
  roundStartedAt: number;
  roundDeadline: number;
  roundResultsUntil?: number;
  roundEndReason?: string;
  languageFilter: string;
  mode: 'competitive' | 'casual';
  createdAt: number;
  recentGuesses: Array<{ playerId: string; guessTitle: string; points: number; correct: boolean; at: number }>;
  usedEvents: string[];
};

type Env = { SUPABASE_URL?: string; SUPABASE_ANON_KEY?: string; VITE_SUPABASE_URL?: string; VITE_SUPABASE_ANON_KEY?: string };
type State = {
  storage: { get<T>(key: string): Promise<T | undefined>; put<T>(key: string, value: T): Promise<void>; delete(key: string): Promise<boolean>; setAlarm(time: number | Date): Promise<void>; deleteAlarm(): Promise<void> };
  blockConcurrencyWhile<T>(callback: () => Promise<T>): Promise<T>;
};

const ROOM_KEY = 'room';
const MAX_PLAYERS = 20;
const ROUND_MS = 30_000;
const RESULTS_MS = 5_000;

/** SQLite-backed Durable Object. Its only caller is the authenticated Worker/Pages binding. */
export class RoomCoordinator {
  private readonly state: State;

  constructor(state: State, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') return this.reply({ error: 'METHOD_NOT_ALLOWED' }, 405);
    let payload: any;
    try { payload = await request.json(); } catch { return this.reply({ error: 'INVALID_JSON' }, 400); }
    const identity = request.headers.get('x-songverse-user-id');
    if (!identity || identity.length > 128) return this.reply({ error: 'UNAUTHORIZED' }, 401);

    return this.state.blockConcurrencyWhile(async () => {
      const room = await this.state.storage.get<RoomState>(ROOM_KEY);
      const action = String(payload?.action || '');
      if (action === 'create') return this.create(identity, payload);
      if (!room || room.status === 'closed') return this.reply({ error: 'ROOM_NOT_FOUND' }, 404);
      this.advanceClock(room, Date.now());
      const player = room.players.find(candidate => candidate.id === identity);
      if (!player && action !== 'join') return this.reply({ error: 'NOT_A_MEMBER' }, 403);
      if (player) player.lastSeenAt = Date.now();

      switch (action) {
        case 'join': return this.join(room, identity, payload);
        case 'read': return this.persistAndReply(room);
        case 'heartbeat': player!.status = 'connected'; return this.persistAndReply(room);
        case 'leave':
          player!.status = 'disconnected';
          return this.persistAndReply(room);
        case 'ready': player!.isReady = payload.ready === true; return this.persistAndReply(room);
        case 'settings':
          if (!this.isHost(room, identity)) return this.reply({ error: 'HOST_REQUIRED' }, 403);
          if (room.status !== 'lobby') return this.reply({ error: 'ROOM_LOCKED' }, 409);
          if (Array.isArray(payload.trackIds)) room.trackIds = this.cleanTrackIds(payload.trackIds, payload.totalRounds);
          if (Number.isInteger(payload.totalRounds)) room.totalRounds = Math.max(3, Math.min(10, payload.totalRounds));
          if (typeof payload.languageFilter === 'string') room.languageFilter = payload.languageFilter.slice(0, 40);
          return this.persistAndReply(room);
        case 'start':
          if (!this.isHost(room, identity)) return this.reply({ error: 'HOST_REQUIRED' }, 403);
          if (room.status !== 'lobby' || room.players.length < 2 || room.trackIds.length < 3) return this.reply({ error: 'ROOM_NOT_READY' }, 409);
          room.status = 'playing'; room.currentRoundIndex = 0; room.roundStartedAt = Date.now(); room.roundDeadline = room.roundStartedAt + ROUND_MS;
          room.players.forEach(p => { p.hasGuessedThisRound = false; p.isReady = false; });
          return this.persistAndReply(room);
        case 'guess': return this.guess(room, identity, payload);
        case 'skip':
          if (room.status !== 'playing') return this.reply({ error: 'ROUND_NOT_ACTIVE' }, 409);
          if (player!.hasGuessedThisRound) return this.reply({ error: 'DUPLICATE_GUESS' }, 409);
          player!.hasGuessedThisRound = true;
          room.recentGuesses.push({ playerId: identity, guessTitle: '', points: 0, correct: false, at: Date.now() });
          this.endWhenReady(room);
          return this.persistAndReply(room);
        case 'next':
          if (!this.isHost(room, identity)) return this.reply({ error: 'HOST_REQUIRED' }, 403);
          if (room.status !== 'round-summary') return this.reply({ error: 'ROUND_NOT_COMPLETE' }, 409);
          this.advanceRound(room, Date.now()); return this.persistAndReply(room);
        case 'kick':
          if (!this.isHost(room, identity)) return this.reply({ error: 'HOST_REQUIRED' }, 403);
          if (typeof payload.targetUserId !== 'string' || payload.targetUserId === room.hostId) return this.reply({ error: 'INVALID_TARGET' }, 400);
          room.players = room.players.filter(p => p.id !== payload.targetUserId);
          return this.persistAndReply(room);
        case 'close':
          if (!this.isHost(room, identity)) return this.reply({ error: 'HOST_REQUIRED' }, 403);
          room.status = 'closed'; await this.state.storage.put(ROOM_KEY, room); await this.state.storage.deleteAlarm();
          return this.reply({ closed: true });
        default: return this.reply({ error: 'UNKNOWN_ACTION' }, 404);
      }
    });
  }

  async alarm(): Promise<void> {
    await this.state.blockConcurrencyWhile(async () => {
      const room = await this.state.storage.get<RoomState>(ROOM_KEY);
      if (!room || room.status === 'closed' || room.status === 'completed') return;
      this.advanceClock(room, Date.now());
      await this.state.storage.put(ROOM_KEY, room);
      await this.schedule(room);
    });
  }

  private async create(identity: string, payload: any): Promise<Response> {
    const existing = await this.state.storage.get<RoomState>(ROOM_KEY);
    if (existing && existing.status !== 'closed' && existing.status !== 'completed') return this.reply({ error: 'ROOM_CODE_TAKEN' }, 409);
    const name = this.cleanName(payload.displayName);
    const tracks = this.cleanTrackIds(payload.trackIds, payload.totalRounds);
    if (tracks.length < 3) return this.reply({ error: 'INSUFFICIENT_TRACKS' }, 422);
    const rounds = Math.max(3, Math.min(10, Number(payload.totalRounds) || 5));
    const now = Date.now();
    const room: RoomState = {
      roomCode: String(payload.roomCode || ''), hostId: identity, status: 'lobby', totalRounds: rounds,
      trackIds: tracks.slice(0, rounds), currentRoundIndex: 0, roundStartedAt: 0, roundDeadline: 0,
      languageFilter: String(payload.languageFilter || 'ALL').slice(0, 40), mode: payload.mode === 'casual' ? 'casual' : 'competitive',
      createdAt: now, recentGuesses: [], usedEvents: [],
      players: [{ id: identity, displayName: name, isHost: true, isReady: true, score: 0, streak: 0, correctGuesses: 0, hasGuessedThisRound: false, status: 'connected', joinedAt: now, lastSeenAt: now }]
    };
    await this.state.storage.put(ROOM_KEY, room);
    return this.reply({ room: this.publicRoom(room) }, 201);
  }

  private async join(room: RoomState, identity: string, payload: any): Promise<Response> {
    const existing = room.players.find(p => p.id === identity);
    if (existing) { existing.status = 'connected'; existing.lastSeenAt = Date.now(); return this.persistAndReply(room); }
    if (room.status !== 'lobby') return this.reply({ error: 'ROOM_LOCKED' }, 409);
    if (room.players.length >= MAX_PLAYERS) return this.reply({ error: 'ROOM_FULL' }, 409);
    const now = Date.now();
    room.players.push({ id: identity, displayName: this.cleanName(payload.displayName), isHost: false, isReady: false, score: 0, streak: 0, correctGuesses: 0, hasGuessedThisRound: false, status: 'connected', joinedAt: now, lastSeenAt: now });
    return this.persistAndReply(room, 201);
  }

  private async guess(room: RoomState, identity: string, payload: any): Promise<Response> {
    if (room.status !== 'playing') return this.reply({ error: 'ROUND_NOT_ACTIVE' }, 409);
    const player = room.players.find(p => p.id === identity)!;
    if (player.hasGuessedThisRound) return this.reply({ error: 'DUPLICATE_GUESS' }, 409);
    const eventId = String(payload.eventId || '');
    if (!/^[A-Za-z0-9_-]{12,80}$/.test(eventId)) return this.reply({ error: 'EVENT_ID_REQUIRED' }, 400);
    if (room.usedEvents.includes(eventId)) return this.reply({ error: 'DUPLICATE_EVENT' }, 409);
    room.usedEvents.push(eventId); room.usedEvents = room.usedEvents.slice(-256);
    const correct = String(payload.trackId || '') === room.trackIds[room.currentRoundIndex];
    const elapsed = Date.now() - room.roundStartedAt;
    const points = correct ? (elapsed < 5_000 ? 100 : elapsed < 10_000 ? 70 : elapsed < 20_000 ? 40 : 20) : 0;
    player.hasGuessedThisRound = true;
    player.lastSeenAt = Date.now();
    if (correct) { player.score += points; player.streak += 1; player.correctGuesses += 1; }
    else player.streak = 0;
    const title = typeof payload.guessTitle === 'string' ? payload.guessTitle.trim().slice(0, 120) : '';
    room.recentGuesses.push({ playerId: identity, guessTitle: title, points, correct, at: Date.now() });
    room.recentGuesses = room.recentGuesses.slice(-20);
    this.endWhenReady(room);
    return this.persistAndReply(room);
  }

  private endWhenReady(room: RoomState): void {
    const activePlayers = room.players.filter(p => p.status === 'connected');
    const guessed = activePlayers.filter(p => p.hasGuessedThisRound).length;
    if (guessed >= 2 || (activePlayers.length > 0 && guessed === activePlayers.length)) {
      room.status = 'round-summary'; room.roundEndReason = 'players_guessed'; room.roundResultsUntil = Date.now() + RESULTS_MS;
    }
  }

  private advanceClock(room: RoomState, now: number): void {
    if (room.status === 'playing' && now >= room.roundDeadline) {
      room.status = 'round-summary'; room.roundEndReason = 'timeout'; room.roundResultsUntil = now + RESULTS_MS;
    } else if (room.status === 'round-summary' && (room.roundResultsUntil || 0) <= now) this.advanceRound(room, now);
  }

  private advanceRound(room: RoomState, now: number): void {
    if (room.currentRoundIndex + 1 >= Math.min(room.totalRounds, room.trackIds.length)) {
      room.status = 'completed'; room.roundEndReason = 'completed'; return;
    }
    room.currentRoundIndex += 1; room.status = 'playing'; room.roundStartedAt = now; room.roundDeadline = now + ROUND_MS;
    room.roundResultsUntil = undefined; room.roundEndReason = undefined; room.recentGuesses = [];
    room.players.forEach(p => { p.hasGuessedThisRound = false; });
  }

  private async persistAndReply(room: RoomState, status = 200): Promise<Response> {
    await this.state.storage.put(ROOM_KEY, room);
    await this.schedule(room);
    return this.reply({ room: this.publicRoom(room) }, status);
  }

  private async schedule(room: RoomState): Promise<void> {
    const next = room.status === 'playing' ? room.roundDeadline : room.status === 'round-summary' ? room.roundResultsUntil : undefined;
    if (next) await this.state.storage.setAlarm(next); else await this.state.storage.deleteAlarm();
  }

  private publicRoom(room: RoomState): Record<string, unknown> {
    const { usedEvents: _used, ...safe } = room;
    return { ...safe, currentRoundIndex: safe.currentRoundIndex, currentTrackId: safe.trackIds[safe.currentRoundIndex] || null, revealedTrackId: safe.status === 'round-summary' || safe.status === 'completed' ? safe.trackIds[safe.currentRoundIndex] : null };
  }
  private isHost(room: RoomState, id: string): boolean { return room.hostId === id; }
  private cleanName(value: unknown): string { return typeof value === 'string' && value.trim() ? value.trim().slice(0, 30) : 'Player'; }
  private cleanTrackIds(value: unknown, rounds: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter(v => typeof v === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(v)))].slice(0, Math.max(3, Math.min(10, Number(rounds) || 10)));
  }
  private reply(body: unknown, status = 200): Response { return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } }); }
}
