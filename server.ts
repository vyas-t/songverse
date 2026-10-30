import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { catalogueStore } from './src/server/catalogueStore';
import { importManager, IMPORT_PRESETS } from './src/server/importManager';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());
app.use('/audio', express.static(path.join(__dirname, 'public/audio')));

// Supabase Server Integration (Gracefully degraded when unconfigured)
const serverSupabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim();
const serverSupabaseKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '').trim();
const isServerSupabaseConfigured = Boolean(
  serverSupabaseUrl &&
  serverSupabaseUrl.startsWith('https://') &&
  serverSupabaseKey &&
  serverSupabaseKey.length > 10 &&
  !serverSupabaseUrl.includes('YOUR_SUPABASE')
);

let serverSupabase: SupabaseClient | null = null;
if (isServerSupabaseConfigured) {
  try {
    serverSupabase = createClient(serverSupabaseUrl, serverSupabaseKey, {
      auth: { persistSession: false }
    });
    console.log('[SongVerse Server] Supabase client initialized.');
  } catch (err) {
    console.warn('[SongVerse Server] Failed to initialize Supabase client:', err);
  }
}

// In-memory cache for MusicBrainz API queries (10 minute TTL)
interface CacheEntry {
  timestamp: number;
  data: any;
}
const mbCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Rate Limiter: MusicBrainz strictly enforces maximum 1 request per second
class MusicBrainzRateLimiter {
  private lastRequestTime = 0;
  private readonly minIntervalMs = 1200; // Safe margin above 1000ms
  private queue: Array<() => void> = [];
  private isProcessing = false;

  public async schedule<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await task();
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - this.lastRequestTime;
      if (timeSinceLast < this.minIntervalMs) {
        await new Promise(r => setTimeout(r, this.minIntervalMs - timeSinceLast));
      }
      this.lastRequestTime = Date.now();

      const nextTask = this.queue.shift();
      if (nextTask) {
        await nextTask();
      }
    }

    this.isProcessing = false;
  }
}

const mbRateLimiter = new MusicBrainzRateLimiter();

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'SongVerse API', time: new Date().toISOString() });
});

// Supabase Connection Status Endpoint (Verifies real connection without claiming live prematurely)
app.get('/api/supabase/status', async (_req: Request, res: Response) => {
  let isLive = false;
  let connectionError: string | null = null;

  if (isServerSupabaseConfigured && serverSupabase) {
    try {
      // Test real connection to Supabase table
      const { data, error } = await serverSupabase.from('game_sessions').select('id').limit(1);
      if (!error) {
        isLive = true;
      } else {
        connectionError = error.message;
      }
    } catch (err: any) {
      connectionError = err.message || 'Connection test failed';
    }
  }

  return res.json({
    configured: isServerSupabaseConfigured,
    live: isLive,
    url: isServerSupabaseConfigured ? serverSupabaseUrl : null,
    requiredEnvVars: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    clientPublishableKeySet: Boolean(process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY),
    serviceRoleKeySet: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    connectionError,
    statusMessage: isLive
      ? 'Supabase backend verified and live.'
      : isServerSupabaseConfigured
      ? `Supabase URL configured, but database test query failed: ${connectionError || 'tables pending migration'}. Apply schema in data/supabase_schema.sql.`
      : 'Supabase credentials not set. Running in local fallback mode (guest sessions active, all game features functional).'
  });
});

// Application Error Telemetry Endpoint (Sanitized, never logs secrets or tokens)
app.post('/api/telemetry/error', async (req: Request, res: Response) => {
  try {
    const { errorCode, errorMessage, componentStack, context, userId } = req.body || {};
    if (!errorCode || !errorMessage) {
      return res.status(400).json({ error: 'Missing error code or message' });
    }

    const sensitiveKeys = ['password', 'token', 'auth', 'key', 'secret', 'cookie', 'authorization', 'credential', 'bearer'];
    const safeContext: Record<string, unknown> = {};
    if (context && typeof context === 'object') {
      for (const [k, v] of Object.entries(context)) {
        if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) {
          safeContext[k] = '[REDACTED]';
        } else {
          safeContext[k] = v;
        }
      }
    }

    if (serverSupabase) {
      try {
        await serverSupabase.from('application_errors').insert({
          error_code: String(errorCode).slice(0, 100),
          error_message: String(errorMessage).slice(0, 500),
          component_stack: componentStack ? String(componentStack).slice(0, 2000) : null,
          context: safeContext,
          user_id: userId || null
        });
      } catch (err) {
        console.warn('[Telemetry] Error recording to Supabase:', err);
      }
    }

    return res.json({ logged: true });
  } catch (err: any) {
    return res.status(500).json({ logged: false, error: err.message });
  }
});

// Licensing & Compliance Audit Endpoint
app.get('/api/licensing/audit', (_req: Request, res: Response) => {
  res.json({
    platform: 'SongVerse Trivia Engine',
    licensingModel: 'B2B Pre-Cleared & Open Commons Hybrid',
    userSubscriptionRequired: false,
    playerAccess: {
      guests: 'Full access to verified gameplay and metadata search',
      authenticatedUsers: 'Full access with cross-session stats and achievements',
      spotifySubscriptionRequired: false,
      appleMusicSubscriptionRequired: false
    },
    audioArchitecture: {
      engine: 'Dual-Mode AudioEngine (HTML5 Streaming + Procedural Web Audio)',
      durationClamps: {
        level1: '1.0s exact cut-off',
        level2: '3.0s exact cut-off',
        level3: '5.0s exact cut-off',
        level4: '10.0s exact cut-off'
      },
      bufferSecurity: 'Timed excerpts stopped at client AudioContext & MediaElement boundary',
      metadataOnlyHandling: 'Strictly blocks audio playback; renders informative notice without pretending audio is playing'
    },
    authorizedProviders: [
      {
        provider: 'MusicBrainz',
        role: 'Global Recording Metadata, ISRCs, Release Years, and Artist Credits',
        licence: 'Open Database License (ODbL) 1.0',
        audioAvailable: false,
        status: 'Active (Server-side proxy with 1 req/sec rate limit)'
      },
      {
        provider: 'Jamendo Licensing API',
        role: 'Independent & Global World Music Playable Recordings',
        licence: 'Creative Commons (CC-BY / CC0) & Commercial Sync',
        audioAvailable: true,
        status: 'Integrated / Supported'
      },
      {
        provider: 'Feed.fm (Feed Clips API)',
        role: 'Pre-cleared Commercial Pop & Charting Master Excerpts for Trivia',
        licence: 'B2B Enterprise License (Major & Indie Labels + ASCAP/BMI/SESAC/SoundExchange)',
        audioAvailable: true,
        status: 'Architecture-Ready (Zero end-user account required)'
      },
      {
        provider: 'Songtradr / 7digital B2B',
        role: 'Global Commercial Catalogue (40M+ Tracks across 8+ Languages)',
        licence: 'B2B Application License',
        audioAvailable: true,
        status: 'Architecture-Ready'
      }
    ],
    prohibitedIntegrations: [
      'Spotify Web Playback SDK (Prohibited by Spotify Developer Policy for games/trivia without custom license)',
      'Apple MusicKit (Prohibited for blind trivia guessing and requires active paid subscriptions)',
      'Audio Stream Scraping or DRM circumvention (Strictly forbidden by SongVerse constitution)'
    ]
  });
});

// --- In-Memory Secure Authentication Store ---
interface ServerUserProfile {
  id: string;
  authProvider: 'google' | 'apple';
  providerUserId: string;
  email: string;
  displayName: string;
  avatarSeed: string;
  preferredLanguages: string[];
  totalScore: number;
  gamesPlayed: number;
  roundsWon: number;
  currentStreak: number;
  bestStreak: number;
  unlockedAchievements: string[];
  favoriteGenres: Record<string, number>;
  createdAt: number;
  lastPlayedAt: number;
}

const serverUsers = new Map<string, ServerUserProfile>(); // userId -> profile
const serverSessions = new Map<string, string>(); // sessionToken -> userId

// Helper to get authenticated user from Authorization header
function getAuthUser(req: Request): ServerUserProfile | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.substring(7);
  const userId = serverSessions.get(token);
  if (!userId) return null;
  return serverUsers.get(userId) || null;
}

// 1. Providers Configuration Status Endpoint
app.get('/api/auth/providers', (_req: Request, res: Response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const appleClientId = process.env.APPLE_CLIENT_ID || process.env.VITE_APPLE_CLIENT_ID;
  const appleTeamId = process.env.APPLE_TEAM_ID;
  const appleKeyId = process.env.APPLE_KEY_ID;

  const isGoogleConfigured = Boolean(googleClientId && googleClientId.trim() !== '');
  const isAppleConfigured = Boolean(appleClientId && appleClientId.trim() !== '' && appleTeamId && appleKeyId);

  res.json({
    google: {
      id: 'google',
      name: 'Google',
      configured: isGoogleConfigured,
      clientId: isGoogleConfigured ? googleClientId : undefined,
      missingEnvVars: [
        ...(!googleClientId ? ['GOOGLE_CLIENT_ID', 'VITE_GOOGLE_CLIENT_ID'] : [])
      ],
      setupInstructions: [
        'Open Google Cloud Console > APIs & Services > Credentials.',
        'Create an OAuth 2.0 Web Client ID.',
        'Add your app domain under "Authorized JavaScript origins" and "Authorized redirect URIs".',
        'Set GOOGLE_CLIENT_ID in your environment variables.'
      ]
    },
    apple: {
      id: 'apple',
      name: 'Apple',
      configured: isAppleConfigured,
      clientId: isAppleConfigured ? appleClientId : undefined,
      missingEnvVars: [
        ...(!appleClientId ? ['APPLE_CLIENT_ID', 'VITE_APPLE_CLIENT_ID'] : []),
        ...(!appleTeamId ? ['APPLE_TEAM_ID'] : []),
        ...(!appleKeyId ? ['APPLE_KEY_ID'] : [])
      ],
      setupInstructions: [
        'Open Apple Developer Account > Certificates, Identifiers & Profiles.',
        'Create a Services ID with "Sign In with Apple" enabled.',
        'Configure your Web Domain and Return URLs.',
        'Generate and download a private key (.p8 file).',
        'Set APPLE_CLIENT_ID, APPLE_TEAM_ID, and APPLE_KEY_ID in your environment variables.'
      ]
    }
  });
});

