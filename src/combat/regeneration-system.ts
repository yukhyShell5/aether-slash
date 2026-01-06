/**
 * Health Regeneration System
 * Regenerates player HP over time based on healthRegen stat
 */
import type { EntityId } from 'bitecs';
import { CombatStats, hasCombatStats, hasPlayer } from '../core/components';
import { playerHealth } from '../stores/player';

/**
 * Regeneration system - heals entities with healthRegen stat
 * Called every frame with deltaTime
 */
export function regenerationSystem(entities: Set<EntityId>, deltaTime: number): void {
  for (const eid of entities) {
    // Only process entities with combat stats
    if (!hasCombatStats(eid)) continue;
    
    const regen = CombatStats.healthRegen[eid];
    if (regen <= 0) continue;
    
    const currentHp = CombatStats.hp[eid];
    const maxHp = CombatStats.maxHp[eid];
    
    // Don't regen if already at max
    if (currentHp >= maxHp) continue;
    
    // Apply regen (HP per second * deltaTime)
    const regenAmount = regen * deltaTime;
    const newHp = Math.min(currentHp + regenAmount, maxHp);
    CombatStats.hp[eid] = newHp;
    
    // Update UI store for player
    if (hasPlayer(eid)) {
      playerHealth.set({
        current: newHp,
        max: maxHp,
      });
    }
  }
}
