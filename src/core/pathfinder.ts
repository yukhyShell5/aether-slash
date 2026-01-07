import { MapStore } from './map-store';

interface Point {
  x: number;
  y: number;
}

interface Node {
  x: number;
  y: number;
  g: number; // Cost from start
  h: number; // Heuristic to end
  f: number; // Total cost
  parent: Node | null;
}

export class Pathfinder {
  static findPath(startX: number, startY: number, endX: number, endY: number): Point[] {
    // Convert to integers
    const start = { x: Math.floor(startX), y: Math.floor(startY) };
    const end = { x: Math.floor(endX), y: Math.floor(endY) };

    if (MapStore.isWall(end.x, end.y)) {
      // If target is a wall, maybe find nearest neighbor? 
      // For now, simple fail or let it try closest valid
      return [];
    }

    const openList: Node[] = [];
    const closedList: Set<string> = new Set();
    
    const startNode: Node = {
      x: start.x,
      y: start.y,
      g: 0,
      h: 0,
      f: 0,
      parent: null
    };
    
    openList.push(startNode);

    while (openList.length > 0) {
      // Get node with lowest f
      openList.sort((a, b) => a.f - b.f);
      const currentNode = openList.shift()!;
      
      const key = `${currentNode.x},${currentNode.y}`;
      closedList.add(key);

      // Check if reached destination
      if (currentNode.x === end.x && currentNode.y === end.y) {
        const path: Point[] = [];
        let curr: Node | null = currentNode;
        while (curr) {
          path.push({ x: curr.x + 0.5, y: curr.y + 0.5 }); // Return center of tiles
          curr = curr.parent;
        }
        return path.reverse(); // Start to End
      }

      // Generate neighbors (4 directions, maybe 8?)
      // Let's stick to 4 for orthogonal movement in dungeon, or 8 for smoother?
      // 8 directions
      const neighbors = [
        { x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 },
        { x: -1, y: -1 }, { x: 1, y: -1 }, { x: -1, y: 1 }, { x: 1, y: 1 }
      ];

      for (const offset of neighbors) {
        const neighborX = currentNode.x + offset.x;
        const neighborY = currentNode.y + offset.y;
        const neighborKey = `${neighborX},${neighborY}`;

        if (closedList.has(neighborKey)) continue;

        if (MapStore.isWall(neighborX, neighborY)) continue;

        // Diagonal check: Don't cut corners if adjacent are walls
        if (Math.abs(offset.x) === 1 && Math.abs(offset.y) === 1) {
          if (MapStore.isWall(currentNode.x + offset.x, currentNode.y) || 
              MapStore.isWall(currentNode.x, currentNode.y + offset.y)) {
            continue;
          }
          // Cost is higher for diagonal
        }

        const moveCost = (Math.abs(offset.x) === 1 && Math.abs(offset.y) === 1) ? 1.414 : 1;
        const gScore = currentNode.g + moveCost;

        const existingNode = openList.find(n => n.x === neighborX && n.y === neighborY);
        
        if (!existingNode || gScore < existingNode.g) {
           const hScore = Math.abs(neighborX - end.x) + Math.abs(neighborY - end.y); // Manhattan or Euclidean?
           const newNode: Node = {
             x: neighborX,
             y: neighborY,
             g: gScore,
             h: hScore,
             f: gScore + hScore,
             parent: currentNode
           };
           
           if (!existingNode) {
             openList.push(newNode);
           } else {
             existingNode.g = gScore;
             existingNode.f = gScore + existingNode.h;
             existingNode.parent = currentNode;
           }
        }
      }
    }

    return []; // No path found
  }
}
