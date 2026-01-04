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
export { movementSystem, moveToTargetSystem } from './systems';
export { uiSystem, resetUISystem } from './ui-system';
export { calculateFinalStats, applyFinalStats, type FinalStats } from './stat-calculator';
