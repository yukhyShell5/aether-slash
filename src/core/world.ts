import { createWorld, addEntity, removeEntity } from 'bitecs';
import type { World, EntityId } from 'bitecs';

// Re-export for convenience
export { createWorld, addEntity, removeEntity };
export type { World, EntityId };

/**
 * Game World wrapper with entity tracking for cleanup
 */
export class GameWorld {
  readonly world: World;
  private entities: Set<EntityId> = new Set();

  constructor() {
    this.world = createWorld();
  }

  createEntity(): EntityId {
    const eid = addEntity(this.world);
    this.entities.add(eid);
    return eid;
  }

  destroyEntity(eid: EntityId): void {
    if (this.entities.has(eid)) {
      removeEntity(this.world, eid);
      this.entities.delete(eid);
    }
  }

  getEntities(): ReadonlySet<EntityId> {
    return this.entities;
  }

  clear(): void {
    for (const eid of this.entities) {
      removeEntity(this.world, eid);
    }
    this.entities.clear();
  }
}

// Singleton game world instance
let gameWorld: GameWorld | null = null;

export function getGameWorld(): GameWorld {
  if (!gameWorld) {
    gameWorld = new GameWorld();
  }
  return gameWorld;
}

export function resetGameWorld(): void {
  if (gameWorld) {
    gameWorld.clear();
  }
  gameWorld = new GameWorld();
}
