// Core ECS exports
export { GameWorld, getGameWorld, resetGameWorld } from './world';
export type { World, EntityId } from 'bitecs';

// Components
export { 
  Position, 
  Velocity, 
  MoveTarget, 
  Speed,
  Renderable,
  ItemDropVisual,
  CombatStats,
  Target,
  CombatState,
  CombatStateEnum,
  Cooldowns,
  ComponentFlags,
  RarityEnum,
  ItemDataStore,
  getSkillCooldown,
  setSkillCooldown,
  // Equipment
  EquipmentSlot,
  EQUIPMENT_SLOT_COUNT,
  EquippedItems,
  getEquippedItem,
  setEquippedItem,
  clearEquippedItem,
  initEquipmentSlots,
  // Base stats
  BaseStats,
  initBaseStats,
  // Add component functions
  addPositionComponent,
  addVelocityComponent,
  addMoveTargetComponent,
  addRenderableComponent,
  addSpeedComponent,
  addPlayerComponent,
  addMonsterComponent,
  addItemDropComponent,
  addCombatStatsComponent,
  addTargetComponent,
  addCooldownsComponent,
  addCombatStateComponent,
  // Has component functions
  hasPosition,
  hasVelocity,
  hasMoveTarget,
  hasRenderable,
  hasSpeed,
  hasPlayer,
  hasMonster,
  hasItemDrop,
  hasCombatStats,
  hasTarget,
  hasCooldowns,
  hasCombatState,
  // Cleanup
  clearEntityComponents,
} from './components';

export type { ItemData, Rarity } from './components';

// Systems
export { movementSystem, moveToTargetSystem, entitySeparationSystem } from './systems';
export { uiSystem, resetUISystem } from './ui-system';
export { calculateFinalStats, applyFinalStats, syncStatsToStore, type FinalStats } from './stat-calculator';

// Progression
export {
  Progression,
  addProgressionComponent,
  hasProgression,
  gainXP,
  xpForNextLevel,
  calculateMonsterXP,
  getProgressionState,
  spendTalentPoint,
  consumeLevelUpEvents,
} from './progression';

// Equipment
export {
  equipItem,
  unequipItem,
  getEquippedItems,
  getSlotForItem,
  getSlotName,
  hasItemEquipped,
  onEquipmentChanged,
} from './equipment-system';
