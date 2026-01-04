import type { EntityId } from 'bitecs';
import { CombatStats, hasPlayer } from './components';
import { playerHealth, playerMana } from '../stores/player';

// Throttle configuration
const UPDATE_EVERY_N_FRAMES = 5;
let frameCounter = 0;

// Cache previous values to avoid unnecessary store updates
let lastHealth = -1;
let lastMaxHealth = -1;
let lastMana = -1;
let lastMaxMana = -1;

/**
 * UI System - Bridges ECS state to Svelte stores
 * Throttled to update only every N frames for performance
 */
export function uiSystem(playerEid: EntityId | null): void {
  // Throttle updates
  frameCounter++;
  if (frameCounter < UPDATE_EVERY_N_FRAMES) return;
  frameCounter = 0;

  // Skip if no player
  if (playerEid === null) return;
  if (!hasPlayer(playerEid)) return;

  // Read from ECS TypedArrays
  const health = CombatStats.hp[playerEid];
  const maxHealth = CombatStats.maxHp[playerEid];
  const mana = CombatStats.mp[playerEid];
  const maxMana = CombatStats.maxMp[playerEid];

  // Only update store if values changed
  if (health !== lastHealth || maxHealth !== lastMaxHealth) {
    playerHealth.set({ current: health, max: maxHealth });
    lastHealth = health;
    lastMaxHealth = maxHealth;
  }

  if (mana !== lastMana || maxMana !== lastMaxMana) {
    playerMana.set({ current: mana, max: maxMana });
    lastMana = mana;
    lastMaxMana = maxMana;
  }
}

/**
 * Reset UI system state (e.g., on player death/respawn)
 */
export function resetUISystem(): void {
  frameCounter = 0;
  lastHealth = -1;
  lastMaxHealth = -1;
  lastMana = -1;
  lastMaxMana = -1;
}