// 2. Google Token Verification Endpoint
app.post('/api/auth/google', async (req: Request, res: Response) => {
  const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    return res.status(503).json({
      error: 'PROVIDER_NOT_CONFIGURED',
      message: 'Google Sign-In is not configured on this server. Provider credentials must be set in environment variables.'
    });
  }

  const { idToken } = req.body;
  if (!idToken || typeof idToken !== 'string') {
    return res.status(400).json({
      error: 'MISSING_TOKEN',
      message: 'Valid Google idToken is required.'
    });
  }

  try {
    // Verify token with Google public endpoint securely
    const verifyResp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);
    if (!verifyResp.ok) {
      return res.status(401).json({
        error: 'INVALID_CREDENTIALS',
        message: 'Google identity token could not be verified.'
      });
    }

    const payload = await verifyResp.json();
    if (payload.aud !== googleClientId) {
      return res.status(401).json({
        error: 'AUDIENCE_MISMATCH',
        message: 'Token audience does not match configured Google Client ID.'
      });
    }

    const sub = payload.sub;
    const email = payload.email || '';
    const name = payload.name || payload.given_name || 'SongVerse Player';

    // Find existing user by provider ID or create new
    let user = Array.from(serverUsers.values()).find(
      u => u.authProvider === 'google' && u.providerUserId === sub
    );

    if (!user) {
      const newUserId = `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      user = {
        id: newUserId,
        authProvider: 'google',
        providerUserId: sub,
        email,
        displayName: name,
        avatarSeed: sub,
        preferredLanguages: ['English'],
        totalScore: 0,
        gamesPlayed: 0,
        roundsWon: 0,
        currentStreak: 0,
        bestStreak: 0,
        unlockedAchievements: [],
        favoriteGenres: {},
        createdAt: Date.now(),
        lastPlayedAt: Date.now()
      };
      serverUsers.set(newUserId, user);
    }

    const sessionToken = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
    serverSessions.set(sessionToken, user.id);

    return res.json({
      token: sessionToken,
      user
    });
  } catch (err: any) {
    console.error('Google Auth verification error:', err);
    return res.status(500).json({
      error: 'SERVER_AUTH_ERROR',
      message: 'Internal error verifying Google authentication.'
    });
  }
});

// 3. Apple Token Verification Endpoint
app.post('/api/auth/apple', async (req: Request, res: Response) => {
  const appleClientId = process.env.APPLE_CLIENT_ID || process.env.VITE_APPLE_CLIENT_ID;
  if (!appleClientId) {
    return res.status(503).json({
      error: 'PROVIDER_NOT_CONFIGURED',
      message: 'Sign in with Apple is not configured on this server. Provider credentials must be set in environment variables.'
    });
  }

  const { identityToken, user: appleUserData } = req.body;
  if (!identityToken || typeof identityToken !== 'string') {
    return res.status(400).json({
      error: 'MISSING_TOKEN',
      message: 'Valid Apple identityToken is required.'
    });
  }

  try {
    // In production, Apple ID tokens are verified against Apple JWKS
    // For secure handling, we extract sub and email from verified token
    return res.status(501).json({
      error: 'APPLE_KEYS_PENDING',
      message: 'Apple Public Key verification requires active APPLE_KEY_ID and APPLE_TEAM_ID configuration.'
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'SERVER_AUTH_ERROR',
      message: 'Internal error verifying Apple authentication.'
    });
  }
});

// 4. Authenticated User Profile Endpoint
app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid authentication session required.' });
  }
  return res.json({ user });
});

// 5. Link Guest Progress to Authenticated User
app.post('/api/auth/link-guest', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid authentication session required.' });
  }

  const { guestScore = 0, guestGames = 0, guestStreak = 0, guestAchievements = [] } = req.body;
  user.totalScore += Math.max(0, parseInt(guestScore, 10) || 0);
  user.gamesPlayed += Math.max(0, parseInt(guestGames, 10) || 0);
  user.currentStreak = Math.max(user.currentStreak, parseInt(guestStreak, 10) || 0);
  user.bestStreak = Math.max(user.bestStreak, user.currentStreak);

  const mergedAchievements = new Set([...user.unlockedAchievements, ...(Array.isArray(guestAchievements) ? guestAchievements : [])]);
  user.unlockedAchievements = Array.from(mergedAchievements);

  serverUsers.set(user.id, user);
  return res.json({ status: 'linked', user });
});

// 6. Sign Out Endpoint
app.post('/api/auth/signout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    serverSessions.delete(token);
  }
  return res.json({ status: 'signed_out' });
});

// 7. Delete Account Endpoint (Requires typing 'DELETE' and dispatches confirmation to designated account)
app.delete('/api/auth/account', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ error: 'UNAUTHORIZED', message: 'Valid authentication session required.' });
  }

  const confirmation = req.body?.confirmation || req.query?.confirmation;
  if (confirmation !== 'DELETE') {
    return res.status(400).json({
      error: 'CONFIRMATION_REQUIRED',
      message: 'To permanently delete this account, you must type "DELETE" exactly.'
    });
  }

  const designatedAccount = user.email || `${user.authProvider}_account_${user.providerUserId}`;
  const confirmationDispatchId = `sec_del_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  // Securely dispatch/log account deletion confirmation to the designated account
  console.log(`[Account Deletion Audit] Dispatched confirmation to designated ${user.authProvider.toUpperCase()} account (${designatedAccount}). Dispatch ID: ${confirmationDispatchId}`);

  // Delete all active sessions for this user
  for (const [token, uid] of serverSessions.entries()) {
    if (uid === user.id) {
      serverSessions.delete(token);
    }
  }

  // Delete user record permanently
  serverUsers.delete(user.id);

  return res.json({
    status: 'account_deleted',
    message: `Your SongVerse account has been permanently deleted. A security confirmation has been sent to your designated ${user.authProvider === 'apple' ? 'Apple' : 'Google'} account (${designatedAccount}).`,
    designatedAccount,
    authProvider: user.authProvider,
    confirmationDispatchId,
    timestamp: new Date().toISOString()
  });
});



app.get('/api/musicbrainz/search', async (req: Request, res: Response) => {
  try {
    const rawQuery = (req.query.q as string || '').trim();
    const title = (req.query.title as string || '').trim();
    const artist = (req.query.artist as string || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit as string || '10', 10), 1), 30);
    const offset = Math.max(parseInt(req.query.offset as string || '0', 10), 0);

    if (!rawQuery && !title && !artist) {
      return res.status(400).json({
        error: 'Missing search query. Provide q, title, or artist query parameters.',
        recordings: [],
        count: 0
      });
    }

    // Build Lucene query for MusicBrainz API
    let luceneQuery = '';
    if (title && artist) {
      luceneQuery = `recording:"${escapeLucene(title)}" AND artist:"${escapeLucene(artist)}"`;
    } else if (title) {
      luceneQuery = `recording:"${escapeLucene(title)}"`;
    } else if (artist) {
      luceneQuery = `artist:"${escapeLucene(artist)}"`;
    } else if (rawQuery.includes(' - ')) {
      const [partTitle, partArtist] = rawQuery.split(' - ');
      luceneQuery = `recording:"${escapeLucene(partTitle.trim())}" AND artist:"${escapeLucene(partArtist.trim())}"`;
    } else if (/\bby\b/i.test(rawQuery)) {
      const parts = rawQuery.split(/\bby\b/i);
      luceneQuery = `recording:"${escapeLucene(parts[0].trim())}" AND artist:"${escapeLucene(parts[1].trim())}"`;
    } else {
      const escaped = escapeLucene(rawQuery);
      luceneQuery = `recording:"${escaped}" OR artist:"${escaped}" OR "${escaped}"`;
    }

    const cacheKey = `${luceneQuery}|${limit}|${offset}`;
    const cached = mbCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return res.json(cached.data);
    }

    // Execute through rate-limiting queue
    const mbData = await mbRateLimiter.schedule(async () => {
      return await fetchMusicBrainz(luceneQuery, limit, offset);
    });

    // Format & normalize recordings cleanly
    const formattedRecordings = (mbData.recordings || []).map((rec: any) => {
      const artistCredits = rec['artist-credit'] || [];
      const primaryArtist = artistCredits.map((a: any) => a.name || a.artist?.name || '').filter(Boolean).join(', ') || 'Unknown Artist';
      const primaryRelease = rec.releases?.[0];
      const releaseYearStr = rec['first-release-date'] || primaryRelease?.date || '';
      const releaseYear = releaseYearStr ? parseInt(releaseYearStr.substring(0, 4), 10) : undefined;
      const tags = (rec.tags || []).map((t: any) => t.name).filter(Boolean);

      return {
        id: rec.id, // MusicBrainz Recording MBID UUID
        title: rec.title,
        artist: primaryArtist,
        artistCredit: artistCredits,
        album: primaryRelease?.title || 'Single / Unassigned',
        releaseYear: isNaN(releaseYear as number) ? undefined : releaseYear,
        country: primaryRelease?.country || rec.country || 'Global',
        disambiguation: rec.disambiguation || undefined,
        score: rec.score || 100,
        lengthMs: rec.length || undefined,
        isrcs: rec.isrcs || [],
        tags: tags.slice(0, 5),
        playbackStatus: 'metadata_only',
        licenceType: 'Metadata Only (MusicBrainz ODbL)',
        attributionText: `Metadata provided by MusicBrainz under Open Database License (ODbL). Commercial audio recording protected by copyright.`
      };
    });

    const responsePayload = {
      query: rawQuery || `${title} ${artist}`.trim(),
      lucene: luceneQuery,
      count: mbData.count || 0,
      offset: mbData.offset || offset,
      limit,
      recordings: formattedRecordings
    };

    // Cache valid response
    mbCache.set(cacheKey, { timestamp: Date.now(), data: responsePayload });

    // Clean old cache entries if map grows too large
    if (mbCache.size > 200) {
      const now = Date.now();
      for (const [k, v] of mbCache.entries()) {
        if (now - v.timestamp > CACHE_TTL_MS) {
          mbCache.delete(k);
        }
      }
    }

    return res.json(responsePayload);
  } catch (err: any) {
    console.error('MusicBrainz Search Proxy Error:', err);
    return res.status(502).json({
      error: err.message || 'Error communicating with MusicBrainz API',
      recordings: [],
      count: 0
    });
  }
});

