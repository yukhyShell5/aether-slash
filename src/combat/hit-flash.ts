import * as THREE from 'three';
import type { EntityId } from 'bitecs';
import type { RenderObjectPool } from '../render/render-system';
import { Renderable } from '../core/components';

/**
 * HitFlash component - Structure of Arrays for BiTECS
 * Tracks entities that should flash white when hit
 */
export const HitFlash = {
  active: new Uint8Array(10000),      // 1 = currently flashing
  timer: new Float32Array(10000),      // Time remaining for flash
  originalColorR: new Float32Array(10000),
  originalColorG: new Float32Array(10000),
  originalColorB: new Float32Array(10000),
};

const FLASH_DURATION = 0.1; // 100ms flash
const FLASH_COLOR = new THREE.Color(0xffffff);

/**
 * Trigger a hit flash on an entity
 */
export function triggerHitFlash(eid: EntityId): void {
  HitFlash.active[eid] = 1;
  HitFlash.timer[eid] = FLASH_DURATION;
}

/**
 * Check if entity has hit flash
 */
export function hasHitFlash(eid: EntityId): boolean {
  return HitFlash.active[eid] === 1;
}

// White material for flash effect
let flashMaterial: THREE.MeshBasicMaterial | null = null;

function getFlashMaterial(): THREE.MeshBasicMaterial {
  if (!flashMaterial) {
    flashMaterial = new THREE.MeshBasicMaterial({
      color: FLASH_COLOR,
    });
  }
  return flashMaterial;
}

// Store original materials to restore them
const originalMaterials = new Map<number, THREE.Material>();

/**
 * Hit flash system - swaps material to white during flash
 */
export function hitFlashSystem(
  entities: Set<EntityId>,
  objectPool: RenderObjectPool,
  deltaTime: number
): void {
  for (const eid of entities) {
    if (HitFlash.active[eid] !== 1) continue;

    const objectIndex = Renderable.objectIndex[eid];
    const mesh = objectPool.get(objectIndex);
    if (!mesh) continue;

    // Start of flash - store original material
    if (HitFlash.timer[eid] === FLASH_DURATION) {
      if (!originalMaterials.has(eid)) {
        originalMaterials.set(eid, mesh.material as THREE.Material);
      }
      mesh.material = getFlashMaterial();
    }

    // Update timer
    HitFlash.timer[eid] -= deltaTime;

    // Flash ended - restore original material
    if (HitFlash.timer[eid] <= 0) {
      HitFlash.active[eid] = 0;
      HitFlash.timer[eid] = 0;

      const original = originalMaterials.get(eid);
      if (original) {
        mesh.material = original;
        originalMaterials.delete(eid);
      }
    }
  }
}

/**
 * Clean up flash state when entity is destroyed
 */
export function cleanupHitFlash(eid: EntityId): void {
  HitFlash.active[eid] = 0;
  HitFlash.timer[eid] = 0;
  originalMaterials.delete(eid);
}
