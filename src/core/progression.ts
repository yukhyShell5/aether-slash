/**
 * Progression System - XP, Leveling, and Talent Points
 */
import type { EntityId } from 'bitecs';
import { CombatStats, hasPlayer } from './components';
import { playerExperience } from '../stores/player';

const MAX_ENTITIES = 10000;

// ============================================================================
// PROGRESSION COMPONENT
// ============================================================================

/**
 * Progression component for XP and leveling
 */
export const Progression = {
  xp: new Float32Array(MAX_ENTITIES),
  level: new Uint16Array(MAX_ENTITIES),
  talentPoints: new Uint16Array(MAX_ENTITIES),
  statPoints: new Uint16Array(MAX_ENTITIES),
};

/**
 * Progression flags
 */
export const ProgressionFlags = {
  hasProgression: new Uint8Array(MAX_ENTITIES),
};

// ============================================================================
// XP CONSTANTS
// ============================================================================

const BASE_XP = 100;
const XP_EXPONENT = 1.5;

// Stats gained per level
const HP_PER_LEVEL = 20;
const DAMAGE_PER_LEVEL = 2;
const TALENT_POINTS_PER_LEVEL = 1;
const STAT_POINTS_PER_LEVEL = 3;

// ============================================================================
// XP FUNCTIONS
// ============================================================================

/**
 * Calculate XP required for next level
 */
export function xpForNextLevel(level: number): number {
  return Math.floor(BASE_XP * Math.pow(level, XP_EXPONENT));
}

/**
 * Initialize progression for an entity
 */
export function addProgressionComponent(eid: EntityId, startLevel: number = 1): void {
  ProgressionFlags.hasProgression[eid] = 1;
  Progression.level[eid] = startLevel;
  Progression.xp[eid] = 0;
  Progression.talentPoints[eid] = 0;
  Progression.statPoints[eid] = 0;
}

/**
 * Check if entity has progression
 */
export function hasProgression(eid: EntityId): boolean {
  return ProgressionFlags.hasProgression[eid] === 1;
}

// Event queue for level ups (consumed by VFX system)
interface LevelUpEvent {
  entity: EntityId;
  newLevel: number;
  position: { x: number; y: number; z: number };
}

const pendingLevelUps: LevelUpEvent[] = [];

/**
 * Consume pending level up events
 */
export function consumeLevelUpEvents(): LevelUpEvent[] {
  const events = [...pendingLevelUps];
  pendingLevelUps.length = 0;
  return events;
}

/**
 * Check and process level up
 */
function checkLevelUp(eid: EntityId): boolean {
  if (!hasProgression(eid)) return false;
  
  const currentLevel = Progression.level[eid];
  const currentXP = Progression.xp[eid];
  const requiredXP = xpForNextLevel(currentLevel);
  
  if (currentXP >= requiredXP) {
    // Level up!
    Progression.xp[eid] -= requiredXP;
    Progression.level[eid] += 1;
    Progression.talentPoints[eid] += TALENT_POINTS_PER_LEVEL;
    Progression.statPoints[eid] += STAT_POINTS_PER_LEVEL;
    
    const newLevel = Progression.level[eid];
    
    // Apply level-up stat bonuses
    if (hasPlayer(eid)) {
      CombatStats.maxHp[eid] += HP_PER_LEVEL;
      CombatStats.hp[eid] = CombatStats.maxHp[eid]; // Full heal on level up
      CombatStats.damageMin[eid] += DAMAGE_PER_LEVEL;
      CombatStats.damageMax[eid] += DAMAGE_PER_LEVEL;
      CombatStats.level[eid] = newLevel;
    }
    
    // Queue level up event for VFX
    pendingLevelUps.push({
      entity: eid,
      newLevel,
      position: { x: 0, y: 0, z: 0 }, // Will be updated by render system
    });
    
    console.log(`🎉 LEVEL UP! Now level ${newLevel}`);
    console.log(`   +${TALENT_POINTS_PER_LEVEL} talent point(s), +${STAT_POINTS_PER_LEVEL} stat point(s)`);
    
    // Check for multiple level ups
    checkLevelUp(eid);
    
    return true;
  }
  
  return false;
}

/**
 * Grant XP to an entity
 * @returns true if leveled up
 */
export function gainXP(eid: EntityId, amount: number): boolean {
  if (!hasProgression(eid)) return false;
  if (amount <= 0) return false;
  
  Progression.xp[eid] += amount;
  
  const currentLevel = Progression.level[eid];
  const currentXP = Progression.xp[eid];
  const requiredXP = xpForNextLevel(currentLevel);
  
  console.log(`✨ +${amount} XP (${currentXP}/${requiredXP})`);
  
  // Update Svelte store
  playerExperience.set({
    current: currentXP,
    toNextLevel: requiredXP,
    level: currentLevel,
  });
  
  // Check for level up
  const leveledUp = checkLevelUp(eid);
  
  // Update store again if leveled up
  if (leveledUp) {
    const newLevel = Progression.level[eid];
    const newXP = Progression.xp[eid];
    const newRequired = xpForNextLevel(newLevel);
    
    playerExperience.set({
      current: newXP,
      toNextLevel: newRequired,
      level: newLevel,
    });
  }
  
  return leveledUp;
}

/**
 * Calculate XP reward for killing a monster
 */
export function calculateMonsterXP(monsterLevel: number): number {
  // Base XP + level bonus
  return Math.floor(10 + monsterLevel * 5);
}

/**
 * Get current progression state
 */
export function getProgressionState(eid: EntityId): {
  level: number;
  xp: number;
  xpRequired: number;
  talentPoints: number;
  statPoints: number;
} {
  if (!hasProgression(eid)) {
    return { level: 1, xp: 0, xpRequired: 100, talentPoints: 0, statPoints: 0 };
  }
  
  const level = Progression.level[eid];
  return {
    level,
    xp: Progression.xp[eid],
    xpRequired: xpForNextLevel(level),
    talentPoints: Progression.talentPoints[eid],
    statPoints: Progression.statPoints[eid],
  };
}

/**
 * Spend a talent point
 * @returns true if successful
 */
export function spendTalentPoint(eid: EntityId): boolean {
  if (!hasProgression(eid)) return false;
  if (Progression.talentPoints[eid] <= 0) return false;
  
  Progression.talentPoints[eid] -= 1;
  return true;
}
