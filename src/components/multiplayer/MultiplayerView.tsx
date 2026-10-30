import React, { useState, useEffect } from 'react';
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
  Edit2
} from 'lucide-react';
import { MultiplayerRoom, Track, GameLevelNumber } from '../../types';
import { multiplayerEngine } from '../../services/multiplayerEngine';
import { gameEngine } from '../../services/gameEngine';
import { audioEngine } from '../../services/audioEngine';
import { GAME_LEVELS } from '../../config/gameConfig';
import { SongSearchInput } from '../game/SongSearchInput';

interface MultiplayerViewProps {
  onOpenAuth?: () => void;
  onNavigateHome?: () => void;
}

export const MultiplayerView: React.FC<MultiplayerViewProps> = ({ onOpenAuth, onNavigateHome }) => {
  const [profile, setProfile] = useState(gameEngine.getUserProfile());
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
  useEffect(() => {
    const updateCountdowns = () => {
      if (room?.status === 'playing') {
        setRemainingSeconds(multiplayerEngine.getRemainingSeconds());
      } else if (room?.status === 'round-summary') {
        setResultsSeconds(multiplayerEngine.getResultsCountdownSeconds());
      }
    };
    updateCountdowns();
    const interval = setInterval(updateCountdowns, 200);
    return () => clearInterval(interval);
  }, [room?.status, room?.roundDeadline, room?.roundResultsUntil]);

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

  const handleCreateRoom = async () => {
    setIsCreating(true);
    setErrorMessage(null);
    try {
      const newRoom = await multiplayerEngine.createRoom(
        profile.displayName,
        profile.id,
        { language: roomLanguage, mixLanguages: roomMixLanguages, totalRounds: selectedRounds }
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
    try {
      const paddedCode = clean.padStart(6, '0');
      const joined = await multiplayerEngine.joinRoom(paddedCode, profile.displayName, profile.id);
      setRoom(joined);
      setJoinCodeInput('');
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

  const handleKickPlayer = async (targetId: string) => {
    if (isHost) {
      await multiplayerEngine.kickParticipant(targetId);
    }
  };

  const handleCloseRoom = async () => {
    if (isHost) {
      await multiplayerEngine.closeRoom();
      setRoom(null);
      setShowCloseConfirm(false);
    }
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
                {profile.displayName.slice(0, 2)}
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
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                type="text"
                maxLength={20}
                value={profile.displayName}
                onChange={(e) => {
                  const val = e.target.value.trim().slice(0, 20);
                  if (val) {
                    const upd = gameEngine.updateUserProfile({ displayName: val });
                    setProfile(upd);
                  }
                }}
                className="w-full sm:w-52 px-4 py-2.5 text-xs font-bold bg-slate-50 dark:bg-sv-midnight border border-slate-200 dark:border-sv-burgundy rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:border-sv-red focus:ring-2 focus:ring-sv-red/10"
                placeholder="Enter player name..."
              />
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

              <div className="p-3.5 bg-slate-50 dark:bg-sv-midnight rounded-2xl border border-slate-200 dark:border-sv-burgundy text-xs text-slate-600 dark:text-slate-300">
                Playing as: <strong className="text-slate-900 dark:text-white font-bold">{profile.displayName}</strong>
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

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={handleStartGame}
                  className="px-7 py-3.5 bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber hover:from-sv-crimson hover:to-sv-red text-white rounded-2xl text-xs font-black cursor-pointer shadow-md shadow-sv-red/25 flex items-center gap-2 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Start Match for All Players</span>
                </button>
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
                          onClick={() => handleKickPlayer(p.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                          title="Remove participant"
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

              {/* Waveform Visualizer Display */}
              <div className="h-32 sm:h-36 bg-slate-50/90 dark:bg-sv-midnight/80 border border-slate-200/70 dark:border-sv-burgundy rounded-2xl px-4 py-3 flex items-center justify-center gap-1.5 sm:gap-2 shadow-inner">
                {waveformBars.map((amp, idx) => {
                  const barHeight = Math.max(14, Math.round(amp * 100));
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center justify-center h-full"
                    >
                      <div
                        style={{ height: `${barHeight}%` }}
                        className={`w-full rounded-full transition-all duration-75 ${
                          isPlayingAudio
                            ? 'bg-gradient-to-t from-sv-red via-sv-red-orange to-sv-gold shadow-xs'
                            : 'bg-slate-200 dark:bg-sv-burgundy/80'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

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
                <Trophy className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  Match Completed!
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Great game! Here are the final scores for all participants:
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

              <div className="pt-2">
                <button
                  onClick={handleLeaveRoom}
                  className="px-7 py-3.5 bg-gradient-to-r from-sv-red via-sv-red-orange to-sv-amber text-white rounded-2xl text-xs font-black transition-all cursor-pointer shadow-md shadow-sv-red/25 hover:from-sv-crimson hover:to-sv-red"
                >
                  Return to Multiplayer Lobby
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
