
export const TileType = {
  VOID: 0,
  FLOOR: 1,
  WALL: 2,
  DOOR: 3
} as const;

export type TileType = typeof TileType[keyof typeof TileType];

export interface Room {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DungeonData {
  width: number;
  height: number;
  tiles: TileType[][];
  rooms: Room[];
  playerStart: { x: number; y: number };
  enemySpawns: { x: number; y: number }[];
}

export class DungeonGenerator {
  private width: number;
  private height: number;
  private map: TileType[][];
  private rooms: Room[] = [];
  private leafRooms: Room[] = [];

  constructor(width: number = 50, height: number = 50) {
    this.width = width;
    this.height = height;
    this.map = [];
  }

  generate(): DungeonData {
    // Initialize map with VOID
    this.map = Array(this.height).fill(null).map(() => Array(this.width).fill(TileType.WALL));

    // BSP Partitioning
    const rootContainer = { x: 1, y: 1, w: this.width - 2, h: this.height - 2 };
    this.splitContainer(rootContainer, 4); // Recursion depth

    // Create rooms in leaves
    this.createRooms();

    // Connect rooms
    this.connectRooms();

    // Identify spawn points
    const playerStart = this.getPlayerStart();
    const enemySpawns = this.getEnemySpawns();

    return {
      width: this.width,
      height: this.height,
      tiles: this.map,
      rooms: this.leafRooms,
      playerStart,
      enemySpawns
    };
  }

  private splitContainer(container: Room, iter: number) {
    if (iter === 0) {
      this.rooms.push(container);
      return;
    }

    // Random split direction
    const splitH = Math.random() > 0.5;
    const minSize = 15; // Minimum container size

    if (splitH) {
      // Split Horizontally
      if (container.h < minSize * 2) {
        this.rooms.push(container);
        return;
      }
      const splitY = Math.floor(Math.random() * (container.h - minSize * 2)) + minSize;
      
      this.splitContainer({ x: container.x, y: container.y, w: container.w, h: splitY }, iter - 1);
      this.splitContainer({ x: container.x, y: container.y + splitY, w: container.w, h: container.h - splitY }, iter - 1);
    } else {
      // Split Vertically
      if (container.w < minSize * 2) {
        this.rooms.push(container);
        return;
      }
      const splitX = Math.floor(Math.random() * (container.w - minSize * 2)) + minSize;

      this.splitContainer({ x: container.x, y: container.y, w: splitX, h: container.h }, iter - 1);
      this.splitContainer({ x: container.x + splitX, y: container.y, w: container.w - splitX, h: container.h }, iter - 1);
    }
  }

  private createRooms() {
    for (const container of this.rooms) {
      // Add padding
      const roomW = Math.floor(Math.random() * (container.w - 4)) + 8;
      const roomH = Math.floor(Math.random() * (container.h - 4)) + 8;
      const roomX = container.x + Math.floor((container.w - roomW) / 2);
      const roomY = container.y + Math.floor((container.h - roomH) / 2);

      const room: Room = { x: roomX, y: roomY, w: roomW, h: roomH };
      this.leafRooms.push(room);

      // Carve room
      for (let y = roomY; y < roomY + roomH; y++) {
        for (let x = roomX; x < roomX + roomW; x++) {
          this.map[y][x] = TileType.FLOOR;
        }
      }
    }
  }

  private connectRooms() {
    // Simple connection: connect each room to the next one in the list
    for (let i = 0; i < this.leafRooms.length - 1; i++) {
      const roomA = this.leafRooms[i];
      const roomB = this.leafRooms[i + 1];

      const centerA = { x: Math.floor(roomA.x + roomA.w / 2), y: Math.floor(roomA.y + roomA.h / 2) };
      const centerB = { x: Math.floor(roomB.x + roomB.w / 2), y: Math.floor(roomB.y + roomB.h / 2) };

      // Horizontal Corridor
      const startX = Math.min(centerA.x, centerB.x);
      const endX = Math.max(centerA.x, centerB.x);
      for (let x = startX; x <= endX; x++) {
        this.map[centerA.y - 1][x] = TileType.FLOOR;
        this.map[centerA.y][x] = TileType.FLOOR;
        this.map[centerA.y + 1][x] = TileType.FLOOR;
      }

      // Vertical Corridor
      const startY = Math.min(centerA.y, centerB.y);
      const endY = Math.max(centerA.y, centerB.y);
      for (let y = startY; y <= endY; y++) {
        this.map[y][centerB.x - 1] = TileType.FLOOR;
        this.map[y][centerB.x] = TileType.FLOOR;
        this.map[y][centerB.x + 1] = TileType.FLOOR;
      }
    }
  }

  private getPlayerStart() {
    // First room center
    const room = this.leafRooms[0];
    return {
      x: room.x + Math.floor(room.w / 2),
      y: room.y + Math.floor(room.h / 2)
    };
  }

  private getEnemySpawns() {
    const spawns: { x: number; y: number }[] = [];
    // Skip first room (safe zone)
    for (let i = 1; i < this.leafRooms.length; i++) {
        const room = this.leafRooms[i];
        // 1-3 enemies per room
        const count = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < count; j++) {
            spawns.push({
                x: room.x + Math.floor(Math.random() * room.w),
                y: room.y + Math.floor(Math.random() * room.h)
            });
        }
    }
    return spawns;
  }
}
