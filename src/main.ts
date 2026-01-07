import { 
  getGameWorld, 
  Position, 
  MoveTarget, 
  Speed,
  CombatStats,
  Target,
  CombatState,
  CombatStateEnum,
  Renderable,
  ItemDataStore,
  addPositionComponent,
  addVelocityComponent,
  addMoveTargetComponent,
  addRenderableComponent,
  addSpeedComponent,
  addPlayerComponent,
  addMonsterComponent,
  addCombatStatsComponent,
  addTargetComponent,
  addCooldownsComponent,
  addCombatStateComponent,
  hasMonster,
  hasItemDrop,
  hasTarget,
  clearEntityComponents,
  moveToTargetSystem,
  entitySeparationSystem,
  // Progression
  addProgressionComponent,
  consumeLevelUpEvents,
  // Equipment
  initEquipmentSlots,
  // Base stats
  initBaseStats,
  type EntityId,
} from './core';
import { GameScene, RenderObjectPool, createRenderSystem, HealthBarPool, createHealthBarSystem, FloatingTextPool, CSS2DManager, LevelUpVFX } from './render';
import { 
  initPhysics, 
  getPhysicsWorld, 
  combatSystem, 
  cooldownSystem, 
  damageSystem, 
  regenerationSystem,
  deathCleanupSystem,
  onEntityDestroyed,
  consumeDamageEvents,
  enemyAISystem,
} from './combat';
import { lootSystem, initItemRenderer, ItemDropPool, createItemDropRenderSystem } from './loot';
import { DungeonGenerator, TileType } from './core/dungeon-generator';
import { DungeonRenderer } from './render/dungeon-renderer';
import { saveCharacter, loadCharacter } from './core/persistence';
import { MapStore } from './core/map-store';
import RAPIER from '@dimforge/rapier3d-compat';
import { mount } from 'svelte';
import App from './ui/App.svelte';
import { addItemToInventory } from './stores/inventory';
import './style.css';
import * as THREE from 'three';
import { clearPath } from './core/path-store';

let gameScene: GameScene | null = null;
let objectPool: RenderObjectPool | null = null;
let itemDropPool: ItemDropPool | null = null;
let healthBarPool: HealthBarPool | null = null;
let floatingTextPool: FloatingTextPool | null = null;
let css2dManager: CSS2DManager | null = null;
let levelUpVFX: LevelUpVFX | null = null;
let dungeonRenderer: DungeonRenderer | null = null;
let playerEid: EntityId | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let uiApp: any = null;

// Monster colors
const MONSTER_COLOR = new THREE.Color(0xff4444);
const PLAYER_COLOR = new THREE.Color(0x00ff88);

/**
 * Create player entity with all combat components
 */
function createPlayer(): EntityId {
  const gameWorld = getGameWorld();
  const eid = gameWorld.createEntity();
  
  // Movement components
  addPositionComponent(eid);
  addVelocityComponent(eid);
  addMoveTargetComponent(eid);
  addSpeedComponent(eid);
  
  // Render
  addRenderableComponent(eid);
  Renderable.colorR[eid] = PLAYER_COLOR.r;
  Renderable.colorG[eid] = PLAYER_COLOR.g;
  Renderable.colorB[eid] = PLAYER_COLOR.b;
  
  // Combat
  addCombatStatsComponent(eid);
  addTargetComponent(eid);
  addCooldownsComponent(eid);
  addCombatStateComponent(eid);
  addPlayerComponent(eid);
  
  // Set initial values
  Position.x[eid] = 0;
  Position.y[eid] = 0;
  Position.z[eid] = 0;
  Speed.value[eid] = 8;
  
  // Player stats
  CombatStats.hp[eid] = 100;
  CombatStats.maxHp[eid] = 100;
  CombatStats.mp[eid] = 50;
  CombatStats.maxMp[eid] = 50;
  CombatStats.attackSpeed[eid] = 1.5; // 1.5 attacks per second
  CombatStats.attackRange[eid] = 2.0;
  CombatStats.damageMin[eid] = 10;
  CombatStats.damageMax[eid] = 20;
  CombatStats.armor[eid] = 5;
  CombatStats.level[eid] = 1;
  CombatStats.healthRegen[eid] = 5; // 5 HP per second
  
  // Store initial base stats (used for stat recalculation)
  initBaseStats(eid, {
    maxHp: 100,
    maxMp: 50,
    attackSpeed: 1.5,
    attackRange: 2.0,
    damageMin: 10,
    damageMax: 20,
    armor: 5,
    healthRegen: 5,
  });
  
  // Progression (XP/Level system)
  addProgressionComponent(eid, 1);
  
  // Equipment slots
  initEquipmentSlots(eid);
  
  return eid;
}

