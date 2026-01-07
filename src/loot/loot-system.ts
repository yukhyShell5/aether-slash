import type { EntityId } from 'bitecs';
import {
  Position,
  RarityEnum,
  ItemDataStore,
  addPositionComponent,
  addRenderableComponent,
  addItemDropComponent,
  type ItemData,
  type Rarity,
} from '../core/components';
import { getGameWorld } from '../core/world';
import { consumeDeathEvents } from '../combat/damage-system';
import lootTables from '../data/loot_tables.json';

// Types from JSON
interface AffixTier {
  minLevel: number;
  maxLevel: number;
  minValue: number;
  maxValue: number;
}

interface Affix {
  id: string;
  name: string;
  stat: string;
  tiers: AffixTier[];
}

interface BaseItem {
  id: string;
  name: string;
  slot: string;
  type: string;
  baseStats: Record<string, number>;
  levelRange: { min: number; max: number };
}

// Rarity name mapping
const RarityNames = ['Common', 'Magic', 'Rare', 'Legendary'] as const;
const RarityKeys = ['common', 'magic', 'rare', 'legendary'] as const;

/**
 * Weighted random selection
 * @param weights Object mapping keys to weights
 * @returns Selected key
 */
function weightedRandom<T extends string>(weights: Record<T, number>): T {
  const entries = Object.entries(weights) as [T, number][];
  const totalWeight = entries.reduce((sum, [, w]) => sum + (w as number), 0);
  let random = Math.random() * totalWeight;
  
  for (const [key, weight] of entries) {
    random -= weight as number;
    if (random <= 0) {
      return key;
    }
  }
  
  // Fallback to first
  return entries[0][0];
}

/**
 * Roll a rarity based on monster level and rarity modifier
 */
function rollRarity(monsterLevel: number, rarityModifier: number = 1): Rarity {
  const weights = { ...lootTables.rarityWeights };
  
  // Apply modifier (increases chance of better rarities)
  if (rarityModifier > 1) {
    weights.magic *= rarityModifier;
    weights.rare *= rarityModifier * 1.5;
    weights.legendary *= rarityModifier * 2;
  }
  
  // Higher level monsters have better drops
  if (monsterLevel > 10) {
    weights.magic *= 1 + (monsterLevel - 10) * 0.02;
    weights.rare *= 1 + (monsterLevel - 10) * 0.03;
  }
  
  const rarityKey = weightedRandom(weights as Record<string, number>);
  return RarityEnum[rarityKey.toUpperCase() as keyof typeof RarityEnum];
}

/**
 * Get base items valid for a given level
 */
function getValidBaseItems(level: number): BaseItem[] {
  return (lootTables.baseItems as BaseItem[]).filter(
    item => level >= item.levelRange.min && level <= item.levelRange.max
  );
}

/**
 * Roll affixes for an item based on rarity
 */
function rollAffixes(level: number, rarity: Rarity): Array<{ id: string; value: number }> {
  const affixes: Array<{ id: string; value: number }> = [];
  
  const rarityKey = RarityKeys[rarity];
  const affixCount = lootTables.rarityAffixCount[rarityKey];
  const numAffixes = affixCount.min + Math.floor(Math.random() * (affixCount.max - affixCount.min + 1));
  
  if (numAffixes === 0) return affixes;
  
  // Combine prefixes and suffixes
  const allAffixes = [
    ...lootTables.affixes.prefixes,
    ...lootTables.affixes.suffixes,
  ] as Affix[];
  
  // Filter affixes valid for this level
  const validAffixes = allAffixes.filter(affix =>
    affix.tiers.some(t => level >= t.minLevel && level <= t.maxLevel)
  );
  
  // Select random affixes without duplicates
  const usedIds = new Set<string>();
  
  for (let i = 0; i < numAffixes && validAffixes.length > 0; i++) {
    // Filter out already used
    const available = validAffixes.filter(a => !usedIds.has(a.id));
    if (available.length === 0) break;
    
    // Random selection
    const affix = available[Math.floor(Math.random() * available.length)];
    usedIds.add(affix.id);
    
    // Find valid tier for level
    const validTiers = affix.tiers.filter(t => level >= t.minLevel && level <= t.maxLevel);
    if (validTiers.length === 0) continue;
    
    // Use highest valid tier
    const tier = validTiers[validTiers.length - 1];
    const value = tier.minValue + Math.floor(Math.random() * (tier.maxValue - tier.minValue + 1));
    
    affixes.push({ id: affix.id, value });
  }
  
  return affixes;
}

