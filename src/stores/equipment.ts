import { writable, derived, type Writable, type Readable } from 'svelte/store';
import type { ItemData } from '../core/components';

/**
 * Equipment slot state
 */
export interface EquipmentSlotState {
  slot: number;
  slotName: string;
  itemData: ItemData | null;
}

/**
 * Equipment store - mirrors ECS equipment state for UI
 */
export const equippedItems: Writable<EquipmentSlotState[]> = writable([]);

/**
 * Update equipment store from ECS
 */
export function updateEquipmentStore(items: EquipmentSlotState[]): void {
  equippedItems.set(items);
}

/**
 * Check if a specific slot has an item
 */
export const hasWeaponEquipped: Readable<boolean> = derived(
  equippedItems,
  ($equipped) => $equipped.some(e => e.slot === 0 && e.itemData !== null)
);

/**
 * Get equipped weapon for display
 */
export const equippedWeapon: Readable<ItemData | null> = derived(
  equippedItems,
  ($equipped) => $equipped.find(e => e.slot === 0)?.itemData ?? null
);

/**
 * Get equipped armor for display
 */
export const equippedArmor: Readable<ItemData | null> = derived(
  equippedItems,
  ($equipped) => $equipped.find(e => e.slot === 3)?.itemData ?? null
);
