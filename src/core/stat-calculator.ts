import type { EntityId } from 'bitecs';
import { 
  CombatStats,
  BaseStats,
  getEquippedItem, 
  EQUIPMENT_SLOT_COUNT, 
  ItemDataStore,
  type ItemData 
} from './components';
import { getTalentBonuses } from '../stores/talents';
import lootTables from '../data/loot_tables.json';

/**
 * Final computed stats for an entity
 */
export interface FinalStats {
  // Base combat stats
  maxHealth: number;
  maxMana: number;
  damageMin: number;
  damageMax: number;
  armor: number;
  attackSpeed: number;
  attackRange: number;
  
  // Derived stats from affixes
  strength: number;
  vitality: number;
  damagePercent: number;
  healthRegen: number;
  critChance: number;
  critDamage: number;
  lifeSteal: number;
  moveSpeed: number;
}

/**
 * Default stats (zero values)
 */
function createEmptyStats(): FinalStats {
  return {
    maxHealth: 0,
    maxMana: 0,
    damageMin: 0,
    damageMax: 0,
    armor: 0,
    attackSpeed: 0,
    attackRange: 0,
    strength: 0,
    vitality: 0,
    damagePercent: 0,
    healthRegen: 0,
    critChance: 0,
    critDamage: 0,
    lifeSteal: 0,
    moveSpeed: 0,
  };
}

/**
 * Get base stats from BaseStats component (the INITIAL stats, not modified by equipment)
 */
function getBaseStats(eid: EntityId): FinalStats {
  return {
    maxHealth: BaseStats.maxHp[eid],
    maxMana: BaseStats.maxMp[eid],
    damageMin: BaseStats.damageMin[eid],
    damageMax: BaseStats.damageMax[eid],
    armor: BaseStats.armor[eid],
    attackSpeed: BaseStats.attackSpeed[eid],
    attackRange: BaseStats.attackRange[eid],
    strength: 0,
    vitality: 0,
    damagePercent: 0,
    healthRegen: BaseStats.healthRegen[eid],
    critChance: 5, // Base 5% crit
    critDamage: 150, // Base 150% crit damage
    lifeSteal: 0,
    moveSpeed: 0,
  };
}

/**
 * Get stats from a single equipped item
 */
function getItemStats(itemData: ItemData): Partial<FinalStats> {
  const stats: Partial<FinalStats> = {};
  
  // Find base item definition
  const baseItem = lootTables.baseItems.find(b => b.id === itemData.baseItemId);
  if (baseItem) {
    const baseStats = baseItem.baseStats as Record<string, number>;
    if (baseStats.damageMin !== undefined) stats.damageMin = baseStats.damageMin;
    if (baseStats.damageMax !== undefined) stats.damageMax = baseStats.damageMax;
    if (baseStats.armor !== undefined) stats.armor = baseStats.armor;
  }
  
  // Apply affixes
  for (const affix of itemData.affixes) {
    switch (affix.id) {
      case 'strength':
        stats.strength = (stats.strength || 0) + affix.value;
        break;
      case 'vitality':
        stats.vitality = (stats.vitality || 0) + affix.value;
        break;
      case 'swiftness':
        stats.attackSpeed = (stats.attackSpeed || 0) + affix.value / 100; // Convert to decimal
        break;
      case 'might':
        stats.damagePercent = (stats.damagePercent || 0) + affix.value;
        break;
      case 'health':
        stats.maxHealth = (stats.maxHealth || 0) + affix.value;
        break;
      case 'mana':
        stats.maxMana = (stats.maxMana || 0) + affix.value;
        break;
      case 'armor':
        stats.armor = (stats.armor || 0) + affix.value;
        break;
      case 'regen':
        stats.healthRegen = (stats.healthRegen || 0) + affix.value;
        break;
      // Unique affixes
      case 'holyDamage':
      case 'lifeSteal':
        stats.lifeSteal = (stats.lifeSteal || 0) + affix.value;
        break;
    }
  }
  
  return stats;
}

/**
 * Collect all stats from equipped gear
 */
function getEquippedGearStats(playerEid: EntityId): Partial<FinalStats> {
  const gearStats: Partial<FinalStats> = createEmptyStats();
  
  for (let slot = 0; slot < EQUIPMENT_SLOT_COUNT; slot++) {
    const itemEid = getEquippedItem(playerEid, slot);
    if (itemEid === -1) continue;
    
    const itemData = ItemDataStore.get(itemEid);
    if (!itemData) continue;
    
    const itemStats = getItemStats(itemData);
    
    // Sum all stats
    for (const [key, value] of Object.entries(itemStats)) {
      if (value !== undefined && typeof value === 'number') {
        (gearStats as Record<string, number>)[key] = 
          ((gearStats as Record<string, number>)[key] || 0) + value;
      }
    }
  }
  
  return gearStats;
}