/**
 * Spawn a monster at position
 */
function spawnMonster(x: number, z: number, level: number = 1): EntityId {
  const gameWorld = getGameWorld();
  const eid = gameWorld.createEntity();
  
  // Movement components
  addPositionComponent(eid);
  addVelocityComponent(eid);
  addMoveTargetComponent(eid);
  addSpeedComponent(eid);
  
  // Render
  addRenderableComponent(eid);
  Renderable.colorR[eid] = MONSTER_COLOR.r;
  Renderable.colorG[eid] = MONSTER_COLOR.g;
  Renderable.colorB[eid] = MONSTER_COLOR.b;
  
  // Combat
  addCombatStatsComponent(eid);
  addTargetComponent(eid);
  addCooldownsComponent(eid);
  addCombatStateComponent(eid);
  addMonsterComponent(eid);
  
  // Set position
  Position.x[eid] = x;
  Position.y[eid] = 0;
  Position.z[eid] = z;
  Speed.value[eid] = 3;
  
  // Monster stats (scales with level)
  CombatStats.hp[eid] = 30 + level * 10;
  CombatStats.maxHp[eid] = 30 + level * 10;
  CombatStats.mp[eid] = 0;
  CombatStats.maxMp[eid] = 0;
  CombatStats.attackSpeed[eid] = 0.8;
  CombatStats.attackRange[eid] = 1.5;
  CombatStats.damageMin[eid] = 3 + level * 2;
  CombatStats.damageMax[eid] = 7 + level * 3;
  CombatStats.armor[eid] = level * 2;
  CombatStats.level[eid] = level;
  
  // console.log(`👹 Monster spawned at (${x}, ${z}) - Level ${level}, HP: ${CombatStats.hp[eid]}`);
  
  return eid;
}

/**
 * Handle click - move or attack
 */
