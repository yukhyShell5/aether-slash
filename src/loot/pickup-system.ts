import type { EntityId } from 'bitecs';
import { Position, ItemDataStore, hasItemDrop, clearEntityComponents } from '../core/components';
import { getGameWorld } from '../core/world';
import { addItemToInventory } from '../stores/inventory';

// Pickup range in world units
const PICKUP_RANGE = 1.5;

/**
 * Calculate distance between two positions
 */
function distanceBetween(x1: number, z1: number, x2: number, z2: number): number {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Check if player is close enough to pick up an item
 */
export function canPickup(playerEid: EntityId, itemEid: EntityId): boolean {
  if (!hasItemDrop(itemEid)) return false;
  
  const px = Position.x[playerEid];
  const pz = Position.z[playerEid];
  const ix = Position.x[itemEid];
  const iz = Position.z[itemEid];
  
  return distanceBetween(px, pz, ix, iz) <= PICKUP_RANGE;
}

/**
 * Pick up an item and add to inventory
 * @returns true if pickup successful
 */
export function pickupItem(
  playerEid: EntityId, 
  itemEid: EntityId,
  onPickup?: (itemEid: EntityId) => void
): boolean {
  if (!canPickup(playerEid, itemEid)) {
    console.log('📦 Too far to pick up');
    return false;
  }
  
  const itemData = ItemDataStore.get(itemEid);
  if (!itemData) {
    console.warn('⚠️ Item has no data');
    return false;
  }
  
  const slotIndex = addItemToInventory(itemEid, itemData);
  
  if (slotIndex === -1) {
    console.log('📦 Inventory full!');
    return false;
  }
  
  console.log(`📦 Picked up: ${itemData.name} (slot ${slotIndex})`);
  
  // Callback for cleanup
  if (onPickup) {
    onPickup(itemEid);
  }
  
  return true;
}

/**
 * Try to pick up all nearby items
 */
export function pickupNearbyItems(
  playerEid: EntityId,
  entities: Set<EntityId>,
  onPickup?: (itemEid: EntityId) => void
): number {
  let pickedUp = 0;
  
  for (const eid of entities) {
    if (!hasItemDrop(eid)) continue;
    
    if (pickupItem(playerEid, eid, onPickup)) {
      pickedUp++;
    }
  }
  
  return pickedUp;
}

/**
 * Create a pickup system that checks for click on items
 */
export function createPickupSystem(
  playerEid: EntityId,
  onPickupEntity: (itemEid: EntityId) => void
) {
  return function tryPickupAt(
    clickX: number, 
    clickZ: number, 
    entities: Set<EntityId>
  ): boolean {
    const gameWorld = getGameWorld();
    
    // Find closest item to click position
    let closestEid: EntityId | null = null;
    let closestDist = Infinity;
    
    for (const eid of entities) {
      if (!hasItemDrop(eid)) continue;
      
      const ix = Position.x[eid];
      const iz = Position.z[eid];
      const dist = distanceBetween(clickX, clickZ, ix, iz);
      
      if (dist < 1.0 && dist < closestDist) {
        closestDist = dist;
        closestEid = eid;
      }
    }
    
    if (closestEid === null) return false;
    
    // Check if player is in range
    if (canPickup(playerEid, closestEid)) {
      if (pickupItem(playerEid, closestEid, onPickupEntity)) {
        // Remove entity from world
        clearEntityComponents(closestEid);
        gameWorld.destroyEntity(closestEid);
        return true;
      }
    } else {
      console.log('📦 Move closer to pick up');
    }
    
    return false;
  };
}
