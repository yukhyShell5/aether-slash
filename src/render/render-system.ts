import * as THREE from 'three';
import type { EntityId } from 'bitecs';
import { Position, Renderable, hasPosition, hasRenderable } from '../core/components';

/**
 * Object pool for reusable Three.js meshes
 * Prevents memory allocation during gameplay
 */
export class RenderObjectPool {
  private objects: Map<number, THREE.Mesh> = new Map();
  private freeIndices: number[] = [];
  private nextIndex = 0;
  private readonly scene: THREE.Scene;
  private readonly defaultGeometry: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    // Shared geometry for batch rendering
    this.defaultGeometry = new THREE.BoxGeometry(1, 1, 1);
  }

  /**
   * Acquire an object from the pool
   */
  acquire(color?: THREE.Color): { index: number; object: THREE.Mesh } {
    let index: number;
    let object: THREE.Mesh;

    if (this.freeIndices.length > 0) {
      index = this.freeIndices.pop()!;
      object = this.objects.get(index)!;
      object.visible = true;
      // Update material color
      if (color && object.material instanceof THREE.MeshStandardMaterial) {
        object.material.color.copy(color);
      }
    } else {
      index = this.nextIndex++;
      const material = new THREE.MeshStandardMaterial({
        color: color || 0x00ff88,
        roughness: 0.7,
        metalness: 0.3,
      });
      object = new THREE.Mesh(this.defaultGeometry, material);
      this.objects.set(index, object);
      this.scene.add(object);
    }

    return { index, object };
  }

  /**
   * Release an object back to the pool
   */
  release(index: number): void {
    const object = this.objects.get(index);
    if (object) {
      object.visible = false;
      this.freeIndices.push(index);
    }
  }

  /**
   * Get an object by index
   */
  get(index: number): THREE.Mesh | undefined {
    return this.objects.get(index);
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.defaultGeometry.dispose();
    
    for (const object of this.objects.values()) {
      if (object.material instanceof THREE.Material) {
        object.material.dispose();
      }
      this.scene.remove(object);
    }
    
    this.objects.clear();
    this.freeIndices = [];
  }
}

/**
 * Render system that syncs ECS positions with Three.js objects
 */
export function createRenderSystem(pool: RenderObjectPool) {
  const initialized = new Set<EntityId>();
  const tempColor = new THREE.Color();

  return function renderSystem(entities: Set<EntityId>): void {
    for (const eid of entities) {
      if (!hasPosition(eid) || !hasRenderable(eid)) continue;

      // Initialize new entities
      if (!initialized.has(eid)) {
        // Get color from component
        tempColor.setRGB(
          Renderable.colorR[eid] || 0,
          Renderable.colorG[eid] || 1,
          Renderable.colorB[eid] || 0.5
        );
        
        const { index, object } = pool.acquire(tempColor);
        Renderable.objectIndex[eid] = index;
        initialized.add(eid);
        
        // Set initial position
        object.position.set(
          Position.x[eid],
          Position.y[eid] + 0.5, // Offset to sit on ground
          Position.z[eid]
        );
      }

      // Update positions for all renderable entities
      const object = pool.get(Renderable.objectIndex[eid]);
      if (object) {
        object.position.set(
          Position.x[eid],
          Position.y[eid] + 0.5,
          Position.z[eid]
        );
      }
    }
  };
}
