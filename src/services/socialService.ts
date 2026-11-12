import { UserProfile, FriendUser, FriendRequest, RoomInvitation } from '../types';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { gameEngine } from './gameEngine';

type SocialListener = () => void;

const STORAGE_KEY_LOCAL_FRIENDS = 'songverse_social_friends_v1';
const STORAGE_KEY_LOCAL_REQUESTS = 'songverse_social_requests_v1';
const STORAGE_KEY_LOCAL_INVITES = 'songverse_social_invitations_v1';
const STORAGE_KEY_DISCOVERABLE_USERS = 'songverse_social_users_directory_v1';

// Starter community directory of active SongVerse players
export const COMMUNITY_PLAYERS: FriendUser[] = [
  {
    id: 'comm_groove_master',
    displayName: 'Groove Master',
    username: 'groove_master',
    avatarSeed: 'aurora',
    totalScore: 14850,
    gamesPlayed: 142,
    roundsWon: 118,
    currentStreak: 12,
    bestStreak: 24,
    favoriteMode: 'competitive',
    isOnline: true,
    lastSeenAt: Date.now() - 15000
  },
  {
    id: 'comm_melody_queen',
    displayName: 'Aria Melody',
    username: 'melody_queen',
    avatarSeed: 'solaris',
    totalScore: 12400,
    gamesPlayed: 98,
    roundsWon: 74,
    currentStreak: 7,
    bestStreak: 19,
    favoriteMode: 'casual',
    isOnline: true,
    lastSeenAt: Date.now() - 40000
  },
  {
    id: 'comm_beat_dropper',
    displayName: 'DJ BeatDropper',
    username: 'beat_dropper',
    avatarSeed: 'cyber',
    totalScore: 16200,
    gamesPlayed: 168,
    roundsWon: 139,
    currentStreak: 14,
    bestStreak: 28,
    favoriteMode: 'competitive',
    isOnline: true,
    lastSeenAt: Date.now() - 25000
  },
  {
    id: 'comm_synth_wave',
    displayName: 'Synth Wave',
    username: 'synth_wave',
    avatarSeed: 'ember',
    totalScore: 8900,
    gamesPlayed: 71,
    roundsWon: 53,
    currentStreak: 4,
    bestStreak: 11,
    favoriteMode: 'casual',
    isOnline: true,
    lastSeenAt: Date.now() - 55000
  },
  {
    id: 'comm_rhythm_racer',
    displayName: 'Rhythm Racer',
    username: 'rhythm_racer',
    avatarSeed: 'neon',
    totalScore: 10250,
    gamesPlayed: 85,
    roundsWon: 62,
    currentStreak: 5,
    bestStreak: 15,
    favoriteMode: 'competitive',
    isOnline: true,
    lastSeenAt: Date.now() - 30000
  },
  {
    id: 'comm_vinyl_vibes',
    displayName: 'Vinyl Collector',
    username: 'vinyl_vibes',
    avatarSeed: 'retro',
    totalScore: 11100,
    gamesPlayed: 104,
    roundsWon: 81,
    currentStreak: 8,
    bestStreak: 17,
    favoriteMode: 'casual',
    isOnline: false,
    lastSeenAt: Date.now() - 300000
  }
];

class SocialService {
  private listeners: Set<SocialListener> = new Set();
  private presenceInterval: any = null;
  private pendingInvites: RoomInvitation[] = [];
  private friends: FriendUser[] = [];
  private incomingRequests: FriendRequest[] = [];
  private outgoingRequests: FriendRequest[] = [];

  constructor() {
    this.initPresence();
    this.loadLocalCache();
  }

  public subscribe(listener: SocialListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(fn => fn());
  }

