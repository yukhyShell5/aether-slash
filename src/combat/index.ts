// Combat system exports
export { initPhysics, getPhysicsWorld, createEntityHitbox, syncEntityHitbox, removeEntityHitbox, getDistanceBetween, isInRange, stepPhysics, disposePhysics } from './physics';
export { combatSystem, cooldownSystem, consumeAttackEvents } from './combat-system';
export type { AttackEvent } from './combat-system';
export { damageSystem, deathCleanupSystem, onEntityDestroyed, consumeDeathEvents, consumeDamageEvents } from './damage-system';
export type { DeathEvent, DamageEvent } from './damage-system';
export { HitFlash, triggerHitFlash, hasHitFlash, hitFlashSystem, cleanupHitFlash } from './hit-flash';
