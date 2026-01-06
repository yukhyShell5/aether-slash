/**
 * Component store types using Structure of Arrays pattern
 * BiTECS 0.4.0 uses simple object stores accessed via entity ID
 */

const MAX_ENTITIES = 10000;
const MAX_SKILL_SLOTS = 6;

// ============================================================================
// MOVEMENT COMPONENTS
// ============================================================================

/**
 * Position component (3D world coordinates)
 */
export const Position = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
  z: new Float32Array(MAX_ENTITIES),
};

/**
 * Velocity component (movement per second)
 */
export const Velocity = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
  z: new Float32Array(MAX_ENTITIES),
};

/**
 * Target position for click-to-move
 */
export const MoveTarget = {
  x: new Float32Array(MAX_ENTITIES),
  y: new Float32Array(MAX_ENTITIES),
  z: new Float32Array(MAX_ENTITIES),
  active: new Uint8Array(MAX_ENTITIES), // 0 = no target, 1 = has target
};

/**
 * Movement speed multiplier
 */
export const Speed = {
  value: new Float32Array(MAX_ENTITIES),
};

// ============================================================================
// COMBAT COMPONENTS
// ============================================================================

/**
 * Combat statistics component
 */
export const CombatStats = {
  hp: new Float32Array(MAX_ENTITIES),
  maxHp: new Float32Array(MAX_ENTITIES),
  mp: new Float32Array(MAX_ENTITIES),
  maxMp: new Float32Array(MAX_ENTITIES),
  attackSpeed: new Float32Array(MAX_ENTITIES),    // Attacks per second
  attackRange: new Float32Array(MAX_ENTITIES),    // Range in world units
  damageMin: new Float32Array(MAX_ENTITIES),
  damageMax: new Float32Array(MAX_ENTITIES),
  armor: new Float32Array(MAX_ENTITIES),
  level: new Uint16Array(MAX_ENTITIES),
  healthRegen: new Float32Array(MAX_ENTITIES),    // HP per second
};

/**
 * Combat target component - entity ID of current attack target
 */
export const Target = {
  entityId: new Int32Array(MAX_ENTITIES), // -1 = no target
};

/**
 * Combat state enum values
 */
export const CombatStateEnum = {
  IDLE: 0,
  MOVING_TO_TARGET: 1,
  ATTACKING: 2,
  DEAD: 3,
} as const;

/**
 * Combat state component
 */
export const CombatState = {
  state: new Uint8Array(MAX_ENTITIES), // CombatStateEnum values
};

/**
 * Cooldowns component for attack and skills
 */
export const Cooldowns = {
  attackTimer: new Float32Array(MAX_ENTITIES),      // Time until next attack
  skillTimers: new Float32Array(MAX_ENTITIES * MAX_SKILL_SLOTS), // Skill cooldowns
};

// Helper to get/set skill cooldown
export function getSkillCooldown(eid: number, skillSlot: number): number {
  return Cooldowns.skillTimers[eid * MAX_SKILL_SLOTS + skillSlot];
}

export function setSkillCooldown(eid: number, skillSlot: number, value: number): void {
  Cooldowns.skillTimers[eid * MAX_SKILL_SLOTS + skillSlot] = value;
}

// ============================================================================
// RENDER COMPONENTS
// ============================================================================

/**
 * Renderable component - links to Three.js object index
 */
export const Renderable = {
  objectIndex: new Uint32Array(MAX_ENTITIES),
  colorR: new Float32Array(MAX_ENTITIES),
  colorG: new Float32Array(MAX_ENTITIES),
  colorB: new Float32Array(MAX_ENTITIES),
};

/**
 * ItemDrop visual component
 */
export const ItemDropVisual = {
  labelIndex: new Int32Array(MAX_ENTITIES), // Index for text label, -1 = none
};

// ============================================================================
// ENTITY TYPE FLAGS
// ============================================================================

export const ComponentFlags = {
  position: new Uint8Array(MAX_ENTITIES),
  velocity: new Uint8Array(MAX_ENTITIES),
  moveTarget: new Uint8Array(MAX_ENTITIES),
  renderable: new Uint8Array(MAX_ENTITIES),
  speed: new Uint8Array(MAX_ENTITIES),
  player: new Uint8Array(MAX_ENTITIES),
  monster: new Uint8Array(MAX_ENTITIES),
  itemDrop: new Uint8Array(MAX_ENTITIES),
  combatStats: new Uint8Array(MAX_ENTITIES),
  target: new Uint8Array(MAX_ENTITIES),
  cooldowns: new Uint8Array(MAX_ENTITIES),
  combatState: new Uint8Array(MAX_ENTITIES),
};

// ============================================================================
// ITEM DROP DATA
// ============================================================================

/**
 * Rarity enum
 */
export const RarityEnum = {
  COMMON: 0,
  MAGIC: 1,
  RARE: 2,
  LEGENDARY: 3,
} as const;

export type Rarity = typeof RarityEnum[keyof typeof RarityEnum];

/**
 * Item data stored separately (not SoA for complex data)
 */
export interface ItemData {
  baseItemId: string;
  name: string;
  rarity: Rarity;
  level: number;
  affixes: Array<{ id: string; value: number }>;
}