/**
 * Calculate final stats by combining base stats + gear + talents + derived bonuses
 */
export function calculateFinalStats(playerEid: EntityId): FinalStats {
  const base = getBaseStats(playerEid);
  const gear = getEquippedGearStats(playerEid);
  const talentBonuses = getTalentBonuses();
  
  // Combine base and gear (flat values)
  const combined: FinalStats = {
    maxHealth: base.maxHealth + (gear.maxHealth || 0),
    maxMana: base.maxMana + (gear.maxMana || 0),
    damageMin: base.damageMin + (gear.damageMin || 0),
    damageMax: base.damageMax + (gear.damageMax || 0),
    armor: base.armor + (gear.armor || 0),
    attackSpeed: base.attackSpeed + (gear.attackSpeed || 0),
    attackRange: base.attackRange,
    strength: base.strength + (gear.strength || 0),
    vitality: base.vitality + (gear.vitality || 0),
    damagePercent: base.damagePercent + (gear.damagePercent || 0),
    healthRegen: base.healthRegen + (gear.healthRegen || 0),
    critChance: base.critChance + (gear.critChance || 0),
    critDamage: base.critDamage + (gear.critDamage || 0),
    lifeSteal: base.lifeSteal + (gear.lifeSteal || 0),
    moveSpeed: base.moveSpeed + (gear.moveSpeed || 0),
  };
  
  // Apply talent flat bonuses
  for (const [stat, bonus] of Object.entries(talentBonuses)) {
    if (stat in combined) {
      (combined as unknown as Record<string, number>)[stat] += bonus.flat;
    }
  }
  
  // Apply vitality bonus to health (10 HP per vitality)
  combined.maxHealth += combined.vitality * 10;
  
  // Apply strength bonus to damage (0.5% per point)
  const strengthBonus = 1 + (combined.strength * 0.005);
  combined.damageMin *= strengthBonus;
  combined.damageMax *= strengthBonus;
  
  // Apply damage percent bonus (from gear + talents)
  const damagePercentBonus = combined.damagePercent + (talentBonuses.damagePercent?.percent || 0);
  const damageMultiplier = 1 + (damagePercentBonus / 100);
  combined.damageMin *= damageMultiplier;
  combined.damageMax *= damageMultiplier;
  
  // Apply talent percent bonuses
  if (talentBonuses.maxHealth?.percent) {
    combined.maxHealth *= 1 + (talentBonuses.maxHealth.percent / 100);
  }
  if (talentBonuses.attackSpeed?.percent) {
    combined.attackSpeed *= 1 + (talentBonuses.attackSpeed.percent / 100);
  }
  if (talentBonuses.critChance?.percent) {
    combined.critChance += talentBonuses.critChance.percent;
  }
  if (talentBonuses.critDamage?.percent) {
    combined.critDamage += talentBonuses.critDamage.percent;
  }
  
  return combined;
}

/**
 * Apply calculated stats back to CombatStats component
 */
export function applyFinalStats(playerEid: EntityId, stats: FinalStats): void {
  CombatStats.maxHp[playerEid] = stats.maxHealth;
  if (CombatStats.hp[playerEid] > stats.maxHealth) {
    CombatStats.hp[playerEid] = stats.maxHealth;
  }
  
  CombatStats.maxMp[playerEid] = stats.maxMana;
  if (CombatStats.mp[playerEid] > stats.maxMana) {
    CombatStats.mp[playerEid] = stats.maxMana;
  }
  CombatStats.damageMin[playerEid] = stats.damageMin;
  CombatStats.damageMax[playerEid] = stats.damageMax;
  CombatStats.armor[playerEid] = stats.armor;
  CombatStats.attackSpeed[playerEid] = stats.attackSpeed;
  CombatStats.attackRange[playerEid] = stats.attackRange;
}

/**
 * Sync final stats to Svelte player store
 */
export function syncStatsToStore(stats: FinalStats): void {
  // Import dynamically to avoid circular deps
  import('../stores/player').then(({ playerStats }) => {
    playerStats.set({
      maxHealth: Math.round(stats.maxHealth),
      maxMana: Math.round(stats.maxMana),
      strength: Math.round(stats.strength),
      vitality: Math.round(stats.vitality),
      attackSpeed: stats.attackSpeed,
      damageMin: Math.round(stats.damageMin),
      damageMax: Math.round(stats.damageMax),
      armor: Math.round(stats.armor),
      moveSpeed: stats.moveSpeed,
      critChance: stats.critChance,
      critDamage: stats.critDamage,
      healthRegen: stats.healthRegen,
      lifeSteal: stats.lifeSteal,
    });
  });
}