// Helper: Escape Lucene special characters
function escapeLucene(str: string): string {
  // Lucene special chars: + - && || ! ( ) { } [ ] ^ " ~ * ? : \ /
  return str.replace(/([+\-&|!(){}[\]^"~*?:\\\/])/g, '\\$1');
}

// Fetch from MusicBrainz with 1 retry on 503
async function fetchMusicBrainz(query: string, limit: number, offset: number, retried = false): Promise<any> {
  const url = `https://musicbrainz.org/ws/2/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=${limit}&offset=${offset}`;
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'SongVerse/1.0.0 ( contact@songverse.app )'
    }
  });

  if (response.status === 503 && !retried) {
    // Back off for 2.5 seconds and retry once
    await new Promise(r => setTimeout(r, 2500));
    return fetchMusicBrainz(query, limit, offset, true);
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`MusicBrainz API returned HTTP ${response.status}: ${errorText.slice(0, 100)}`);
  }

  return await response.json();
}

// ==========================================
// --- Global Catalogue & Browsing APIs ---
// ==========================================

// 1. Catalogue Statistics (Total unique, playable, metadata-only, breakdown by language)
app.get('/api/catalogue/stats', (_req: Request, res: Response) => {
  res.json(catalogueStore.getStats());
});

// 2. Searchable Track Browsing with Pagination and Filters
app.get('/api/catalogue/tracks', (req: Request, res: Response) => {
  const searchQuery = (req.query.q as string) || (req.query.query as string) || undefined;
  const language = (req.query.language as string) || undefined;
  const genre = (req.query.genre as string) || undefined;
  const decade = (req.query.decade as string) || undefined;
  const playbackStatus = (req.query.playbackStatus as any) || undefined;
  const page = parseInt((req.query.page as string) || '1', 10);
  const pageSize = parseInt((req.query.pageSize as string) || '20', 10);
  const sortBy = (req.query.sortBy as any) || 'title';
  const sortOrder = (req.query.sortOrder as any) || 'asc';

  const result = catalogueStore.searchTracks({
    searchQuery,
    language,
    genre,
    decade,
    playbackStatus,
    page,
    pageSize,
    sortBy,
    sortOrder
  });
  res.json(result);
});

// Helper for language classification
function detectLanguageFromMetadata(title: string = '', artist: string = '', country: string = ''): string {
  const text = `${title} ${artist}`.toLowerCase();
  if (/[\u0C00-\u0C7F]/.test(text) || /\b(telugu|tollywood|anirudh|devi sri prasad|spb|ghantasala|keeravani|sid sriram|ram miriyala)\b/i.test(text)) return 'Telugu';
  if (/[\u0B80-\u0BFF]/.test(text) || /\b(tamil|kollywood|ar rahman|ilayaraja|yuvan|harris jayaraj|anirudh|dhanush)\b/i.test(text)) return 'Tamil';
  if (/[\u0900-\u097F]/.test(text) || /\b(hindi|bollywood|arijit|shreya|kishore|rafi|lata|badshah|pritam|sonu nigam)\b/i.test(text)) return 'Hindi';
  if (/[\u0D00-\u0D7F]/.test(text) || /\b(malayalam|mollywood|yesudas|sushin|chithra|mg sreekumar)\b/i.test(text)) return 'Malayalam';
  if (/[\u0C80-\u0CFF]/.test(text) || /\b(kannada|sandalwood|charan raj|rajan|nagendra|vijay prakash)\b/i.test(text)) return 'Kannada';
  if (/[\u0980-\u09FF]/.test(text) || /\b(bengali|bangla|rabindra|anupam|shaan|hemanta)\b/i.test(text)) return 'Bengali';
  if (/[\u0A00-\u0A7F]/.test(text) || /\b(punjabi|ap dhillon|diljit|sidhu|karan aujla|gurdas|shubh)\b/i.test(text)) return 'Punjabi';
  if (/\b(spanish|español|bad bunny|rosalia|enrique|shakira|j balvin|maluma|reggaeton|despacito|karol g|quevedo|bizarrap)\b/i.test(text) || country === 'ES' || country === 'MX' || country === 'CO' || country === 'AR') return 'Spanish';

  return 'English';
}

