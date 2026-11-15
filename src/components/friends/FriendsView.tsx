import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  UserPlus,
  UserCheck,
  UserX,
  Clock,
  Check,
  X,
  Mail,
  Send,
  Trophy,
  Flame,
  Radio,
  Gamepad2,
  Sparkles,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Disc3,
  AtSign
} from 'lucide-react';
import { FriendUser, FriendRequest, RoomInvitation } from '../../types';
import { socialService } from '../../services/socialService';
import { gameEngine } from '../../services/gameEngine';

interface FriendsViewProps {
  onOpenAuth?: () => void;
  onJoinRoom?: (roomCode: string) => void;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ onOpenAuth, onJoinRoom }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search' | 'invites'>('friends');
  const [profile, setProfile] = useState(gameEngine.getUserProfile());

  // Friends & Requests lists
  const [friends, setFriends] = useState<FriendUser[]>(socialService.getFriends());
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>(socialService.getIncomingRequests());
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>(socialService.getOutgoingRequests());
  const [pendingInvites, setPendingInvites] = useState<RoomInvitation[]>(socialService.getPendingInvitations());
  const [suggestedUsers, setSuggestedUsers] = useState<FriendUser[]>(socialService.getSuggestedUsers());

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FriendUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchPerformed, setSearchPerformed] = useState(false);

  // Status & action notifications
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selectedFriendProfile, setSelectedFriendProfile] = useState<FriendUser | null>(null);

  // Refresh lists
  const refreshSocialData = () => {
    setProfile(gameEngine.getUserProfile());
    setFriends(socialService.getFriends());
    setIncomingRequests(socialService.getIncomingRequests());
    setOutgoingRequests(socialService.getOutgoingRequests());
    setPendingInvites(socialService.getPendingInvitations());
    setSuggestedUsers(socialService.getSuggestedUsers());
  };

  useEffect(() => {
    refreshSocialData();
    const unsub = socialService.subscribe(refreshSocialData);
    socialService.syncFriendsFromDatabase();
    socialService.syncInvitationsFromDatabase();

    return () => unsub();
  }, []);

  const handleQueryChange = async (val: string) => {
    setSearchQuery(val);
    const trimmed = val.trim();
    if (!trimmed) {
      setSearchPerformed(false);
      setSearchResults([]);
      return;
    }

    setSearchPerformed(true);
    setIsSearching(true);
    try {
      const results = await socialService.searchUsersByUsername(trimmed);
      setSearchResults(results);
    } catch {
      // Non-blocking
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchPerformed(false);
      return;
    }

    setIsSearching(true);
    setActionError(null);
    setSearchPerformed(true);

    try {
      const results = await socialService.searchUsersByUsername(trimmed);
      setSearchResults(results);
    } catch (err: any) {
      setActionError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSendRequest = async (target: FriendUser) => {
    setActionError(null);
    setActionSuccess(null);
    const res = await socialService.sendFriendRequest(target);
    if (res.success) {
      setActionSuccess(`Friend request sent to @${target.username}!`);
      refreshSocialData();
    } else {
      setActionError(res.error || 'Failed to send request.');
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    setActionError(null);
    setActionSuccess(null);
    const res = await socialService.acceptFriendRequest(requestId);
    if (res.success) {
      setActionSuccess('Friend request accepted!');
      refreshSocialData();
    } else {
      setActionError(res.error || 'Failed to accept request.');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    await socialService.rejectFriendRequest(requestId);
    setActionSuccess('Request rejected.');
    refreshSocialData();
  };

  const handleRemoveFriend = async (friendId: string, friendName: string) => {
    if (confirm(`Remove @${friendName} from your friends list?`)) {
      await socialService.removeFriend(friendId);
      setActionSuccess(`Removed @${friendName}.`);
      if (selectedFriendProfile?.id === friendId) {
        setSelectedFriendProfile(null);
      }
      refreshSocialData();
    }
  };

  const handleAcceptInvite = async (invitationId: string) => {
    const res = await socialService.respondToInvitation(invitationId, 'accept');
    if (res.success && res.roomCode && onJoinRoom) {
      onJoinRoom(res.roomCode);
    }
  };

  const handleDeclineInvite = async (invitationId: string) => {
    await socialService.respondToInvitation(invitationId, 'decline');
    refreshSocialData();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-sv-burgundy pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sv-red to-sv-orange text-white flex items-center justify-center font-black shadow-md shadow-sv-red/25">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Friends & Community
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Connect with fellow music lovers, track online friends, and invite them to multiplayer games
            </p>
          </div>
        </div>

        {/* Sync Button */}
        <button
          onClick={() => {
            socialService.syncFriendsFromDatabase();
            socialService.syncInvitationsFromDatabase();
          }}
          className="p-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-sv-red rounded-xl bg-slate-100 dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          title="Refresh Friends and Invites"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync</span>
        </button>
      </div>

      {/* Guest Mode Warning Banner */}
      {profile.isGuest && (
        <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/90 dark:border-amber-900 rounded-3xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-0.5">
            <div className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
              <span>Account Required for Social Features</span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed max-w-xl font-medium">
              You are currently playing in Guest Mode. Sign in or register for a free SongVerse account to set your unique username, add friends, and receive game invitations!
            </p>
          </div>
          {onOpenAuth && (
            <button
              onClick={onOpenAuth}
              className="px-5 py-2.5 text-xs font-black text-white bg-sv-red hover:bg-sv-crimson rounded-2xl shadow-md shadow-sv-red/25 shrink-0 cursor-pointer"
            >
              Sign In / Register
            </button>
          )}
        </div>
      )}

      {/* Action Notification Banners */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="cursor-pointer p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center justify-between text-xs font-bold text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="cursor-pointer p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Social Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy shadow-xs">
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'friends'
              ? 'bg-sv-red text-white shadow-sm shadow-sv-red/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Friends ({friends.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
            activeTab === 'requests'
              ? 'bg-sv-red text-white shadow-sm shadow-sv-red/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Requests</span>
          {incomingRequests.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-sv-warm-orange text-slate-900 text-[10px] font-black flex items-center justify-center">
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('invites')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 relative ${
            activeTab === 'invites'
              ? 'bg-sv-red text-white shadow-sm shadow-sv-red/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Gamepad2 className="w-3.5 h-3.5" />
          <span>Room Invites</span>
          {pendingInvites.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
              {pendingInvites.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('search')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
            activeTab === 'search'
              ? 'bg-sv-red text-white shadow-sm shadow-sv-red/30'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Find Players</span>
        </button>
      </div>

      {/* TAB 1: FRIENDS LIST */}
      {activeTab === 'friends' && (
        <div className="space-y-6">
          {friends.length === 0 ? (
            <div className="space-y-6">
              <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl p-8 sm:p-10 text-center max-w-lg mx-auto space-y-4 shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-sv-red/10 border border-sv-red/20 text-sv-red flex items-center justify-center mx-auto">
                  <Users className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    No Friends Added Yet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Build your SongVerse trivia squad to challenge friends, trade scores, and join private rooms!
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('search')}
                  className="px-5 py-2.5 bg-sv-red text-white text-xs font-bold rounded-2xl hover:bg-sv-crimson transition-all cursor-pointer shadow-sm"
                >
                  Find Players Directory
                </button>
              </div>

              {/* Quick Add Suggestions on Empty Friends List */}
              {suggestedUsers.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sv-gold" />
                    <span>Quick Add Registered Players</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {suggestedUsers.slice(0, 3).map((user) => (
                      <div
                        key={user.id}
                        className="p-3.5 bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="truncate">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {user.displayName}
                          </p>
                          <p className="text-[10px] font-mono font-bold text-slate-400">
                            @{user.username}
                          </p>
                        </div>
                        <button
                          onClick={() => handleSendRequest(user)}
                          className="px-2.5 py-1 bg-sv-red hover:bg-sv-crimson text-white rounded-xl text-[11px] font-black cursor-pointer shadow-xs shrink-0"
                        >
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="p-4 bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-sv-burgundy/80 transition-all"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => setSelectedFriendProfile(friend)}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sv-red to-sv-orange text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {friend.displayName.charAt(0)}
                      </div>
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-sv-midnight ${
                          friend.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`}
                        title={friend.isOnline ? 'Online' : 'Offline'}
                      />
                    </div>

                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                          {friend.displayName}
                        </span>
                        {friend.isOnline && (
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.2 rounded">
                            Online
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-slate-500 dark:text-slate-400 font-bold">
                        <span>@{friend.username}</span>
                        <span>·</span>
                        <span className="text-sv-red dark:text-sv-gold">{friend.totalScore || 0} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setSelectedFriendProfile(friend)}
                      className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                      title="View Profile"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveFriend(friend.id, friend.username)}
                      className="p-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer"
                      title="Remove Friend"
                    >
                      <UserX className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: REQUESTS (Incoming & Outgoing) */}
      {activeTab === 'requests' && (
        <div className="space-y-6">
          {/* Incoming Requests */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-sv-red" />
              <span>Incoming Friend Requests ({incomingRequests.length})</span>
            </h3>

            {incomingRequests.length === 0 ? (
              <div className="p-6 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy text-center text-xs text-slate-500 dark:text-slate-400 font-medium">
                No pending incoming friend requests.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                        {req.sender?.displayName || 'SongVerse Player'}
                      </p>
                      <p className="text-[11px] font-mono font-bold text-sv-red dark:text-sv-warm-orange">
                        @{req.sender?.username || 'player'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleAcceptRequest(req.id)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept</span>
                      </button>
                      <button
                        onClick={() => handleRejectRequest(req.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-xl cursor-pointer"
                        title="Decline"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Requests */}
          {outgoingRequests.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-sv-burgundy">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sv-orange" />
                <span>Pending Outgoing Requests ({outgoingRequests.length})</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {outgoingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3.5 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy flex items-center justify-between text-xs"
                  >
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      @{req.receiver?.username || 'player'}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full">
                      Pending
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ROOM INVITATIONS */}
      {activeTab === 'invites' && (
        <div className="space-y-4">
          <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <Gamepad2 className="w-3.5 h-3.5 text-sv-red" />
            <span>Active Room Invitations ({pendingInvites.length})</span>
          </h3>

          {pendingInvites.length === 0 ? (
            <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl p-12 text-center max-w-md mx-auto space-y-3 shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-sv-orange/10 border border-sv-orange/20 text-sv-orange flex items-center justify-center mx-auto">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                No Pending Room Invitations
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                When friends invite you into their multiplayer match rooms, invitations will appear right here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {pendingInvites.map((inv) => (
                <div
                  key={inv.id}
                  className="p-5 bg-white/95 dark:bg-sv-burgundy-deep/90 border-2 border-sv-red/30 rounded-3xl shadow-md space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-sv-red dark:text-sv-warm-orange font-mono">
                      Multiplayer Invite
                    </span>
                    <span className="text-xs font-mono font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-sv-midnight px-2 py-0.5 rounded-lg">
                      Room: {inv.roomCode}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white">
                      {inv.senderName} ({inv.senderUsername ? `@${inv.senderUsername}` : 'Host'})
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Mode: <strong className="capitalize">{inv.mode}</strong> · {inv.totalRounds} Rounds
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleAcceptInvite(inv.id)}
                      className="flex-1 py-2.5 bg-gradient-to-r from-sv-red to-sv-orange text-white rounded-xl text-xs font-black shadow-sm cursor-pointer hover:from-sv-crimson hover:to-sv-red"
                    >
                      Join Room ({inv.roomCode})
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(inv.id)}
                      className="px-3.5 py-2.5 bg-slate-100 dark:bg-sv-midnight text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: SEARCH PLAYERS */}
      {activeTab === 'search' && (
        <div className="space-y-6">
          <form onSubmit={handleSearch} className="flex items-center gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleQueryChange(e.target.value)}
                placeholder="Search by username (e.g. groove, melody, vyas)..."
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-2xl text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:border-sv-red shadow-2xs"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="px-6 py-3 bg-sv-red hover:bg-sv-crimson text-white rounded-2xl text-xs font-black shadow-md shadow-sv-red/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </form>

          {/* Results Area */}
          {searchPerformed && searchQuery.trim() ? (
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
                <span>Search Results ({searchResults.length})</span>
                <button
                  type="button"
                  onClick={() => handleQueryChange('')}
                  className="text-[11px] text-sv-red font-bold hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </h3>

              {searchResults.length === 0 ? (
                <div className="p-8 bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl text-center space-y-2 max-w-md mx-auto shadow-sm">
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-bold">
                    No players found matching "{searchQuery}".
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Try searching for another handle or add an active player from the suggested squad below!
                  </p>
                  <button
                    onClick={() => handleQueryChange('')}
                    className="mt-2 px-4 py-1.5 bg-sv-red text-white text-xs font-bold rounded-xl"
                  >
                    View Suggested Players
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {searchResults.map((user) => {
                    const isAlreadyFriend = socialService.isFriend(user.id);
                    const isPending = socialService.hasPendingRequestWith(user.id);

                    return (
                      <div
                        key={user.id}
                        className="p-4 bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-sv-burgundy/80 transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sv-red to-sv-orange text-white font-black text-xs flex items-center justify-center shrink-0">
                            {user.displayName.charAt(0)}
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {user.displayName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-400">
                              <span>@{user.username}</span>
                              <span>·</span>
                              <span className="text-sv-red dark:text-sv-gold">{user.totalScore || 0} pts</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isAlreadyFriend ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-xl flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Friends</span>
                            </span>
                          ) : isPending ? (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-xl flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(user)}
                              className="px-3.5 py-1.5 bg-slate-900 dark:bg-sv-warm-orange text-white dark:text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer hover:bg-slate-800"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add Friend</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Suggested Active Players Directory */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-sv-gold" />
                  <span>Registered Players Directory ({suggestedUsers.length})</span>
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">Genuine players only</span>
              </div>

              {suggestedUsers.length === 0 ? (
                <div className="p-8 bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl text-center text-xs text-slate-500 dark:text-slate-400 font-medium max-w-md mx-auto space-y-2">
                  <p className="font-bold text-slate-700 dark:text-slate-300">Find your friends</p>
                  <p>Type your friend's exact username above to find them and send a friend request.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {suggestedUsers.map((user) => {
                    const isAlreadyFriend = socialService.isFriend(user.id);
                    const isPending = socialService.hasPendingRequestWith(user.id);

                    return (
                      <div
                        key={user.id}
                        className="p-4 bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between gap-3 shadow-2xs hover:border-slate-300 dark:hover:border-sv-burgundy/80 transition-all"
                      >
                        <div
                          className="flex items-center gap-3 min-w-0 cursor-pointer"
                          onClick={() => setSelectedFriendProfile(user)}
                        >
                          <div className="relative">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sv-red to-sv-orange text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                              {user.displayName.charAt(0)}
                            </div>
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-sv-midnight ${
                                user.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                              {user.displayName}
                            </p>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-slate-400">
                              <span>@{user.username}</span>
                              <span>·</span>
                              <span className="text-sv-red dark:text-sv-gold">{user.totalScore || 0} pts</span>
                            </div>
                          </div>
                        </div>

                        <div>
                          {isAlreadyFriend ? (
                            <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-2.5 py-1 rounded-xl flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Friends</span>
                            </span>
                          ) : isPending ? (
                            <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-2.5 py-1 rounded-xl flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => handleSendRequest(user)}
                              className="px-3.5 py-1.5 bg-gradient-to-r from-sv-red to-sv-orange text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer hover:from-sv-crimson hover:to-sv-red shadow-xs transition-transform active:scale-95"
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Add Friend</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: FRIEND PROFILE VIEW */}
      {selectedFriendProfile && (
        <div className="sv-modal-viewport fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in">
          <div className="sv-modal-surface bg-white dark:bg-sv-burgundy-deep border border-slate-200 dark:border-sv-burgundy rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-5">
            <button
              onClick={() => setSelectedFriendProfile(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Header */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sv-red via-sv-red-orange to-sv-amber text-white font-black text-xl flex items-center justify-center shadow-md shadow-sv-red/20">
                  {selectedFriendProfile.displayName.charAt(0)}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-white dark:border-sv-midnight ${
                    selectedFriendProfile.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                  }`}
                />
              </div>

              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedFriendProfile.displayName}
                </h3>
                <p className="text-xs font-mono font-bold text-sv-red dark:text-sv-warm-orange">
                  @{selectedFriendProfile.username}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5 font-medium">
                  Status: <strong>{selectedFriendProfile.isOnline ? 'Active Now' : 'Offline'}</strong>
                </p>
              </div>
            </div>

            {/* Game Stats */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              <div className="p-3 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Score</span>
                <span className="text-sm font-black text-sv-red dark:text-sv-gold font-mono">
                  {selectedFriendProfile.totalScore || 0}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Rounds Won</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200 font-mono">
                  {selectedFriendProfile.roundsWon || 0}
                </span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy text-center">
                <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Streak</span>
                <span className="text-sm font-black text-rose-600 font-mono flex items-center justify-center gap-0.5">
                  <Flame className="w-3.5 h-3.5 fill-current" />
                  <span>{selectedFriendProfile.currentStreak || 0}</span>
                </span>
              </div>
            </div>

            {/* Privacy Protection Notice */}
            <div className="p-3 bg-slate-50 dark:bg-sv-midnight/60 rounded-xl border border-slate-200/60 dark:border-sv-burgundy/60 text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
              🛡️ <strong>Privacy Protection:</strong> Email addresses and personal identifiers are strictly private and never exposed.
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setSelectedFriendProfile(null)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 dark:bg-sv-midnight text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold cursor-pointer"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
