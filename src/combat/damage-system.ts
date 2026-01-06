import type { EntityId } from 'bitecs';
import {
  Position,
  CombatStats,
  CombatState,
  CombatStateEnum,
  Target,
  hasCombatStats,
  hasCombatState,
  hasTarget,
  hasPosition,
  hasPlayer,
  hasMonster,
  clearEntityComponents,
} from '../core/components';
import { getGameWorld } from '../core/world';
import { consumeAttackEvents, type AttackEvent } from './combat-system';
import { removeEntityHitbox } from './physics';
import { gainXP, calculateMonsterXP, hasProgression } from '../core/progression';

/**
 * Event emitted when an entity dies
 */
export interface DeathEvent {
  entity: EntityId;
  killedBy: EntityId;
  position: { x: number; y: number; z: number };
  level: number;
}

/**
 * Event emitted when damage is dealt
 */
export interface DamageEvent {
  target: EntityId;
  attacker: EntityId;
  damage: number;
  isCrit: boolean;
  position: { x: number; y: number; z: number };
}

// Queue of death events for loot system
const pendingDeaths: DeathEvent[] = [];

// Queue of damage events for floating text
const pendingDamages: DamageEvent[] = [];

// Callback for entity cleanup (set by render system)
type CleanupCallback = (eid: EntityId) => void;
let renderCleanupCallback: CleanupCallback | null = null;

/**
 * Register render cleanup callback
 */
export function onEntityDestroyed(callback: CleanupCallback): void {
  renderCleanupCallback = callback;
}

/**
 * Get pending death events and clear the queue
 */
export function consumeDeathEvents(): DeathEvent[] {
  const events = [...pendingDeaths];
  pendingDeaths.length = 0;
  return events;
}

/**
 * Get pending damage events and clear the queue
 */
export function consumeDamageEvents(): DamageEvent[] {
  const events = [...pendingDamages];
  pendingDamages.length = 0;
  return events;
}

/**
 * Apply damage to an entity
 */
function applyDamage(event: AttackEvent): void {
  const { target, damage, attacker } = event;
  
  if (!hasCombatStats(target)) return;
  
  // Calculate damage reduction from armor
  const armor = CombatStats.armor[target];
  const reduction = armor / (armor + 100); // Diminishing returns formula
  
  // 5% crit chance, 150% crit damage
  const isCrit = Math.random() < 0.05;
  const critMultiplier = isCrit ? 1.5 : 1.0;
  
  const finalDamage = Math.max(1, damage * (1 - reduction) * critMultiplier);
  
  // Apply damage
  CombatStats.hp[target] -= finalDamage;
  
  // Emit damage event for floating text
  const pos = hasPosition(target) 
    ? { x: Position.x[target], y: Position.y[target], z: Position.z[target] }
    : { x: 0, y: 0, z: 0 };
  
  pendingDamages.push({
    target,
    attacker,
    damage: finalDamage,
    isCrit,
    position: pos,
  });
  
  // Check for death
  if (CombatStats.hp[target] <= 0) {
    CombatStats.hp[target] = 0;
    
    if (hasCombatState(target)) {
      CombatState.state[target] = CombatStateEnum.DEAD;
    }
    
    // Get position for loot drop
    const pos = hasPosition(target) 
      ? { x: Position.x[target], y: Position.y[target], z: Position.z[target] }
      : { x: 0, y: 0, z: 0 };
    
    // Emit death event
    pendingDeaths.push({
      entity: target,
      killedBy: attacker,
      position: pos,
      level: CombatStats.level[target],
    });
    
    // Grant XP to killer if player killed a monster
    if (hasPlayer(attacker) && hasMonster(target) && hasProgression(attacker)) {
      const xpReward = calculateMonsterXP(CombatStats.level[target]);
      gainXP(attacker, xpReward);
    }
  }
}

/**
 * Damage System - processes attack events and handles entity deaths
 */
export function damageSystem(_entities: Set<EntityId>): void {
  // Process all pending attacks
  const attacks = consumeAttackEvents();
  for (const attack of attacks) {
    applyDamage(attack);
  }
}

/**
 * Death Cleanup System - removes dead entities from all systems
 */
export function deathCleanupSystem(entities: Set<EntityId>): EntityId[] {
  const deadEntities: EntityId[] = [];
  
  for (const eid of entities) {
    if (!hasCombatState(eid)) continue;
    
    if (CombatState.state[eid] === CombatStateEnum.DEAD) {
      deadEntities.push(eid);
    }
  }
  
  // Clean up dead entities
  const gameWorld = getGameWorld();
  for (const eid of deadEntities) {
    // 1. Clear any entities targeting this one
    for (const otherEid of entities) {
      if (hasTarget(otherEid) && Target.entityId[otherEid] === eid) {
        Target.entityId[otherEid] = -1;
        if (hasCombatState(otherEid)) {
          CombatState.state[otherEid] = CombatStateEnum.IDLE;
        }
      }
    }
    
    // 2. Call render cleanup callback
    if (renderCleanupCallback) {
      renderCleanupCallback(eid);
    }
    
    // 3. Remove physics body
    removeEntityHitbox(eid);
    
    // 4. Clear component data
    clearEntityComponents(eid);
    
    // 5. Remove from ECS world
    gameWorld.destroyEntity(eid);
  }
  
  return deadEntities;
}
