import { TileType } from './dungeon-generator';

export const MapStore = {
  width: 0,
  height: 0,
  tiles: [] as TileType[][],
  
  init(width: number, height: number, tiles: TileType[][]) {
    this.width = width;
    this.height = height;
    this.tiles = tiles;
  },

  isWall(x: number, z: number): boolean {
    if (this.width === 0) return false;

    // Convert world coords to grid coords
    // Center of map is (0,0). Width=width.
    // gridX = x + width/2
    // gridY = z + height/2
    const gridX = Math.floor(x + this.width / 2);
    const gridY = Math.floor(z + this.height / 2);

    if (gridX < 0 || gridX >= this.width || gridY < 0 || gridY >= this.height) {
      return true; // Out of bounds is wall
    }

    return this.tiles[gridY][gridX] === TileType.WALL;
  }
};
