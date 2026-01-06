import type { EntityId } from 'bitecs';
import {
  Target,
  CombatState,
  CombatStateEnum,
  CombatStats,
  hasMonster,
  hasCombatStats,
  hasCombatState,
  hasTarget,
  hasPosition,
} from '../core/components';
import { getDistanceBetween } from './physics';

// AI Constants
const AGGRO_RANGE = 8.0;  // Distance at which monsters detect player
const LEASH_RANGE = 15.0; // Distance at which monsters give up chase

/**
 * Enemy AI System - handles monster targeting behavior
 * 
 * Flow:
 * 1. For each monster entity
 * 2. If no target and player in aggro range → target player
 * 3. If target is too far (leash) → clear target
 * 4. combatSystem handles the rest (movement, attacking)
 */
export function enemyAISystem(
  entities: Set<EntityId>,
  playerEid: EntityId | null,
  _deltaTime: number
): void {
  // No player to target
  if (playerEid === null) return;
  
  // Check if player is alive
  if (!hasCombatStats(playerEid) || CombatStats.hp[playerEid] <= 0) return;
  
  for (const eid of entities) {
    // Only process monsters
    if (!hasMonster(eid)) continue;
    if (!hasTarget(eid) || !hasCombatState(eid) || !hasPosition(eid)) continue;
    
    // Skip dead monsters
    if (hasCombatState(eid) && CombatState.state[eid] === CombatStateEnum.DEAD) continue;
    
    const currentTarget = Target.entityId[eid];
    const distanceToPlayer = getDistanceBetween(eid, playerEid);
    
    // No current target - check for aggro
    if (currentTarget === -1) {
      if (distanceToPlayer <= AGGRO_RANGE) {
        // Aggro! Target the player
        Target.entityId[eid] = playerEid;
        CombatState.state[eid] = CombatStateEnum.MOVING_TO_TARGET;
        console.log(`👹 Monster ${eid} aggro on player! Distance: ${distanceToPlayer.toFixed(1)}`);
      }
    } else {
      // Has a target - check leash range
      if (distanceToPlayer > LEASH_RANGE) {
        // Too far, give up chase
        Target.entityId[eid] = -1;
        CombatState.state[eid] = CombatStateEnum.IDLE;
        console.log(`👹 Monster ${eid} lost interest (leash)`);
      }
    }
  }
}