function setupClickHandler(scene: GameScene): void {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  const canvas = scene.renderer.domElement;
  
  canvas.addEventListener('click', (event: MouseEvent) => {
    if (playerEid === null) return;
    
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, scene.isometricCamera.camera);
    
    const gameWorld = getGameWorld();
    const entities = gameWorld.getEntities();
    
    // Calculate click position on ground first
    const ground = scene.scene.getObjectByName('ground');
    let clickPoint: THREE.Vector3 | null = null;
    if (ground) {
      const intersects = raycaster.intersectObject(ground);
      if (intersects.length > 0) {
        clickPoint = intersects[0].point;
      }
    }
    
    // Check for item pickup first
    if (clickPoint) {
      let foundItem = false;
      for (const eid of entities) {
        if (!hasItemDrop(eid)) continue;
        foundItem = true;
        
        const ix = Position.x[eid];
        const iz = Position.z[eid];
        const distToClick = Math.sqrt((clickPoint.x - ix) ** 2 + (clickPoint.z - iz) ** 2);
        
        // console.log(`🔍 Item ${eid} at (${ix.toFixed(1)}, ${iz.toFixed(1)}), click at (${clickPoint.x.toFixed(1)}, ${clickPoint.z.toFixed(1)}), dist=${distToClick.toFixed(2)}`);
        
        if (distToClick < 1.5) {
          // Clicked on item - check if player is close enough
          const px = Position.x[playerEid];
          const pz = Position.z[playerEid];
          const distToPlayer = Math.sqrt((px - ix) ** 2 + (pz - iz) ** 2);
          
          // console.log(`📍 Player at (${px.toFixed(1)}, ${pz.toFixed(1)}), dist to item=${distToPlayer.toFixed(2)}`);
          
          if (distToPlayer <= 2.5) {
            // Pick up the item
            const itemData = ItemDataStore.get(eid);
            if (itemData) {
              const slotIndex = addItemToInventory(eid, itemData);
              if (slotIndex >= 0) {
                // console.log(`📦 Picked up: ${itemData.name}`);
                // Remove item from world
                itemDropPool?.removeItemDrop(eid);
                clearEntityComponents(eid);
                gameWorld.destroyEntity(eid);
                return;
              } else {
                // console.log('📦 Inventory full!');
                return;
              }
            } else {
              // console.log('⚠️ No item data for eid', eid);
            }
          } else {
            // Move towards item
            MoveTarget.x[playerEid] = ix;
            MoveTarget.y[playerEid] = 0;
            MoveTarget.z[playerEid] = iz;
            MoveTarget.active[playerEid] = 1;
            
            // Clear existing path to force recalculation
            clearPath(playerEid);
            
            // Clear target entity if any
            if (hasTarget(playerEid)) {
              Target.entityId[playerEid] = -1;
            }
            // console.log('📦 Moving to pick up item');
            return;
          }
        }
      }
      if (!foundItem) {
        // Check how many item drops exist
        let itemCount = 0;
        for (const eid of entities) {
          if (hasItemDrop(eid)) itemCount++;
        }
        if (itemCount > 0) {
          // console.log(`📍 ${itemCount} items exist but none clicked`);
        }
      }
    }
    
    // Check for monster hits
    for (const eid of entities) {
      if (!hasMonster(eid)) continue;
      if (CombatState.state[eid] === CombatStateEnum.DEAD) continue;
      
      // Simple distance check from ray to monster position
      const monsterPos = new THREE.Vector3(Position.x[eid], Position.y[eid] + 0.5, Position.z[eid]);
      const rayOrigin = raycaster.ray.origin.clone();
      const rayDir = raycaster.ray.direction.clone();
      
      // Project monster onto ray
      const toMonster = monsterPos.clone().sub(rayOrigin);
      const projection = toMonster.dot(rayDir);
      const closestPoint = rayOrigin.clone().add(rayDir.clone().multiplyScalar(projection));
      const distance = closestPoint.distanceTo(monsterPos);
      
      if (distance < 1.0 && projection > 0) {
        // Clicked on monster - set as target
        Target.entityId[playerEid] = eid;
        CombatState.state[playerEid] = CombatStateEnum.MOVING_TO_TARGET;
        // console.log(`⚔️ Targeting monster ${eid}`);
        return;
      }
    }
    
    // No monster hit - clear target and move
    Target.entityId[playerEid] = -1;
    CombatState.state[playerEid] = CombatStateEnum.IDLE;
    
    // Move to click point
    if (clickPoint) {
      MoveTarget.x[playerEid] = clickPoint.x;
      MoveTarget.y[playerEid] = 0;
      MoveTarget.z[playerEid] = clickPoint.z;
      MoveTarget.active[playerEid] = 1;
    }
  });
  
  // Right-click to clear target
  canvas.addEventListener('contextmenu', (event: MouseEvent) => {
    event.preventDefault();
    if (playerEid !== null) {
      Target.entityId[playerEid] = -1;
      CombatState.state[playerEid] = CombatStateEnum.IDLE;
      // console.log('🎯 Target cleared');
    }
  });
}

/**
 * Initialize the game
 */