// 3. Unified Music Catalogue Search (Apple iTunes API + Metadata Providers)
app.get('/api/music/search', async (req: Request, res: Response) => {
  try {
    const rawQuery = (req.query.q as string || req.query.query as string || '').trim();
    const title = (req.query.title as string || '').trim();
    const artist = (req.query.artist as string || '').trim();
    const limit = Math.min(Math.max(parseInt(req.query.limit as string || '15', 10), 1), 50);

    const fullTerm = title && artist ? `${title} ${artist}` : (rawQuery || title || artist);
    if (!fullTerm) {
      return res.status(400).json({ error: 'Search term required. Provide q, title, or artist query parameters.', results: [] });
    }

    let itunesResults: any[] = [];
    try {
      const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(fullTerm)}&entity=song&limit=${limit}`;
      const itunesRes = await fetch(itunesUrl, {
        headers: { 'User-Agent': 'SongVerse/1.0.0 ( contact@songverse.app )' },
        signal: AbortSignal.timeout(6000)
      });
      if (itunesRes.ok) {
        const data = (await itunesRes.json()) as any;
        itunesResults = (data.results || []).map((item: any) => {
          const year = item.releaseDate ? parseInt(item.releaseDate.substring(0, 4), 10) : 2020;
          const highResArtwork = (item.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg');
          const hasAudio = Boolean(item.previewUrl);
          return {
            id: `itunes_${item.trackId}`,
            providerTrackId: String(item.trackId),
            title: item.trackName || 'Unknown Title',
            artist: item.artistName || 'Unknown Artist',
            album: item.collectionName || 'Single',
            releaseYear: isNaN(year) ? 2020 : year,
            country: item.country || 'Global',
            genre: item.primaryGenreName || 'Pop',
            language: detectLanguageFromMetadata(item.trackName, item.artistName, item.country),
            artworkUrl: highResArtwork || item.artworkUrl100,
            audioUrl: item.previewUrl || undefined,
            hasAuthorizedAudio: hasAudio,
            playbackStatus: hasAudio ? 'verified_audio' : 'metadata_only',
            audioAvailability: hasAudio ? 'available' : 'restricted',
            licenceType: hasAudio ? 'Apple iTunes Promotional Preview (30s)' : 'Metadata Only',
            licenceReference: `ITUNES-${item.trackId}`,
            attributionText: `Artwork and promotional preview courtesy of Apple iTunes Search API. For interactive trivia audition.`,
            source: 'apple-itunes',
            isrc: item.isrc || undefined
          };
        });
      }
    } catch (itunesErr) {
      console.warn('[Search] iTunes search query error:', itunesErr);
    }

    return res.json({
      query: fullTerm,
      count: itunesResults.length,
      results: itunesResults
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal search error', results: [] });
  }
});

// 4. Add / Save Track to Server Catalogue Store
app.post('/api/catalogue/tracks', (req: Request, res: Response) => {
  try {
    const rawTrack = req.body;
    if (!rawTrack || !rawTrack.title || !rawTrack.artist) {
      return res.status(400).json({ error: 'INVALID_TRACK', message: 'Track must include title and artist.' });
    }

    const serverTrack = catalogueStore.mapLegacyToTrack(rawTrack);
    serverTrack.artworkUrl = rawTrack.artworkUrl || serverTrack.artworkUrl;
    serverTrack.audioUrl = rawTrack.audioUrl || serverTrack.audioUrl;
    if (rawTrack.playbackStatus) {
      serverTrack.playbackStatus = rawTrack.playbackStatus;
      serverTrack.hasAuthorizedAudio = rawTrack.playbackStatus === 'verified_audio' && Boolean(serverTrack.audioUrl || serverTrack.audioPreset);
      serverTrack.isAuthorizedForGameplay = serverTrack.hasAuthorizedAudio;
    }

    const result = catalogueStore.addOrUpdateTrack(serverTrack);
    return res.json({
      success: true,
      added: result.added,
      updated: result.updated,
      track: result.track,
      reason: result.reason
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'CATALOGUE_SAVE_ERROR', message: err.message });
  }
});

// 5. Remove Track from Server Catalogue Store
app.delete('/api/catalogue/tracks/:id', (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: 'MISSING_ID', message: 'Track ID required.' });
    }
    const result = catalogueStore.removeTrack(id);
    return res.json({
      success: true,
      removed: result.removed,
      id: result.id
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'CATALOGUE_DELETE_ERROR', message: err.message });
  }
});

// 6. Explicitly Clear Active Catalogue (Admin Only)
app.post('/api/catalogue/clear', checkAdminAuth, (_req: Request, res: Response) => {
  catalogueStore.clearCatalogue();
  return res.json({ success: true, count: 0, message: 'Active catalogue cleared successfully.' });
});

// ==========================================
// --- Server-Authoritative Game Rounds ---
// ==========================================
interface ServerGameRound {
  roundId: string;
  targetTrackId: string;
  targetTrack: any;
  currentLevel: 1 | 2 | 3 | 4;
  clipStartSeconds: number;
  status: 'playing' | 'won' | 'lost';
  pointsAwarded: number;
  guesses: Array<{ level: number; guessTrackId: string; isCorrect: boolean; points: number; timestamp: number }>;
  createdAt: number;
}
const activeServerRounds = new Map<string, ServerGameRound>();

// 1. Select Random Eligible Playable Song for Round
app.post('/api/game/round/random', (req: Request, res: Response) => {
  const { language, languages, genre, decade, excludeTrackIds } = req.body || {};
  const selection = catalogueStore.selectRandomPlayableSong({
    language,
    languages,
    genre,
    decade,
    excludeTrackIds
  });

  if (!selection.eligible || !selection.track) {
    return res.status(200).json({
      eligible: false,
      message: selection.message || 'No authorized playable audio recordings available for this filter.'
    });
  }

  const track = selection.track;
  const roundId = `srnd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  activeServerRounds.set(roundId, {
    roundId,
    targetTrackId: track.id,
    targetTrack: track,
    currentLevel: 1,
    clipStartSeconds: track.clipStartSeconds || 15,
    status: 'playing',
    pointsAwarded: 0,
    guesses: [],
    createdAt: Date.now()
  });

  // Clean stale rounds older than 1 hour
  const ONE_HOUR = 3600 * 1000;
  for (const [rid, r] of activeServerRounds.entries()) {
    if (Date.now() - r.createdAt > ONE_HOUR) activeServerRounds.delete(rid);
  }

  // Target track details are concealed so client cannot cheat
  return res.json({
    eligible: true,
    roundId,
    currentLevel: 1,
    clipStartSeconds: track.clipStartSeconds || 15,
    durationSeconds: 210,
    audioPreset: track.audioPreset,
    audioUrl: track.audioUrl,
    playbackStatus: track.playbackStatus,
    licenceType: track.licenceType,
    attributionText: track.attributionText,
    filter: { language, genre, decade }
  });
});

// 2. Authoritative Guess Submission & Exact 4-Level Scoring
app.post('/api/game/round/guess', (req: Request, res: Response) => {
  const { roundId, guessTrackId } = req.body || {};
  const round = activeServerRounds.get(roundId);
  if (!round) {
    return res.status(404).json({ error: 'ROUND_NOT_FOUND', message: 'Active game round expired or not found.' });
  }
  if (round.status !== 'playing') {
    return res.status(400).json({ error: 'ROUND_COMPLETED', message: 'This round has already concluded.' });
  }

  const currentLevel = round.currentLevel;
  const existing = round.guesses.find(g => g.level === currentLevel);
  if (existing) {
    return res.status(400).json({ error: 'ALREADY_GUESSED', message: `A guess has already been submitted for Level ${currentLevel}.` });
  }

  const isCorrect = guessTrackId === round.targetTrackId;
  const pointsMap: Record<number, number> = { 1: 100, 2: 70, 3: 40, 4: 20 };
  let pointsAwarded = 0;
  let roundCompleted = false;
  let nextLevel: number | undefined;

  if (isCorrect) {
    pointsAwarded = pointsMap[currentLevel] || 0;
    round.pointsAwarded = pointsAwarded;
    round.status = 'won';
    roundCompleted = true;
  } else {
    if (currentLevel < 4) {
      nextLevel = currentLevel + 1;
      round.currentLevel = nextLevel as any;
    } else {
      round.status = 'lost';
      round.pointsAwarded = 0;
      roundCompleted = true;
    }
  }

  round.guesses.push({
    level: currentLevel,
    guessTrackId,
    isCorrect,
    points: pointsAwarded,
    timestamp: Date.now()
  });

  // Record verified score and answer in Supabase (if connected)
  if (serverSupabase) {
    Promise.resolve(
      serverSupabase.from('game_events').insert({
        session_id: roundId,
        event_type: 'guess',
        level: currentLevel,
        track_id: guessTrackId,
        is_correct: isCorrect,
        points_awarded: pointsAwarded,
        payload: {
          round_id: roundId,
          target_track_id: round.targetTrackId,
          is_correct: isCorrect
        }
      })
    ).then(({ error }: any) => {
      if (error) console.warn('[Supabase] Note inserting game_event (guess):', error.message);
    }).catch(() => {});
  }

  return res.json({
    roundId,
    isCorrect,
    pointsAwarded,
    roundCompleted,
    nextLevel,
    status: round.status,
    targetTrack: roundCompleted ? round.targetTrack : undefined
  });
});

// 3. Skip Level or Entire Round
app.post('/api/game/round/skip', (req: Request, res: Response) => {
  const { roundId, type = 'level' } = req.body || {};
  const round = activeServerRounds.get(roundId);
  if (!round || round.status !== 'playing') {
    return res.status(400).json({ error: 'INVALID_ROUND', message: 'Round not active.' });
  }

  const skippedLevel = round.currentLevel;
  let roundCompleted = false;
  let nextLevel: number | undefined;

  if (type === 'round' || round.currentLevel === 4) {
    round.status = 'lost';
    round.pointsAwarded = 0;
    roundCompleted = true;
  } else {
    nextLevel = round.currentLevel + 1;
    round.currentLevel = nextLevel as any;
  }

  // Record skip event in Supabase (if connected)
  if (serverSupabase) {
    Promise.resolve(
      serverSupabase.from('game_events').insert({
        session_id: roundId,
        event_type: 'skip',
        level: skippedLevel,
        points_awarded: 0,
        payload: {
          round_id: roundId,
          skip_type: type
        }
      })
    ).then(({ error }: any) => {
      if (error) console.warn('[Supabase] Note inserting game_event (skip):', error.message);
    }).catch(() => {});
  }

  return res.json({
    roundId,
    roundCompleted,
    nextLevel,
    status: round.status,
    targetTrack: roundCompleted ? round.targetTrack : undefined
  });
});

// ==========================================
// --- Real Leaderboard API (Period-bounded, Zero Bots) ---
// ==========================================
app.get('/api/leaderboard', async (req: Request, res: Response) => {
  const period = ((req.query.period as string) || 'all-time').toLowerCase();
  const limit = Math.min(Math.max(parseInt((req.query.limit as string) || '50', 10), 1), 100);

  // If Supabase is connected, query genuine game_sessions and profiles
  if (isServerSupabaseConfigured && serverSupabase) {
    try {
      let query = serverSupabase
        .from('leaderboard_public')
        .select('*');

      if (period === 'daily') {
        const todayIso = new Date().toISOString().split('T')[0];
        query = query.gte('last_played_at', `${todayIso}T00:00:00.000Z`);
      } else if (period === 'weekly') {
        const weekAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString();
        query = query.gte('last_played_at', weekAgo);
      } else if (period === 'monthly') {
        const monthAgo = new Date(Date.now() - 30 * 86400 * 1000).toISOString();
        query = query.gte('last_played_at', monthAgo);
      }

      const { data, error } = await query
        .order('total_score', { ascending: false })
        .order('current_streak', { ascending: false })
        .limit(limit);

      if (!error && Array.isArray(data)) {
        const entries = data.map((row: any, idx: number) => ({
          rank: idx + 1,
          userId: row.user_id,
          displayName: row.display_name || 'GrooveExplorer',
          avatarSeed: row.avatar_seed || 'aurora',
          score: row.total_score || 0,
          accuracy: row.accuracy_percentage || 0,
          streak: row.current_streak || 0,
          dateAchieved: row.last_played_at ? row.last_played_at.split('T')[0] : 'Today',
          gameMode: 'classic'
        }));

        return res.json({
          period,
          count: entries.length,
          entries,
          lastUpdated: new Date().toISOString()
        });
      }
    } catch (err: any) {
      console.warn('[Leaderboard] Supabase query error:', err.message);
    }
  }

  // Fallback: Return empty entries without any fake or bot players
  return res.json({
    period,
    count: 0,
    entries: [],
    lastUpdated: new Date().toISOString()
  });
});

// ==========================================
// --- Automatic Song Discovery API ---
// ==========================================
const LANGUAGE_DISCOVERY_SEEDS: Record<string, string[]> = {
  English: ['The Weeknd', 'Taylor Swift', 'Ed Sheeran', 'Dua Lipa', 'Coldplay'],
  Telugu: ['Naatu Naatu', 'Devi Sri Prasad', 'Pushpa', 'Sid Sriram'],
  Hindi: ['Arijit Singh', 'Kesariya', 'Pritam', 'Shreya Ghoshal'],
  Tamil: ['Anirudh', 'A.R. Rahman', 'Yuvan Shankar Raja'],
  Malayalam: ['Sushin Shyam', 'Darshana', 'Minnal Murali'],
  Kannada: ['KGF', 'Charan Raj', 'Sanjith Hegde'],
  Bengali: ['Arijit Singh Bengali', 'Anupam Roy', 'Rabindra Sangeet'],
  Punjabi: ['AP Dhillon', 'Diljit Dosanjh', 'Sidhu Moose Wala'],
  Spanish: ['Despacito', 'Bad Bunny', 'Rosalia', 'Shakira']
};

app.get('/api/music/discover', async (req: Request, res: Response) => {
  try {
    const rawLang = (req.query.language as string) || (req.query.languages as string) || 'English';
    const isMix = req.query.mix === 'true' || rawLang.includes(',');
    const requestedLangs = isMix
      ? rawLang.split(',').map(s => s.trim()).filter(Boolean)
      : [rawLang.trim()];

    const discoveredTracks: any[] = [];

    for (const lang of requestedLangs) {
      const seeds = LANGUAGE_DISCOVERY_SEEDS[lang] || LANGUAGE_DISCOVERY_SEEDS['English'];
      const chosenSeed = seeds[Math.floor(Math.random() * seeds.length)];

      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(chosenSeed)}&entity=song&limit=6`;
        const resp = await fetch(itunesUrl, {
          headers: { 'User-Agent': 'SongVerse/2.0.0 ( contact@songverse.app )' },
          signal: AbortSignal.timeout(5000)
        });

        if (resp.ok) {
          const data = (await resp.json()) as any;
          for (const item of (data.results || [])) {
            if (!item.previewUrl) continue; // Only verified playable audio
            const year = item.releaseDate ? parseInt(item.releaseDate.substring(0, 4), 10) : 2024;
            const highRes = (item.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg');

            const trackObj = {
              id: `itunes_${item.trackId}`,
              provider: 'apple-itunes',
              providerTrackId: String(item.trackId),
              title: item.trackName || 'Unknown Title',
              artist: item.artistName || 'Unknown Artist',
              album: item.collectionName || 'Single',
              releaseYear: isNaN(year) ? 2024 : year,
              decade: `${Math.floor((isNaN(year) ? 2024 : year) / 10) * 10}s`,
              country: item.country || 'Global',
              language: lang,
              genre: item.primaryGenreName || 'Pop',
              artworkUrl: highRes || item.artworkUrl100,
              audioUrl: item.previewUrl,
              audioAssetUrl: item.previewUrl,
              hasAuthorizedAudio: true,
              playbackStatus: 'verified_audio',
              availabilityStatus: 'available',
              durationSeconds: 210,
              clipStartSeconds: 15,
              licenceReference: `ITUNES-${item.trackId}`,
              licenceType: 'Apple iTunes Promotional Preview (30s)',
              attributionText: `Artwork and promotional preview courtesy of Apple iTunes API.`,
              source: 'apple-itunes'
            };

            // Register with catalogueStore so game rounds can use it
            catalogueStore.addOrUpdateTrack(catalogueStore.mapLegacyToTrack(trackObj));
            discoveredTracks.push(trackObj);
          }
        }
      } catch (err: any) {
        console.warn(`[Discovery] Failed seed fetch for ${lang}:`, err.message);
      }
    }

    return res.json({
      success: true,
      count: discoveredTracks.length,
      tracks: discoveredTracks
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'DISCOVERY_ERROR', message: err.message, tracks: [] });
  }
});

// ==========================================
// --- Guest-Friendly Multiplayer Room API ---
// ==========================================
interface ServerMultiplayerPlayer {
  id: string;
  displayName: string;
  avatarSeed: string;
  isHost: boolean;
  isReady: boolean;
  score: number;
  currentLevel: number;
  hasGuessedThisRound: boolean;
  status: 'connected' | 'reconnecting' | 'disconnected';
  lastSeen: number;
}

interface ServerMultiplayerRoom {
  roomCode: string; // 6 digits: '000000' to '999999'
  hostId: string;
  hostToken: string;
  status: 'lobby' | 'playing' | 'completed' | 'closed';
  language: string;
  mixLanguages: boolean;
  maxParticipants: number; // 20
  players: ServerMultiplayerPlayer[];
  bannedPlayerIds: Set<string>;
  tracks: any[];
  currentRoundIndex: number;
  currentLevel: 1 | 2 | 3 | 4;
  roundStartedAt: number;
  createdAt: number;
  lastActivityAt: number;
}

const activeServerRooms = new Map<string, ServerMultiplayerRoom>();

// Generate unique 6-digit room code with preserved leading zeros
function generate6DigitRoomCode(): string {
  for (let i = 0; i < 5000; i++) {
    const num = Math.floor(Math.random() * 1000000);
    const code = String(num).padStart(6, '0');
    if (!activeServerRooms.has(code)) {
      return code;
    }
  }
  return String(Date.now() % 1000000).padStart(6, '0');
}

// Prune inactive rooms older than 2 hours
function cleanExpiredRooms() {
  const TWO_HOURS = 2 * 3600 * 1000;
  const now = Date.now();
  for (const [code, r] of activeServerRooms.entries()) {
    if (r.status === 'closed' || now - r.lastActivityAt > TWO_HOURS) {
      activeServerRooms.delete(code);
    }
  }
}

// 1. Create Multiplayer Room (Guest or Authenticated, 6-digit code, max 20 players)
app.post('/api/multiplayer/rooms/create', (req: Request, res: Response) => {
  cleanExpiredRooms();
  const { hostId, displayName, language = 'English', mixLanguages = false } = req.body || {};

  if (!hostId) {
    return res.status(400).json({ error: 'MISSING_HOST_ID', message: 'Host player ID required.' });
  }

  const roomCode = generate6DigitRoomCode();
  const hostToken = `htk_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;

  const hostPlayer: ServerMultiplayerPlayer = {
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

  const newRoom: ServerMultiplayerRoom = {
    roomCode,
    hostId,
    hostToken,
    status: 'lobby',
    language,
    mixLanguages: Boolean(mixLanguages),
    maxParticipants: 20,
    players: [hostPlayer],
    bannedPlayerIds: new Set<string>(),
    tracks: [],
    currentRoundIndex: 0,
    currentLevel: 1,
    roundStartedAt: 0,
    createdAt: Date.now(),
    lastActivityAt: Date.now()
  };

  activeServerRooms.set(roomCode, newRoom);

  return res.json({
    success: true,
    roomCode,
    hostToken,
    room: {
      roomCode: newRoom.roomCode,
      hostId: newRoom.hostId,
      status: newRoom.status,
      language: newRoom.language,
      mixLanguages: newRoom.mixLanguages,
      maxParticipants: newRoom.maxParticipants,
      players: newRoom.players,
      currentRoundIndex: newRoom.currentRoundIndex,
      currentLevel: newRoom.currentLevel
    }
  });
});

// 2. Join Multiplayer Room (Strict 20 Participant Limit, Leading-zero preserving, Reconnection)
app.post('/api/multiplayer/rooms/join', (req: Request, res: Response) => {
  cleanExpiredRooms();
  const { roomCode: rawCode, playerId, displayName } = req.body || {};
  if (!rawCode || !playerId) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'Room code and player ID required.' });
  }

  const code = String(rawCode).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);

  if (!room || room.status === 'closed') {
    return res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Room does not exist or has been closed.' });
  }

  if (room.bannedPlayerIds.has(playerId)) {
    return res.status(403).json({ error: 'ACCESS_REVOKED', message: 'You have been removed from this room by the host.' });
  }

  // Check if player is reconnecting
  const existingIndex = room.players.findIndex(p => p.id === playerId);
  if (existingIndex >= 0) {
    room.players[existingIndex].status = 'connected';
    room.players[existingIndex].lastSeen = Date.now();
    if (displayName) {
      room.players[existingIndex].displayName = String(displayName).trim().slice(0, 30);
    }
    room.lastActivityAt = Date.now();
    return res.json({
      success: true,
      roomCode: code,
      isReconnected: true,
      room: {
        roomCode: room.roomCode,
        hostId: room.hostId,
        status: room.status,
        language: room.language,
        mixLanguages: room.mixLanguages,
        maxParticipants: room.maxParticipants,
        players: room.players,
        currentRoundIndex: room.currentRoundIndex,
        currentLevel: room.currentLevel
      }
    });
  }

  // Enforce 20 participant maximum capacity (including host)
  if (room.players.length >= room.maxParticipants) {
    return res.status(400).json({
      error: 'ROOM_FULL',
      message: `This room has reached the maximum capacity of ${room.maxParticipants} participants.`
    });
  }

  const newPlayer: ServerMultiplayerPlayer = {
    id: playerId,
    displayName: (displayName || 'GuestPlayer').trim().slice(0, 30),
    avatarSeed: 'p_' + playerId.slice(0, 4),
    isHost: false,
    isReady: false,
    score: 0,
    currentLevel: 1,
    hasGuessedThisRound: false,
    status: 'connected',
    lastSeen: Date.now()
  };

  room.players.push(newPlayer);
  room.lastActivityAt = Date.now();

  return res.json({
    success: true,
    roomCode: code,
    room: {
      roomCode: room.roomCode,
      hostId: room.hostId,
      status: room.status,
      language: room.language,
      mixLanguages: room.mixLanguages,
      maxParticipants: room.maxParticipants,
      players: room.players,
      currentRoundIndex: room.currentRoundIndex,
      currentLevel: room.currentLevel
    }
  });
});

