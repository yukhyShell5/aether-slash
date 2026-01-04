import type { EntityId } from 'bitecs';
import {
  Position,
  CombatStats,
  Target,
  CombatState,
  CombatStateEnum,
  Cooldowns,
  MoveTarget,
  hasPosition,
  hasCombatStats,
  hasTarget,
  hasCombatState,
  hasCooldowns,
  hasMoveTarget,
} from '../core/components';
import { getDistanceBetween } from './physics';

/**
 * Event emitted when an attack hits
 */
export interface AttackEvent {
  attacker: EntityId;
  target: EntityId;
  damage: number;
}

// Queue of pending attack events for damage system to process
const pendingAttacks: AttackEvent[] = [];

/**
 * Get pending attacks and clear the queue
 */
export function consumeAttackEvents(): AttackEvent[] {
  const events = [...pendingAttacks];
  pendingAttacks.length = 0;
  return events;
}

/**
 * Calculate damage with random roll between min and max
 */
function rollDamage(eid: EntityId): number {
  const min = CombatStats.damageMin[eid];
  const max = CombatStats.damageMax[eid];
  return min + Math.random() * (max - min);
}

/**
 * Combat System - handles targeting, range checking, and attack triggering
 * 
 * Flow:
 * 1. If entity has a target, check distance
 * 2. If not in range, set MoveTarget to move toward target
 * 3. If in range and attack cooldown ready, trigger attack
 * 4. Apply attack cooldown
 */
export function combatSystem(entities: Set<EntityId>, _deltaTime: number): void {
  for (const eid of entities) {
    // Skip if missing required components
    if (!hasCombatStats(eid) || !hasTarget(eid) || !hasCombatState(eid)) continue;
    
    const targetEid = Target.entityId[eid];
    
    // No target or dead - stay idle
    if (targetEid === -1 || CombatState.state[eid] === CombatStateEnum.DEAD) {
      continue;
    }
    
    // Check if target still exists and is alive
    if (!hasCombatStats(targetEid) || CombatStats.hp[targetEid] <= 0) {
      // Target dead or gone, clear target
      Target.entityId[eid] = -1;
      CombatState.state[eid] = CombatStateEnum.IDLE;
      continue;
    }
    
    // Check distance to target
    const distance = getDistanceBetween(eid, targetEid);
    const attackRange = CombatStats.attackRange[eid];
    
    if (distance > attackRange) {
      // Not in range - move toward target
      CombatState.state[eid] = CombatStateEnum.MOVING_TO_TARGET;
      
      if (hasMoveTarget(eid) && hasPosition(targetEid)) {
        MoveTarget.x[eid] = Position.x[targetEid];
        MoveTarget.y[eid] = Position.y[targetEid];
        MoveTarget.z[eid] = Position.z[targetEid];
        MoveTarget.active[eid] = 1;
      }
    } else {
      // In range - stop moving and try to attack
      if (hasMoveTarget(eid)) {
        MoveTarget.active[eid] = 0;
      }
      
      // Check attack cooldown
      if (hasCooldowns(eid)) {
        if (Cooldowns.attackTimer[eid] <= 0) {
          // Attack is ready!
          CombatState.state[eid] = CombatStateEnum.ATTACKING;
          
          // Calculate and queue damage
          const damage = rollDamage(eid);
          pendingAttacks.push({
            attacker: eid,
            target: targetEid,
            damage,
          });
          
          // Apply cooldown (1 / attackSpeed = time between attacks)
          const attackSpeed = CombatStats.attackSpeed[eid];
          Cooldowns.attackTimer[eid] = attackSpeed > 0 ? 1 / attackSpeed : 1;
        } else {
          // Waiting for cooldown
          CombatState.state[eid] = CombatStateEnum.IDLE;
        }
      }
    }
  }
}

/**
 * Update cooldown timers
 */
export function cooldownSystem(entities: Set<EntityId>, deltaTime: number): void {
  for (const eid of entities) {
    if (!hasCooldowns(eid)) continue;
    
    // Reduce attack cooldown
    if (Cooldowns.attackTimer[eid] > 0) {
      Cooldowns.attackTimer[eid] -= deltaTime;
    }
  }
}
