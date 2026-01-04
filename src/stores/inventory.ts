import { writable, type Writable } from 'svelte/store';
import type { ItemData } from '../core/components';

/**
 * Inventory slot interface
 */
export interface InventorySlot {
  itemEid: number | null;  // Entity ID of the item
  itemData: ItemData | null;
  quantity: number;
}

const INVENTORY_SIZE = 20;

/**
 * Create initial empty inventory
 */
function createEmptyInventory(): InventorySlot[] {
  return Array(INVENTORY_SIZE).fill(null).map(() => ({
    itemEid: null,
    itemData: null,
    quantity: 0,
  }));
}

/**
 * Inventory store
 */
export const inventorySlots: Writable<InventorySlot[]> = writable(createEmptyInventory());

/**
 * Find first empty slot
 */
export function findEmptySlot(slots: InventorySlot[]): number {
  return slots.findIndex(slot => slot.itemEid === null);
}

/**
 * Add item to inventory
 * @returns slot index if successful, -1 if inventory full
 */
export function addItemToInventory(itemEid: number, itemData: ItemData): number {
  let slotIndex = -1;
  
  inventorySlots.update(slots => {
    const emptyIndex = findEmptySlot(slots);
    if (emptyIndex === -1) return slots; // Inventory full
    
    slots[emptyIndex] = {
      itemEid,
      itemData,
      quantity: 1,
    };
    slotIndex = emptyIndex;
    return [...slots]; // Trigger reactivity
  });
  
  return slotIndex;
}

/**
 * Remove item from inventory
 */
export function removeItemFromInventory(slotIndex: number): InventorySlot | null {
  let removed: InventorySlot | null = null;
  
  inventorySlots.update(slots => {
    if (slotIndex < 0 || slotIndex >= slots.length) return slots;
    
    removed = slots[slotIndex];
    slots[slotIndex] = {
      itemEid: null,
      itemData: null,
      quantity: 0,
    };
    return [...slots];
  });
  
  return removed;
}

/**
 * Clear inventory
 */
export function clearInventory(): void {
  inventorySlots.set(createEmptyInventory());
}

/**
 * Check if inventory is full
 */
export function isInventoryFull(): boolean {
  let full = true;
  inventorySlots.subscribe(slots => {
    full = findEmptySlot(slots) === -1;
  })();
  return full;
}