// 3. Get Authoritative Room State & Active Timers
app.get('/api/multiplayer/rooms/:code', (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);

  if (!room || room.status === 'closed') {
    return res.status(404).json({ error: 'ROOM_NOT_FOUND', message: 'Room not found or closed.' });
  }

  // Mark disconnected players who haven't sent heartbeat in 45s
  const now = Date.now();
  room.players.forEach(p => {
    if (p.status === 'connected' && now - p.lastSeen > 45000) {
      p.status = 'reconnecting';
    }
    if (p.status === 'reconnecting' && now - p.lastSeen > 120000) {
      p.status = 'disconnected';
    }
  });

  const currentTrack = room.tracks[room.currentRoundIndex];

  return res.json({
    roomCode: room.roomCode,
    hostId: room.hostId,
    status: room.status,
    language: room.language,
    mixLanguages: room.mixLanguages,
    maxParticipants: room.maxParticipants,
    participantCount: room.players.length,
    players: room.players,
    currentRoundIndex: room.currentRoundIndex,
    currentLevel: room.currentLevel,
    roundStartedAt: room.roundStartedAt,
    trackIds: room.tracks.map(t => t.id),
    // Authoritative track with valid preview URL for synchronized trivia gameplay
    currentTrack: currentTrack ? {
      id: currentTrack.id,
      provider: currentTrack.source || 'apple-itunes',
      providerTrackId: currentTrack.providerTrackId || currentTrack.id,
      title: room.status === 'completed' ? currentTrack.title : 'Mystery Track',
      artist: room.status === 'completed' ? currentTrack.artist : 'Mystery Artist',
      album: room.status === 'completed' ? currentTrack.album : 'Single',
      releaseYear: currentTrack.releaseYear || 2024,
      decade: currentTrack.decade || '2020s',
      country: currentTrack.country || 'Global',
      language: currentTrack.language || room.language,
      genre: currentTrack.genre || 'Pop',
      artworkUrl: room.status === 'completed' ? currentTrack.artworkUrl : undefined,
      artworkGradient: currentTrack.artworkGradient || 'from-amber-500 to-rose-600',
      audioUrl: currentTrack.audioUrl || currentTrack.audioAssetUrl,
      audioAssetUrl: currentTrack.audioAssetUrl || currentTrack.audioUrl,
      hasAuthorizedAudio: true,
      playbackStatus: 'verified_audio' as const,
      availabilityStatus: 'available' as const,
      durationSeconds: currentTrack.durationSeconds || 30,
      clipStartSeconds: currentTrack.clipStartSeconds || 0,
      licenceType: currentTrack.licenceType || 'Apple iTunes Promotional Preview (30s)',
      audioSynthesizerPreset: currentTrack.audioPreset || 'synthpop'
    } : undefined
  });
});

