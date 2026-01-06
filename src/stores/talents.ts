import { writable, derived, type Writable, type Readable } from 'svelte/store';

/**
 * Talent node definition
 */
export interface TalentNode {
  id: string;
  name: string;
  description: string;
  maxRank: number;
  currentRank: number;
  effect: {
    stat: string;
    valuePerRank: number;
    isPercent: boolean;
  };
}

/**
 * Default talent tree with 6 basic nodes
 */
function createDefaultTalents(): TalentNode[] {
  return [
    {
      id: 'attack_speed',
      name: 'Rapidité',
      description: '+5% vitesse d\'attaque par rang',
      maxRank: 5,
      currentRank: 0,
      effect: { stat: 'attackSpeed', valuePerRank: 5, isPercent: true },
    },
    {
      id: 'max_health',
      name: 'Vitalité',
      description: '+10% vie max par rang',
      maxRank: 5,
      currentRank: 0,
      effect: { stat: 'maxHealth', valuePerRank: 10, isPercent: true },
    },
    {
      id: 'damage',
      name: 'Puissance',
      description: '+5% dégâts par rang',
      maxRank: 5,
      currentRank: 0,
      effect: { stat: 'damagePercent', valuePerRank: 5, isPercent: true },
    },
    {
      id: 'armor',
      name: 'Endurance',
      description: '+10 armure par rang',
      maxRank: 5,
      currentRank: 0,
      effect: { stat: 'armor', valuePerRank: 10, isPercent: false },
    },
    {
      id: 'crit_chance',
      name: 'Précision',
      description: '+2% chance critique par rang',
      maxRank: 5,
      currentRank: 0,
      effect: { stat: 'critChance', valuePerRank: 2, isPercent: true },
    },
    {
      id: 'crit_damage',
      name: 'Brutalité',
      description: '+15% dégâts critiques par rang',
      maxRank: 5,
      currentRank: 0,
      effect: { stat: 'critDamage', valuePerRank: 15, isPercent: true },
    },
  ];
}

/**
 * Talents store
 */
export const talents: Writable<TalentNode[]> = writable(createDefaultTalents());

/**
 * Total talent points spent
 */
export const totalTalentPointsSpent: Readable<number> = derived(
  talents,
  ($talents) => $talents.reduce((sum, t) => sum + t.currentRank, 0)
);

/**
 * Allocate a point to a talent
 * @returns true if successful
 */
export function allocateTalentPoint(talentId: string): boolean {
  let success = false;
  
  talents.update(nodes => {
    const node = nodes.find(n => n.id === talentId);
    if (node && node.currentRank < node.maxRank) {
      node.currentRank += 1;
      success = true;
    }
    return [...nodes];
  });
  
  return success;
}

/**
 * Reset all talents
 */
export function resetTalents(): void {
  talents.set(createDefaultTalents());
}

/**
 * Get talent bonuses for stat calculation
 */
export function getTalentBonuses(): Record<string, { flat: number; percent: number }> {
  const bonuses: Record<string, { flat: number; percent: number }> = {};
  
  let currentTalents: TalentNode[] = [];
  talents.subscribe(t => currentTalents = t)();
  
  for (const talent of currentTalents) {
    const stat = talent.effect.stat;
    const value = talent.currentRank * talent.effect.valuePerRank;
    
    if (!bonuses[stat]) {
      bonuses[stat] = { flat: 0, percent: 0 };
    }
    
    if (talent.effect.isPercent) {
      bonuses[stat].percent += value;
    } else {
      bonuses[stat].flat += value;
    }
  }
  
  return bonuses;
}
