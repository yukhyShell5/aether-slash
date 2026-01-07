import { writable, derived, type Writable, type Readable } from 'svelte/store';

/**
 * Player health store
 */
interface HealthState {
  current: number;
  max: number;
}

export const playerHealth: Writable<HealthState> = writable({ current: 100, max: 100 });
export const healthPercent: Readable<number> = derived(
  playerHealth,
  ($health) => ($health.current / $health.max) * 100
);

/**
 * Player mana store
 */
interface ManaState {
  current: number;
  max: number;
}

export const playerMana: Writable<ManaState> = writable({ current: 50, max: 50 });
export const manaPercent: Readable<number> = derived(
  playerMana,
  ($mana) => ($mana.current / $mana.max) * 100
);

/**
 * Player experience store
 */
interface ExperienceState {
  current: number;
  toNextLevel: number;
  level: number;
}

export const playerExperience: Writable<ExperienceState> = writable({
  current: 0,
  toNextLevel: 100,
  level: 1,
});

export const expPercent: Readable<number> = derived(
  playerExperience,
  ($exp) => ($exp.current / $exp.toNextLevel) * 100
);

/**
 * Player stats store (computed from gear + base stats)
 */
interface PlayerStats {
  maxHealth: number;
  maxMana: number;
  strength: number;
  vitality: number;
  attackSpeed: number;
  damageMin: number;
  damageMax: number;
  armor: number;
  moveSpeed: number;
  critChance: number;
  critDamage: number;
  healthRegen: number;
  lifeSteal: number;
}

export const playerStats: Writable<PlayerStats> = writable({
  maxHealth: 100,
  maxMana: 50,
  strength: 10,
  vitality: 10,
  attackSpeed: 1.0,
  damageMin: 10,
  damageMax: 20,
  armor: 5,
  moveSpeed: 8,
  critChance: 5,
  critDamage: 150,
  healthRegen: 5,
  lifeSteal: 0,
});

/**
 * Target info store (for showing enemy health)
 */
interface TargetInfo {
  active: boolean;
  name: string;
  health: number;
  maxHealth: number;
  level: number;
}

export const targetInfo: Writable<TargetInfo> = writable({
  active: false,
  name: '',
  health: 0,
  maxHealth: 0,
  level: 0,
});