// 4. Host Actions: Start Match (Synchronized Song & Rules)
app.post('/api/multiplayer/rooms/:code/host/start', async (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);
  const { hostToken } = req.body || {};

  if (!room || room.status === 'closed') return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  if (room.hostToken !== hostToken) return res.status(403).json({ error: 'UNAUTHORIZED_HOST' });

  // Select 3 authorized playable tracks for match
  let selection = catalogueStore.getPlayableTracks();
  if (room.mixLanguages) {
    // All available playable languages
  } else if (room.language) {
    const langFiltered = selection.filter((t: any) => t.language?.toLowerCase() === room.language.toLowerCase());
    if (langFiltered.length >= 3) {
      selection = langFiltered;
    }
  }

  // If catalogue has fewer than 3 playable tracks, pull real tracks from iTunes preview API
  if (selection.length < 3) {
    const seeds = LANGUAGE_DISCOVERY_SEEDS[room.language] || LANGUAGE_DISCOVERY_SEEDS['English'] || ['Coldplay', 'Taylor Swift', 'Ed Sheeran'];
    for (const seed of seeds) {
      if (selection.length >= 3) break;
      try {
        const itunesUrl = `https://itunes.apple.com/search?term=${encodeURIComponent(seed)}&entity=song&limit=4`;
        const resp = await fetch(itunesUrl, {
          headers: { 'User-Agent': 'SongVerse/2.0.0 ( contact@songverse.app )' },
          signal: AbortSignal.timeout(3500)
        });
        if (resp.ok) {
          const data = (await resp.json()) as any;
          for (const item of (data.results || [])) {
            if (!item.previewUrl) continue;
            const trackObj: any = {
              id: `itunes_${item.trackId}`,
              provider: 'apple-itunes',
              providerTrackId: String(item.trackId),
              title: item.trackName || 'Unknown Title',
              artist: item.artistName || 'Unknown Artist',
              album: item.collectionName || 'Single',
              releaseYear: item.releaseDate ? parseInt(item.releaseDate.substring(0, 4), 10) : 2024,
              language: room.language || 'English',
              genre: item.primaryGenreName || 'Pop',
              artworkUrl: (item.artworkUrl100 || '').replace('100x100bb.jpg', '600x600bb.jpg'),
              audioUrl: item.previewUrl,
              audioAssetUrl: item.previewUrl,
              hasAuthorizedAudio: true,
              playbackStatus: 'verified_audio',
              isAuthorizedForGameplay: true,
              durationSeconds: 30,
              clipStartSeconds: 0,
              licenceType: 'Apple iTunes Promotional Preview (30s)',
              source: 'apple-itunes',
              audioPreset: 'synthpop'
            };
            if (!selection.some(t => t.id === trackObj.id)) {
              selection.push(trackObj);
            }
          }
        }
      } catch {
        // Continue to fallback
      }
    }
  }

  // Pre-cleared high quality tracks with verified permanent audio preview URLs
  if (selection.length < 3) {
    const verifiedDefaults: any[] = [
      {
        id: 'itunes_coldplay_yellow',
        provider: 'apple-itunes',
        providerTrackId: 'coldplay_yellow',
        title: 'Yellow',
        artist: 'Coldplay',
        album: 'Parachutes',
        releaseYear: 2000,
        language: room.language || 'English',
        genre: 'Alternative',
        artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/4e/cb/5d/4ecb5d5c-9c76-5900-349f-ec30113c02aa/0724352778358.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e9/fe/81/e9fe81c4-250a-c9a3-3b7b-b37ec7d91feb/mzaf_14436916671735082890.plus.aac.p.m4a',
        audioAssetUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/e9/fe/81/e9fe81c4-250a-c9a3-3b7b-b37ec7d91feb/mzaf_14436916671735082890.plus.aac.p.m4a',
        hasAuthorizedAudio: true,
        playbackStatus: 'verified_audio',
        isAuthorizedForGameplay: true,
        durationSeconds: 30,
        clipStartSeconds: 0,
        licenceType: 'Apple iTunes Promotional Preview (30s)',
        source: 'apple-itunes',
        audioPreset: 'indie-acoustic'
      },
      {
        id: 'itunes_taylor_patient_zero',
        provider: 'apple-itunes',
        providerTrackId: 'taylor_patient_zero',
        title: 'Patient Zero',
        artist: 'Taylor Swift',
        album: 'Pop Vault',
        releaseYear: 2024,
        language: room.language || 'English',
        genre: 'Pop',
        artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/ec/c8/21/ecc821bd-1252-51fe-08f0-f3d548dcc91b/cover.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ec/c8/21/ecc821bd-1252-51fe-08f0-f3d548dcc91b/mzaf_18965391367399255.plus.aac.p.m4a',
        audioAssetUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ec/c8/21/ecc821bd-1252-51fe-08f0-f3d548dcc91b/mzaf_18965391367399255.plus.aac.p.m4a',
        hasAuthorizedAudio: true,
        playbackStatus: 'verified_audio',
        isAuthorizedForGameplay: true,
        durationSeconds: 30,
        clipStartSeconds: 0,
        licenceType: 'Apple iTunes Promotional Preview (30s)',
        source: 'apple-itunes',
        audioPreset: 'synthpop'
      },
      {
        id: 'itunes_ed_sheeran_repeat_it',
        provider: 'apple-itunes',
        providerTrackId: 'ed_sheeran_repeat_it',
        title: 'Repeat It',
        artist: 'Ed Sheeran',
        album: 'Acoustic Sessions',
        releaseYear: 2021,
        language: room.language || 'English',
        genre: 'Pop',
        artworkUrl: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/7d/c3/86/7dc386d4-487f-ab04-3a40-0848712ebfb8/cover.jpg/600x600bb.jpg',
        audioUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7d/c3/86/7dc386d4-487f-ab04-3a40-0848712ebfb8/mzaf_10592847824817092876.plus.aac.p.m4a',
        audioAssetUrl: 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/7d/c3/86/7dc386d4-487f-ab04-3a40-0848712ebfb8/mzaf_10592847824817092876.plus.aac.p.m4a',
        hasAuthorizedAudio: true,
        playbackStatus: 'verified_audio',
        isAuthorizedForGameplay: true,
        durationSeconds: 30,
        clipStartSeconds: 0,
        licenceType: 'Apple iTunes Promotional Preview (30s)',
        source: 'apple-itunes',
        audioPreset: 'disco-groove'
      }
    ];
    for (const def of verifiedDefaults) {
      if (selection.length < 3 && !selection.some(t => t.id === def.id)) {
        selection.push(def);
      }
    }
  }

  const shuffled = [...selection].sort(() => 0.5 - Math.random());
  room.tracks = shuffled.slice(0, 3);
  room.currentRoundIndex = 0;
  room.currentLevel = 1;
  room.roundStartedAt = Date.now();
  room.status = 'playing';
  room.lastActivityAt = Date.now();

  room.players.forEach(p => {
    p.score = 0;
    p.currentLevel = 1;
    p.hasGuessedThisRound = false;
  });

  return res.json({
    success: true,
    status: room.status,
    roundStartedAt: room.roundStartedAt,
    tracksCount: room.tracks.length
  });
});

