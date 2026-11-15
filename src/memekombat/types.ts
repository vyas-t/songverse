// =========================================================================
// MEME KOMBAT: BATTLE ROYALE — TYPE DEFINITIONS
// =========================================================================

export type MemeOrigin = 'india' | 'international';

export type MemeCategory =
  | 'desi_nostalgia'
  | 'international_brainrot'
  | 'savage_roast'
  | 'sigma_phonk'
  | 'wholesome_cringe';

export type MemeRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type SpellEffectType =
  | 'laser'
  | 'mud_splash'
  | 'explosion'
  | 'violin'
  | 'airhorn'
  | 'bonk'
  | 'rainbow'
  | 'helicopter'
  | 'eggplant'
  | 'binod_flood';

export interface MemeCard {
  id: string;
  title: string;
  origin: MemeOrigin;
  category: MemeCategory;
  rarity: MemeRarity;
  comedyScore: number; // 70 to 100
  baseDamage: number;
  energyCost: number;
  healAmount?: number;
  shieldAmount?: number;
  quote: string;
  description: string;
  visualEmoji: string;
  spellEffect: SpellEffectType;
  counterCategory?: MemeCategory; // Category it inflicts +50% critical damage on
}

export interface Fighter {
  id: string;
  name: string;
  parodyOf: string;
  title: string;
  avatar: string;
  origin: MemeOrigin;
  maxHp: number;
  baseEnergy: number;
  catchphrase: string;
  bio: string;
  ultimateMove: {
    name: string;
    description: string;
    damage: number;
    energyCost: number;
    spellEffect: SpellEffectType;
  };
  passiveTrait: {
    name: string;
    description: string;
  };
  favoriteCategory: MemeCategory;
  themeColor: string;
}

export interface BattleFighterState {
  fighter: Fighter;
  currentHp: number;
  currentEnergy: number;
  shield: number;
  hand: MemeCard[];
  lastUsedCard?: MemeCard | null;
  tauntBubble?: string | null;
  isStunned?: boolean;
}

export interface ActiveSpell {
  id: string;
  type: SpellEffectType;
  title: string;
  damage: number;
  isCritical: boolean;
  sourceIsPlayer: boolean;
  color: string;
}

export type BattleMode = 'bot' | 'local_2p' | 'multiplayer_room';

export type BattlePhase =
  | 'character_select'
  | 'player_turn'
  | 'opponent_turn'
  | 'spell_animation'
  | 'game_over';

export interface BattleLogEntry {
  id: string;
  turn: number;
  attackerName: string;
  targetName: string;
  cardName: string;
  damageDealt: number;
  healed: number;
  isCritical: boolean;
  roastComment: string;
}

export interface MultiplayerRoomState {
  roomCode: string;
  hostName: string;
  guestName?: string;
  hostFighterId: string;
  guestFighterId?: string;
  status: 'waiting' | 'ready' | 'battling' | 'finished';
  currentTurnPlayer: 'host' | 'guest';
}
