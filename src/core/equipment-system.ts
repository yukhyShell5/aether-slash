/**
 * Equipment System - Equip/Unequip items between inventory and equipment slots
 */
import type { EntityId } from 'bitecs';
import type { ItemData } from './components';
import {
  EquipmentSlot,
  EQUIPMENT_SLOT_COUNT,
  getEquippedItem,
  setEquippedItem,
  clearEquippedItem,
  ItemDataStore,
} from './components';
import {
  inventorySlots,
  removeItemFromInventory,
  addItemToInventory,
} from '../stores/inventory';
import { calculateFinalStats, applyFinalStats } from './stat-calculator';
import { get } from 'svelte/store';

// Equipment change callback for stat recalculation
type EquipmentChangeCallback = (playerEid: EntityId) => void;
let onEquipmentChange: EquipmentChangeCallback | null = null;

/**
 * Register callback for equipment changes
 */
export function onEquipmentChanged(callback: EquipmentChangeCallback): void {
  onEquipmentChange = callback;
}

/**
 * Map base item types to equipment slots
 */
const itemTypeToSlot: Record<string, number> = {
  // Weapons
  'iron_sword': EquipmentSlot.MAINHAND,
  'steel_sword': EquipmentSlot.MAINHAND,
  'crystal_blade': EquipmentSlot.MAINHAND,
  'shadow_dagger': EquipmentSlot.MAINHAND,
  'flame_axe': EquipmentSlot.MAINHAND,
  
  // Armor
  'leather_armor': EquipmentSlot.CHEST,
  'chain_mail': EquipmentSlot.CHEST,
  'plate_armor': EquipmentSlot.CHEST,
  'robe_wisdom': EquipmentSlot.CHEST,
  'dragon_scale': EquipmentSlot.CHEST,
  
  // Helmets
  'iron_helm': EquipmentSlot.HEAD,
  'crown_kings': EquipmentSlot.HEAD,
  
  // Rings
  'gold_ring': EquipmentSlot.RING1,
  'ruby_ring': EquipmentSlot.RING1,
  
  // Amulets
  'silver_amulet': EquipmentSlot.AMULET,
};

/**
 * Get the equipment slot for an item
 */
export function getSlotForItem(baseItemId: string): number | null {
  return itemTypeToSlot[baseItemId] ?? null;
}

/**
 * Get slot name for display
 */
export function getSlotName(slot: number): string {
  const names: Record<number, string> = {
    [EquipmentSlot.MAINHAND]: 'Arme',
    [EquipmentSlot.OFFHAND]: 'Bouclier',
    [EquipmentSlot.HEAD]: 'Casque',
    [EquipmentSlot.CHEST]: 'Armure',
    [EquipmentSlot.LEGS]: 'Jambières',
    [EquipmentSlot.FEET]: 'Bottes',
    [EquipmentSlot.RING1]: 'Anneau 1',
    [EquipmentSlot.RING2]: 'Anneau 2',
    [EquipmentSlot.AMULET]: 'Amulette',
  };
  return names[slot] ?? 'Slot';
}

/**
 * Trigger stat recalculation after equipment change
 */
function triggerStatRecalc(playerEid: EntityId): void {
  // Recalculate and apply stats
  const finalStats = calculateFinalStats(playerEid);
  applyFinalStats(playerEid, finalStats);
  
  // Notify callback
  if (onEquipmentChange) {
    onEquipmentChange(playerEid);
  }
  
  console.log('📊 Stats recalculated after equipment change');
}

/**
 * Equip an item from inventory to equipment slot
 * @returns true if successful
 */
export function equipItem(
  playerEid: EntityId,
  inventorySlotIndex: number,
  equipSlot?: number
): boolean {
  const slots = get(inventorySlots);
  const invSlot = slots[inventorySlotIndex];
  
  if (!invSlot || !invSlot.itemData || invSlot.itemEid === null) {
    console.log('❌ No item in inventory slot');
    return false;
  }
  
  const itemData = invSlot.itemData;
  const itemEid = invSlot.itemEid;
  
  // Determine target equipment slot
  const targetSlot = equipSlot ?? getSlotForItem(itemData.baseItemId);
  if (targetSlot === null) {
    console.log('❌ Item cannot be equipped');
    return false;
  }
  
  // Check if slot already has an item
  const currentEquipped = getEquippedItem(playerEid, targetSlot);
  
  if (currentEquipped !== -1) {
    // Swap: unequip current item first
    const currentItemData = ItemDataStore.get(currentEquipped);
    if (currentItemData) {
      // Add currently equipped item back to inventory
      const addedSlot = addItemToInventory(currentEquipped, currentItemData);
      if (addedSlot === -1) {
        console.log('❌ Inventory full, cannot swap');
        return false;
      }
    }
  }
  
  // Remove item from inventory
  removeItemFromInventory(inventorySlotIndex);
  
  // Equip the new item
  setEquippedItem(playerEid, targetSlot, itemEid);
  
  // Store item data in ItemDataStore
  ItemDataStore.set(itemEid, itemData);
  
  console.log(`🛡️ Equipped: ${itemData.name} → ${getSlotName(targetSlot)}`);
  
  // Recalculate stats
  triggerStatRecalc(playerEid);
  
  return true;
}

/**
 * Unequip an item to inventory
 * @returns true if successful
 */
export function unequipItem(
  playerEid: EntityId,
  equipSlot: number
): boolean {
  const equippedEid = getEquippedItem(playerEid, equipSlot);
  
  if (equippedEid === -1) {
    console.log('❌ No item in equipment slot');
    return false;
  }
  
  const itemData = ItemDataStore.get(equippedEid);
  if (!itemData) {
    console.log('❌ Item data not found');
    return false;
  }
  
  // Add to inventory
  const invSlot = addItemToInventory(equippedEid, itemData);
  if (invSlot === -1) {
    console.log('❌ Inventory full');
    return false;
  }
  
  // Clear equipment slot
  clearEquippedItem(playerEid, equipSlot);
  
  console.log(`📦 Unequipped: ${itemData.name} → Inventory`);
  
  // Recalculate stats
  triggerStatRecalc(playerEid);
  
  return true;
}

/**
 * Get all equipped items for display
 */
export function getEquippedItems(playerEid: EntityId): Array<{
  slot: number;
  slotName: string;
  itemData: ItemData | null;
}> {
  const equipped: Array<{ slot: number; slotName: string; itemData: ItemData | null }> = [];
  
  for (let slot = 0; slot < EQUIPMENT_SLOT_COUNT; slot++) {
    const itemEid = getEquippedItem(playerEid, slot);
    const itemData = itemEid !== -1 ? ItemDataStore.get(itemEid) ?? null : null;
    
    equipped.push({
      slot,
      slotName: getSlotName(slot),
      itemData,
    });
  }
  
  return equipped;
}

/**
 * Check if player has an item equipped in slot
 */
export function hasItemEquipped(playerEid: EntityId, slot: number): boolean {
  return getEquippedItem(playerEid, slot) !== -1;
}