async function init(): Promise<void> {
  const container = document.getElementById('game-canvas');
  if (!container) {
    throw new Error('Game canvas container not found');
  }

  // Initialize physics
  await initPhysics();
  
  // Initialize item rendering
  initItemRenderer();

  // Create ECS world and scene
  const gameWorld = getGameWorld();
  gameScene = new GameScene(container);
  objectPool = new RenderObjectPool(gameScene.scene);
  itemDropPool = new ItemDropPool(gameScene.scene);

  // Create render systems
  const renderSystem = createRenderSystem(objectPool);
  const itemDropRenderSystem = createItemDropRenderSystem(itemDropPool);
  healthBarPool = new HealthBarPool(gameScene.scene);
  const healthBarSystem = createHealthBarSystem(healthBarPool, gameScene.isometricCamera.camera);
  
  // Create floating combat text system
  css2dManager = new CSS2DManager(container);
  floatingTextPool = new FloatingTextPool(gameScene.scene);
  
  // Create level-up VFX system
  levelUpVFX = new LevelUpVFX(gameScene.scene);
  
  // Register cleanup callback for dead entities
  onEntityDestroyed((eid) => {
    objectPool?.release(Renderable.objectIndex[eid]);
    healthBarPool?.removeHealthBar(eid);
  });

  // Create player
  playerEid = createPlayer();
  
  // Generate Dungeon
  const dungeonGen = new DungeonGenerator(80, 80);
  console.time('MapGeneration');
  const dungeonData = dungeonGen.generate();
  console.timeEnd('MapGeneration');
  
  // Init MapStore for collision
  MapStore.init(dungeonData.width, dungeonData.height, dungeonData.tiles);

  // Render Dungeon
  dungeonRenderer = new DungeonRenderer(gameScene.scene);
  dungeonRenderer.generateMesh(dungeonData);

  // Setup Physics Colliders for Walls
  const physicsWorld = getPhysicsWorld();
  const wallColliderDesc = RAPIER.ColliderDesc.cuboid(0.5, 1, 0.5); // 1x2x1 wall
  
  // Optimize: In a real app we'd merge colliders. Here we create one per wall tile for simplicity.
  // Given 50x50 map, worst case 2500 colliders (acceptable for Rapier).
  for (let y = 0; y < dungeonData.height; y++) {
    for (let x = 0; x < dungeonData.width; x++) {
       if (dungeonData.tiles[y][x] === TileType.WALL) {
           const posX = x - dungeonData.width / 2;
           const posZ = y - dungeonData.height / 2;
           
           const wallBodyDesc = RAPIER.RigidBodyDesc.fixed()
                .setTranslation(posX, 1, posZ);
           const wallBody = physicsWorld.createRigidBody(wallBodyDesc);
           physicsWorld.createCollider(wallColliderDesc, wallBody);
       }
    }
  }

  // Set Player Position (default from dungeon)
  Position.x[playerEid] = dungeonData.playerStart.x - dungeonData.width / 2;
  Position.z[playerEid] = dungeonData.playerStart.y - dungeonData.height / 2;

  // Try to Load Saved Character (Overwrites position if found)
  await loadCharacter(playerEid, 'local-player');

  // Force update camera to player immediately
  if (gameScene) {
      gameScene.isometricCamera.setTarget(
        Position.x[playerEid],
        Position.y[playerEid],
        Position.z[playerEid]
      );
  }

  // Spawn Monsters
  for (const spawn of dungeonData.enemySpawns) {
      const mx = spawn.x - dungeonData.width / 2;
      const mz = spawn.y - dungeonData.height / 2;
      // Random level based on distance from center? Or just random.
      spawnMonster(mx, mz, Math.floor(Math.random() * 3) + 1);
  }

  // Setup click handler for targeting
  setupClickHandler(gameScene);
  
  // Setup camera controls
  setupCameraControls(gameScene);
  
  // Mount Svelte UI
  const uiOverlay = document.getElementById('ui-overlay');
  if (uiOverlay) {
    uiApp = mount(App, { 
      target: uiOverlay,
      props: { playerEid }
    });
  }

  // Start game loop
  gameScene.start((deltaTime: number) => {
    const entities = gameWorld.getEntities() as Set<number>;
    
    // Update cooldowns
    cooldownSystem(entities, deltaTime);
    
    // Enemy AI - detect and target player
    enemyAISystem(entities, playerEid, deltaTime);
    
    // Combat logic
    combatSystem(entities, deltaTime);
    
    // Process damage
    damageSystem(entities);
    
    // Process damage events for floating text
    const damageEvents = consumeDamageEvents();
    for (const dmgEvent of damageEvents) {
      floatingTextPool?.spawnDamage(
        dmgEvent.position.x,
        dmgEvent.position.y,
        dmgEvent.position.z,
        dmgEvent.damage,
        dmgEvent.isCrit
      );
    }
    
    // Update floating text animations
    floatingTextPool?.update(deltaTime);
    
    // Process level-up events for VFX
    const levelUps = consumeLevelUpEvents();
    for (const levelUp of levelUps) {
      levelUpVFX?.spawn(
        Position.x[levelUp.entity],
        Position.y[levelUp.entity],
        Position.z[levelUp.entity]
      );
    }
    
    // Update level-up VFX
    levelUpVFX?.update(deltaTime);
    
    // Health regeneration
    regenerationSystem(entities, deltaTime);
    
    // Movement
    moveToTargetSystem(entities, deltaTime);
    
    // Prevent entity overlapping
    entitySeparationSystem(entities, deltaTime);
    
    // Handle deaths and spawn loot
    const dead = deathCleanupSystem(entities);
    if (dead.length > 0) {
      lootSystem();
    }

    // Update camera to follow player (BEFORE rendering)
    if (playerEid !== null) {
      gameScene!.isometricCamera.setTarget(
        Position.x[playerEid],
        Position.y[playerEid],
        Position.z[playerEid]
      );
      gameScene!.isometricCamera.update(deltaTime);
    }
    
    // Render
    renderSystem(entities);
    healthBarSystem(entities);
    itemDropRenderSystem(entities);
    
    // Render CSS2D layer (floating text)
    css2dManager?.render(gameScene!.scene, gameScene!.isometricCamera.camera);
    
    // Update player UI
    if (playerEid !== null && uiApp?.updatePlayerHealth) {
      uiApp.updatePlayerHealth(CombatStats.hp[playerEid], CombatStats.maxHp[playerEid]);
    }
  });

  // console.log('🎮 Aether Slash initialized');
  // console.log('📍 Click on grid to move');
  // console.log('⚔️ Click on red monsters to attack');
  // console.log('🖱️ Right-click to clear target');
  // console.log('🎥 Q/E to rotate camera, scroll to zoom');
}

