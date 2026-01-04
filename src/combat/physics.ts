import RAPIER from '@dimforge/rapier3d-compat';
import { Position, hasPosition } from '../core/components';
import type { EntityId } from 'bitecs';

/**
 * Physics world singleton
 */
let physicsWorld: RAPIER.World | null = null;
let rapierInitialized = false;

// Map entity IDs to Rapier rigid body handles
const entityBodies = new Map<EntityId, RAPIER.RigidBody>();
const entityColliders = new Map<EntityId, RAPIER.Collider>();

/**
 * Initialize Rapier WASM and create physics world
 */
export async function initPhysics(): Promise<RAPIER.World> {
  if (!rapierInitialized) {
    await RAPIER.init();
    rapierInitialized = true;
  }
  
  if (!physicsWorld) {
    const gravity = new RAPIER.Vector3(0, -9.81, 0);
    physicsWorld = new RAPIER.World(gravity);
  }
  
  return physicsWorld;
}

/**
 * Get the physics world (must call initPhysics first)
 */
export function getPhysicsWorld(): RAPIER.World {
  if (!physicsWorld) {
    throw new Error('Physics not initialized. Call initPhysics() first.');
  }
  return physicsWorld;
}

/**
 * Create a hitbox (kinematic rigid body with collider) for an entity
 */
export function createEntityHitbox(
  eid: EntityId, 
  radius: number = 0.5
): { body: RAPIER.RigidBody; collider: RAPIER.Collider } {
  const world = getPhysicsWorld();
  
  // Create kinematic rigid body (controlled by game logic, not physics)
  const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
    .setTranslation(Position.x[eid], Position.y[eid], Position.z[eid]);
  
  const body = world.createRigidBody(bodyDesc);
  
  // Create sphere collider for hitbox
  const colliderDesc = RAPIER.ColliderDesc.ball(radius)
    .setSensor(true); // Sensor = no physical collision, just detection
  
  const collider = world.createCollider(colliderDesc, body);
  
  // Store references
  entityBodies.set(eid, body);
  entityColliders.set(eid, collider);
  
  return { body, collider };
}

/**
 * Update entity hitbox position to match ECS position
 */
export function syncEntityHitbox(eid: EntityId): void {
  const body = entityBodies.get(eid);
  if (body && hasPosition(eid)) {
    body.setTranslation(
      new RAPIER.Vector3(Position.x[eid], Position.y[eid], Position.z[eid]),
      true
    );
  }
}

/**
 * Remove entity hitbox from physics world
 */
export function removeEntityHitbox(eid: EntityId): void {
  const world = getPhysicsWorld();
  
  const collider = entityColliders.get(eid);
  if (collider) {
    world.removeCollider(collider, true);
    entityColliders.delete(eid);
  }
  
  const body = entityBodies.get(eid);
  if (body) {
    world.removeRigidBody(body);
    entityBodies.delete(eid);
  }
}

/**
 * Calculate distance between two entities using their positions
 */
export function getDistanceBetween(eid1: EntityId, eid2: EntityId): number {
  if (!hasPosition(eid1) || !hasPosition(eid2)) {
    return Infinity;
  }
  
  const dx = Position.x[eid2] - Position.x[eid1];
  const dy = Position.y[eid2] - Position.y[eid1];
  const dz = Position.z[eid2] - Position.z[eid1];
  
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Check if entity is within range of target
 */
export function isInRange(attacker: EntityId, target: EntityId, range: number): boolean {
  return getDistanceBetween(attacker, target) <= range;
}

/**
 * Step the physics simulation
 */
export function stepPhysics(): void {
  if (physicsWorld) {
    physicsWorld.step();
  }
}

/**
 * Cleanup physics world
 */
export function disposePhysics(): void {
  if (physicsWorld) {
    physicsWorld.free();
    physicsWorld = null;
  }
  entityBodies.clear();
  entityColliders.clear();
}