  private loadLocalCache(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const frStr = localStorage.getItem(STORAGE_KEY_LOCAL_FRIENDS);
      if (frStr) this.friends = JSON.parse(frStr);

      const reqStr = localStorage.getItem(STORAGE_KEY_LOCAL_REQUESTS);
      if (reqStr) {
        const parsed = JSON.parse(reqStr);
        this.incomingRequests = parsed.incoming || [];
        this.outgoingRequests = parsed.outgoing || [];
      }

      const invStr = localStorage.getItem(STORAGE_KEY_LOCAL_INVITES);
      if (invStr) this.pendingInvites = JSON.parse(invStr);
    } catch {}
  }

  private saveLocalCache(): void {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY_LOCAL_FRIENDS, JSON.stringify(this.friends));
      localStorage.setItem(
        STORAGE_KEY_LOCAL_REQUESTS,
        JSON.stringify({ incoming: this.incomingRequests, outgoing: this.outgoingRequests })
      );
      localStorage.setItem(STORAGE_KEY_LOCAL_INVITES, JSON.stringify(this.pendingInvites));
    } catch {}
  }

  // --- ONLINE PRESENCE & HEARTBEAT ---
  private initPresence(): void {
    if (typeof window === 'undefined') return;

    // Send heartbeat every 30 seconds
    this.presenceInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 30000);

    // Initial heartbeat
    setTimeout(() => this.sendHeartbeat(), 2000);
  }

  public async sendHeartbeat(): Promise<void> {
    const profile = gameEngine.getUserProfile();
    if (profile.isGuest || !profile.id) return;

    // Update local profile lastSeenAt
    profile.lastPlayedAt = Date.now();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('profiles')
          .update({ last_seen_at: new Date().toISOString() })
          .eq('id', profile.id);
      } catch {}
    }
  }

  // --- 1. USERNAME VALIDATION & AVAILABILITY ---
  public validateUsernameFormat(username: string): { valid: boolean; error?: string } {
    const trimmed = (username || '').trim();
    if (!trimmed) {
      return { valid: false, error: 'Username is required.' };
    }
    if (trimmed.length < 3) {
      return { valid: false, error: 'Username must be at least 3 characters.' };
    }
    if (trimmed.length > 20) {
      return { valid: false, error: 'Username must be at most 20 characters.' };
    }
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(trimmed)) {
      return { valid: false, error: 'Username can only contain letters, numbers, and underscores.' };
    }
    return { valid: true };
  }

  public async checkUsernameAvailability(username: string): Promise<{ available: boolean; error?: string }> {
    const format = this.validateUsernameFormat(username);
    if (!format.valid) {
      return { available: false, error: format.error };
    }

    const currentProfile = gameEngine.getUserProfile();
    const clean = username.trim().toLowerCase();

    // If it's already the user's username
    if (currentProfile.username && currentProfile.username.toLowerCase() === clean) {
      return { available: true };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username')
          .ilike('username', clean)
          .maybeSingle();

        if (error) {
          console.warn('[SocialService] Supabase check error:', error.message);
        } else if (data && data.id !== currentProfile.id) {
          return { available: false, error: 'This username is already taken. Please choose another.' };
        }
      } catch (err: any) {
        console.warn('[SocialService] Network error during username check:', err);
      }
    }

    // Community check
    const commFound = COMMUNITY_PLAYERS.find(u => u.username && u.username.toLowerCase() === clean && u.id !== currentProfile.id);
    if (commFound) {
      return { available: false, error: 'This username is already taken. Please choose another.' };
    }

    // Local directory fallback check
    try {
      if (typeof localStorage !== 'undefined') {
        const dirStr = localStorage.getItem(STORAGE_KEY_DISCOVERABLE_USERS);
        if (dirStr) {
          const dir: any[] = JSON.parse(dirStr);
          const found = dir.find(u => u.username && u.username.toLowerCase() === clean && u.id !== currentProfile.id);
          if (found) {
            return { available: false, error: 'This username is already taken. Please choose another.' };
          }
        }
      }
    } catch {}

    return { available: true };
  }

  public async updateUsername(newUsername: string): Promise<{ success: boolean; username?: string; error?: string }> {
    const availability = await this.checkUsernameAvailability(newUsername);
    if (!availability.available) {
      return { success: false, error: availability.error };
    }

    const clean = newUsername.trim();
    const currentProfile = gameEngine.getUserProfile();

    // 1. Update local game profile
    const updated = gameEngine.updateUserProfile({ username: clean });

    // 2. Persist to Supabase if authenticated
    if (!currentProfile.isGuest && isSupabaseConfigured() && supabase) {
      try {
        const { data: updatedRows, error: updateError } = await supabase
          .from('profiles')
          .update({
            username: clean
          })
          .eq('id', currentProfile.id)
          .select('id');

        if (updateError) {
          return { success: false, error: 'Database error: ' + updateError.message };
        }

        // If no existing row was updated, insert base profile row with safe columns
        if (!updatedRows || updatedRows.length === 0) {
          const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
              id: currentProfile.id,
              username: clean,
              display_name: currentProfile.displayName || clean,
              avatar_seed: currentProfile.avatarSeed || 'aurora',
              account_status: 'active',
              total_score: currentProfile.totalScore || 0,
              games_played: currentProfile.gamesPlayed || 0,
              rounds_won: currentProfile.roundsWon || 0,
              current_streak: currentProfile.currentStreak || 0,
              best_streak: currentProfile.bestStreak || 0
            });

          if (insertError) {
            console.warn('[SocialService] Supabase profile upsert warning:', insertError);
          }
        }

        // Keep Supabase auth user_metadata synchronized as well
        await supabase.auth.updateUser({
          data: { username: clean }
        }).catch(() => {});
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to update username in database.' };
      }
    }

    // Update discoverable directory cache
    this.registerDiscoverableUser({
      id: updated.id,
      displayName: updated.displayName,
      username: clean,
      avatarSeed: updated.avatarSeed,
      avatarUrl: updated.avatarUrl,
      totalScore: updated.totalScore,
      gamesPlayed: updated.gamesPlayed,
      roundsWon: updated.roundsWon,
      currentStreak: updated.currentStreak,
      bestStreak: updated.bestStreak,
      favoriteMode: updated.favoriteMode || 'competitive',
      isOnline: true,
      lastSeenAt: Date.now()
    });

    this.notify();
    return { success: true, username: clean };
  }

  // --- 2. USER DISCOVERY & SEARCH ---
  public getSuggestedUsers(): FriendUser[] {
    const currentProfile = gameEngine.getUserProfile();
    const friendIds = new Set(this.friends.map(f => f.id));
    const suggested: Map<string, FriendUser> = new Map();

    // 1. Community players
    COMMUNITY_PLAYERS.forEach(cp => {
      if (cp.id !== currentProfile.id && !friendIds.has(cp.id)) {
        suggested.set(cp.id, cp);
      }
    });

    // 2. Discoverable local players
    try {
      if (typeof localStorage !== 'undefined') {
        const dirStr = localStorage.getItem(STORAGE_KEY_DISCOVERABLE_USERS);
        if (dirStr) {
          const dir: FriendUser[] = JSON.parse(dirStr);
          dir.forEach(u => {
            if (u.id !== currentProfile.id && !friendIds.has(u.id)) {
              if (!suggested.has(u.id)) {
                suggested.set(u.id, u);
              }
            }
          });
        }
      }
    } catch {}

    return Array.from(suggested.values());
  }

  public async searchUsersByUsername(query: string): Promise<FriendUser[]> {
    const cleanQuery = (query || '').trim().toLowerCase();
    
    // If query is empty, return suggested community squad
    if (!cleanQuery) {
      return this.getSuggestedUsers();
    }

    const currentProfile = gameEngine.getUserProfile();
    const results: Map<string, FriendUser> = new Map();

    // 1. Search Supabase profiles
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_seed, avatar_url, total_score, games_played, rounds_won, current_streak, best_streak, favorite_mode, last_seen_at')
          .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
          .neq('id', currentProfile.id)
          .limit(20);

        if (!error && Array.isArray(data)) {
          data.forEach(item => {
            const lastSeen = item.last_seen_at ? new Date(item.last_seen_at).getTime() : 0;
            const isOnline = Date.now() - lastSeen < 90000; // Active in last 90 seconds
            results.set(item.id, {
              id: item.id,
              displayName: item.display_name || item.username || 'SongVerse Player',
              username: item.username || item.id.slice(0, 8),
              avatarSeed: item.avatar_seed || 'aurora',
              avatarUrl: item.avatar_url,
              totalScore: item.total_score || 0,
              gamesPlayed: item.games_played || 0,
              roundsWon: item.rounds_won || 0,
              currentStreak: item.current_streak || 0,
              bestStreak: item.best_streak || 0,
              favoriteMode: item.favorite_mode || 'competitive',
              isOnline,
              lastSeenAt: lastSeen
            });
          });
        }
      } catch {}
    }

    // 2. Search COMMUNITY_PLAYERS
    COMMUNITY_PLAYERS.forEach(cp => {
      if (cp.id !== currentProfile.id) {
        const uName = (cp.username || '').toLowerCase();
        const dName = (cp.displayName || '').toLowerCase();
        if (uName.includes(cleanQuery) || dName.includes(cleanQuery)) {
          if (!results.has(cp.id)) {
            results.set(cp.id, cp);
          }
        }
      }
    });

    // 3. Search local discoverable directory
    try {
      if (typeof localStorage !== 'undefined') {
        const dirStr = localStorage.getItem(STORAGE_KEY_DISCOVERABLE_USERS);
        if (dirStr) {
          const dir: FriendUser[] = JSON.parse(dirStr);
          dir.forEach(u => {
            if (u.id !== currentProfile.id) {
              const uName = (u.username || '').toLowerCase();
              const dName = (u.displayName || '').toLowerCase();
              if (uName.includes(cleanQuery) || dName.includes(cleanQuery)) {
                if (!results.has(u.id)) {
                  results.set(u.id, u);
                }
              }
            }
          });
        }
      }
    } catch {}

    return Array.from(results.values());
  }

  public registerDiscoverableUser(user: FriendUser): void {
    try {
      if (typeof localStorage === 'undefined') return;
      const dirStr = localStorage.getItem(STORAGE_KEY_DISCOVERABLE_USERS);
      const dir: FriendUser[] = dirStr ? JSON.parse(dirStr) : [];
      const filtered = dir.filter(u => u.id !== user.id);
      filtered.push(user);
      localStorage.setItem(STORAGE_KEY_DISCOVERABLE_USERS, JSON.stringify(filtered.slice(-50)));
    } catch {}
  }

  // --- 3. FRIEND REQUESTS & FRIENDSHIPS ---
  public getFriends(): FriendUser[] {
    return [...this.friends];
  }

  public getIncomingRequests(): FriendRequest[] {
    return [...this.incomingRequests];
  }

  public getOutgoingRequests(): FriendRequest[] {
    return [...this.outgoingRequests];
  }

  public isFriend(userId: string): boolean {
    return this.friends.some(f => f.id === userId);
  }

  public hasPendingRequestWith(userId: string): boolean {
    return (
      this.outgoingRequests.some(r => r.receiverId === userId && r.status === 'pending') ||
      this.incomingRequests.some(r => r.senderId === userId && r.status === 'pending')
    );
  }

  public async sendFriendRequest(targetUser: FriendUser): Promise<{ success: boolean; error?: string }> {
    const currentProfile = gameEngine.getUserProfile();
    if (currentProfile.id === targetUser.id) {
      return { success: false, error: 'You cannot add yourself as a friend.' };
    }
    if (this.isFriend(targetUser.id)) {
      return { success: false, error: 'You are already friends with this user.' };
    }
    if (this.hasPendingRequestWith(targetUser.id)) {
      return { success: false, error: 'A friend request is already pending between you two.' };
    }

    const request: FriendRequest = {
      id: `freq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: currentProfile.id,
      receiverId: targetUser.id,
      status: 'pending',
      createdAt: new Date().toISOString(),
      sender: {
        id: currentProfile.id,
        displayName: currentProfile.displayName,
        username: currentProfile.username || currentProfile.displayName.toLowerCase().replace(/\s+/g, '_'),
        avatarSeed: currentProfile.avatarSeed,
        avatarUrl: currentProfile.avatarUrl
      },
      receiver: {
        id: targetUser.id,
        displayName: targetUser.displayName,
        username: targetUser.username,
        avatarSeed: targetUser.avatarSeed,
        avatarUrl: targetUser.avatarUrl
      }
    };

    // Update local state
    this.outgoingRequests.push(request);
    this.saveLocalCache();

    // Auto-accept community squad bots after 600ms so players immediately experience active friends
    if (targetUser.id.startsWith('comm_')) {
      setTimeout(() => {
        if (!this.friends.some(f => f.id === targetUser.id)) {
          this.friends.push(targetUser);
          this.outgoingRequests = this.outgoingRequests.filter(r => r.id !== request.id);
          this.saveLocalCache();
          this.notify();
        }
      }, 600);
    }

    // Supabase insert if authenticated
    if (!currentProfile.isGuest && isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('friendships').insert({
          sender_id: currentProfile.id,
          receiver_id: targetUser.id,
          status: 'pending'
        });
      } catch (err: any) {
        console.warn('[SocialService] Supabase friend request insert:', err);
      }
    }

    this.notify();
    return { success: true };
  }

  public async acceptFriendRequest(requestId: string): Promise<{ success: boolean; error?: string }> {
    const req = this.incomingRequests.find(r => r.id === requestId);
    if (!req) return { success: false, error: 'Friend request not found.' };

    const currentProfile = gameEngine.getUserProfile();

    // Add to friends list
    const newFriend: FriendUser = {
      id: req.senderId,
      displayName: req.sender?.displayName || 'SongVerse Friend',
      username: req.sender?.username || req.senderId.slice(0, 8),
      avatarSeed: req.sender?.avatarSeed || 'aurora',
      avatarUrl: req.sender?.avatarUrl,
      totalScore: 0,
      gamesPlayed: 0,
      roundsWon: 0,
      currentStreak: 0,
      bestStreak: 0,
      favoriteMode: 'competitive',
      isOnline: true,
      lastSeenAt: Date.now()
    };

    if (!this.friends.some(f => f.id === newFriend.id)) {
      this.friends.push(newFriend);
    }

    // Remove from incoming requests
    this.incomingRequests = this.incomingRequests.filter(r => r.id !== requestId);
    this.saveLocalCache();

    if (!currentProfile.isGuest && isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('friendships')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('sender_id', req.senderId)
          .eq('receiver_id', currentProfile.id);
      } catch (err) {
        console.warn('[SocialService] Accept friend in Supabase failed:', err);
      }
    }

    this.notify();
    return { success: true };
  }

  public async rejectFriendRequest(requestId: string): Promise<{ success: boolean }> {
    const req = this.incomingRequests.find(r => r.id === requestId);
    const currentProfile = gameEngine.getUserProfile();

    this.incomingRequests = this.incomingRequests.filter(r => r.id !== requestId);
    this.saveLocalCache();

    if (req && !currentProfile.isGuest && isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('friendships')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('sender_id', req.senderId)
          .eq('receiver_id', currentProfile.id);
      } catch {}
    }

    this.notify();
    return { success: true };
  }

  public async removeFriend(friendId: string): Promise<{ success: boolean }> {
    const currentProfile = gameEngine.getUserProfile();
    this.friends = this.friends.filter(f => f.id !== friendId);
    this.saveLocalCache();

    if (!currentProfile.isGuest && isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('friendships')
          .delete()
          .or(`and(sender_id.eq.${currentProfile.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentProfile.id})`);
      } catch {}
    }

    this.notify();
    return { success: true };
  }

  public async syncFriendsFromDatabase(): Promise<void> {
    const currentProfile = gameEngine.getUserProfile();
    if (currentProfile.isGuest || !isSupabaseConfigured() || !supabase) return;

    try {
      // 1. Fetch friendships involving user
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`sender_id.eq.${currentProfile.id},receiver_id.eq.${currentProfile.id}`);

      if (error || !Array.isArray(friendships)) return;

      const acceptedFriendIds: string[] = [];
      const newIncoming: FriendRequest[] = [];
      const newOutgoing: FriendRequest[] = [];

      for (const f of friendships) {
        if (f.status === 'accepted') {
          const friendId = f.sender_id === currentProfile.id ? f.receiver_id : f.sender_id;
          acceptedFriendIds.push(friendId);
        } else if (f.status === 'pending') {
          if (f.receiver_id === currentProfile.id) {
            newIncoming.push({
              id: f.id,
              senderId: f.sender_id,
              receiverId: f.receiver_id,
              status: 'pending',
              createdAt: f.created_at
            });
          } else {
            newOutgoing.push({
              id: f.id,
              senderId: f.sender_id,
              receiverId: f.receiver_id,
              status: 'pending',
              createdAt: f.created_at
            });
          }
        }
      }

      // Fetch profiles of accepted friends
      if (acceptedFriendIds.length > 0) {
        const { data: friendProfiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_seed, avatar_url, total_score, games_played, rounds_won, current_streak, best_streak, favorite_mode, last_seen_at')
          .in('id', acceptedFriendIds);

        if (Array.isArray(friendProfiles)) {
          this.friends = friendProfiles.map(p => {
            const lastSeen = p.last_seen_at ? new Date(p.last_seen_at).getTime() : 0;
            const isOnline = Date.now() - lastSeen < 90000;
            return {
              id: p.id,
              displayName: p.display_name || p.username || 'Player',
              username: p.username || p.id.slice(0, 8),
              avatarSeed: p.avatar_seed || 'aurora',
              avatarUrl: p.avatar_url,
              totalScore: p.total_score || 0,
              gamesPlayed: p.games_played || 0,
              roundsWon: p.rounds_won || 0,
              currentStreak: p.current_streak || 0,
              bestStreak: p.best_streak || 0,
              favoriteMode: p.favorite_mode || 'competitive',
              isOnline,
              lastSeenAt: lastSeen
            };
          });
        }
      } else {
        this.friends = [];
      }

      this.incomingRequests = newIncoming;
      this.outgoingRequests = newOutgoing;
      this.saveLocalCache();
      this.notify();
    } catch (err) {
      console.warn('[SocialService] syncFriendsFromDatabase error:', err);
    }
  }

  // --- 4. ROOM INVITATIONS ---
  public getPendingInvitations(): RoomInvitation[] {
    // Purge expired invitations (older than 5 minutes)
    const now = Date.now();
    this.pendingInvites = this.pendingInvites.filter(
      inv => new Date(inv.expiresAt).getTime() > now && inv.status === 'pending'
    );
    return [...this.pendingInvites];
  }

  public async inviteFriendToRoom(
    friend: FriendUser,
    roomCode: string,
    mode: 'competitive' | 'casual' = 'competitive',
    totalRounds: number = 3
  ): Promise<{ success: boolean; error?: string }> {
    const currentProfile = gameEngine.getUserProfile();
    if (currentProfile.isGuest) {
      return { success: false, error: 'Sign in to invite friends to multiplayer rooms.' };
    }

    const invitation: RoomInvitation = {
      id: `inv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      roomCode,
      senderId: currentProfile.id,
      senderName: currentProfile.displayName,
      senderUsername: currentProfile.username,
      receiverId: friend.id,
      mode,
      totalRounds,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString()
    };

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('room_invitations').insert({
          room_code: roomCode,
          sender_id: currentProfile.id,
          sender_name: currentProfile.displayName,
          sender_username: currentProfile.username,
          receiver_id: friend.id,
          mode,
          total_rounds: totalRounds,
          status: 'pending'
        });
      } catch (err: any) {
        console.warn('[SocialService] Supabase invite insert failed:', err);
      }
    }

    return { success: true };
  }

  public receiveMockInvitation(invitation: RoomInvitation): void {
    this.pendingInvites = [invitation, ...this.pendingInvites.filter(i => i.id !== invitation.id)];
    this.saveLocalCache();
    this.notify();
  }

  public async respondToInvitation(
    invitationId: string,
    action: 'accept' | 'decline'
  ): Promise<{ success: boolean; roomCode?: string }> {
    const inv = this.pendingInvites.find(i => i.id === invitationId);
    if (!inv) return { success: false };

    inv.status = action === 'accept' ? 'accepted' : 'declined';
    this.pendingInvites = this.pendingInvites.filter(i => i.id !== invitationId);
    this.saveLocalCache();

    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase
          .from('room_invitations')
          .update({ status: inv.status })
          .eq('id', invitationId);
      } catch {}
    }

    this.notify();
    return { success: true, roomCode: inv.roomCode };
  }

  public async syncInvitationsFromDatabase(): Promise<void> {
    const currentProfile = gameEngine.getUserProfile();
    if (currentProfile.isGuest || !isSupabaseConfigured() || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('room_invitations')
        .select('*')
        .eq('receiver_id', currentProfile.id)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString());

      if (!error && Array.isArray(data)) {
        this.pendingInvites = data.map(d => ({
          id: d.id,
          roomCode: d.room_code,
          senderId: d.sender_id,
          senderName: d.sender_name,
          senderUsername: d.sender_username,
          receiverId: d.receiver_id,
          mode: d.mode,
          totalRounds: d.total_rounds,
          status: d.status,
          createdAt: d.created_at,
          expiresAt: d.expires_at
        }));
        this.saveLocalCache();
        this.notify();
      }
    } catch {}
  }
}

export const socialService = new SocialService();
