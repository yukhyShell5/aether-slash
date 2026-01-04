import * as THREE from 'three';
import type { EntityId } from 'bitecs';
import { 
  Position, 
  CombatStats,
  hasPosition, 
  hasCombatStats,
  hasMonster,
  hasCombatState,
  CombatState,
  CombatStateEnum,
} from '../core/components';

/**
 * Health bar data per entity
 */
interface HealthBarData {
  container: THREE.Group;
  background: THREE.Mesh;
  fill: THREE.Mesh;
  lastHpPercent: number;
}

// Shared geometries
let backgroundGeometry: THREE.PlaneGeometry | null = null;
let fillGeometry: THREE.PlaneGeometry | null = null;

const BAR_WIDTH = 1.2;
const BAR_HEIGHT = 0.12;
const BAR_Y_OFFSET = 1.3;

/**
 * Health bar renderer using 3D meshes
 */
export class HealthBarPool {
  private healthBars: Map<EntityId, HealthBarData> = new Map();
  private readonly scene: THREE.Scene;
  
  // Materials
  private backgroundMaterial: THREE.MeshBasicMaterial;
  private greenMaterial: THREE.MeshBasicMaterial;
  private yellowMaterial: THREE.MeshBasicMaterial;
  private redMaterial: THREE.MeshBasicMaterial;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Initialize shared geometries
    if (!backgroundGeometry) {
      backgroundGeometry = new THREE.PlaneGeometry(BAR_WIDTH, BAR_HEIGHT);
      fillGeometry = new THREE.PlaneGeometry(1, BAR_HEIGHT); // Width will be scaled
    }
    
    // Create materials
    this.backgroundMaterial = new THREE.MeshBasicMaterial({
      color: 0x222222,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
    });
    
    this.greenMaterial = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    
    this.yellowMaterial = new THREE.MeshBasicMaterial({
      color: 0xeab308,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
    
    this.redMaterial = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
    });
  }

  /**
   * Get material based on HP percentage
   */
  private getMaterial(percent: number): THREE.MeshBasicMaterial {
    if (percent > 0.6) return this.greenMaterial;
    if (percent > 0.3) return this.yellowMaterial;
    return this.redMaterial;
  }

  /**
   * Create health bar for an entity
   */
  private createHealthBar(eid: EntityId): HealthBarData {
    const container = new THREE.Group();
    container.renderOrder = 999; // Render on top
    
    // Background bar (dark, shows max health)
    const background = new THREE.Mesh(backgroundGeometry!, this.backgroundMaterial);
    background.renderOrder = 999;
    container.add(background);
    
    // Health fill bar
    const fill = new THREE.Mesh(fillGeometry!, this.greenMaterial.clone());
    fill.renderOrder = 1000;
    fill.scale.x = BAR_WIDTH - 0.04; // Slightly smaller than background
    fill.position.z = 0.01; // Slightly in front
    container.add(fill);
    
    // Make bars always face camera
    container.lookAt(0, 100, 0); // Will be updated each frame
    
    this.scene.add(container);
    
    const data: HealthBarData = {
      container,
      background,
      fill,
      lastHpPercent: 1,
    };
    
    this.healthBars.set(eid, data);
    return data;
  }

  /**
   * Update health bar for an entity
   */
  updateHealthBar(eid: EntityId, camera: THREE.Camera): void {
    if (!hasCombatStats(eid) || !hasPosition(eid)) return;
    
    // Don't show health bars for dead entities
    if (hasCombatState(eid) && CombatState.state[eid] === CombatStateEnum.DEAD) {
      this.removeHealthBar(eid);
      return;
    }
    
    const hp = CombatStats.hp[eid];
    const maxHp = CombatStats.maxHp[eid];
    const hpPercent = Math.max(0, Math.min(1, hp / maxHp));
    
    // Get or create health bar
    let data = this.healthBars.get(eid);
    if (!data) {
      data = this.createHealthBar(eid);
    }
    
    // Update fill width based on HP
    const fillWidth = (BAR_WIDTH - 0.04) * hpPercent;
    data.fill.scale.x = Math.max(0.01, fillWidth); // Minimum size to avoid disappearing
    
    // Offset fill to left-align it
    data.fill.position.x = -(BAR_WIDTH - 0.04) / 2 + fillWidth / 2;
    
    // Update color if changed
    if (Math.abs(data.lastHpPercent - hpPercent) > 0.01) {
      const material = this.getMaterial(hpPercent);
      (data.fill.material as THREE.MeshBasicMaterial).color.copy(material.color);
      data.lastHpPercent = hpPercent;
    }
    
    // Position above entity
    data.container.position.set(
      Position.x[eid],
      Position.y[eid] + BAR_Y_OFFSET,
      Position.z[eid]
    );
    
    // Billboard: always face the camera
    data.container.lookAt(camera.position);
  }

  /**
   * Remove a health bar
   */
  removeHealthBar(eid: EntityId): void {
    const data = this.healthBars.get(eid);
    if (data) {
      this.scene.remove(data.container);
      // Dispose cloned fill material
      (data.fill.material as THREE.Material).dispose();
      this.healthBars.delete(eid);
    }
  }

  /**
   * Dispose all health bars
   */
  dispose(): void {
    for (const eid of this.healthBars.keys()) {
      this.removeHealthBar(eid);
    }
    
    this.backgroundMaterial.dispose();
    this.greenMaterial.dispose();
    this.yellowMaterial.dispose();
    this.redMaterial.dispose();
    
    if (backgroundGeometry) {
      backgroundGeometry.dispose();
      backgroundGeometry = null;
    }
    if (fillGeometry) {
      fillGeometry.dispose();
      fillGeometry = null;
    }
  }
}

/**
 * Create health bar render system for monsters
 */
export function createHealthBarSystem(pool: HealthBarPool, camera: THREE.Camera) {
  return function healthBarSystem(entities: Set<EntityId>): void {
    for (const eid of entities) {
      // Only show health bars for monsters
      if (!hasMonster(eid)) continue;
      
      pool.updateHealthBar(eid, camera);
    }
  };
}