// Map of entity ID to item data for dropped items
export const ItemDataStore = new Map<number, ItemData>();

// ============================================================================
// EQUIPMENT COMPONENTS
// ============================================================================

/**
 * Equipment slot indices
 */
export const EquipmentSlot = {
  MAINHAND: 0,
  OFFHAND: 1,
  HEAD: 2,
  CHEST: 3,
  LEGS: 4,
  FEET: 5,
  RING1: 6,
  RING2: 7,
  AMULET: 8,
} as const;

export const EQUIPMENT_SLOT_COUNT = 9;

/**
 * Equipped items component - stores entity IDs of equipped items
 * -1 = slot is empty
 */
export const EquippedItems = {
  slots: new Int32Array(MAX_ENTITIES * EQUIPMENT_SLOT_COUNT),
};

// Helper functions for equipped items
export function getEquippedItem(playerEid: number, slot: number): number {
  return EquippedItems.slots[playerEid * EQUIPMENT_SLOT_COUNT + slot];
}

export function setEquippedItem(playerEid: number, slot: number, itemEid: number): void {
  EquippedItems.slots[playerEid * EQUIPMENT_SLOT_COUNT + slot] = itemEid;
}

export function clearEquippedItem(playerEid: number, slot: number): void {
  EquippedItems.slots[playerEid * EQUIPMENT_SLOT_COUNT + slot] = -1;
}

export function initEquipmentSlots(playerEid: number): void {
  for (let i = 0; i < EQUIPMENT_SLOT_COUNT; i++) {
    EquippedItems.slots[playerEid * EQUIPMENT_SLOT_COUNT + i] = -1;
  }
}

// ============================================================================
// COMPONENT ADD/HAS FUNCTIONS
// ============================================================================

// Movement
export function addPositionComponent(eid: number): void {
  ComponentFlags.position[eid] = 1;
}

export function addVelocityComponent(eid: number): void {
  ComponentFlags.velocity[eid] = 1;
}

export function addMoveTargetComponent(eid: number): void {
  ComponentFlags.moveTarget[eid] = 1;
}

export function addSpeedComponent(eid: number): void {
  ComponentFlags.speed[eid] = 1;
}

// Entity types
export function addPlayerComponent(eid: number): void {
  ComponentFlags.player[eid] = 1;
}

export function addMonsterComponent(eid: number): void {
  ComponentFlags.monster[eid] = 1;
}

export function addItemDropComponent(eid: number): void {
  ComponentFlags.itemDrop[eid] = 1;
}

// Render
export function addRenderableComponent(eid: number): void {
  ComponentFlags.renderable[eid] = 1;
}

// Combat
export function addCombatStatsComponent(eid: number): void {
  ComponentFlags.combatStats[eid] = 1;
}

export function addTargetComponent(eid: number): void {
  ComponentFlags.target[eid] = 1;
  Target.entityId[eid] = -1; // Initialize with no target
}

export function addCooldownsComponent(eid: number): void {
  ComponentFlags.cooldowns[eid] = 1;
  Cooldowns.attackTimer[eid] = 0;
  // Initialize skill cooldowns
  for (let i = 0; i < MAX_SKILL_SLOTS; i++) {
    setSkillCooldown(eid, i, 0);
  }
}

export function addCombatStateComponent(eid: number): void {
  ComponentFlags.combatState[eid] = 1;
  CombatState.state[eid] = CombatStateEnum.IDLE;
}

// Has checks
export function hasPosition(eid: number): boolean {
  return ComponentFlags.position[eid] === 1;
}

export function hasVelocity(eid: number): boolean {
  return ComponentFlags.velocity[eid] === 1;
}

export function hasMoveTarget(eid: number): boolean {
  return ComponentFlags.moveTarget[eid] === 1;
}

export function hasRenderable(eid: number): boolean {
  return ComponentFlags.renderable[eid] === 1;
}

export function hasSpeed(eid: number): boolean {
  return ComponentFlags.speed[eid] === 1;
}

export function hasPlayer(eid: number): boolean {
  return ComponentFlags.player[eid] === 1;
}

export function hasMonster(eid: number): boolean {
  return ComponentFlags.monster[eid] === 1;
}

export function hasItemDrop(eid: number): boolean {
  return ComponentFlags.itemDrop[eid] === 1;
}

export function hasCombatStats(eid: number): boolean {
  return ComponentFlags.combatStats[eid] === 1;
}

export function hasTarget(eid: number): boolean {
  return ComponentFlags.target[eid] === 1;
}

export function hasCooldowns(eid: number): boolean {
  return ComponentFlags.cooldowns[eid] === 1;
}

export function hasCombatState(eid: number): boolean {
  return ComponentFlags.combatState[eid] === 1;
}

// ============================================================================
// COMPONENT CLEANUP
// ============================================================================

/**
 * Clear all component data for an entity
 */
export function clearEntityComponents(eid: number): void {
  // Clear flags
  for (const flag of Object.values(ComponentFlags)) {
    flag[eid] = 0;
  }
  
  // Clear item data if exists
  ItemDataStore.delete(eid);
}
