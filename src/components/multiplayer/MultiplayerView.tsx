import React, { useState, useEffect, useRef } from 'react';
import {
  Users,
  Play,
  Crown,
  Check,
  X,
  Copy,
  Volume2,
  VolumeX,
  Disc3,
  Shield,
  Settings,
  UserX,
  LogOut,
  AlertCircle,
  Radio,
  Globe,
  Sparkles,
  Wifi,
  WifiOff,
  RotateCcw,
  SkipForward,
  Trophy,
  Timer,
  Clock,
  Zap,
  CheckCircle2,
  XCircle,
  Hourglass,
  Edit2,
  Flame,
  Swords,
  Info,
  Heart,
  ShieldCheck,
  Headphones,
  Share2,
  ExternalLink
} from 'lucide-react';
import { MultiplayerRoom, Track, GameLevelNumber } from '../../types';
import { multiplayerEngine } from '../../services/multiplayerEngine';
import { gameEngine } from '../../services/gameEngine';
import { audioEngine } from '../../services/audioEngine';
import { GAME_LEVELS } from '../../config/gameConfig';
import { SongSearchInput } from '../game/SongSearchInput';
import { MusicVisualizer } from '../common/MusicVisualizer';
import { socialService } from '../../services/socialService';
import { FriendUser } from '../../types';
import { soundEffectsService } from '../../services/soundEffectsService';
import { ShareResultModal } from '../common/ShareResultModal';
import { CURATED_BATTLE_THEMES } from '../../config/battleThemes';
import { rankedBlitzService } from '../../services/rankedBlitzService';
import { RankedBlitzModal } from './RankedBlitzModal';