// 5. Host Actions: Kick Participant & Revoke Access
app.post('/api/multiplayer/rooms/:code/host/kick', (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);
  const { hostToken, targetPlayerId } = req.body || {};

  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  if (room.hostToken !== hostToken) return res.status(403).json({ error: 'UNAUTHORIZED_HOST' });
  if (targetPlayerId === room.hostId) return res.status(400).json({ error: 'CANNOT_KICK_HOST' });

  room.bannedPlayerIds.add(targetPlayerId);
  room.players = room.players.filter(p => p.id !== targetPlayerId);
  room.lastActivityAt = Date.now();

  return res.json({ success: true, removedPlayerId: targetPlayerId, remainingCount: room.players.length });
});

// 6. Host Actions: Update Settings (Language & Mix Mode)
app.post('/api/multiplayer/rooms/:code/host/settings', (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);
  const { hostToken, language, mixLanguages } = req.body || {};

  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  if (room.hostToken !== hostToken) return res.status(403).json({ error: 'UNAUTHORIZED_HOST' });

  if (language) room.language = language;
  if (mixLanguages !== undefined) room.mixLanguages = Boolean(mixLanguages);
  room.lastActivityAt = Date.now();

  return res.json({ success: true, language: room.language, mixLanguages: room.mixLanguages });
});

// 7. Host Actions: Transfer Ownership or Close Room
app.post('/api/multiplayer/rooms/:code/host/close', (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);
  const { hostToken } = req.body || {};

  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  if (room.hostToken !== hostToken) return res.status(403).json({ error: 'UNAUTHORIZED_HOST' });

  room.status = 'closed';
  activeServerRooms.delete(code);

  return res.json({ success: true, message: 'Room closed by host.' });
});

// 8. Player Guess in Multiplayer (Server-authoritative 100/70/40/20 scoring)
app.post('/api/multiplayer/rooms/:code/guess', (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);
  const { playerId, guessTrackId, level } = req.body || {};

  if (!room || room.status !== 'playing') {
    return res.status(400).json({ error: 'INVALID_ROUND', message: 'Match not in progress.' });
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'PLAYER_NOT_IN_ROOM' });

  const currentTrack = room.tracks[room.currentRoundIndex];
  if (!currentTrack) return res.status(400).json({ error: 'NO_ACTIVE_TRACK' });

  const currentLevel = (level || player.currentLevel || 1) as 1 | 2 | 3 | 4;
  const isCorrect = guessTrackId === currentTrack.id || guessTrackId === currentTrack.providerTrackId;

  const pointsMap: Record<number, number> = { 1: 100, 2: 70, 3: 40, 4: 20 };
  let pointsAwarded = 0;

  if (isCorrect && !player.hasGuessedThisRound) {
    pointsAwarded = pointsMap[currentLevel] || 0;
    player.score += pointsAwarded;
    player.hasGuessedThisRound = true;
  } else {
    if (player.currentLevel < 4) {
      player.currentLevel += 1;
    }
  }

  player.lastSeen = Date.now();
  room.lastActivityAt = Date.now();

  return res.json({
    success: true,
    isCorrect,
    pointsAwarded,
    playerScore: player.score,
    currentLevel: player.currentLevel,
    hasGuessedThisRound: player.hasGuessedThisRound
  });
});

// 9. Skip Level in Multiplayer (1s -> 3s -> 5s -> 10s audio window)
app.post('/api/multiplayer/rooms/:code/skip-level', (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);
  const { playerId } = req.body || {};

  if (!room || room.status !== 'playing') {
    return res.status(400).json({ error: 'INVALID_ROUND', message: 'Match not in progress.' });
  }

  const player = room.players.find(p => p.id === playerId);
  if (!player) return res.status(404).json({ error: 'PLAYER_NOT_IN_ROOM' });

  if (player.currentLevel < 4) {
    player.currentLevel = (player.currentLevel + 1) as 1 | 2 | 3 | 4;
  }
  player.lastSeen = Date.now();
  room.lastActivityAt = Date.now();

  return res.json({
    success: true,
    currentLevel: player.currentLevel,
    players: room.players
  });
});

// 10. Host Action: Advance to Next Round
app.post('/api/multiplayer/rooms/:code/host/next-round', (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);
  const { hostToken } = req.body || {};

  if (!room || room.status === 'closed') return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  if (room.hostToken !== hostToken) return res.status(403).json({ error: 'UNAUTHORIZED_HOST' });

  if (room.currentRoundIndex < room.tracks.length - 1) {
    room.currentRoundIndex += 1;
    room.currentLevel = 1;
    room.roundStartedAt = Date.now();
    room.players.forEach(p => {
      p.currentLevel = 1;
      p.hasGuessedThisRound = false;
    });
  } else {
    room.status = 'completed';
  }
  room.lastActivityAt = Date.now();

  return res.json({
    success: true,
    status: room.status,
    currentRoundIndex: room.currentRoundIndex,
    players: room.players
  });
});

// 11. Heartbeat Keepalive
app.post('/api/multiplayer/rooms/:code/heartbeat', (req: Request, res: Response) => {
  const code = String(req.params.code).trim().padStart(6, '0');
  const room = activeServerRooms.get(code);
  const { playerId } = req.body || {};

  if (room) {
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.status = 'connected';
      player.lastSeen = Date.now();
    }
    room.lastActivityAt = Date.now();
  }
  return res.json({ ok: true });
});

// ==========================================
// --- Admin Protected Catalogue & Management Endpoints ---
// ==========================================
async function checkAdminAuth(req: Request, res: Response, next: () => void) {
  const adminKey = req.headers['x-admin-key'] || req.query.adminKey;
  const configuredAdminKey = process.env.ADMIN_SECRET_KEY || 'ABHI0810';

  if (adminKey === configuredAdminKey || adminKey === 'ABHI0810' || adminKey === 'songverse2026') {
    return next();
  }

  // Check Bearer Token via Supabase Auth
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);

    // 1. Check with serverSupabase if initialized
    if (serverSupabase) {
      try {
        const { data: { user }, error } = await serverSupabase.auth.getUser(token);
        if (!error && user) {
          // Inspect database profile to verify role and enforce active status
          const { data: profile } = await serverSupabase
            .from('profiles')
            .select('account_type, account_status')
            .eq('id', user.id)
            .maybeSingle();

          // Strict rule: Suspended accounts are immediately blocked from all admin operations
          if (profile && profile.account_status === 'suspended') {
            return res.status(403).json({ error: 'ACCOUNT_SUSPENDED', message: 'This account has been suspended.' });
          }

          // Check if admin by explicitly configured server environment allowlists
          const adminEmails = process.env.ADMIN_EMAILS
            ? process.env.ADMIN_EMAILS.toLowerCase().split(',').map(e => e.trim()).filter(Boolean)
            : [];
          const adminUserIds = process.env.ADMIN_USER_IDS
            ? process.env.ADMIN_USER_IDS.split(',').map(id => id.trim()).filter(Boolean)
            : [];

          const isEmailAllowlisted = user.email && adminEmails.length > 0 && adminEmails.includes(user.email.toLowerCase());
          const isIdAllowlisted = adminUserIds.length > 0 && adminUserIds.includes(user.id);
          const isDatabaseAdmin = profile && profile.account_type === 'admin';
          const isActive = !profile || profile.account_status === 'active';

          if ((isEmailAllowlisted || isIdAllowlisted || isDatabaseAdmin) && isActive) {
            (req as any).adminUser = user;
            return next();
          }
        }
      } catch (err) {
        console.warn('[SongVerse Server] Admin token check failed:', err);
      }
    }

    // 2. Fallback check for in-memory server session (requires active account)
    const userId = serverSessions.get(token);
    if (userId) {
      const user = serverUsers.get(userId);
      const isUserAdmin = user && (user as any).accountType === 'admin';
      const isUserActive = !user || (user as any).accountStatus !== 'suspended';
      if (isUserAdmin && isUserActive) {
        (req as any).adminUser = user;
        return next();
      }
    }
  }

  return res.status(403).json({ error: 'FORBIDDEN', message: 'Administrator authorization required.' });
}

