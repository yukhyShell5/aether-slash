import type { EntityId } from 'bitecs';
import { 
  Position, 
  Velocity, 
  MoveTarget, 
  Speed, 
  hasPosition,
  hasVelocity,
  hasMoveTarget,
  hasSpeed,
  hasMonster,
  hasPlayer,
} from './components';

import { Pathfinder } from './pathfinder';
import { setPath, getPath, clearPath } from './path-store';

// Collision radius for entities
const ENTITY_RADIUS = 0.8;
const SEPARATION_STRENGTH = 5.0;

/**
 * Movement System - applies velocity to position
 */
export function movementSystem(entities: Set<EntityId>, deltaTime: number): void {
  for (const eid of entities) {
    if (!hasPosition(eid) || !hasVelocity(eid)) continue;
    
    Position.x[eid] += Velocity.x[eid] * deltaTime;
    Position.y[eid] += Velocity.y[eid] * deltaTime;
    Position.z[eid] += Velocity.z[eid] * deltaTime;
  }
}

/**
 * Move-to-target System - moves entities toward their target position using A* Pathfinding
 */
export function moveToTargetSystem(entities: Set<EntityId>, deltaTime: number): void {
  for (const eid of entities) {
    // Skip if missing required components
    if (!hasPosition(eid) || !hasMoveTarget(eid) || !hasSpeed(eid)) continue;
    
    // Skip if no active target
    if (MoveTarget.active[eid] === 0) continue;
    
    let path = getPath(eid);

    // If no path, calculate it
    if (!path || path.length === 0) {
      // If we don't have a path but have a target, try to find one
       // Only if we haven't just cleared it? 
       // We assume if MoveTarget is active, we want to go there.
       // Note: findPath returns empty if unreachable.
       
       const startX = Position.x[eid];
       const startZ = Position.z[eid];
       const targetX = MoveTarget.x[eid];
       const targetZ = MoveTarget.z[eid];
       
       // Optimization: If close enough, don't pathfind?
       // Just basic A*
       const newPath = Pathfinder.findPath(startX, startZ, targetX, targetZ);
       if (newPath.length > 0) {
         setPath(eid, newPath);
         path = newPath;
       } else {
         // No path found (unreachable or wall). Stop.
         MoveTarget.active[eid] = 0;
         if (hasVelocity(eid)) {
            Velocity.x[eid] = 0;
            Velocity.y[eid] = 0;
            Velocity.z[eid] = 0;
         }
         continue;
       }
    }

    // Follow path
    if (path && path.length > 0) {
        const nextPoint = path[0];
        const speed = Speed.value[eid];
        
        const dx = nextPoint.x - Position.x[eid];
        // const dy = 0; // Flat movement
        const dz = nextPoint.y - Position.z[eid]; // Path uses y for world z? check pathfinder.
        // Pathfinder uses x,y. MapStore uses x,z.
        // In pathfinder.ts:
        // isWall(x, y) -> tiles[y][x].
        // In Dungeon, map[y][x]. y is row (Z), x is col (X).
        // So pathfinder Y corresponds to World Z. Correct.
        
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < 0.2) { // Reached waypoint
            path.shift(); // Remove first point
            if (path.length === 0) {
                // Reached destination
                MoveTarget.active[eid] = 0;
                clearPath(eid); 
                if (hasVelocity(eid)) {
                    Velocity.x[eid] = 0;
                    Velocity.z[eid] = 0;
                }
                continue;
            }
            // Proceed to next point immediately? or wait next frame? 
            // Better to continue moving to next point to avoid stutter, but for simplicity let's wait next frame or recalc for this frame.
            // Recalculating for this frame:
            // return to start of loop is complex. simpler to just stop this frame.
        }
        
        // Move towards nextPoint
        if (distance > 0.001) {
            const moveDistance = Math.min(speed * deltaTime, distance);
            const ratio = moveDistance / distance;
            
            // We can treat nextPoint as a straight line. 
            // Verify collision just in case (e.g. dynamic obstacle?), but A* handles walls.
            // Simple visual move
            
            if (hasVelocity(eid)) {
              Velocity.x[eid] = (dx / distance) * speed;
              Velocity.y[eid] = 0;
              Velocity.z[eid] = (dz / distance) * speed;
            }
            
            Position.x[eid] += dx * ratio;
            // Position.y[eid] += dy * ratio;
            Position.z[eid] += dz * ratio;
        }
    }
  }
}

/**
 * Entity Separation System - prevents entities from overlapping
 * Pushes monsters apart when they get too close to each other
 */
export function entitySeparationSystem(entities: Set<EntityId>, deltaTime: number): void {
  const entityList: EntityId[] = [];
  
  // Collect all entities that need separation (monsters and player)
  for (const eid of entities) {
    if ((hasMonster(eid) || hasPlayer(eid)) && hasPosition(eid)) {
      entityList.push(eid);
    }
  }
  
  // Check each pair for overlap
  for (let i = 0; i < entityList.length; i++) {
    const eid1 = entityList[i];
    const x1 = Position.x[eid1];
    const z1 = Position.z[eid1];
    
    for (let j = i + 1; j < entityList.length; j++) {
      const eid2 = entityList[j];
      const x2 = Position.x[eid2];
      const z2 = Position.z[eid2];
      
      // Calculate distance (2D, ignoring Y)
      const dx = x2 - x1;
      const dz = z2 - z1;
      const distance = Math.sqrt(dx * dx + dz * dz);
      
      const minDistance = ENTITY_RADIUS * 2;
      
      // If overlapping, push apart
      if (distance < minDistance && distance > 0.01) {
        const overlap = minDistance - distance;
        const pushStrength = overlap * SEPARATION_STRENGTH * deltaTime;
        
        // Normalize direction
        const nx = dx / distance;
        const nz = dz / distance;
        
        // Push both entities apart equally
        const push = pushStrength / 2;
        Position.x[eid1] -= nx * push;
        Position.z[eid1] -= nz * push;
        Position.x[eid2] += nx * push;
        Position.z[eid2] += nz * push;
      }
    }
  }
}
