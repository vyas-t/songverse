// =========================================================================
// MEME KOMBAT — COMBAT ENGINE & COMEDY DAMAGE CALCULATION
// =========================================================================

import { MemeCard, Fighter, BattleFighterState, ActiveSpell, BattleLogEntry, SpellEffectType } from '../types';
import { ALL_MEME_CARDS } from '../data/memeCards';

export class CombatEngine {
  // Draw random hand of N cards
  public static drawHand(count: number = 4): MemeCard[] {
    const shuffled = [...ALL_MEME_CARDS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Initialize a fighter's battle state
  public static initFighterState(fighter: Fighter): BattleFighterState {
    return {
      fighter,
      currentHp: fighter.maxHp,
      currentEnergy: fighter.baseEnergy,
      shield: 0,
      hand: this.drawHand(4),
      lastUsedCard: null,
      tauntBubble: fighter.catchphrase,
      isStunned: false,
    };
  }

  // Resolve an attack
  public static executeAttack(
    card: MemeCard,
    attacker: BattleFighterState,
    defender: BattleFighterState,
    turn: number
  ): {
    updatedAttacker: BattleFighterState;
    updatedDefender: BattleFighterState;
    spell: ActiveSpell;
    log: BattleLogEntry;
  } {
    // 1. Consume Energy
    const attackerEnergy = Math.max(0, attacker.currentEnergy - card.energyCost);

    // 2. Determine Critical Comedy Matchup
    let isCritical = false;
    let multiplier = 1.0;

    // Check if card category counters the defender's favorite or last used category
    if (
      card.counterCategory &&
      (card.counterCategory === defender.fighter.favoriteCategory ||
        card.counterCategory === defender.lastUsedCard?.category)
    ) {
      isCritical = true;
      multiplier = attacker.fighter.id === 'sigma_sharmaji' ? 2.0 : 1.5;
    }

    // Comedy rating bonus (80 - 100 score gives 1.0 to 1.25 bonus)
    const comedyFactor = 0.8 + (card.comedyScore / 100) * 0.4;

    // Base damage calculated
    let rawDamage = Math.floor(card.baseDamage * multiplier * comedyFactor);

    // Harold passive check: reflects 15%
    if (defender.fighter.id === 'harold_pain') {
      rawDamage = Math.floor(rawDamage * 0.85);
    }

    // 3. Shield absorption & HP deduction
    let remainingDamage = rawDamage;
    let defenderShield = defender.shield;

    if (defenderShield > 0) {
      if (defenderShield >= remainingDamage) {
        defenderShield -= remainingDamage;
        remainingDamage = 0;
      } else {
        remainingDamage -= defenderShield;
        defenderShield = 0;
      }
    }

    let defenderHp = Math.max(0, defender.currentHp - remainingDamage);

    // 4. Attacker Healing & Shielding
    let attackerHp = attacker.currentHp;
    if (card.healAmount) {
      attackerHp = Math.min(attacker.fighter.maxHp, attackerHp + card.healAmount);
    }

    let attackerShield = attacker.shield;
    if (card.shieldAmount) {
      attackerShield += card.shieldAmount;
    }

    // Passive trigger: Lord Puneet gains energy when hit
    let defenderEnergy = defender.currentEnergy;
    if (defender.fighter.id === 'lord_puneet') {
      defenderEnergy = Math.min(120, defenderEnergy + 15);
    }

    // Passive trigger: Moye Monk sympathy tears heal below 30%
    if (defender.fighter.id === 'moye_monk' && defenderHp <= 30 && defender.currentHp > 30) {
      // Emergency heal!
      defenderHp += 20;
    }

    // 5. Build Comedy Roast Messages
    const roastComments = [
      `💀 EMOTIONAL DAMAGE! ${defender.fighter.name} took ${rawDamage} points of comedy trauma!`,
      `🔥 ${attacker.fighter.name} dropped "${card.title}" and ${defender.fighter.name}'s aura vanished!`,
      `👑 ${isCritical ? 'CRITICAL ROAST!' : 'CLEAN HIT!'} ${card.quote}`,
      `😂 That joke was so savage ${defender.fighter.name} started questioning their life choices!`,
      `✨ Pure Meme Magic! ${defender.fighter.name} took a direct hit to their self-esteem!`,
    ];

    const roastComment = isCritical
      ? `⚡ CRITICAL COMEDY COMBO! "${card.title}" counter-rekt ${defender.fighter.name} for ${rawDamage} DMG!`
      : roastComments[Math.floor(Math.random() * roastComments.length)];

    const updatedAttacker: BattleFighterState = {
      ...attacker,
      currentHp: attackerHp,
      currentEnergy: attackerEnergy,
      shield: attackerShield,
      lastUsedCard: card,
      tauntBubble: card.quote,
    };

    const updatedDefender: BattleFighterState = {
      ...defender,
      currentHp: defenderHp,
      currentEnergy: defenderEnergy,
      shield: defenderShield,
      isStunned: card.spellEffect === 'mud_splash' && Math.random() > 0.5,
    };

    const spell: ActiveSpell = {
      id: `spell_${Date.now()}_${Math.random()}`,
      type: card.spellEffect,
      title: card.title,
      damage: rawDamage,
      isCritical,
      sourceIsPlayer: true,
      color: isCritical ? '#a3e635' : '#ef4444',
    };

    const log: BattleLogEntry = {
      id: `log_${Date.now()}_${Math.random()}`,
      turn,
      attackerName: attacker.fighter.name,
      targetName: defender.fighter.name,
      cardName: card.title,
      damageDealt: rawDamage,
      healed: card.healAmount || 0,
      isCritical,
      roastComment,
    };

    return {
      updatedAttacker,
      updatedDefender,
      spell,
      log,
    };
  }

  // Execute Ultimate Move
  public static executeUltimate(
    attacker: BattleFighterState,
    defender: BattleFighterState,
    turn: number
  ): {
    updatedAttacker: BattleFighterState;
    updatedDefender: BattleFighterState;
    spell: ActiveSpell;
    log: BattleLogEntry;
  } {
    const ult = attacker.fighter.ultimateMove;
    const attackerEnergy = Math.max(0, attacker.currentEnergy - ult.energyCost);
    const rawDamage = ult.damage;

    let remainingDamage = rawDamage;
    let defenderShield = defender.shield;

    if (defenderShield > 0) {
      if (defenderShield >= remainingDamage) {
        defenderShield -= remainingDamage;
        remainingDamage = 0;
      } else {
        remainingDamage -= defenderShield;
        defenderShield = 0;
      }
    }

    let defenderHp = Math.max(0, defender.currentHp - remainingDamage);

    const updatedAttacker: BattleFighterState = {
      ...attacker,
      currentEnergy: attackerEnergy,
      tauntBubble: `ULTIMATE UNLEASHED: ${ult.name}!`,
    };

    const updatedDefender: BattleFighterState = {
      ...defender,
      currentHp: defenderHp,
      shield: defenderShield,
      isStunned: true,
    };

    const spell: ActiveSpell = {
      id: `ult_${Date.now()}`,
      type: ult.spellEffect,
      title: ult.name,
      damage: rawDamage,
      isCritical: true,
      sourceIsPlayer: true,
      color: '#facc15',
    };

    const log: BattleLogEntry = {
      id: `log_ult_${Date.now()}`,
      turn,
      attackerName: attacker.fighter.name,
      targetName: defender.fighter.name,
      cardName: `ULTIMATE: ${ult.name}`,
      damageDealt: rawDamage,
      healed: 0,
      isCritical: true,
      roastComment: `🌟 ${attacker.fighter.name} CHANNELLED MAXIMUM AURA: "${ult.description}" for ${rawDamage} devastating DMG!`,
    };

    return {
      updatedAttacker,
      updatedDefender,
      spell,
      log,
    };
  }

  // Turn Energy Regeneration (+20 Energy, replenish hand to 4)
  public static replenishTurn(state: BattleFighterState): BattleFighterState {
    const newEnergy = Math.min(100, state.currentEnergy + 22);
    // Draw back up to 4 cards if hand has fewer
    const missingCount = Math.max(0, 4 - state.hand.length);
    const newCards = missingCount > 0 ? this.drawHand(missingCount) : [];

    return {
      ...state,
      currentEnergy: newEnergy,
      hand: [...state.hand, ...newCards],
      isStunned: false,
    };
  }

  // Bot Decision AI
  public static chooseBotAction(
    botState: BattleFighterState,
    playerState: BattleFighterState
  ): { type: 'ultimate' | 'card'; card?: MemeCard } {
    // 1. Can bot cast Ultimate?
    if (botState.currentEnergy >= botState.fighter.ultimateMove.energyCost) {
      if (playerState.currentHp <= botState.fighter.ultimateMove.damage || botState.currentHp < 50) {
        return { type: 'ultimate' };
      }
    }

    // 2. Choose best affordable card
    const affordableCards = botState.hand.filter((c) => c.energyCost <= botState.currentEnergy);

    if (affordableCards.length === 0) {
      // Pick lowest energy card even if slight deficit or wait
      return { type: 'card', card: botState.hand[0] };
    }

    // Sort by counter bonus or highest damage
    const sorted = [...affordableCards].sort((a, b) => {
      const aCounter = a.counterCategory === playerState.fighter.favoriteCategory ? 15 : 0;
      const bCounter = b.counterCategory === playerState.fighter.favoriteCategory ? 15 : 0;
      return (b.baseDamage + bCounter) - (a.baseDamage + aCounter);
    });

    return { type: 'card', card: sorted[0] };
  }
}
