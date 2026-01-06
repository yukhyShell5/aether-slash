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
} from './components';

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
 * Move-to-target System - moves entities toward their target position
 */
export function moveToTargetSystem(entities: Set<EntityId>, deltaTime: number): void {
  for (const eid of entities) {
    // Skip if missing required components
    if (!hasPosition(eid) || !hasMoveTarget(eid) || !hasSpeed(eid)) continue;
    
    // Skip if no active target
    if (MoveTarget.active[eid] === 0) continue;
    
    const speed = Speed.value[eid];
    const dx = MoveTarget.x[eid] - Position.x[eid];
    const dy = MoveTarget.y[eid] - Position.y[eid];
    const dz = MoveTarget.z[eid] - Position.z[eid];
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Reached target (within threshold)
    if (distance < 0.1) {
      Position.x[eid] = MoveTarget.x[eid];
      Position.y[eid] = MoveTarget.y[eid];
      Position.z[eid] = MoveTarget.z[eid];
      MoveTarget.active[eid] = 0;
      
      if (hasVelocity(eid)) {
        Velocity.x[eid] = 0;
        Velocity.y[eid] = 0;
        Velocity.z[eid] = 0;
      }
      continue;
    }
    
    // Normalize and apply speed
    const moveDistance = Math.min(speed * deltaTime, distance);
    const ratio = moveDistance / distance;
    
    if (hasVelocity(eid)) {
      Velocity.x[eid] = (dx / distance) * speed;
      Velocity.y[eid] = (dy / distance) * speed;
      Velocity.z[eid] = (dz / distance) * speed;
    }
    
    Position.x[eid] += dx * ratio;
    Position.y[eid] += dy * ratio;
    Position.z[eid] += dz * ratio;
  }
}

/**
 * Entity Separation System - prevents entities from overlapping
 * Pushes monsters apart when they get too close to each other
 */
export function entitySeparationSystem(entities: Set<EntityId>, deltaTime: number): void {
  const monsterList: EntityId[] = [];
  
  // Collect all monsters
  for (const eid of entities) {
    if (hasMonster(eid) && hasPosition(eid)) {
      monsterList.push(eid);
    }
  }
  
  // Check each pair for overlap
  for (let i = 0; i < monsterList.length; i++) {
    const eid1 = monsterList[i];
    const x1 = Position.x[eid1];
    const z1 = Position.z[eid1];
    
    for (let j = i + 1; j < monsterList.length; j++) {
      const eid2 = monsterList[j];
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