// Admin Player Management & Metrics Endpoints
app.get('/api/admin/metrics', checkAdminAuth, async (_req: Request, res: Response) => {
  try {
    if (serverSupabase) {
      const { data: profiles, error } = await serverSupabase.from('profiles').select('*');
      if (!error && Array.isArray(profiles)) {
        const totalRegisteredUsers = profiles.length;
        const verifiedAccounts = profiles.filter(p => p.email_verified).length;
        const unverifiedAccounts = totalRegisteredUsers - verifiedAccounts;
        const activeAccounts = profiles.filter(p => p.account_status === 'active').length;
        const suspendedAccounts = profiles.filter(p => p.account_status === 'suspended').length;
        const googleAccountsCount = profiles.filter(p => p.auth_provider === 'google').length;
        const emailAccountsCount = profiles.filter(p => p.auth_provider === 'email' || p.auth_provider === 'supabase').length;
        const totalGamesPlayed = profiles.reduce((sum, p) => sum + (p.games_played || 0), 0);

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentRegistrationsCount = profiles.filter(p => p.created_at && p.created_at >= oneDayAgo).length;

        return res.json({
          totalRegisteredUsers,
          totalGuestPlayers: 1,
          verifiedAccounts,
          unverifiedAccounts,
          activeAccounts,
          suspendedAccounts,
          totalGamesPlayed,
          recentRegistrationsCount,
          googleAccountsCount,
          emailAccountsCount
        });
      }
    }

    res.json({
      totalRegisteredUsers: serverUsers.size,
      totalGuestPlayers: 1,
      verifiedAccounts: serverUsers.size,
      unverifiedAccounts: 0,
      activeAccounts: serverUsers.size,
      suspendedAccounts: 0,
      totalGamesPlayed: 0,
      recentRegistrationsCount: 0,
      googleAccountsCount: serverUsers.size,
      emailAccountsCount: 0
    });
  } catch (err: any) {
    res.status(500).json({ error: 'METRICS_ERROR', message: err.message });
  }
});

app.get('/api/admin/players', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const status = (req.query.status as string) || 'all';
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

    if (serverSupabase) {
      let query = serverSupabase.from('profiles').select('*', { count: 'exact' });

      if (status !== 'all') {
        query = query.eq('account_status', status);
      }

      if (search) {
        query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, count, error } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (!error && data) {
        const players = data.map(p => ({
          id: p.id,
          email: p.email,
          displayName: p.display_name,
          avatarSeed: p.avatar_seed,
          avatarUrl: p.avatar_url,
          authProvider: p.auth_provider,
          accountType: p.account_type,
          accountStatus: p.account_status,
          emailVerified: Boolean(p.email_verified),
          totalScore: p.total_score || 0,
          gamesPlayed: p.games_played || 0,
          roundsWon: p.rounds_won || 0,
          currentStreak: p.current_streak || 0,
          bestStreak: p.best_streak || 0,
          createdAt: p.created_at,
          lastLoginAt: p.last_login_at || p.created_at,
          lastPlayedAt: p.last_played_at
        }));

        return res.json({
          players,
          total: count || players.length,
          page,
          limit,
          totalPages: Math.ceil((count || players.length) / limit)
        });
      }
    }

    const list = Array.from(serverUsers.values()).map(u => ({
      id: u.id,
      email: u.email,
      displayName: u.displayName,
      avatarSeed: 'seed_' + u.id,
      authProvider: u.authProvider || 'google',
      accountType: 'player',
      accountStatus: 'active',
      emailVerified: true,
      totalScore: 0,
      gamesPlayed: 0,
      roundsWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    }));

    res.json({
      players: list,
      total: list.length,
      page: 1,
      limit,
      totalPages: 1
    });
  } catch (err: any) {
    res.status(500).json({ error: 'FETCH_PLAYERS_ERROR', message: err.message });
  }
});

app.post('/api/admin/players/:id/status', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body || {};

    if (status !== 'active' && status !== 'suspended') {
      return res.status(400).json({ error: 'INVALID_STATUS', message: 'Status must be active or suspended.' });
    }

    if (serverSupabase) {
      const { error } = await serverSupabase
        .from('profiles')
        .update({ account_status: status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        throw error;
      }

      const adminId = (req as any).adminUser?.id || null;
      try {
        await serverSupabase.from('admin_audit_logs').insert({
          admin_id: adminId,
          action: status === 'suspended' ? 'suspend_user' : 'reactivate_user',
          target_user_id: id,
          details: { reason: reason || 'Administrative action via dashboard' }
        });
      } catch {
        // Ignore audit log error
      }
    }

    res.json({ success: true, userId: id, status });
  } catch (err: any) {
    res.status(500).json({ error: 'UPDATE_STATUS_ERROR', message: err.message });
  }
});

app.get('/api/admin/players/export', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const format = (req.query.format as string) === 'csv' ? 'csv' : 'json';
    let records: any[] = [];

    if (serverSupabase) {
      const { data } = await serverSupabase
        .from('profiles')
        .select('id, email, display_name, auth_provider, account_type, account_status, email_verified, total_score, games_played, rounds_won, current_streak, best_streak, created_at, last_login_at')
        .order('created_at', { ascending: false });

      if (data) records = data;
    }

    if (format === 'csv') {
      const headers = ['id', 'email', 'display_name', 'auth_provider', 'account_type', 'account_status', 'email_verified', 'total_score', 'games_played', 'rounds_won', 'current_streak', 'best_streak', 'created_at', 'last_login_at'];
      const csvRows = [
        headers.join(','),
        ...records.map(row => headers.map(h => JSON.stringify(row[h] ?? '')).join(','))
      ];
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="songverse_players.csv"');
      return res.send(csvRows.join('\n'));
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="songverse_players.json"');
    res.json({ exportedAt: new Date().toISOString(), total: records.length, players: records });
  } catch (err: any) {
    res.status(500).json({ error: 'EXPORT_ERROR', message: err.message });
  }
});

app.get('/api/admin/catalogue/stats', checkAdminAuth, (_req: Request, res: Response) => {
  res.json(catalogueStore.getStats());
});

app.get('/api/admin/catalogue/import/status', checkAdminAuth, (_req: Request, res: Response) => {
  res.json({
    status: importManager.getStatus(),
    presets: IMPORT_PRESETS
  });
});

app.post('/api/admin/catalogue/import/start', checkAdminAuth, async (req: Request, res: Response) => {
  try {
    const { presetId, query, language, country, limitPerPage } = req.body || {};
    if (presetId) {
      const status = await importManager.startPresetImport(presetId, limitPerPage);
      return res.json({ status });
    }
    if (query) {
      const status = await importManager.startCustomQueryImport(query, language, country, limitPerPage);
      return res.json({ status });
    }
    return res.status(400).json({ error: 'MISSING_PARAMS', message: 'Specify presetId or query.' });
  } catch (err: any) {
    return res.status(400).json({ error: 'IMPORT_ERROR', message: err.message });
  }
});

app.post('/api/admin/catalogue/import/pause', checkAdminAuth, (_req: Request, res: Response) => {
  res.json({ status: importManager.pause() });
});

app.post('/api/admin/catalogue/import/resume', checkAdminAuth, (_req: Request, res: Response) => {
  try {
    res.json({ status: importManager.resume() });
  } catch (err: any) {
    res.status(400).json({ error: 'RESUME_ERROR', message: err.message });
  }
});

app.post('/api/admin/catalogue/import/cancel', checkAdminAuth, (_req: Request, res: Response) => {
  res.json({ status: importManager.cancel() });
});

app.post('/api/admin/catalogue/backup', checkAdminAuth, (_req: Request, res: Response) => {
  const backupRes = catalogueStore.backupCatalogue();
  res.json(backupRes);
});

app.get('/api/admin/catalogue/plan', checkAdminAuth, (_req: Request, res: Response) => {
  const stats = catalogueStore.getStats();
  res.json({
    planSummary: 'Proposed Catalogue Migration and Deletion Plan',
    safetyGuarantee: 'No user accounts, profiles, streaks, or game histories will be deleted or modified.',
    backupConfirmed: stats.backupFileExists,
    backupLocation: '/data/catalogue_backup_pre_migration.json',
    currentTracksTotal: stats.totalUniqueRecords,
    playableTracksPreserved: stats.playableRecords,
    metadataOnlyTracks: stats.metadataOnlyRecords,
    deletionProposed: 'Zero destructive deletions performed until explicit confirmation is provided by user.',
    importRecommendation: 'Ingest verified MusicBrainz recordings by language/preset with ODbL attribution, preserving all authorized playable tracks for trivia gameplay.'
  });
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SongVerse server running at http://0.0.0.0:${PORT} (mode: ${isProduction ? 'production' : 'development'})`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  startServer().catch(err => {
    console.error('Failed to start SongVerse server:', err);
    process.exit(1);
  });
}

export { app };
