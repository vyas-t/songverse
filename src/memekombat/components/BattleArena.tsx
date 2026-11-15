// =========================================================================
// MEME KOMBAT — MAIN BATTLE ARENA COMPONENT
// =========================================================================

import React, { useState, useEffect, useRef } from 'react';
import { Fighter, BattleMode, BattleFighterState, ActiveSpell, BattleLogEntry, MemeCard } from '../types';
import { CombatEngine } from '../engine/combatEngine';
import { FighterCard } from './FighterCard';
import { MemeCardView } from './MemeCardView';
import { SpellEffectsOverlay } from './SpellEffectsOverlay';
import { memeAudio } from '../audio';
import { Swords, RotateCcw, ArrowLeft, Trophy, Skull, Flame, ShieldAlert, Sparkles, MessageSquare } from 'lucide-react';

interface BattleArenaProps {
  playerFighter: Fighter;
  opponentFighter: Fighter;
  mode: BattleMode;
  onExitToSelect: () => void;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  playerFighter,
  opponentFighter,
  mode,
  onExitToSelect,
}) => {
  const [playerState, setPlayerState] = useState<BattleFighterState>(() =>
    CombatEngine.initFighterState(playerFighter)
  );
  const [opponentState, setOpponentState] = useState<BattleFighterState>(() =>
    CombatEngine.initFighterState(opponentFighter)
  );

  const [turn, setTurn] = useState<number>(1);
  const [activeTurn, setActiveTurn] = useState<'player' | 'opponent'>('player');
  const [activeSpell, setActiveSpell] = useState<ActiveSpell | null>(null);
  const [battleLogs, setBattleLogs] = useState<BattleLogEntry[]>([]);
  const [winner, setWinner] = useState<'player' | 'opponent' | null>(null);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll battle log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [battleLogs]);

  // Restart / Rematch
  const handleRematch = () => {
    setPlayerState(CombatEngine.initFighterState(playerFighter));
    setOpponentState(CombatEngine.initFighterState(opponentFighter));
    setTurn(1);
    setActiveTurn('player');
    setActiveSpell(null);
    setBattleLogs([]);
    setWinner(null);
    setIsBotThinking(false);
  };

  // Bot Turn Trigger
  useEffect(() => {
    if (winner !== null || activeSpell !== null) return;

    if (activeTurn === 'opponent' && mode === 'bot') {
      setIsBotThinking(true);
      const botTimer = setTimeout(() => {
        executeBotTurn();
        setIsBotThinking(false);
      }, 900);

      return () => clearTimeout(botTimer);
    }
  }, [activeTurn, winner, activeSpell, mode]);

  // Execute Bot Turn
  const executeBotTurn = () => {
    const action = CombatEngine.chooseBotAction(opponentState, playerState);

    if (action.type === 'ultimate') {
      const outcome = CombatEngine.executeUltimate(opponentState, playerState, turn);
      setActiveSpell(outcome.spell);
      setOpponentState(outcome.updatedAttacker);
      setPlayerState(outcome.updatedDefender);
      setBattleLogs((prev) => [...prev, outcome.log]);

      if (outcome.updatedDefender.currentHp <= 0) {
        setWinner('opponent');
        memeAudio.playSadViolin();
      } else {
        // Switch turn back to player
        endRoundToPlayer(outcome.updatedAttacker, outcome.updatedDefender);
      }
    } else if (action.card) {
      const outcome = CombatEngine.executeAttack(action.card, opponentState, playerState, turn);
      setActiveSpell(outcome.spell);
      // Remove played card from bot hand
      const newBotHand = opponentState.hand.filter((c) => c.id !== action.card!.id);
      const updatedAttackerWithHand = { ...outcome.updatedAttacker, hand: newBotHand };

      setOpponentState(updatedAttackerWithHand);
      setPlayerState(outcome.updatedDefender);
      setBattleLogs((prev) => [...prev, outcome.log]);

      if (outcome.updatedDefender.currentHp <= 0) {
        setWinner('opponent');
        memeAudio.playSadViolin();
      } else {
        endRoundToPlayer(updatedAttackerWithHand, outcome.updatedDefender);
      }
    }
  };

  // Turn transitions with energy replenishment
  const endRoundToOpponent = (updatedPlayer: BattleFighterState, updatedOpponent: BattleFighterState) => {
    setTimeout(() => {
      const replenishedOpponent = CombatEngine.replenishTurn(updatedOpponent);
      setOpponentState(replenishedOpponent);
      setActiveTurn('opponent');
    }, 500);
  };

  const endRoundToPlayer = (updatedOpponent: BattleFighterState, updatedPlayer: BattleFighterState) => {
    setTimeout(() => {
      const replenishedPlayer = CombatEngine.replenishTurn(updatedPlayer);
      setPlayerState(replenishedPlayer);
      setTurn((t) => t + 1);
      setActiveTurn('player');
    }, 500);
  };

  // Player Plays a Card
  const handlePlayCard = (card: MemeCard) => {
    if (activeTurn !== 'player' || winner !== null || activeSpell !== null) return;
    if (card.energyCost > playerState.currentEnergy) return;

    const outcome = CombatEngine.executeAttack(card, playerState, opponentState, turn);
    setActiveSpell(outcome.spell);

    // Remove played card from hand
    const newPlayerHand = playerState.hand.filter((c) => c.id !== card.id);
    const updatedAttackerWithHand = { ...outcome.updatedAttacker, hand: newPlayerHand };

    setPlayerState(updatedAttackerWithHand);
    setOpponentState(outcome.updatedDefender);
    setBattleLogs((prev) => [...prev, outcome.log]);

    if (outcome.updatedDefender.currentHp <= 0) {
      setWinner('player');
      memeAudio.playAirhorn();
    } else {
      endRoundToOpponent(updatedAttackerWithHand, outcome.updatedDefender);
    }
  };

  // Player Casts Ultimate Move
  const handleCastUltimate = () => {
    if (activeTurn !== 'player' || winner !== null || activeSpell !== null) return;
    if (playerState.currentEnergy < playerState.fighter.ultimateMove.energyCost) return;

    const outcome = CombatEngine.executeUltimate(playerState, opponentState, turn);
    setActiveSpell(outcome.spell);

    setPlayerState(outcome.updatedAttacker);
    setOpponentState(outcome.updatedDefender);
    setBattleLogs((prev) => [...prev, outcome.log]);

    if (outcome.updatedDefender.currentHp <= 0) {
      setWinner('player');
      memeAudio.playAirhorn();
    } else {
      endRoundToOpponent(outcome.updatedAttacker, outcome.updatedDefender);
    }
  };

  return (
    <div className="relative w-full max-w-6xl mx-auto px-4 py-4 flex flex-col items-center select-none space-y-6">
      
      {/* Active Magical Spell Overlay */}
      <SpellEffectsOverlay spell={activeSpell} onEffectEnd={() => setActiveSpell(null)} />

      {/* Top Arena HUD Bar */}
      <div className="w-full flex items-center justify-between p-4 rounded-3xl bg-[#0e1117] border border-white/10 shadow-lg">
        <button
          onClick={onExitToSelect}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Exit Arena</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono font-bold text-amber-300">
            ROUND {turn}
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-mono font-black uppercase ${
            activeTurn === 'player'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/50'
              : 'bg-rose-500/20 text-rose-300 border border-rose-400/50'
          }`}>
            {activeTurn === 'player' ? 'YOUR TURN' : isBotThinking ? 'BOT THINKING...' : 'OPPONENT TURN'}
          </div>
        </div>

        <button
          onClick={() => setShowLogDrawer(!showLogDrawer)}
          className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
        >
          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden sm:inline">Roast Log</span>
        </button>
      </div>

      {/* Main Dual Fighters Arena Stage */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        
        {/* Left: Player Fighter */}
        <div className="flex flex-col items-center md:items-start w-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-black mb-2 flex items-center gap-1">
            <span>🛡️ YOU</span>
            {activeTurn === 'player' && <span className="animate-pulse text-emerald-400 font-bold">• ACTIVE</span>}
          </span>
          <FighterCard
            state={playerState}
            isPlayer={true}
            onCastUltimate={handleCastUltimate}
            canCastUltimate={
              activeTurn === 'player' &&
              winner === null &&
              playerState.currentEnergy >= playerState.fighter.ultimateMove.energyCost
            }
          />
        </div>

        {/* Right: Opponent Fighter */}
        <div className="flex flex-col items-center md:items-end w-full">
          <span className="text-[10px] font-mono uppercase tracking-widest text-rose-400 font-black mb-2 flex items-center gap-1">
            {activeTurn === 'opponent' && <span className="animate-pulse text-rose-400 font-bold">• ACTIVE</span>}
            <span>⚔️ {mode === 'bot' ? 'BOT RIVAL' : 'PLAYER 2'}</span>
          </span>
          <FighterCard
            state={opponentState}
            isPlayer={false}
          />
        </div>

      </div>

      {/* Floating Battle Action Log Feed */}
      {battleLogs.length > 0 && (
        <div className="w-full max-w-2xl p-3.5 rounded-2xl bg-black/70 backdrop-blur-md border border-white/10 text-center animate-in fade-in duration-200">
          <p className="text-xs font-mono font-bold text-white">
            {battleLogs[battleLogs.length - 1].roastComment}
          </p>
        </div>
      )}

      {/* Player's Hand of Meme Cards */}
      {winner === null && (
        <div className="w-full space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-slate-300 font-bold">YOUR MEME DECK ({playerState.hand.length} Cards)</span>
            <span className="text-amber-400">Click a card to attack with comedy</span>
          </div>

          <div className="flex items-center justify-center gap-3 overflow-x-auto pb-4 pt-1 px-2">
            {playerState.hand.map((card) => (
              <MemeCardView
                key={card.id}
                card={card}
                isPlayable={activeTurn === 'player' && card.energyCost <= playerState.currentEnergy}
                onSelect={handlePlayCard}
              />
            ))}
          </div>
        </div>
      )}

      {/* Game Over Screen (Victory / Defeat) */}
      {winner !== null && (
        <div className="w-full max-w-lg p-8 rounded-3xl bg-black/90 backdrop-blur-2xl border-2 border-amber-400 shadow-[0_0_60px_rgba(251,191,36,0.35)] flex flex-col items-center text-center space-y-5 animate-in zoom-in-95 duration-200">
          <div className="text-7xl">
            {winner === 'player' ? '🏆👑' : '💀🪦'}
          </div>

          <div className="space-y-1">
            <h2 className="font-cinzel text-3xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-rose-300 to-purple-400">
              {winner === 'player' ? 'MEME VICTORY!' : 'EMOTIONAL DAMAGE!'}
            </h2>
            <p className="text-sm text-slate-300">
              {winner === 'player'
                ? `${playerFighter.name}'s comedy aura completely wiped out ${opponentFighter.name}!`
                : `${opponentFighter.name} hit you with memes so lethal you lost all your aura!`}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={handleRematch}
              className="px-8 py-3.5 rounded-full bg-gradient-to-r from-amber-400 to-rose-500 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>REMATCH</span>
            </button>

            <button
              onClick={onExitToSelect}
              className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
            >
              Select New Fighter
            </button>
          </div>
        </div>
      )}

      {/* Roast Log Drawer Modal */}
      {showLogDrawer && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg p-6 rounded-3xl bg-[#0e1117] border-2 border-amber-400/50 space-y-4 max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-cinzel font-black text-white text-lg">ROAST COMBAT LOG</h3>
              <button
                onClick={() => setShowLogDrawer(false)}
                className="text-slate-400 hover:text-white font-mono text-xs cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 text-left font-mono text-xs">
              {battleLogs.length === 0 ? (
                <p className="text-slate-500 text-center py-6">No roasts recorded yet.</p>
              ) : (
                battleLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                    <div className="flex justify-between text-[10px] text-amber-400 font-bold">
                      <span>TURN {log.turn} • {log.attackerName}</span>
                      <span>-{log.damageDealt} DMG</span>
                    </div>
                    <p className="text-slate-200">{log.roastComment}</p>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
