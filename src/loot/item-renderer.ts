import * as THREE from 'three';
import type { EntityId } from 'bitecs';
import { 
  Position, 
  ItemDataStore,
  hasPosition, 
  hasItemDrop,
  RarityEnum,
} from '../core/components';
import { getRarityColor } from './loot-system';

// Rarity to geometry/material mapping
const rarityGeometries = new Map<number, THREE.BufferGeometry>();
const rarityMaterials = new Map<number, THREE.Material>();

/**
 * Initialize item drop geometries and materials
 */
export function initItemRenderer(): void {
  // Create different sized geometries for rarity
  rarityGeometries.set(RarityEnum.COMMON, new THREE.SphereGeometry(0.2, 8, 8));
  rarityGeometries.set(RarityEnum.MAGIC, new THREE.SphereGeometry(0.25, 12, 12));
  rarityGeometries.set(RarityEnum.RARE, new THREE.OctahedronGeometry(0.3, 0));
  rarityGeometries.set(RarityEnum.LEGENDARY, new THREE.OctahedronGeometry(0.35, 1));
  
  // Create materials with emissive glow
  for (const [rarity, colorHex] of Object.entries({
    [RarityEnum.COMMON]: '#9d9d9d',
    [RarityEnum.MAGIC]: '#4169e1',
    [RarityEnum.RARE]: '#ffd700',
    [RarityEnum.LEGENDARY]: '#ff8c00',
  })) {
    const color = new THREE.Color(colorHex);
    rarityMaterials.set(Number(rarity), new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.8,
    }));
  }
}

/**
 * Object pool for item drop meshes
 */
export class ItemDropPool {
  private meshes: Map<EntityId, THREE.Mesh> = new Map();
  private labels: Map<EntityId, THREE.Sprite> = new Map();
  private readonly scene: THREE.Scene;
  private labelCanvas: HTMLCanvasElement;
  private labelContext: CanvasRenderingContext2D;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.labelCanvas = document.createElement('canvas');
    this.labelCanvas.width = 256;
    this.labelCanvas.height = 64;
    this.labelContext = this.labelCanvas.getContext('2d')!;
  }
  
  /**
   * Create item drop visual
   */
  createItemDrop(eid: EntityId): THREE.Mesh | null {
    const itemData = ItemDataStore.get(eid);
    if (!itemData) return null;
    
    const geometry = rarityGeometries.get(itemData.rarity) || rarityGeometries.get(RarityEnum.COMMON)!;
    const material = (rarityMaterials.get(itemData.rarity) || rarityMaterials.get(RarityEnum.COMMON)!)
      .clone(); // Clone to allow per-item modifications
    
    const mesh = new THREE.Mesh(geometry, material);
    
    if (hasPosition(eid)) {
      mesh.position.set(Position.x[eid], Position.y[eid], Position.z[eid]);
    }
    
    this.scene.add(mesh);
    this.meshes.set(eid, mesh);
    
    // Create text label
    const label = this.createLabel(itemData.name, getRarityColor(itemData.rarity));
    if (hasPosition(eid)) {
      label.position.set(Position.x[eid], Position.y[eid] + 0.8, Position.z[eid]);
    }
    this.scene.add(label);
    this.labels.set(eid, label);
    
    return mesh;
  }
  
  /**
   * Create text label sprite
   */
  private createLabel(text: string, color: string): THREE.Sprite {
    // Clear canvas
    this.labelContext.clearRect(0, 0, this.labelCanvas.width, this.labelCanvas.height);
    
    // Draw text
    this.labelContext.font = 'bold 20px Arial';
    this.labelContext.textAlign = 'center';
    this.labelContext.textBaseline = 'middle';
    
    // Background
    this.labelContext.fillStyle = 'rgba(0, 0, 0, 0.7)';
    const textWidth = this.labelContext.measureText(text).width + 10;
    this.labelContext.fillRect(
      (this.labelCanvas.width - textWidth) / 2, 
      10, 
      textWidth, 
      this.labelCanvas.height - 20
    );
    
    // Text
    this.labelContext.fillStyle = color;
    this.labelContext.fillText(text, this.labelCanvas.width / 2, this.labelCanvas.height / 2);
    
    // Create texture
    const texture = new THREE.CanvasTexture(this.labelCanvas);
    texture.needsUpdate = true;
    
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });
    
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(2, 0.5, 1);
    
    return sprite;
  }
  
  /**
   * Update item drop position
   */
  updatePosition(eid: EntityId): void {
    if (!hasPosition(eid)) return;
    
    const mesh = this.meshes.get(eid);
    if (mesh) {
      mesh.position.set(Position.x[eid], Position.y[eid], Position.z[eid]);
      
      // Bobbing animation
      mesh.position.y += Math.sin(Date.now() * 0.003 + eid) * 0.1;
      mesh.rotation.y += 0.02;
    }
    
    const label = this.labels.get(eid);
    if (label) {
      label.position.set(Position.x[eid], Position.y[eid] + 0.8, Position.z[eid]);
      label.position.y += Math.sin(Date.now() * 0.003 + eid) * 0.1;
    }
  }
  
  /**
   * Remove item drop
   */
  removeItemDrop(eid: EntityId): void {
    const mesh = this.meshes.get(eid);
    if (mesh) {
      this.scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
      this.meshes.delete(eid);
    }
    
    const label = this.labels.get(eid);
    if (label) {
      this.scene.remove(label);
      (label.material as THREE.SpriteMaterial).map?.dispose();
      (label.material as THREE.Material).dispose();
      this.labels.delete(eid);
    }
  }
  
  /**
   * Clean up all resources
   */
  dispose(): void {
    for (const eid of this.meshes.keys()) {
      this.removeItemDrop(eid);
    }
    
    // Dispose shared geometries and materials
    for (const geo of rarityGeometries.values()) {
      geo.dispose();
    }
    for (const mat of rarityMaterials.values()) {
      mat.dispose();
    }
    rarityGeometries.clear();
    rarityMaterials.clear();
  }
}

/**
 * Create item drop render system
 */
export function createItemDropRenderSystem(pool: ItemDropPool) {
  const initialized = new Set<EntityId>();
  
  return function itemDropRenderSystem(entities: Set<EntityId>): void {
    for (const eid of entities) {
      if (!hasItemDrop(eid)) continue;
      
      // Initialize new drops
      if (!initialized.has(eid)) {
        pool.createItemDrop(eid);
        initialized.add(eid);
      }
      
      // Update position (for bobbing animation)
      pool.updatePosition(eid);
    }
  };
}
