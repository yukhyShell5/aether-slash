import * as THREE from 'three';
import type { EntityId } from 'bitecs';
import { MoveTarget } from '../core/components';

/**
 * Click-to-move controller using Three.js Raycaster
 */
export class ClickToMoveController {
  private readonly raycaster: THREE.Raycaster;
  private readonly mouse: THREE.Vector2;
  private readonly camera: THREE.Camera;
  private readonly groundPlane: THREE.Object3D;
  private playerEntity: EntityId | null = null;
  private readonly canvas: HTMLElement;

  constructor(camera: THREE.Camera, scene: THREE.Scene, canvas: HTMLElement) {
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.camera = camera;
    this.canvas = canvas;

    // Find ground plane for raycasting
    const ground = scene.getObjectByName('ground');
    if (!ground) {
      throw new Error('Ground plane not found in scene');
    }
    this.groundPlane = ground;

    // Bind event handlers
    this.canvas.addEventListener('click', this.handleClick);
    this.canvas.addEventListener('contextmenu', this.handleRightClick);
  }

  /**
   * Set the player entity to control
   */
  setPlayer(entityId: EntityId): void {
    this.playerEntity = entityId;
  }

  private handleClick = (event: MouseEvent): void => {
    if (this.playerEntity === null) return;

    const rect = this.canvas.getBoundingClientRect();
    
    // Convert mouse position to normalized device coordinates
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // Raycast to ground
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObject(this.groundPlane);

    if (intersects.length > 0) {
      const point = intersects[0].point;
      
      // Set move target on player entity
      MoveTarget.x[this.playerEntity] = point.x;
      MoveTarget.y[this.playerEntity] = 0; // Keep on ground
      MoveTarget.z[this.playerEntity] = point.z;
      MoveTarget.active[this.playerEntity] = 1;
    }
  };

  private handleRightClick = (event: MouseEvent): void => {
    event.preventDefault();
    // Could be used for abilities or attack-move
  };

  /**
   * Get the last clicked world position (for visual feedback)
   */
  getLastClickPosition(): THREE.Vector3 | null {
    if (this.playerEntity === null) return null;
    
    if (MoveTarget.active[this.playerEntity] === 0) return null;
    
    return new THREE.Vector3(
      MoveTarget.x[this.playerEntity],
      MoveTarget.y[this.playerEntity],
      MoveTarget.z[this.playerEntity]
    );
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    this.canvas.removeEventListener('click', this.handleClick);
    this.canvas.removeEventListener('contextmenu', this.handleRightClick);
  }
}
