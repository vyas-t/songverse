/**
 * Cloudflare Pages Function: /api/multiplayer/[[route]]
 * 
 * Handles all multiplayer REST API endpoints on Cloudflare Pages:
 * - POST /api/multiplayer/rooms/create
 * - POST /api/multiplayer/rooms/join
 * - GET  /api/multiplayer/rooms/:code
 * - POST /api/multiplayer/rooms/:code/host/start
 * - POST /api/multiplayer/rooms/:code/host/kick
 * - POST /api/multiplayer/rooms/:code/host/settings
 * - POST /api/multiplayer/rooms/:code/host/close
 * - POST /api/multiplayer/rooms/:code/guess
 * - POST /api/multiplayer/rooms/:code/skip-level
 * - POST /api/multiplayer/rooms/:code/host/next-round
 * - POST /api/multiplayer/rooms/:code/heartbeat
 * - OPTIONS (CORS preflight)
 */

interface ServerPlayer {
  id: string;
  displayName: string;
  avatarSeed: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  currentLevel: 1 | 2 | 3 | 4;
  hasGuessedThisRound: boolean;
  lastGuessCorrect?: boolean;
  status: 'connected' | 'idle' | 'disconnected';
  lastSeen: number;
}

interface ServerRoom {
  roomCode: string;
  hostId: string;
  hostToken: string;
  status: 'lobby' | 'playing' | 'round_end' | 'completed' | 'closed';
  language: string;
  mixLanguages: boolean;
  players: ServerPlayer[];
  trackIds: string[];
  currentRoundIndex: number;
  roundStartedAt: number;
  createdAt: number;
  lastActivityAt: number;
  bannedPlayerIds?: string[];
  currentTrack?: any;
}

// In-memory cache for edge isolate execution
const isolateRooms = new Map<string, ServerRoom>();

function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: corsHeaders()
  });
}

function generate6DigitCode(): string {
  for (let i = 0; i < 5000; i++) {
    const num = Math.floor(Math.random() * 1000000);
    const code = String(num).padStart(6, '0');
    if (!isolateRooms.has(code)) {
      return code;
    }
  }
  return String(Date.now() % 1000000).padStart(6, '0');
}

