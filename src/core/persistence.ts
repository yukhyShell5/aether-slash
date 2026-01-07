
import { createClient } from '@supabase/supabase-js';
import { get } from 'svelte/store';
import { inventorySlots, addItemToInventory, clearInventory } from '../stores/inventory';
import {
  Progression,
  getProgressionState,
  addProgressionComponent,
  restoreLevelStats,
  syncXPToStore,
} from './progression';
import { CombatStats, Position, type ItemData } from './components';
import { getGameWorld } from './world';

// Default to local Supabase if env vars are missing (for dev)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321';
// Updated key from 'supabase status' output
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'; 

import { 
    ItemDataStore, 
    setEquippedItem, 
    initEquipmentSlots 
} from './components';

import { recalculateStats, syncStatsToStore } from './stat-calculator';
import { getEquippedItems, triggerStatRecalc } from './equipment-system';
import { talents } from '../stores/talents';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export interface SavedCharacterData {
  stats: {
    level: number;
    xp: number;
    talentPoints: number;
    statPoints: number;
    currentHp: number;
  };
  position: { x: number; y: number; z: number };
  inventory: Array<{ slot: number; quantity: number; itemData: ItemData }>;
  equipment: Array<{ slot: number; itemData: ItemData }>;
  talents: Array<{ id: string; rank: number }>;
}

export async function saveCharacter(eid: number, userId: string = 'dummy-user') {
  if (!eid) return;

  const progression = getProgressionState(eid);
  const inv = get(inventorySlots);
  const currentTalents = get(talents);
  
  const savedInventory = inv
    .map((slot, index) => ({ slot: index, ...slot }))
    .filter(s => s.itemEid !== null && s.itemData)
    .map(s => ({
      slot: s.slot,
      quantity: s.quantity,
      itemData: s.itemData!
    }));

  const savedEquipment = getEquippedItems(eid)
    .filter(e => e.itemData !== null)
    .map(e => ({
      slot: e.slot,
      itemData: e.itemData!
    }));

  const savedTalents = currentTalents
    .filter(t => t.currentRank > 0)
    .map(t => ({
      id: t.id,
      rank: t.currentRank
    }));

  const data: SavedCharacterData = {
    stats: {
      level: progression.level,
      xp: progression.xp,
      talentPoints: progression.talentPoints,
      statPoints: progression.statPoints,
      currentHp: CombatStats.hp[eid]
    },
    position: {
      x: Position.x[eid],
      y: Position.y[eid],
      z: Position.z[eid]
    },
    inventory: savedInventory,
    equipment: savedEquipment,
    talents: savedTalents
  };

  // Validation before saving
  if (!validateCharacterStats(data)) {
    console.error('Validation failed: Stats do not match level/equipment');
    return;
  }

  const { error } = await supabase
    .from('characters')
    .upsert({ 
        user_id: userId,
        data 
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error saving character:', error);
    throw error;
  } else {
    console.log('Character saved successfully');
  }
}

export async function loadCharacter(eid: number, userId: string = 'dummy-user'): Promise<boolean> {
  const { data, error } = await supabase
    .from('characters')
    .select('data')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.log('No character found or error loading:', error);
    return false;
  }

  const charData = data.data as SavedCharacterData;
  const world = getGameWorld();
  
  // Restore State
  
  // 1. Progression
  addProgressionComponent(eid, charData.stats.level);
  restoreLevelStats(eid, charData.stats.level);
  Progression.xp[eid] = charData.stats.xp;
  Progression.talentPoints[eid] = charData.stats.talentPoints;
  Progression.statPoints[eid] = charData.stats.statPoints;

  // 2. Talents
  if (charData.talents) {
      talents.update(nodes => {
          return nodes.map(node => {
              const saved = charData.talents.find(t => t.id === node.id);
              if (saved) {
                  return { ...node, currentRank: saved.rank };
              }
              return { ...node, currentRank: 0 };
          });
      });
  }

  // 3. Position
  Position.x[eid] = charData.position.x;
  Position.y[eid] = charData.position.y;
  Position.z[eid] = charData.position.z;

  // 4. Inventory
  clearInventory();
  for (const item of charData.inventory) {
    const itemEid = world.createEntity();
    addItemToInventory(itemEid, item.itemData);
  }

  // 5. Equipment
  initEquipmentSlots(eid);
  if (charData.equipment) {
      for (const item of charData.equipment) {
          const itemEid = world.createEntity();
          ItemDataStore.set(itemEid, item.itemData);
          setEquippedItem(eid, item.slot, itemEid);
      }
  }

  // 6. Stats Recalculation
  // Recalculate everything based on Level + Equipment + Talents
  recalculateStats(eid);
  triggerStatRecalc(eid);
  
  // 7. Restore Current HP (Clamped)
  CombatStats.hp[eid] = Math.min(charData.stats.currentHp, CombatStats.maxHp[eid]);
  
  // 8. Sync UI Stores
  syncXPToStore(eid);
  syncStatsToStore(eid);

  console.log('Character loaded successfully');
  return true;
}

/**
 * Validates that character stats are consistent with their level and equipment.
 * This simulates a server-side check.
 */
export function validateCharacterStats(data: SavedCharacterData): boolean {
  // Simplified Validation: 
  // Check if Level is valid (> 0)
  // Check if Stat Points match Level (approx)
  // In a full implementation, we'd recalculate MaxHP = Base + (Level * 20) + Gear
  // And verify data.stats.currentHp <= calculatedMaxHp
  
  if (data.stats.level < 1) return false;

  const expectedStatPoints = (data.stats.level - 1) * 3; // From progression.ts
  // const usedStatPoints = 0; // Unused variable removed
  
  // Simple check: Available points should not exceed max possible
  if (data.stats.statPoints > expectedStatPoints) {
      console.warn(`Validation Error: Too many stat points. Level ${data.stats.level} allows ${expectedStatPoints}, found ${data.stats.statPoints}`);
      return false;
  }

  // Check HP Cap
  // Base HP = 100, +20 per level
  const baseMaxHp = 100 + (data.stats.level - 1) * 20;
  // We'd add gear HP here if we had the gear data in the save
  const maxAllowedHp = baseMaxHp + 1000; // Tolerance for gear not checked here
  
  if (data.stats.currentHp > maxAllowedHp) {
      console.warn(`Validation Error: HP ${data.stats.currentHp} exceeds reasonable max ${maxAllowedHp}`);
      return false;
  }

  return true;
}
