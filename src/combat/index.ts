// Combat systems barrel export
export { combatSystem, cooldownSystem, type AttackEvent, consumeAttackEvents } from './combat-system';
export { damageSystem, deathCleanupSystem, consumeDamageEvents, onEntityDestroyed, type DeathEvent, type DamageEvent } from './damage-system';
export { enemyAISystem } from './enemy-ai-system';
export { initPhysics, createEntityHitbox, removeEntityHitbox, stepPhysics, getPhysicsWorld, syncEntityHitbox, getDistanceBetween, isInRange, disposePhysics } from './physics';
export { regenerationSystem } from './regeneration-system';
export { HitFlash, triggerHitFlash, hasHitFlash, hitFlashSystem, cleanupHitFlash } from './hit-flash';