async function getRoom(code: string, env: any): Promise<ServerRoom | null> {
  cleanExpiredRooms();
  if (isolateRooms.has(code)) {
    return isolateRooms.get(code)!;
  }
  if (env && env.SONGVERSE_ROOMS) {
    try {
      const raw = await env.SONGVERSE_ROOMS.get(`room:${code}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        isolateRooms.set(code, parsed);
        return parsed;
      }
    } catch {}
  }
  return null;
}

async function saveRoom(room: ServerRoom, env: any): Promise<void> {
  room.lastActivityAt = Date.now();
  isolateRooms.set(room.roomCode, room);
  if (env && env.SONGVERSE_ROOMS) {
    try {
      await env.SONGVERSE_ROOMS.put(`room:${room.roomCode}`, JSON.stringify(room), {
        expirationTtl: 7200 // 2 hours TTL
      });
    } catch {}
  }
}

async function deleteRoom(code: string, env: any): Promise<void> {
  isolateRooms.delete(code);
  if (env && env.SONGVERSE_ROOMS) {
    try {
      await env.SONGVERSE_ROOMS.delete(`room:${code}`);
    } catch {}
  }
}

function cleanExpiredRooms() {
  const TWO_HOURS = 2 * 3600 * 1000;
  const now = Date.now();
  for (const [code, r] of isolateRooms.entries()) {
    if (r.status === 'closed' || now - r.lastActivityAt > TWO_HOURS) {
      isolateRooms.delete(code);
    }
  }
}

function sanitizeRoom(room: ServerRoom) {
  // Strip hostToken from public responses
  const { hostToken: _, ...safe } = room;
  return safe;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function onRequestGet(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/\/+$/, '');
  
  // Format: /api/multiplayer/rooms/:code
  const match = pathname.match(/\/api\/multiplayer\/rooms\/([0-9a-zA-Z_-]+)$/);
  if (!match) {
    return jsonResponse({ error: 'NOT_FOUND', message: 'Endpoint not found' }, 404);
  }

  const code = match[1].padStart(6, '0');
  const room = await getRoom(code, context.env);

  if (!room || room.status === 'closed') {
    return jsonResponse({ error: 'ROOM_NOT_FOUND', message: 'Room not found or host is offline.' }, 404);
  }

  return jsonResponse(sanitizeRoom(room));
}

export async function onRequestPost(context: any): Promise<Response> {
  const url = new URL(context.request.url);
  const pathname = url.pathname.replace(/\/+$/, '');
  let body: any = {};
  try {
    body = await context.request.json();
  } catch {}

  // 1. POST /api/multiplayer/rooms/create
  if (pathname === '/api/multiplayer/rooms/create') {
    const { hostId, displayName, language = 'English', mixLanguages = false } = body;
    if (!hostId) {
      return jsonResponse({ error: 'MISSING_HOST_ID', message: 'Host player ID required.' }, 400);
    }

    const roomCode = generate6DigitCode();
    const hostToken = `htk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

    const hostPlayer: ServerPlayer = {
      id: hostId,
      displayName: (displayName || 'HostPlayer').trim().slice(0, 30),
      avatarSeed: 'host_' + hostId.slice(0, 4),
      isHost: true,
      isReady: true,
      score: 0,
      currentLevel: 1,
      hasGuessedThisRound: false,
      status: 'connected',
      lastSeen: Date.now()
    };

    const newRoom: ServerRoom = {
      roomCode,
      hostId,
      hostToken,
      status: 'lobby',
      language,
      mixLanguages: Boolean(mixLanguages),
      players: [hostPlayer],
      trackIds: [],
      currentRoundIndex: 0,
      roundStartedAt: 0,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      bannedPlayerIds: []
    };

    await saveRoom(newRoom, context.env);
    return jsonResponse({
      roomCode,
      hostToken,
      room: sanitizeRoom(newRoom)
    });
  }

  // 2. POST /api/multiplayer/rooms/join
  if (pathname === '/api/multiplayer/rooms/join') {
    const { roomCode, playerId, displayName } = body;
    if (!roomCode || !playerId) {
      return jsonResponse({ error: 'INVALID_INPUT', message: 'Room code and player ID required.' }, 400);
    }

    const code = String(roomCode).trim().padStart(6, '0');
    const room = await getRoom(code, context.env);

    if (!room || room.status === 'closed') {
      return jsonResponse({ error: 'ROOM_NOT_FOUND', message: `Unable to join room ${code}. Please check the code and ensure the host is online.` }, 404);
    }

    if (room.bannedPlayerIds && room.bannedPlayerIds.includes(playerId)) {
      return jsonResponse({ error: 'ACCESS_REVOKED', message: 'You have been kicked by the host.' }, 403);
    }

    const existingIndex = room.players.findIndex(p => p.id === playerId);
    if (existingIndex !== -1) {
      room.players[existingIndex].status = 'connected';
      room.players[existingIndex].lastSeen = Date.now();
      if (displayName) room.players[existingIndex].displayName = displayName.trim().slice(0, 30);
    } else {
      if (room.players.length >= 20) {
        return jsonResponse({ error: 'ROOM_FULL', message: 'This room has reached the maximum capacity of 20 participants.' }, 400);
      }
      room.players.push({
        id: playerId,
        displayName: (displayName || 'Player').trim().slice(0, 30),
        avatarSeed: 'p_' + playerId.slice(0, 4),
        isHost: false,
        isReady: false,
        score: 0,
        currentLevel: 1,
        hasGuessedThisRound: false,
        status: 'connected',
        lastSeen: Date.now()
      });
    }

    await saveRoom(room, context.env);
    return jsonResponse({
      roomCode: code,
      room: sanitizeRoom(room)
    });
  }

  // Check code-based routes: /api/multiplayer/rooms/:code/...
  const actionMatch = pathname.match(/\/api\/multiplayer\/rooms\/([0-9a-zA-Z_-]+)(\/.*)?$/);
  if (!actionMatch) {
    return jsonResponse({ error: 'NOT_FOUND' }, 404);
  }

  const code = actionMatch[1].padStart(6, '0');
  const action = actionMatch[2] || '';
  const room = await getRoom(code, context.env);

  if (!room || room.status === 'closed') {
    return jsonResponse({ error: 'ROOM_NOT_FOUND', message: 'Room not found or host is offline.' }, 404);
  }

  // 3. POST /api/multiplayer/rooms/:code/host/start
  if (action === '/host/start') {
    if (room.hostToken !== body.hostToken) {
      return jsonResponse({ error: 'UNAUTHORIZED_HOST', message: 'Invalid host credentials.' }, 403);
    }
    room.status = 'playing';
    room.roundStartedAt = Date.now();
    room.currentRoundIndex = 0;
    room.players.forEach(p => {
      p.currentLevel = 1;
      p.hasGuessedThisRound = false;
      p.lastGuessCorrect = undefined;
    });
    await saveRoom(room, context.env);
    return jsonResponse({ success: true, room: sanitizeRoom(room) });
  }

  // 4. POST /api/multiplayer/rooms/:code/host/kick
  if (action === '/host/kick') {
    if (room.hostToken !== body.hostToken) {
      return jsonResponse({ error: 'UNAUTHORIZED_HOST', message: 'Invalid host credentials.' }, 403);
    }
    const targetPlayerId = body.targetPlayerId;
    if (!targetPlayerId) {
      return jsonResponse({ error: 'MISSING_TARGET_PLAYER' }, 400);
    }
    room.players = room.players.filter(p => p.id !== targetPlayerId);
    if (!room.bannedPlayerIds) room.bannedPlayerIds = [];
    if (!room.bannedPlayerIds.includes(targetPlayerId)) {
      room.bannedPlayerIds.push(targetPlayerId);
    }
    await saveRoom(room, context.env);
    return jsonResponse({ success: true, room: sanitizeRoom(room) });
  }

  // 5. POST /api/multiplayer/rooms/:code/host/settings
  if (action === '/host/settings') {
    if (room.hostToken !== body.hostToken) {
      return jsonResponse({ error: 'UNAUTHORIZED_HOST' }, 403);
    }
    if (body.language) room.language = body.language;
    if (body.mixLanguages !== undefined) room.mixLanguages = Boolean(body.mixLanguages);
    await saveRoom(room, context.env);
    return jsonResponse({ success: true, room: sanitizeRoom(room) });
  }

  // 6. POST /api/multiplayer/rooms/:code/host/close
  if (action === '/host/close') {
    if (room.hostToken !== body.hostToken) {
      return jsonResponse({ error: 'UNAUTHORIZED_HOST' }, 403);
    }
    room.status = 'closed';
    await deleteRoom(code, context.env);
    return jsonResponse({ success: true, message: 'Room closed successfully.' });
  }

  // 7. POST /api/multiplayer/rooms/:code/guess
  if (action === '/guess') {
    const { playerId, isCorrect, level = 1, points = 0 } = body;
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return jsonResponse({ error: 'PLAYER_NOT_IN_ROOM' }, 404);
    }
    if (!player.hasGuessedThisRound) {
      player.hasGuessedThisRound = true;
      const scoreMatrix: Record<number, number> = { 1: 100, 2: 70, 3: 40, 4: 20 };
      const awardedPoints = isCorrect ? (scoreMatrix[level] || 0) : (points || 0);
      player.score += awardedPoints;
      player.lastGuessCorrect = Boolean(isCorrect);
    }
    await saveRoom(room, context.env);
    return jsonResponse({ success: true, room: sanitizeRoom(room) });
  }

  // 8. POST /api/multiplayer/rooms/:code/skip-level
  if (action === '/skip-level') {
    const { playerId } = body;
    const player = room.players.find(p => p.id === playerId);
    if (!player) {
      return jsonResponse({ error: 'PLAYER_NOT_IN_ROOM' }, 404);
    }
    if (player.currentLevel < 4) {
      player.currentLevel = (player.currentLevel + 1) as 1 | 2 | 3 | 4;
    }
    await saveRoom(room, context.env);
    return jsonResponse({ success: true, players: room.players, currentLevel: player.currentLevel });
  }

  // 9. POST /api/multiplayer/rooms/:code/host/next-round
  if (action === '/host/next-round') {
    if (room.hostToken !== body.hostToken) {
      return jsonResponse({ error: 'UNAUTHORIZED_HOST' }, 403);
    }
    room.currentRoundIndex += 1;
    room.roundStartedAt = Date.now();
    room.players.forEach(p => {
      p.currentLevel = 1;
      p.hasGuessedThisRound = false;
      p.lastGuessCorrect = undefined;
    });
    await saveRoom(room, context.env);
    return jsonResponse({ success: true, room: sanitizeRoom(room) });
  }

  // 10. POST /api/multiplayer/rooms/:code/heartbeat
  if (action === '/heartbeat') {
    const { playerId } = body;
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.status = 'connected';
      player.lastSeen = Date.now();
      await saveRoom(room, context.env);
    }
    return jsonResponse({ ok: true });
  }

  return jsonResponse({ error: 'NOT_FOUND', message: `Unknown action: ${action}` }, 404);
}