/**
 * Generate item name based on rarity and affixes
 */
function generateItemName(baseItem: BaseItem, rarity: Rarity, affixes: Array<{ id: string; value: number }>): string {
  const rarityPrefix = rarity >= RarityEnum.RARE ? RarityNames[rarity] + ' ' : '';
  
  // Find affix names
  const allAffixDefs = [
    ...lootTables.affixes.prefixes,
    ...lootTables.affixes.suffixes,
  ] as Affix[];
  
  let prefixName = '';
  let suffixName = '';
  
  for (const affix of affixes) {
    const def = allAffixDefs.find(a => a.id === affix.id);
    if (!def) continue;
    
    // Prefixes start with capital (e.g., "Mighty")
    if (def.name.charAt(0) === def.name.charAt(0).toUpperCase() && !def.name.startsWith('of')) {
      prefixName = def.name + ' ';
    } else if (def.name.startsWith('of')) {
      suffixName = ' ' + def.name;
    }
  }
  
  return `${rarityPrefix}${prefixName}${baseItem.name}${suffixName}`.trim();
}

/**
 * Generate a random loot drop
 */
export function generateLoot(monsterLevel: number, rarityModifier: number = 1): ItemData | null {
  // Roll for drop (not every kill drops loot)
  if (Math.random() > 0.3 + (monsterLevel * 0.01)) {
    return null;
  }
  
  const rarity = rollRarity(monsterLevel, rarityModifier);
  const validItems = getValidBaseItems(monsterLevel);
  
  if (validItems.length === 0) {
    return null;
  }
  
  const baseItem = validItems[Math.floor(Math.random() * validItems.length)];
  const affixes = rollAffixes(monsterLevel, rarity);
  const name = generateItemName(baseItem, rarity, affixes);
  
  return {
    baseItemId: baseItem.id,
    name,
    rarity,
    level: monsterLevel,
    affixes,
  };
}

/**
 * Create an ItemDrop entity at a position
 */
export function createItemDropEntity(x: number, y: number, z: number, itemData: ItemData): EntityId {
  const gameWorld = getGameWorld();
  const eid = gameWorld.createEntity();
  
  // Add components
  addPositionComponent(eid);
  addRenderableComponent(eid);
  addItemDropComponent(eid);
  
  // Set position (slightly above ground)
  Position.x[eid] = x;
  Position.y[eid] = y + 0.25;
  Position.z[eid] = z;
  
  // Store item data
  ItemDataStore.set(eid, itemData);
  
  return eid;
}

/**
 * Loot System - processes death events and spawns loot drops
 */
export function lootSystem(): EntityId[] {
  const droppedItems: EntityId[] = [];
  const deaths = consumeDeathEvents();
  
  for (const death of deaths) {
    const item = generateLoot(death.level, 1);
    
    if (item) {
      const eid = createItemDropEntity(
        death.position.x,
        death.position.y,
        death.position.z,
        item
      );
      droppedItems.push(eid);
      
      // console.log(`💎 Dropped: ${item.name} (${RarityNames[item.rarity]})`);
    }
  }
  
  return droppedItems;
}

/**
 * Get rarity color for rendering
 */
export function getRarityColor(rarity: Rarity): string {
  return lootTables.rarityColors[RarityKeys[rarity]];
}
