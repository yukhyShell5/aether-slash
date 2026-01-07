
import { 
  BaseStats, 
  CombatStats, 
  ItemDataStore, 
  getEquippedItem, 
  EQUIPMENT_SLOT_COUNT,
  hasPlayer
} from './components';
import { getTalentBonuses } from '../stores/talents';
// @ts-ignore
import lootTables from '../data/loot_tables.json';
import { playerStats } from '../stores/player';

export function recalculateStats(eid: number): void {
  // 1. Start with Base Stats
  let maxHp = BaseStats.maxHp[eid];
  let maxMp = BaseStats.maxMp[eid];
  let damageMin = BaseStats.damageMin[eid];
  let damageMax = BaseStats.damageMax[eid];
  let armor = BaseStats.armor[eid];
  let attackSpeed = BaseStats.attackSpeed[eid];
  // let attackRange = BaseStats.attackRange[eid]; // Usually fixed or weapon dependent

  // 2. Add Equipment Bonuses
  if (hasPlayer(eid)) {
    for (let i = 0; i < EQUIPMENT_SLOT_COUNT; i++) {
        const itemEid = getEquippedItem(eid, i);
        if (itemEid !== -1) {
            const itemData = ItemDataStore.get(itemEid);
            if (itemData) {
                // Apply Base Item Stats (Fixed stats from loot table)
                const baseItem = lootTables.baseItems.find(b => b.id === itemData.baseItemId);
                if (baseItem && baseItem.baseStats) {
                    if (baseItem.baseStats.damageMin) damageMin += baseItem.baseStats.damageMin;
                    if (baseItem.baseStats.damageMax) damageMax += baseItem.baseStats.damageMax;
                    if (baseItem.baseStats.armor) armor += baseItem.baseStats.armor;
                }

                // Apply Affix Stats
                if (itemData.affixes) {
                    for (const affix of itemData.affixes) {
                     // Simple mapping of affix ID to stat
                     // IDs from loot_tables.json need to be handled
                     // e.g. "plus_hp", "plus_damage", "percent_damage"
                     switch (affix.id) {
                         // Suffixes
                         case 'health': maxHp += affix.value; break;
                         case 'mana': maxMp += affix.value; break;
                         case 'armor': armor += affix.value; break;
                         case 'regen': 
                             // Not currently in CombatStats initialization locally but exists in component
                             // We should ensure it's handled at end
                             // For now add to a local var?
                             // Actually BaseStats.healthRegen exists.
                             // Let's rely on component directly? 
                             // No, logic below overwrites CombatStats.
                             // Add healthRegen to local vars.
                             break;
                             
                         // Prefixes
                         case 'strength':
                             // Strength grants damage?
                             damageMin += affix.value;
                             damageMax += affix.value;
                             break;
                         case 'vitality':
                             // Vitality grants HP?
                             maxHp += affix.value * 5;
                             break;
                         case 'swiftness':
                             // Attack Speed percent
                             attackSpeed *= (1 + affix.value / 100);
                             break;
                         case 'might':
                             // Damage percent
                             const mult = 1 + (affix.value / 100);
                             damageMin *= mult;
                             damageMax *= mult;
                             break;
                     }
                }
            }
        }
    }
  }

  // 3. Add Talent Bonuses
  if (hasPlayer(eid)) {
      const talentBonuses = getTalentBonuses();
      // Apply Percentages last? Or additive? 
      // Typically: (Base + Flat) * Percent
      
      // Let's gather flats and percents
      // Stats: maxHealth, damagePercent, armor, critChance, critDamage, attackSpeed
      
      if (talentBonuses['maxHealth']) {
          maxHp = maxHp * (1 + talentBonuses['maxHealth'].percent / 100);
      }
      
      if (talentBonuses['damagePercent']) {
          const mult = 1 + (talentBonuses['damagePercent'].percent / 100);
          damageMin *= mult;
          damageMax *= mult;
      }
      
      if (talentBonuses['armor']) {
          armor += talentBonuses['armor'].flat;
      }
      
      if (talentBonuses['attackSpeed']) {
          attackSpeed *= (1 + talentBonuses['attackSpeed'].percent / 100);
      }
  }

  // 4. Update CombatStats
  CombatStats.maxHp[eid] = maxHp;
  CombatStats.maxMp[eid] = maxMp;
  CombatStats.damageMin[eid] = damageMin;
  CombatStats.damageMax[eid] = damageMax;
  CombatStats.armor[eid] = armor;
  CombatStats.attackSpeed[eid] = attackSpeed;
  
  // Ensure current HP doesn't exceed new max
  if (CombatStats.hp[eid] > maxHp) {
      CombatStats.hp[eid] = maxHp;
  }
  
  // console.log('Stats Recalculated:', { maxHp, damageMin, damageMax, armor });
}

  // console.log('Stats Recalculated:', { maxHp, damageMin, damageMax, armor });
}

/**
 * Sync ECS CombatStats to Svelte store for UI
 */
export function syncStatsToStore(eid: number): void {
  if (hasPlayer(eid)) {
      playerStats.update((s: any) => ({
          ...s,
          maxHealth: CombatStats.maxHp[eid],
          maxMana: CombatStats.maxMp[eid],
          attackSpeed: CombatStats.attackSpeed[eid],
          damageMin: CombatStats.damageMin[eid],
          damageMax: CombatStats.damageMax[eid],
          armor: CombatStats.armor[eid],
          // Keep defaults for stats not yet in ECS
          healthRegen: CombatStats.healthRegen[eid],
      }));
  }
}