interface MultiplayerViewProps {
  onOpenAuth?: () => void;
  onNavigateHome?: () => void;
}

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({ onOpenAuth, onNavigateHome }) => {
  const [profile, setProfile] = useState(gameEngine.getUserProfile());
  const [nameInput, setNameInput] = useState(profile.displayName || '');
  const [room, setRoom] = useState<MultiplayerRoom | null>(multiplayerEngine.getActiveRoom());
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [waveformBars, setWaveformBars] = useState<number[]>(new Array(32).fill(0.18));
  const [lastGuessFeedback, setLastGuessFeedback] = useState<{ isCorrect: boolean; points: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [roomLanguage, setRoomLanguage] = useState('English');
  const [roomMixLanguages, setRoomMixLanguages] = useState(false);
  const [selectedRounds, setSelectedRounds] = useState<number>(3);
  const [remainingSeconds, setRemainingSeconds] = useState<number>(30);
  const [resultsSeconds, setResultsSeconds] = useState<number>(5);
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [kickTargetPlayer, setKickTargetPlayer] = useState<{ id: string; name: string } | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [friendsList, setFriendsList] = useState<FriendUser[]>(socialService.getFriends());
  const [invitedFriendIds, setInvitedFriendIds] = useState<Set<string>>(new Set());
  const [roomPasscode, setRoomPasscode] = useState('');
  const [usePasscode, setUsePasscode] = useState(false);
  const [guestPasscodeInput, setGuestPasscodeInput] = useState('');
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [exportedService, setExportedService] = useState<'spotify' | 'apple' | null>(null);
  const [selectedBattleTheme, setSelectedBattleTheme] = useState<string>('pop_2010s');
  const [blitzModalOpen, setBlitzModalOpen] = useState(false);
  const [shareMatchModalOpen, setShareMatchModalOpen] = useState(false);
  const [blitzStats, setBlitzStats] = useState(rankedBlitzService.getStats());

  useEffect(() => {
    return rankedBlitzService.subscribe(() => {
      setBlitzStats(rankedBlitzService.getStats());
    });
  }, []);

  // Cool Floating & Popping Emojis Reaction State
  interface FloatingReactionItem {
    id: string;
    emoji: '🔥' | '🤯' | '👏' | '😭' | '⚡' | '🎉' | '❤️';
    playerName: string;
    leftPercent: number;
    rotation: number;
    scale: number;
  }
  const [floatingReactions, setFloatingReactions] = useState<FloatingReactionItem[]>([]);
  const lastReactionCountRef = useRef<number>(0);

  const spawnFloatingReaction = (emoji: '🔥' | '🤯' | '👏' | '😭' | '⚡' | '🎉' | '❤️', playerName: string) => {
    soundEffectsService.playEmojiPop(emoji);
    const burstCount = 2;
    for (let i = 0; i < burstCount; i++) {
      const id = `pop_${Date.now()}_${Math.random().toString(36).slice(2, 7)}_${i}`;
      const leftPercent = Math.floor(18 + Math.random() * 64);
      const rotation = Math.floor(-16 + Math.random() * 32);
      const scale = 0.95 + Math.random() * 0.35;

      setTimeout(() => {
        setFloatingReactions((prev) => [
          ...prev.slice(-14),
          { id, emoji, playerName, leftPercent, rotation, scale }
        ]);

        setTimeout(() => {
          setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
        }, 2400);
      }, i * 120);
    }
  };

  useEffect(() => {
    const reactions = room?.recentReactions || [];
    if (reactions.length > lastReactionCountRef.current) {
      const newItems = reactions.slice(lastReactionCountRef.current);
      newItems.forEach((rx) => {
        spawnFloatingReaction(rx.emoji, rx.playerName);
      });
    }
    lastReactionCountRef.current = reactions.length;
  }, [room?.recentReactions]);

  const isHost = Boolean(room && room.hostId === profile.id);
  const myPlayer = room?.players.find(p => p.id === profile.id);
  const myLevel = ((myPlayer?.currentLevel || 1) as GameLevelNumber);
  const levelConfig = GAME_LEVELS[myLevel];
  const maxDuration = levelConfig.durationSeconds;
  const pointsMap: Record<number, number> = { 1: 100, 2: 70, 3: 40, 4: 20 };

  useEffect(() => {
    const unsub = multiplayerEngine.subscribeRoom((updatedRoom) => {
      setRoom({ ...updatedRoom });
      if (updatedRoom.totalRounds) {
        setSelectedRounds(updatedRoom.totalRounds);
      }
    });
    return () => unsub();
  }, []);

  // Tick interval for 30-second round countdown and 5-second round summary countdown
  const lastTickSecondRef = useRef<number>(-1);
  useEffect(() => {
    const updateCountdowns = () => {
      if (room?.status === 'playing') {
        const remaining = multiplayerEngine.getRemainingSeconds();
        setRemainingSeconds(remaining);
        if (remaining <= 3 && remaining > 0) {
          if (lastTickSecondRef.current !== remaining) {
            lastTickSecondRef.current = remaining;
            soundEffectsService.playCountdownTick(remaining === 1);
          }
        } else {
          lastTickSecondRef.current = -1;
        }
      } else if (room?.status === 'round-summary') {
        setResultsSeconds(multiplayerEngine.getResultsCountdownSeconds());
      }
    };
    updateCountdowns();
    const interval = setInterval(updateCountdowns, 200);
    return () => clearInterval(interval);
  }, [room?.status, room?.roundDeadline, room?.roundResultsUntil]);

  // Victory fanfare sound when match completes
  useEffect(() => {
    if (room?.status === 'completed') {
      soundEffectsService.playGameVictoryFanfare();
    }
  }, [room?.status]);

  useEffect(() => {
    const unsubPlayback = audioEngine.subscribePlayback((playing, curTime) => {
      setIsPlayingAudio(playing);
      setCurrentTime(curTime);
      if (playing) {
        setIsLoadingAudio(false);
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
  }, []);

  // When round changes, reset audio and selections
  const currentRoundIndex = room?.currentRoundIndex;
  const roomStatus = room?.status;
  useEffect(() => {
    audioEngine.stop();
    setIsPlayingAudio(false);
    setIsLoadingAudio(false);
    setSelectedTrack(null);
    setAudioError(null);
    setLastGuessFeedback(null);
  }, [currentRoundIndex, roomStatus]);

  // Refresh user profile and name input on mount
  useEffect(() => {
    const fresh = gameEngine.getUserProfile();
    setProfile(fresh);
    setNameInput(fresh.displayName || '');
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.slice(0, 20);
    setNameInput(rawValue);
    const updated = gameEngine.updateUserProfile({ displayName: rawValue });
    setProfile(updated);
  };

  const handleNameBlur = () => {
    const trimmed = nameInput.trim();
    const finalName = trimmed || `Guest_${profile.id.slice(-4).toUpperCase()}`;
    setNameInput(finalName);
    const updated = gameEngine.updateUserProfile({ displayName: finalName });
    setProfile(updated);
  };

  const handleClearName = () => {
    setNameInput('');
    const updated = gameEngine.updateUserProfile({ displayName: '' });
    setProfile(updated);
  };

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setErrorMessage(null);
    const effectiveName = nameInput.trim() || profile.displayName.trim() || `Guest_${profile.id.slice(-4).toUpperCase()}`;
    const updated = gameEngine.updateUserProfile({ displayName: effectiveName });
    setProfile(updated);
    setNameInput(effectiveName);
    try {
      const newRoom = await multiplayerEngine.createRoom(
        effectiveName,
        profile.id,
        { language: roomLanguage, mixLanguages: roomMixLanguages, totalRounds: selectedRounds, battleTheme: selectedBattleTheme }
      );
      setRoom(newRoom);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create room.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectRounds = (count: number) => {
    setSelectedRounds(count);
    if (isHost && room && room.status === 'lobby') {
      multiplayerEngine.setTotalRounds(count);
    }
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = joinCodeInput.trim().replace(/\D/g, '');
    if (!clean) return;

    setIsJoining(true);
    setErrorMessage(null);
    const effectiveName = nameInput.trim() || profile.displayName.trim() || `Guest_${profile.id.slice(-4).toUpperCase()}`;
    const updated = gameEngine.updateUserProfile({ displayName: effectiveName });
    setProfile(updated);
    setNameInput(effectiveName);
    try {
      const paddedCode = clean.padStart(6, '0');
      const joined = await multiplayerEngine.joinRoom(paddedCode, effectiveName, profile.id, guestPasscodeInput.trim() || undefined);
      setRoom(joined);
      setJoinCodeInput('');
      setGuestPasscodeInput('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or closed room code.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCopyCode = () => {
    if (room?.roomCode) {
      navigator.clipboard.writeText(room.roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleToggleReady = () => {
    multiplayerEngine.toggleReady(profile.id);
  };

  const handleStartGame = async () => {
    if (room && isHost) {
      await multiplayerEngine.startMatch(room.hostId);
    }
  };

  const handleKickPlayer = async (targetId: string, targetName: string) => {
    if (!isHost) return;
    if (room?.status === 'playing') {
      alert('Fair play safeguard: You cannot remove participants while a round is actively in progress.');
      return;
    }
    setKickTargetPlayer({ id: targetId, name: targetName });
  };

  const handleConfirmKick = async () => {
    if (isHost && kickTargetPlayer) {
      try {
        await multiplayerEngine.kickParticipant(kickTargetPlayer.id);
      } catch (err: any) {
        alert(err.message || 'Failed to remove player.');
      } finally {
        setKickTargetPlayer(null);
      }
    }
  };

  const handleCloseRoom = async () => {
    if (isHost) {
      await multiplayerEngine.closeRoom();
      setRoom(null);
      setShowCloseConfirm(false);
    }
  };

  const handleSelectMode = (mode: 'competitive' | 'casual') => {
    if (isHost && room && room.status === 'lobby') {
      multiplayerEngine.setGameMode(mode);
    }
  };

  const handleSelectLanguageFilter = (lang: string) => {
    if (isHost && room && room.status === 'lobby') {
      multiplayerEngine.setLanguageFilter(lang);
    }
  };

  const handleTogglePasscode = (enabled: boolean) => {
    setUsePasscode(enabled);
    if (!enabled) {
      setRoomPasscode('');
      multiplayerEngine.setRoomPasscode(null);
    } else if (roomPasscode.length === 4) {
      multiplayerEngine.setRoomPasscode(roomPasscode);
    }
  };

  const handleUpdatePasscode = (code: string) => {
    const clean = code.replace(/\D/g, '').slice(0, 4);
    setRoomPasscode(clean);
    if (usePasscode) {
      multiplayerEngine.setRoomPasscode(clean.length === 4 ? clean : null);
    }
  };

  const handlePreviewCatalogueTrack = async (track: Track) => {
    if (previewTrackId === track.id && isPlayingPreview) {
      audioEngine.stop();
      setIsPlayingPreview(false);
      setPreviewTrackId(null);
      return;
    }

    try {
      audioEngine.stop();
      setIsPlayingPreview(true);
      setPreviewTrackId(track.id);
      await audioEngine.playClip(track, 2); // 3-second sample audition
    } catch {
      setIsPlayingPreview(false);
      setPreviewTrackId(null);
    }
  };

  const handleSendReaction = (emoji: '🔥' | '🤯' | '👏' | '😭' | '⚡' | '🎉' | '❤️') => {
    multiplayerEngine.sendReaction(profile.id, emoji);
    spawnFloatingReaction(emoji, profile.displayName || 'You');
  };

  const handleRematch = async () => {
    if (isHost && room) {
      await multiplayerEngine.restartRematch(room.hostId);
      setExportedService(null);
    }
  };

  const handleExportPlaylist = (service: 'spotify' | 'apple') => {
    if (!room) return;
    const tracks = (room.catalogueSnapshot && room.catalogueSnapshot.length > 0)
      ? room.catalogueSnapshot
      : room.trackIds.map(id => multiplayerEngine.getRoomTrackById(id)).filter(Boolean) as Track[];

    const trackNames = tracks.map(t => `${t.title} - ${t.artist}`).join('\n');
    const encoded = encodeURIComponent(trackNames);

    if (service === 'spotify') {
      // Direct search query link for Spotify
      window.open(`https://open.spotify.com/search/${encodeURIComponent(tracks[0]?.title || 'SongVerse')}`, '_blank');
    } else {
      // Direct Apple Music search link
      window.open(`https://music.apple.com/search?term=${encodeURIComponent(tracks[0]?.title || 'SongVerse')}`, '_blank');
    }

    // Also copy entire track list to clipboard for instant import
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`SongVerse Room ${room.roomCode} Match Playlist:\n` + trackNames);
    }

    setExportedService(service);
    setTimeout(() => setExportedService(null), 4000);
  };

  const handleOpenInviteFriends = () => {
    setFriendsList(socialService.getFriends());
    socialService.syncFriendsFromDatabase();
    setShowInviteModal(true);
  };

  const handleSendFriendRoomInvite = async (friend: FriendUser) => {
    if (!room) return;
    await socialService.inviteFriendToRoom(
      friend,
      room.roomCode,
      room.mode || 'competitive',
      room.totalRounds || 3
    );
    setInvitedFriendIds(prev => new Set(prev).add(friend.id));
  };

  const handlePlayMultiplayerAudio = async () => {
    const track = multiplayerEngine.getCurrentTrack();
    if (!track) {
      setAudioError('Preparing active track preview audio... please wait a moment.');
      return;
    }

    if (isPlayingAudio) {
      audioEngine.stop();
      setIsPlayingAudio(false);
    } else {
      setAudioError(null);
      setIsLoadingAudio(true);
      try {
        await audioEngine.playClip(track, myLevel);
      } catch (err: any) {
        setAudioError(err.message || 'Audio playback error. Please tap to retry.');
      } finally {
        setIsLoadingAudio(false);
      }
    }
  };

  const handleSkipLevel = async () => {
    audioEngine.stop();
    setIsPlayingAudio(false);
    await multiplayerEngine.skipLevel(profile.id);
  };

  const handleSubmitMultiplayerGuess = async () => {
    if (!selectedTrack || !room) return;
    audioEngine.stop();
    setIsPlayingAudio(false);
    const currentTrack = multiplayerEngine.getCurrentTrack();
    const normalize = (s: string) => (s || '').toLowerCase().replace(/[^\w]/g, '');
    const isCorrect = Boolean(
      currentTrack && (
        selectedTrack.id === currentTrack.id ||
        selectedTrack.providerTrackId === currentTrack.providerTrackId ||
        (normalize(selectedTrack.title) === normalize(currentTrack.title) &&
         normalize(selectedTrack.artist) === normalize(currentTrack.artist))
      )
    );

    const points = isCorrect ? (pointsMap[myLevel] || 20) : 0;

    if (isCorrect) {
      soundEffectsService.playCorrectChime(profile.currentStreak || 1);
    } else {
      soundEffectsService.playWrongBuzz();
    }

    multiplayerEngine.submitPlayerGuess(
      profile.id,
      isCorrect,
      points,
      selectedTrack.id,
      selectedTrack.title
    );

    setLastGuessFeedback({ isCorrect, points });
    setSelectedTrack(null);

    // If wrong guess and level < 4, auto advance level for longer audio clip hint
    if (!isCorrect && myLevel < 4) {
      await multiplayerEngine.skipLevel(profile.id);
    }
  };

  const handleLeaveRoom = () => {
    audioEngine.stop();
    multiplayerEngine.leaveRoom();
    setRoom(null);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in">
      
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-sv-burgundy pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sv-red to-sv-orange text-white flex items-center justify-center font-black shadow-md shadow-sv-red/25">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              Multiplayer Game Room
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Up to 20 players per room · 6-digit room codes · Full guest support
            </p>
          </div>
        </div>

        {profile.isGuest && onOpenAuth && (
          <button
            onClick={onOpenAuth}
            className="text-xs font-bold text-sv-red hover:text-sv-crimson dark:text-sv-warm-orange dark:hover:text-sv-gold transition-colors flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <span>Sign in to save records across devices</span>
            <span>→</span>
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 p-4 rounded-2xl flex items-center gap-3 text-xs font-medium text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* LOBBY BROWSER / ROOM CREATOR (When not in an active room) */}
      {!room ? (
        <div className="space-y-6">
          {/* Customizable Player Identity Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 bg-white/95 dark:bg-sv-burgundy-deep/90 rounded-3xl border border-slate-200 dark:border-sv-burgundy shadow-sm">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sv-red via-sv-red-orange to-sv-amber flex items-center justify-center text-white font-black text-sm uppercase shadow-sm shadow-sv-red/25">
                {(nameInput.trim() || profile.displayName.trim() || 'Guest').slice(0, 2)}
              </div>
              <div>
                <span className="text-[10px] font-bold text-sv-red dark:text-sv-warm-orange uppercase tracking-wider block font-mono">
                  Your Player Identity
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Visible to everyone in multiplayer matches
                </span>
              </div>
            </div>
            <div className="relative flex items-center w-full sm:w-auto">
              <input
                type="text"
                maxLength={20}
                value={nameInput}
                onChange={handleNameChange}
                onBlur={handleNameBlur}
                className="w-full sm:w-56 pl-4 pr-9 py-2.5 text-xs font-bold bg-slate-50 dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-sv-red focus:ring-2 focus:ring-sv-red/10"
                placeholder="Enter player name..."
                aria-label="Player Display Name"
              />
              {nameInput.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearName}
                  className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
                  title="Clear name"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Match 1v1 Blitz Card */}
          <div className="bg-gradient-to-r from-sv-burgundy via-sv-red/80 to-sv-orange/80 rounded-3xl p-6 sm:p-7 shadow-lg text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden border border-white/20">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
            <div className="relative z-10 space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-[10px] font-black uppercase tracking-wider text-sv-warm-orange border border-white/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Ranked Matchmaking • 3-Round Duel
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                ⚡ Quick Match 1v1 Blitz
              </h2>
              <p className="text-xs text-white/80 max-w-lg leading-relaxed">
                Compete in real-time head-to-head 30-second song showdowns. Climb from <span className="font-bold text-amber-300">Bronze</span> to <span className="font-bold text-cyan-300">Maestro</span> and gain Elo!
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                <span className="px-3 py-1 rounded-xl bg-black/40 font-bold border border-white/10">
                  Rating: <span className="text-sv-warm-orange font-mono font-black">{blitzStats.rating} Elo</span>
                </span>
                <span className="px-3 py-1 rounded-xl bg-black/40 font-bold border border-white/10">
                  Tier: <span className="text-amber-300 font-mono font-black">{blitzStats.tier}</span>
                </span>
                <span className="px-3 py-1 rounded-xl bg-black/40 font-bold border border-white/10">
                  Record: <span className="text-white font-mono">{blitzStats.wins}W / {blitzStats.losses}L</span>
                </span>
              </div>
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setBlitzModalOpen(true)}
                className="w-full sm:w-auto px-7 py-3.5 bg-white text-slate-950 hover:bg-slate-100 font-black text-sm rounded-2xl shadow-xl transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-sv-red" />
                Find 1v1 Match
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-7 items-start">
          
          {/* Create Room Card */}
          <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-sv-red dark:text-sv-warm-orange uppercase tracking-wider font-mono">
                Host a Match
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Create a New Room
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Generate a unique 6-digit code. Invite friends to join as guests with no login required.
              </p>
            </div>

            <div className="space-y-4">
              {/* Curated Showdown Theme & Visualizer */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Battle Showdown Theme & Visualizer
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CURATED_BATTLE_THEMES.map((theme) => {
                    const isSelected = selectedBattleTheme === theme.id;
                    return (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => setSelectedBattleTheme(theme.id)}
                        className={`p-2.5 rounded-xl text-left border transition-all text-xs cursor-pointer flex flex-col gap-1 ${
                          isSelected
                            ? 'border-sv-red bg-sv-red/10 text-sv-red dark:text-sv-warm-orange ring-1 ring-sv-red'
                            : 'border-slate-200 dark:border-sv-burgundy bg-slate-50 dark:bg-sv-midnight text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span className="truncate">{theme.name}</span>
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 shrink-0">{theme.visualizerTheme}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{theme.tagline}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Language Preference
                </label>
                <select
                  value={roomLanguage}
                  onChange={(e) => setRoomLanguage(e.target.value)}
                  className="w-full px-4 py-3 text-xs font-semibold bg-slate-50 dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-sv-red"
                >
                  <option value="English">English</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Hindi">Hindi</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>

              {/* Host Round Count Selector (3 to 10 rounds) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Match Length (Rounds)
                  </label>
                  <span className="text-xs font-black text-sv-red dark:text-sv-warm-orange font-mono">
                    {selectedRounds} Rounds
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 p-1.5 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy">
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const isSelected = selectedRounds === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSelectRounds(num)}
                        className={`py-2 px-1 rounded-xl text-xs font-black font-mono transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-sv-red text-white shadow-md scale-105 ring-2 ring-sv-red/30'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-sv-burgundy/60'
                        }`}
                      >
                        <span>{num}</span>
                        <span className="text-[9px] opacity-75 font-normal">rnd</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                  Authoritative 30s deadline · 2-player early round finish · 5s results review.
                </p>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Mix Languages</span>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Play tracks across all world languages</p>
                </div>
                <input
                  type="checkbox"
                  checked={roomMixLanguages}
                  onChange={(e) => setRoomMixLanguages(e.target.checked)}
                  className="w-4 h-4 text-sv-red accent-sv-red rounded cursor-pointer"
                />
              </div>

              <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-1 pt-1">
                <p>• Capacity: <strong>20 participants</strong> (including host)</p>
                <p>• Code Format: <strong>6 numeric digits (000000–999999)</strong></p>
              </div>

              <button
                type="button"
                onClick={handleCreateRoom}
                disabled={isCreating}
                className="w-full py-4 bg-gradient-to-r from-sv-red to-sv-red-orange hover:from-sv-crimson hover:to-sv-red active:scale-95 text-white rounded-2xl text-xs font-black shadow-md shadow-sv-red/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4 text-sv-gold" />
                <span>{isCreating ? 'Creating Room...' : 'Create Room & Get 6-Digit Code'}</span>
              </button>
            </div>
          </div>

          {/* Join Room Card */}
          <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="space-y-1.5">
              <span className="text-[11px] font-black text-sv-warm-orange uppercase tracking-wider font-mono">
                Join a Friend
              </span>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                Enter 6-Digit Room Code
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Got an invitation code from a host? Enter the 6 digits to jump straight into the lobby.
              </p>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Room Code (e.g. 048291)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-4 py-3.5 text-center tracking-[0.4em] font-mono text-3xl font-black bg-slate-50 dark:bg-sv-midnight border-2 border-slate-200 dark:border-sv-burgundy rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-sv-red focus:ring-4 focus:ring-sv-red/10"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sv-red" />
                  <span>Room Passcode (Optional)</span>
                </label>
                <input
                  type="password"
                  maxLength={4}
                  value={guestPasscodeInput}
                  onChange={(e) => setGuestPasscodeInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Leave empty if no PIN set by host"
                  className="w-full px-4 py-2.5 text-center tracking-widest font-mono text-sm font-bold bg-slate-50 dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-sv-red"
                />
              </div>

              <div className="p-3.5 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy text-xs text-slate-600 dark:text-slate-300">
                Playing as: <strong className="text-slate-900 dark:text-white font-bold">{nameInput.trim() || profile.displayName.trim() || 'Guest'}</strong>
              </div>

              <button
                type="submit"
                disabled={isJoining || joinCodeInput.length === 0}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-sv-warm-orange dark:hover:bg-sv-amber text-white dark:text-slate-900 rounded-2xl text-xs font-black shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>{isJoining ? 'Joining Room...' : 'Join Room'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>
      ) : (
        /* ACTIVE MULTIPLAYER ROOM (Lobby, Playing, Round Summary, or Completed) */
        <div className="space-y-6">
          
          {/* Room Header & Controls */}
          <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-black text-sv-red dark:text-sv-warm-orange tracking-wider uppercase font-mono">
                    Room Active
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                    {room.players.length} / 20 Participants
                  </span>
                  <span className="text-xs text-slate-400">•</span>
                  <span className="text-xs font-black text-sv-warm-orange font-mono">
                    {room.totalRounds || room.trackIds?.length || 3} Rounds
                  </span>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-slate-900 dark:text-white">
                    {room.roomCode}
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="p-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-sv-midnight/90 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200/80 dark:border-sv-burgundy/80 shadow-2xs"
                    title="Copy 6-digit code"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                  </button>
                </div>
              </div>

              {/* Leave / Close Buttons */}
              <div className="flex items-center gap-2">
                {isHost && (
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-200/60 dark:border-rose-900/60"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close Room</span>
                  </button>
                )}
                <button
                  onClick={handleLeaveRoom}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-sv-midnight/90 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-200/60 dark:border-sv-burgundy/80"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Leave Lobby</span>
                </button>
              </div>
            </div>

            {/* Close confirmation modal */}
            {showCloseConfirm && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-2xl space-y-3">
                <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                  Are you sure you want to close this room? All participants will be disconnected.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCloseRoom}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs"
                  >
                    Yes, Close Room
                  </button>
                  <button
                    onClick={() => setShowCloseConfirm(false)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Kick Participant confirmation modal */}
            {kickTargetPlayer && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-800 rounded-2xl space-y-3 animate-in fade-in">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-900 dark:text-amber-200">
                  <UserX className="w-4 h-4 text-rose-600" />
                  <span>
                    Remove <span className="font-extrabold text-slate-900 dark:text-white">"{kickTargetPlayer.name}"</span> from this room?
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  This player will be disconnected from the lobby and their spot will open up for others.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleConfirmKick}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer shadow-xs transition-colors"
                  >
                    Yes, Remove Player
                  </button>
                  <button
                    onClick={() => setKickTargetPlayer(null)}
                    className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Host Migration Notification Banner */}
          {room.hostMigrated && (
            <div className="p-4 bg-amber-500/15 border border-amber-500/30 rounded-3xl flex items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200 shadow-xs animate-in fade-in">
              <div className="flex items-center gap-3">
                <Crown className="w-6 h-6 text-sv-gold shrink-0 animate-bounce" />
                <div>
                  <p className="font-black text-sm">👑 Host Migration Active</p>
                  <p className="text-[11px] opacity-90 mt-0.5">
                    {room.hostMigrationNotice || 'Previous host departed. Host authority seamlessly promoted to next active player. All scores, rounds, and music catalogue snapshot are preserved!'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Room Music Catalogue Transparency Card */}
          <div className="p-5 bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl shadow-sm space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-sv-burgundy pb-3">
              <div className="flex items-center gap-2.5">
                <Disc3 className="w-5 h-5 text-sv-red animate-spin" style={{ animationDuration: '10s' }} />
                <div>
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                    Host Room Catalogue Snapshot
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    Immutable pool · Zero disruption during active gameplay
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="font-mono px-2.5 py-1 rounded-xl bg-sv-red/10 text-sv-red dark:text-sv-warm-orange font-black border border-sv-red/20">
                  {room.catalogueStats?.totalTracks || room.catalogueSnapshot?.length || 0} Playable Tracks
                </span>
                <span className="font-mono px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-sv-midnight text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-sv-burgundy">
                  {room.catalogueStats?.artistsCount || 16} Artists
                </span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5 text-sv-warm-orange" />
                <span>Languages: <strong className="text-slate-800 dark:text-slate-200">{room.catalogueStats?.languages?.join(', ') || room.languageFilter || 'All Languages'}</strong></span>
              </div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Host Source: <strong className="text-slate-700 dark:text-slate-300">{room.catalogueStats?.hostName || 'Host'}</strong>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium bg-slate-50 dark:bg-sv-midnight/60 p-2.5 rounded-xl border border-slate-200/60 dark:border-sv-burgundy/60">
              🛡️ <strong>Catalogue Isolation Guarantee:</strong> All participants in this room will play using the host's shared room catalogue. Your personal song catalogue on this device remains completely unchanged.
            </p>
          </div>

          {/* DEDICATED HOST MANAGEMENT PANEL */}
          {isHost && room.status === 'lobby' && (
            <div className="bg-gradient-to-br from-sv-burgundy-deep/15 to-sv-midnight/40 dark:bg-sv-burgundy-deep/90 border border-sv-burgundy/40 rounded-3xl p-6 sm:p-7 space-y-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Crown className="w-5 h-5 text-sv-gold" />
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">Host Controls Panel</h3>
                </div>
                <span className="text-[10px] uppercase font-bold text-sv-orange bg-sv-orange/10 px-3 py-1 rounded-full border border-sv-orange/20 font-mono">
                  Host Authority Verified
                </span>
              </div>

              {/* Game Mode Selector: Competitive vs Casual */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-sv-red" />
                  <span>Select Game Mode</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleSelectMode('competitive')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      (room.mode || 'competitive') === 'competitive'
                        ? 'border-sv-red bg-sv-red/10 text-sv-red dark:text-sv-warm-orange shadow-sm ring-2 ring-sv-red/30'
                        : 'border-slate-200 dark:border-sv-burgundy text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-sv-midnight'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs">
                        <Zap className="w-4 h-4 text-sv-warm-orange" />
                        <span>Competitive Mode</span>
                      </div>
                      {(room.mode || 'competitive') === 'competitive' && (
                        <Check className="w-4 h-4 text-sv-red" />
                      )}
                    </div>
                    <p className="text-[11px] mt-1.5 opacity-85 leading-snug font-medium">
                      100-70-40-20 speed scoring, win streaks, competitive leaderboard, and podium ceremony.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectMode('casual')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      room.mode === 'casual'
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 shadow-sm ring-2 ring-emerald-500/30'
                        : 'border-slate-200 dark:border-sv-burgundy text-slate-600 dark:text-slate-400 hover:border-slate-300 bg-white dark:bg-sv-midnight'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-black text-xs">
                        <Sparkles className="w-4 h-4 text-emerald-500" />
                        <span>Casual Jam Mode</span>
                      </div>
                      {room.mode === 'casual' && (
                        <Check className="w-4 h-4 text-emerald-600" />
                      )}
                    </div>
                    <p className="text-[11px] mt-1.5 opacity-85 leading-snug font-medium">
                      Relaxed guessing, collaborative summaries, team music appreciation, zero pressure.
                    </p>
                  </button>
                </div>
              </div>

              {/* Language Filter Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-sv-warm-orange" />
                  <span>Catalogue Language Filter</span>
                </label>
                <select
                  value={room.languageFilter || 'all'}
                  onChange={(e) => handleSelectLanguageFilter(e.target.value)}
                  className="w-full px-4 py-3 text-xs font-semibold bg-white dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-sv-red"
                >
                  <option value="all">All Languages (Mixed Global Hits)</option>
                  <option value="English">English Only</option>
                  <option value="Hindi">Hindi (Bollywood & Pop)</option>
                  <option value="Telugu">Telugu</option>
                  <option value="Tamil">Tamil</option>
                  <option value="Malayalam">Malayalam</option>
                  <option value="Kannada">Kannada</option>
                  <option value="Bengali">Bengali</option>
                  <option value="Punjabi">Punjabi</option>
                  <option value="Spanish">Spanish</option>
                </select>
              </div>

              {/* Host Round Count Selector (3 to 10 rounds) in Lobby */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-sv-red" />
                    <span>Match Length ({room.totalRounds || selectedRounds} Rounds)</span>
                  </label>
                  <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                    Synchronizes to all players
                  </span>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 p-1.5 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy">
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                    const isSelected = (room.totalRounds || selectedRounds) === num;
                    return (
                      <button
                        key={num}
                        type="button"
                        onClick={() => handleSelectRounds(num)}
                        className={`py-2 px-1 rounded-xl text-xs font-black font-mono transition-all duration-200 cursor-pointer flex flex-col items-center justify-center ${
                          isSelected
                            ? 'bg-sv-red text-white shadow-md scale-105 ring-2 ring-sv-red/30'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-sv-burgundy/60'
                        }`}
                      >
                        <span>{num}</span>
                        <span className="text-[9px] opacity-75 font-normal">rnd</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Host Feature 1: Pre-Listen / Audio Quality Audit */}
              <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-sv-burgundy/60">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Headphones className="w-3.5 h-3.5 text-sv-orange" />
                    <span>Host Audio Pre-Listen & Catalogue Scrub</span>
                  </label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    Audition 3s preview
                  </span>
                </div>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy">
                  {(room.catalogueSnapshot || []).slice(0, 8).map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2 rounded-xl bg-white dark:bg-sv-burgundy/40 border border-slate-200/60 dark:border-sv-burgundy/60 text-xs"
                    >
                      <div className="truncate max-w-[200px] sm:max-w-xs">
                        <p className="font-bold text-slate-900 dark:text-white truncate">{t.title}</p>
                        <p className="text-[10px] text-slate-500 truncate">{t.artist} · {t.language}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handlePreviewCatalogueTrack(t)}
                        className="px-2.5 py-1 rounded-lg bg-sv-red/10 hover:bg-sv-red/20 text-sv-red text-[10px] font-bold cursor-pointer transition-colors flex items-center gap-1"
                      >
                        {previewTrackId === t.id && isPlayingPreview ? (
                          <>
                            <VolumeX className="w-3 h-3" />
                            <span>Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Audition</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Host Feature 3: Private Room 4-Digit Passcode Protection */}
              <div className="p-3.5 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-sv-red" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">Require 4-Digit Room Passcode</p>
                      <p className="text-[10px] text-slate-500">Only players with this PIN can enter the lobby</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={usePasscode}
                    onChange={(e) => handleTogglePasscode(e.target.checked)}
                    className="w-4 h-4 text-sv-red accent-sv-red rounded cursor-pointer"
                  />
                </div>
                {usePasscode && (
                  <div className="flex items-center gap-2 pt-1 animate-in fade-in">
                    <input
                      type="text"
                      maxLength={4}
                      value={roomPasscode}
                      onChange={(e) => handleUpdatePasscode(e.target.value)}
                      placeholder="e.g. 1234"
                      className="px-3 py-1.5 text-center font-mono font-black text-sm tracking-widest bg-white dark:bg-sv-burgundy/60 border border-slate-200 dark:border-sv-burgundy rounded-xl focus:outline-none focus:border-sv-red w-32"
                    />
                    <span className="text-[10px] text-slate-500 font-mono">
                      {roomPasscode.length === 4 ? '✓ Passcode locked & broadcasted' : 'Enter 4 digits'}
                    </span>
                  </div>
                )}
              </div>

              {/* Start Match & Ready State Summary */}
              {(() => {
                const guests = room.players.filter(p => !p.isHost);
                const readyGuests = guests.filter(p => p.isReady).length;
                return (
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-slate-200/60 dark:border-sv-burgundy/60">
                    <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {guests.length === 0 ? (
                        <span>Solo lobby. Invite friends with code <strong>{room.roomCode}</strong> or start solo practice.</span>
                      ) : (
                        <span>
                          Participant Readiness: <strong className={readyGuests === guests.length ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>{readyGuests} / {guests.length} ready</strong>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleOpenInviteFriends}
                        className="px-5 py-3.5 bg-white dark:bg-sv-midnight hover:bg-slate-50 dark:hover:bg-sv-burgundy text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-sv-burgundy rounded-2xl text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <Users className="w-4 h-4 text-sv-red" />
                        <span>Invite Friends</span>
                      </button>
                      <button
                        onClick={handleStartGame}
                        className="px-8 py-3.5 bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber hover:from-sv-crimson hover:to-sv-red text-white rounded-2xl text-xs font-black cursor-pointer shadow-md shadow-sv-red/25 flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        <Play className="w-4 h-4 fill-white" />
                        <span>Start Match for All Players</span>
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* GUEST LOBBY READY TOGGLE & ROOM MODE DISPLAY */}
          {!isHost && room.status === 'lobby' && (
            <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl p-6 sm:p-7 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-sv-burgundy pb-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-sv-red dark:text-sv-warm-orange font-mono">
                    Participant Status
                  </span>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    {myPlayer?.isReady ? 'You are Ready to Play! ✅' : 'Waiting for You to Ready Up'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Signal to the host that you have your headphones on and are ready for track trivia.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleToggleReady}
                  className={`px-6 py-3.5 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm ${
                    myPlayer?.isReady
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                      : 'bg-amber-500 hover:bg-amber-600 text-slate-950 shadow-amber-500/20'
                  }`}
                >
                  {myPlayer?.isReady ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Ready (Tap to Unready)</span>
                    </>
                  ) : (
                    <>
                      <Hourglass className="w-4 h-4" />
                      <span>Mark Yourself as Ready</span>
                    </>
                  )}
                </button>
              </div>

              {/* Game Mode Badge for Guest */}
              <div className="p-3.5 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200/80 dark:border-sv-burgundy/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {room.mode === 'casual' ? (
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Zap className="w-4 h-4 text-sv-warm-orange" />
                  )}
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Host Mode: <strong>{room.mode === 'casual' ? 'Casual Jam' : 'Competitive Match'}</strong>
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  {room.mode === 'casual' ? 'Friendly group trivia' : '100-70-40-20 speed ranking'}
                </span>
              </div>
            </div>
          )}

          {/* PARTICIPANTS LIST & STATUS */}
          <div className="bg-white/95 dark:bg-sv-burgundy-deep/90 border border-slate-200 dark:border-sv-burgundy rounded-3xl p-6 sm:p-7 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sv-burgundy pb-3.5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sv-red" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Participants ({room.players.length} / 20)
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Real players only · No bots</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {room.players.map((p) => {
                const isMe = p.id === profile.id;
                return (
                  <div
                    key={p.id}
                    className="p-3.5 bg-slate-50/90 dark:bg-sv-midnight/80 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sv-red to-sv-orange flex items-center justify-center text-white font-black text-xs shrink-0 shadow-xs">
                        {p.displayName.charAt(0)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-black text-slate-900 dark:text-white truncate">
                            {p.displayName} {isMe && '(You)'}
                          </p>
                          {p.isHost && <Crown className="w-3.5 h-3.5 text-sv-gold shrink-0" />}
                          {p.status === 'disconnected' ? (
                            <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                              <WifiOff className="w-2.5 h-2.5 animate-pulse" /> Reconnecting
                            </span>
                          ) : room.status === 'lobby' ? (
                            p.isHost ? (
                              <span className="text-[9px] font-bold text-sv-gold bg-sv-gold/10 border border-sv-gold/30 px-1.5 py-0.2 rounded-md">
                                Host
                              </span>
                            ) : p.isReady ? (
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Ready
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-100 dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                                <Hourglass className="w-2.5 h-2.5" /> Not Ready
                              </span>
                            )
                          ) : null}
                          {(p.streak || 0) > 1 && (
                            <span className="text-[9px] font-black text-rose-600 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 px-1.5 py-0.2 rounded-md flex items-center gap-0.5">
                              <Flame className="w-2.5 h-2.5 text-rose-500" /> {p.streak}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono font-bold">
                            Score: {p.score || 0} pts
                          </span>
                          {room.status === 'playing' && p.hasGuessedThisRound && (
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.2 rounded-full flex items-center gap-0.5">
                              <Check className="w-2.5 h-2.5" /> Guessed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isHost && !p.isHost && (
                        <button
                          onClick={() => handleKickPlayer(p.id, p.displayName)}
                          disabled={room.status === 'playing'}
                          className={`p-1.5 rounded-lg transition-colors ${
                            room.status === 'playing'
                              ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50'
                              : 'text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer'
                          }`}
                          title={room.status === 'playing' ? 'Cannot remove players while a round is actively in progress' : `Remove ${p.displayName}`}
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ACTIVE GAMEPLAY (When status is 'playing') */}
          {room.status === 'playing' && (
            <div className="bg-white/95 dark:bg-sv-burgundy-deep/95 border-2 border-sv-red/40 dark:border-sv-red/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in">
              
              {/* Header: Synchronized Match Status, Round & Level Badges, 30s Countdown Timer & 2-Player Guess Tracker */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-sv-burgundy pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs font-black text-sv-red uppercase tracking-wider font-mono">
                    Synchronized Match In Progress
                  </span>
                  <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full border border-sv-red/30 bg-sv-red/10 text-sv-red dark:text-sv-warm-orange flex items-center gap-1">
                    {room.mode === 'casual' ? <Sparkles className="w-3 h-3 text-emerald-500" /> : <Zap className="w-3 h-3 text-sv-warm-orange" />}
                    <span>{room.mode === 'casual' ? 'Casual Jam' : 'Competitive Mode'}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {/* 30-Second Round Deadline Timer Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-black transition-all ${
                      remainingSeconds <= 5
                        ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30 ring-2 ring-rose-400'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                    }`}
                    title="Authoritative 30-Second Round Deadline"
                  >
                    <Timer className={`w-3.5 h-3.5 ${remainingSeconds <= 5 ? 'animate-spin' : ''}`} />
                    <span>{remainingSeconds}s remaining</span>
                  </div>

                  {/* 2-Player Guess Tracker Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                      (room.roundGuessedPlayerIds?.length || 0) >= 2
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                        : (room.roundGuessedPlayerIds?.length || 0) === 1
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 text-indigo-700 dark:text-indigo-300'
                        : 'bg-slate-100 dark:bg-sv-midnight border-slate-200 dark:border-sv-burgundy text-slate-700 dark:text-slate-300'
                    }`}
                    title="Round ends automatically when at least 2 distinct players submit a guess"
                  >
                    <Zap className="w-3.5 h-3.5 text-sv-warm-orange" />
                    <span>{(room.roundGuessedPlayerIds?.length || 0)} / 2 guessed</span>
                  </div>

                  {/* Round Index / Total Rounds Badge */}
                  <span className="font-mono text-xs font-black text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-sv-midnight px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-sv-burgundy">
                    Round {room.currentRoundIndex + 1} of {room.totalRounds || room.trackIds?.length || 3}
                  </span>

                  {/* Player Level Badge */}
                  <span className="text-xs font-black uppercase tracking-wider text-sv-red dark:text-sv-gold bg-sv-red/10 dark:bg-sv-midnight/90 border border-sv-red/25 dark:border-sv-burgundy px-3 py-1.5 rounded-xl tabular-nums shadow-xs">
                    Lvl {myLevel} ({maxDuration.toFixed(1)}s)
                  </span>
                </div>
              </div>

              {/* Realtime Synchronized Guess Activity Banner during Active Play */}
              {room.recentGuesses && room.recentGuesses.length > 0 && (
                <div className="p-3 bg-slate-50/90 dark:bg-sv-midnight/80 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between gap-2 text-xs animate-in fade-in">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
                    <span className="font-black text-slate-800 dark:text-slate-200 shrink-0">
                      Live Guess:
                    </span>
                    <span className="text-slate-600 dark:text-slate-300 truncate font-medium">
                      <strong>{room.recentGuesses[room.recentGuesses.length - 1].playerName}</strong> submitted a guess!
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 font-bold">
                    Round {room.currentRoundIndex + 1}
                  </span>
                </div>
              )}

              {/* Audio Playback Error Banner with Retry */}
              {audioError && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 rounded-2xl p-4 flex items-center justify-between gap-3 text-xs text-rose-800 dark:text-rose-200">
                  <div className="flex items-center gap-2">
                    <VolumeX className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>{audioError}</span>
                  </div>
                  <button
                    onClick={handlePlayMultiplayerAudio}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl shrink-0 cursor-pointer transition-colors"
                  >
                    Retry Audio
                  </button>
                </div>
              )}

              {/* Audio-Reactive Equalizer Visualizer */}
              <MusicVisualizer
                waveformBars={waveformBars}
                isPlaying={isPlayingAudio}
                isLoading={isLoadingAudio}
                defaultStyle={
                  (CURATED_BATTLE_THEMES.find(t => t.id === (room?.battleTheme || selectedBattleTheme))?.visualizerTheme) || 'cyberpunk'
                }
              />

              {/* Progress Bar Track */}
              <div className="space-y-1.5">
                <div className="w-full bg-slate-100 dark:bg-sv-midnight h-2.5 rounded-full overflow-hidden border border-slate-200/60 dark:border-sv-burgundy/60 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-sv-red to-sv-amber h-full rounded-full transition-all duration-75"
                    style={{ width: `${Math.min(100, (currentTime / maxDuration) * 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-mono text-slate-400 font-bold px-0.5">
                  <span>{currentTime.toFixed(1)}s</span>
                  <span>{maxDuration.toFixed(1)}s window limit</span>
                </div>
              </div>

              {/* Central Audio Play & Interaction Button */}
              <div className="text-center space-y-3 py-2">
                <button
                  onClick={handlePlayMultiplayerAudio}
                  disabled={isLoadingAudio}
                  className={`px-9 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-3 mx-auto shadow-xl transition-all cursor-pointer active:scale-95 ${
                    isPlayingAudio
                      ? 'bg-gradient-to-r from-sv-warm-orange to-sv-amber text-slate-900 shadow-sv-warm-orange/30'
                      : 'bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber text-white shadow-sv-red/30 hover:shadow-2xl'
                  }`}
                >
                  {isLoadingAudio ? (
                    <>
                      <RotateCcw className="w-5 h-5 animate-spin" />
                      <span>Loading Verified Audio...</span>
                    </>
                  ) : isPlayingAudio ? (
                    <>
                      <Volume2 className="w-5 h-5 animate-bounce" />
                      <span>Stop Audio ({currentTime.toFixed(1)}s / {maxDuration.toFixed(1)}s)</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 fill-current" />
                      <span>Tap to Play {maxDuration.toFixed(1)}s Trivia Clip</span>
                    </>
                  )}
                </button>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Audio plays locally on your device. You can replay the {maxDuration.toFixed(1)}s window as many times as you like.
                </p>
              </div>

              {/* Guessing or Feedback Area */}
              {myPlayer?.hasGuessedThisRound ? (
                <div className={`p-4 rounded-2xl border text-xs text-center space-y-1 ${
                  myPlayer.lastGuessCorrect
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                }`}>
                  <p className="font-black text-sm">
                    {myPlayer.lastGuessCorrect
                      ? '🎉 Correct Guess! Score recorded.'
                      : 'Round Guess Submitted.'}
                  </p>
                  <p className="font-medium">
                    {myPlayer.lastGuessCorrect
                      ? 'Great ears! Waiting for other participants or 30s round timer.'
                      : 'Your answer was recorded. Waiting for round completion.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                      Submit Your Guess
                    </label>
                    {myLevel < 4 && (
                      <button
                        onClick={handleSkipLevel}
                        className="text-xs font-bold text-sv-orange hover:text-sv-red transition-colors cursor-pointer flex items-center gap-1"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        <span>
                          Skip Level (+Unlock {GAME_LEVELS[(myLevel + 1) as GameLevelNumber].durationSeconds}s Clip)
                        </span>
                      </button>
                    )}
                  </div>

                  <SongSearchInput
                    selectedTrack={selectedTrack}
                    onSelectTrack={setSelectedTrack}
                    onClearSelection={() => setSelectedTrack(null)}
                    customTrackPool={room.catalogueSnapshot}
                  />

                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button
                      onClick={handleSubmitMultiplayerGuess}
                      disabled={!selectedTrack}
                      className="w-full py-4 bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber hover:from-sv-crimson hover:to-sv-red disabled:bg-slate-300 dark:disabled:bg-sv-burgundy text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-sv-red/25 flex items-center justify-center gap-2 disabled:shadow-none disabled:cursor-not-allowed active:scale-95"
                    >
                      <Check className="w-4 h-4" />
                      <span>Submit Guess (+{pointsMap[myLevel]} pts)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Fair Host Notice */}
              <div className="pt-3 border-t border-slate-100 dark:border-sv-burgundy/60 text-center">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  ⚡ Fair Match Rules: Round advances automatically after 30s or when 2 players submit guesses.
                </span>
              </div>
            </div>
          )}

          {/* ROUND RESULTS INTERMISSION (When status is 'round-summary') */}
          {room.status === 'round-summary' && (
            <div className="bg-white/95 dark:bg-sv-burgundy-deep/95 border-2 border-sv-red/40 dark:border-sv-red/50 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl animate-in fade-in">
              {/* Round Summary Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-sv-burgundy pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-sv-red tracking-wider uppercase font-mono">
                      Round {room.currentRoundIndex + 1} Completed
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
                      Total {room.totalRounds || room.trackIds?.length || 3} Rounds
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                    Round Results
                  </h2>
                </div>

                {/* Auto Countdown Badge to Next Round */}
                <div className="flex items-center gap-2.5 bg-sv-red/10 dark:bg-sv-midnight border border-sv-red/30 px-4 py-2.5 rounded-2xl shadow-xs">
                  <Hourglass className="w-4 h-4 text-sv-red animate-spin" />
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase block leading-none font-mono">
                      Next Round Starts In
                    </span>
                    <span className="text-base font-black font-mono text-sv-red dark:text-sv-warm-orange">
                      {resultsSeconds}s...
                    </span>
                  </div>
                </div>
              </div>

              {/* Round End Trigger Reason Banner */}
              <div className={`p-4 rounded-2xl border text-xs flex items-center gap-3.5 ${
                room.roundEndReason === 'two_players_guessed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : room.roundEndReason === 'all_guessed'
                  ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}>
                {room.roundEndReason === 'two_players_guessed' ? (
                  <>
                    <Zap className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="font-black text-sm">Round Ended Early: 2 Players Submitted Guesses!</p>
                      <p className="text-[11px] opacity-90 mt-0.5">First 2 distinct participants answered, triggering fair automatic round completion.</p>
                    </div>
                  </>
                ) : room.roundEndReason === 'all_guessed' ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <div>
                      <p className="font-black text-sm">Round Ended: All Players Submitted Guesses!</p>
                      <p className="text-[11px] opacity-90 mt-0.5">Every participant in the room placed their guess.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <div>
                      <p className="font-black text-sm">Round Ended: 30-Second Time Limit Expired</p>
                      <p className="text-[11px] opacity-90 mt-0.5">Authoritative 30s round timer reached zero and locked all answers.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Revealed Target Song Card */}
              {(room.targetTrackRevealed || room.currentTrack) && (() => {
                const track = room.targetTrackRevealed || room.currentTrack!;
                return (
                  <div className="p-5 bg-slate-50/90 dark:bg-sv-midnight/90 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex flex-col sm:flex-row items-center gap-5 shadow-xs">
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-tr ${track.artworkGradient || 'from-sv-red to-sv-orange'} flex items-center justify-center text-white shrink-0 shadow-md`}>
                      <Disc3 className="w-10 h-10 animate-spin" style={{ animationDuration: '8s' }} />
                    </div>
                    <div className="space-y-1 text-center sm:text-left flex-1 min-w-0">
                      <span className="text-[10px] font-black uppercase tracking-wider text-sv-red dark:text-sv-warm-orange font-mono">
                        The Mystery Track Was
                      </span>
                      <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white truncate">
                        {track.title}
                      </h3>
                      <p className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate">
                        {track.artist}
                      </p>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                        <span className="bg-slate-200/70 dark:bg-sv-burgundy/60 px-2.5 py-0.5 rounded-lg">{track.language}</span>
                        <span className="bg-slate-200/70 dark:bg-sv-burgundy/60 px-2.5 py-0.5 rounded-lg">{track.genre}</span>
                        <span className="bg-slate-200/70 dark:bg-sv-burgundy/60 px-2.5 py-0.5 rounded-lg">{track.releaseYear}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Player Round Standings Breakdown */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono">
                  Current Scoreboard
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[...room.players]
                    .sort((a, b) => (b.score || 0) - (a.score || 0))
                    .map((p, idx) => (
                      <div
                        key={p.id}
                        className="p-3.5 bg-slate-50/90 dark:bg-sv-midnight/80 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between text-xs shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="font-mono font-black text-slate-400 w-4">{idx + 1}.</span>
                          <span className="font-bold text-slate-900 dark:text-white truncate">
                            {p.displayName} {p.id === profile.id && '(You)'}
                          </span>
                          {idx === 0 && <Crown className="w-3.5 h-3.5 text-sv-gold shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2">
                          {p.lastGuessCorrect ? (
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md">
                              Correct (+{p.lastGuessPoints || 0} pts)
                            </span>
                          ) : p.hasGuessedThisRound ? (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md max-w-[140px] truncate" title={p.lastGuessTitle || 'Wrong'}>
                              Guessed: {p.lastGuessTitle || 'Wrong'}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-medium">
                              No guess
                            </span>
                          )}
                          <span className="font-mono font-black text-sv-red dark:text-sv-gold">
                            {p.score || 0} pts
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Feature 2: Live Emoji Reactions Bar during Round Summary */}
              <div className="p-3 bg-slate-50 dark:bg-sv-midnight/80 rounded-2xl border border-slate-200 dark:border-sv-burgundy flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-sv-orange animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Live Reactions:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {(['🔥', '🤯', '👏', '😭', '⚡', '🎉', '❤️'] as const).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReaction(emoji)}
                      className="px-2.5 py-1 text-base bg-white dark:bg-sv-burgundy hover:scale-135 hover:bg-slate-100 dark:hover:bg-sv-burgundy-deep rounded-xl border border-slate-200 dark:border-sv-burgundy/80 shadow-2xs transition-all cursor-pointer active:scale-90 active:rotate-6"
                      title={`Send ${emoji} reaction`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Display recent floating/broadcast reactions */}
              {(room.recentReactions || []).length > 0 && (
                <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
                  {(room.recentReactions || []).slice(-6).map((rx) => (
                    <div
                      key={rx.id}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-sv-midnight border border-sv-red/20 shadow-xs text-xs font-bold text-slate-800 dark:text-slate-200 animate-in fade-in zoom-in"
                    >
                      <span className="text-base">{rx.emoji}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{rx.playerName}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 5-second automatic progression bar */}
              <div className="space-y-1.5 pt-2">
                <div className="w-full bg-slate-100 dark:bg-sv-midnight h-2 rounded-full overflow-hidden border border-slate-200/60 dark:border-sv-burgundy/60 shadow-inner">
                  <div
                    className="bg-gradient-to-r from-sv-red to-sv-amber h-full rounded-full transition-all duration-200"
                    style={{ width: `${Math.min(100, ((5 - resultsSeconds) / 5) * 100)}%` }}
                  />
                </div>
                <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 font-medium">
                  Automatic progression in {resultsSeconds}s... Next round begins with newly selected music.
                </p>
              </div>
            </div>
          )}

          {/* COMPLETED MATCH SUMMARY PODIUM */}
          {room.status === 'completed' && (
            <div className="bg-white/95 dark:bg-sv-burgundy-deep/95 border-2 border-sv-red/40 dark:border-sv-red/50 rounded-3xl p-6 sm:p-9 space-y-6 shadow-xl text-center animate-in fade-in">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-sv-amber/20 to-sv-gold/30 border border-sv-gold/40 text-sv-amber flex items-center justify-center mx-auto shadow-md">
                {room.mode === 'casual' ? (
                  <Sparkles className="w-8 h-8 text-emerald-500" />
                ) : (
                  <Trophy className="w-8 h-8 text-sv-gold" />
                )}
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {room.mode === 'casual' ? 'Casual Jam Complete! 🎶' : 'Competitive Match Completed! 🏆'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  {room.mode === 'casual'
                    ? `Thanks for jamming together! Collective group score: ${room.players.reduce((sum, p) => sum + (p.score || 0), 0)} pts.`
                    : 'Great game! Here are the final scores and rankings for all participants:'}
                </p>
              </div>

              <div className="max-w-md mx-auto space-y-2.5">
                {[...room.players]
                  .sort((a, b) => (b.score || 0) - (a.score || 0))
                  .map((p, rank) => (
                    <div
                      key={p.id}
                      className="p-3.5 bg-slate-50/90 dark:bg-sv-midnight/80 border border-slate-200 dark:border-sv-burgundy rounded-2xl flex items-center justify-between text-xs shadow-2xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-slate-400 w-5 text-center text-sm">
                          #{rank + 1}
                        </span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {p.displayName} {p.id === profile.id && '(You)'}
                        </span>
                        {rank === 0 && <Crown className="w-4 h-4 text-sv-gold" />}
                      </div>
                      <span className="font-mono font-black text-sv-red dark:text-sv-gold text-sm">
                        {p.score || 0} pts
                      </span>
                    </div>
                  ))}
              </div>

              {/* Feature 4: Post-Match Spotify / Apple Music Export */}
              <div className="p-4 bg-slate-50/90 dark:bg-sv-midnight/90 border border-slate-200 dark:border-sv-burgundy rounded-2xl max-w-md mx-auto space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-sv-red" />
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Export Match Playlist</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {room.trackIds?.length || 0} Tracks Played
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportPlaylist('spotify')}
                    className="flex-1 py-2 px-3 bg-[#1DB954] hover:bg-[#1AA34A] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Spotify Search</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportPlaylist('apple')}
                    className="flex-1 py-2 px-3 bg-[#FC3C44] hover:bg-[#E0353C] text-white rounded-xl text-xs font-bold cursor-pointer transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <span>Apple Music</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
                {exportedService && (
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold animate-in fade-in">
                    ✓ Track list copied to clipboard and opened in {exportedService === 'spotify' ? 'Spotify' : 'Apple Music'}!
                  </p>
                )}
              </div>

              {/* Podium Celebration Reaction Bar */}
              <div className="p-3 bg-slate-50/90 dark:bg-sv-midnight/90 rounded-2xl border border-slate-200 dark:border-sv-burgundy max-w-md mx-auto flex items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sv-gold animate-pulse" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Cheer Podium:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {(['🔥', '🤯', '👏', '😭', '⚡', '🎉', '❤️'] as const).map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => handleSendReaction(emoji)}
                      className="px-2.5 py-1 text-base bg-white dark:bg-sv-burgundy hover:scale-135 hover:bg-slate-100 dark:hover:bg-sv-burgundy-deep rounded-xl border border-slate-200 dark:border-sv-burgundy/80 shadow-2xs transition-all cursor-pointer active:scale-90"
                      title={`Send ${emoji} reaction`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Feature 5: 1-Click Rematch Button for Host & Return Button */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                {isHost && (
                  <button
                    onClick={handleRematch}
                    className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-emerald-600/25 flex items-center justify-center gap-2 active:scale-95"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Instant Rematch (Same Players)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShareMatchModalOpen(true)}
                  className="w-full sm:w-auto px-7 py-3.5 bg-gradient-to-r from-sv-burgundy to-sv-red hover:from-sv-burgundy-deep hover:to-sv-crimson text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-sv-red/25 flex items-center justify-center gap-2 active:scale-95"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Share Score Card</span>
                </button>
                <button
                  onClick={handleLeaveRoom}
                  className="w-full sm:w-auto px-7 py-3.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 rounded-2xl text-xs font-black transition-all cursor-pointer shadow-xs"
                >
                  Return to Lobby
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* INVITE FRIENDS MODAL */}
      {showInviteModal && (
        <div className="sv-modal-viewport fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-sm animate-in fade-in">
          <div className="sv-modal-surface bg-white dark:bg-sv-burgundy-deep border border-slate-200 dark:border-sv-burgundy rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-sv-burgundy pb-3">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-sv-red" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Invite Friends to Room {room?.roomCode}
                </h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {friendsList.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 font-medium space-y-2">
                <p>No accepted friends found in your network.</p>
                <p className="text-[11px] opacity-75">
                  Visit the Friends section to search and connect with other SongVerse players.
                </p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-2 divide-y divide-slate-100 dark:divide-sv-burgundy/40">
                {friendsList.map(friend => {
                  const alreadyInvited = invitedFriendIds.has(friend.id);
                  return (
                    <div key={friend.id} className="pt-2 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="font-black text-slate-900 dark:text-white truncate">
                          {friend.displayName}
                        </p>
                        <p className="text-[11px] font-mono text-slate-400">
                          @{friend.username}
                        </p>
                      </div>

                      <button
                        onClick={() => handleSendFriendRoomInvite(friend)}
                        disabled={alreadyInvited}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          alreadyInvited
                            ? 'bg-slate-100 dark:bg-sv-midnight text-slate-400 cursor-not-allowed'
                            : 'bg-sv-red hover:bg-sv-crimson text-white shadow-xs'
                        }`}
                      >
                        {alreadyInvited ? 'Invited ✓' : 'Send Invite'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 dark:border-sv-burgundy flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-sv-midnight text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Animated Emojis Burst Layer */}
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {floatingReactions.map((rx) => (
          <div
            key={rx.id}
            className="absolute bottom-16 flex flex-col items-center animate-emoji-pop"
            style={{
              left: `${rx.leftPercent}%`,
              transform: `rotate(${rx.rotation}deg) scale(${rx.scale})`
            }}
          >
            {/* Glowing Burst Ring */}
            <div className="absolute w-20 h-20 -top-3 -left-3 rounded-full bg-sv-warm-orange/20 border border-sv-warm-orange/50 animate-emoji-ring pointer-events-none" />

            {/* Main Floating Emoji */}
            <div className="text-5xl drop-shadow-[0_12px_24px_rgba(232,93,4,0.4)] select-none filter">
              {rx.emoji}
            </div>

            {/* Attached Player Pill */}
            <span className="mt-1.5 px-2.5 py-0.5 rounded-full bg-slate-900/90 dark:bg-sv-midnight/95 text-white text-[10px] font-black font-mono shadow-lg border border-white/20 whitespace-nowrap">
              {rx.playerName}
            </span>
          </div>
        ))}
      </div>

      {/* 1v1 Ranked Blitz Duel Modal */}
      <RankedBlitzModal
        isOpen={blitzModalOpen}
        onClose={() => setBlitzModalOpen(false)}
        playerName={nameInput.trim() || profile.displayName || `Player_${profile.id.slice(-4)}`}
      />

      {/* Wordle-Style Match Share Result Modal */}
      <ShareResultModal
        isOpen={shareMatchModalOpen}
        onClose={() => setShareMatchModalOpen(false)}
        gameMode="multiplayer"
        score={myPlayer?.score || 0}
        accuracy={Math.round(((myPlayer?.correctGuesses || 0) / Math.max(1, room?.totalRounds || room?.trackIds?.length || 5)) * 100)}
        streak={profile.currentStreak || 0}
        totalRounds={room?.totalRounds || room?.trackIds?.length || 5}
        roundsWon={myPlayer?.correctGuesses || 0}
        playerName={myPlayer?.displayName || profile.displayName}
      />

    </div>
  );
};