/**
 * Setup camera keyboard controls
 */
function setupCameraControls(scene: GameScene): void {
  document.addEventListener('keydown', (event: KeyboardEvent) => {
    // console.log('Key pressed:', event.key);
    switch (event.key.toLowerCase()) {
      // Spawn new monster with 'M' key (debug)
      case 'm':
        const x = (Math.random() - 0.5) * 20;
        const z = (Math.random() - 0.5) * 20;
        const level = Math.floor(Math.random() * 3) + 1;
        spawnMonster(x, z, level);
        break;
      // Quick Save with F9 or K
      case 'f9':
      case 'k':
        if (playerEid !== null) {
            console.log('Saving character...');
            saveCharacter(playerEid, 'local-player')
              .then(() => alert('Game Saved!'))
              .catch(err => {
                  console.error(err);
                  alert('Save failed: ' + JSON.stringify(err, null, 2));
              });
        } else {
            console.error('Player entity is null');
        }
        break;
    }
  });

  document.addEventListener('wheel', (event: WheelEvent) => {
    event.preventDefault();
    scene.isometricCamera.setZoom(event.deltaY * 0.05);
  }, { passive: false });
}

/**
 * Cleanup on page unload
 */
function cleanup(): void {
  dungeonRenderer?.dispose();
  levelUpVFX?.dispose();
  itemDropPool?.dispose();
  objectPool?.dispose();
  gameScene?.dispose();
}

// Initialize on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => init());
} else {
  init();
}

// Cleanup on unload
window.addEventListener('beforeunload', cleanup);
