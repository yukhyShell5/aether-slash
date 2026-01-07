
import * as THREE from 'three';
import { type DungeonData, TileType } from '../core/dungeon-generator';

export class DungeonRenderer {
  private scene: THREE.Scene;
  private floorMesh: THREE.InstancedMesh | null = null;
  private wallMesh: THREE.InstancedMesh | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  generateMesh(dungeon: DungeonData) {
    this.dispose();

    const floorGeometry = new THREE.BoxGeometry(1, 0.2, 1);
    const wallGeometry = new THREE.BoxGeometry(1, 2, 1);

    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.5 });

    let floorCount = 0;
    let wallCount = 0;

    // Count tiles
    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        if (dungeon.tiles[y][x] === TileType.FLOOR) {
          floorCount++;
        } else if (dungeon.tiles[y][x] === TileType.WALL) {
          if (this.hasAdjacentFloor(dungeon, x, y)) {
            wallCount++;
          }
        }
      }
    }

    this.floorMesh = new THREE.InstancedMesh(floorGeometry, floorMaterial, floorCount);
    this.wallMesh = new THREE.InstancedMesh(wallGeometry, wallMaterial, wallCount);
    
    // Enable shadows
    this.floorMesh.receiveShadow = true;
    this.wallMesh.receiveShadow = true;
    this.wallMesh.castShadow = true;

    let floorIdx = 0;
    let wallIdx = 0;
    const dummy = new THREE.Object3D();

    for (let y = 0; y < dungeon.height; y++) {
      for (let x = 0; x < dungeon.width; x++) {
        const type = dungeon.tiles[y][x];
        
        // Centered coordinates: x - width/2, y - height/2
        const posX = x - dungeon.width / 2;
        const posZ = y - dungeon.height / 2;

        if (type === TileType.FLOOR) {
          dummy.position.set(posX, -0.1, posZ);
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          this.floorMesh.setMatrixAt(floorIdx++, dummy.matrix);
        } else if (type === TileType.WALL) {
            // Only render walls if they are adjacent to a floor? 
            // For now render all walls in the grid to be safe, or maybe just non-void ones.
            // The generator initializes everything as WALL, so that's a lot of walls.
            // Optimization: Only render walls that touch a floor.
            if (this.hasAdjacentFloor(dungeon, x, y)) {
                dummy.position.set(posX, 1, posZ);
                dummy.scale.set(1, 1, 1);
                dummy.updateMatrix();
                // We might exceed the count if we counted all walls but only render some.
                // However, we counted exactly the types. 
                // Wait, if we optimize here we must optimize the count too.
                // For safety in this iteration, I will skip the optimization check in the count 
                // but implementation-wise I should be careful. 
                // Actually, let's just render all walls for now to ensure we don't have holes in the view 
                // if the camera sees outside. Or simple optimization: only if not surrounded by walls.
                this.wallMesh.setMatrixAt(wallIdx++, dummy.matrix);
            }
        }
      }
    }

    this.scene.add(this.floorMesh);
    this.scene.add(this.wallMesh);
  }

  private hasAdjacentFloor(dungeon: DungeonData, x: number, y: number): boolean {
      const directions = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [dx, dy] of directions) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < dungeon.width && ny >= 0 && ny < dungeon.height) {
              if (dungeon.tiles[ny][nx] === TileType.FLOOR) return true;
          }
      }
      return false;
  }

  dispose() {
    if (this.floorMesh) {
      this.scene.remove(this.floorMesh);
      this.floorMesh.geometry.dispose();
      (this.floorMesh.material as THREE.Material).dispose();
      this.floorMesh = null;
    }
    if (this.wallMesh) {
      this.scene.remove(this.wallMesh);
      this.wallMesh.geometry.dispose();
      (this.wallMesh.material as THREE.Material).dispose();
      this.wallMesh = null;
    }
  }
}
