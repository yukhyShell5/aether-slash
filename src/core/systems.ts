import type { EntityId } from 'bitecs';
import { 
  Position, 
  Velocity, 
  MoveTarget, 
  Speed, 
  hasPosition,
  hasVelocity,
  hasMoveTarget,
  hasSpeed 
} from './components';

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
