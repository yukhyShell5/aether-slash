<script lang="ts">
  import { talents, allocateTalentPoint, type TalentNode } from '../stores/talents';
  import { spendTalentPoint, getProgressionState } from '../core/progression';
  
  interface Props {
    playerEid: number | null;
    onTalentAllocated: (() => void) | null;
  }
  
  let { playerEid = null, onTalentAllocated = null }: Props = $props();
  
  let availablePoints = $state(0);
  
  $effect(() => {
    if (playerEid !== null) {
      const state = getProgressionState(playerEid);
      availablePoints = state.talentPoints;
    }
  });
  
  function handleAllocate(talent: TalentNode) {
    if (playerEid === null) return;
    if (availablePoints <= 0) return;
    if (talent.currentRank >= talent.maxRank) return;
    
    // Spend point in ECS
    if (spendTalentPoint(playerEid)) {
      // Allocate in store
      allocateTalentPoint(talent.id);
      
      // Update available points
      const state = getProgressionState(playerEid);
      availablePoints = state.talentPoints;
      
      // Trigger stat recalculation
      if (onTalentAllocated) {
        onTalentAllocated();
      }
    }
  }
</script>

<div class="talent-tree">
  <h3>🌟 Arbre de Talents</h3>
  <p class="points-available">Points disponibles: <span class="points">{availablePoints}</span></p>
  
  <div class="talents-grid">
    {#each $talents as talent}
      <button 
        class="talent-node"
        class:maxed={talent.currentRank >= talent.maxRank}
        class:available={availablePoints > 0 && talent.currentRank < talent.maxRank}
        on:click={() => handleAllocate(talent)}
        disabled={availablePoints <= 0 || talent.currentRank >= talent.maxRank}
      >
        <span class="talent-name">{talent.name}</span>
        <span class="talent-rank">{talent.currentRank}/{talent.maxRank}</span>
        <span class="talent-desc">{talent.description}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .talent-tree {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #444;
    border-radius: 8px;
    padding: 12px;
    color: white;
    min-width: 280px;
  }
  
  h3 {
    margin: 0 0 8px 0;
    text-align: center;
    font-size: 14px;
  }
  
  .points-available {
    text-align: center;
    margin: 0 0 12px 0;
    font-size: 12px;
    color: #aaa;
  }
  
  .points {
    color: #ffdd00;
    font-weight: bold;
    font-size: 14px;
  }
  
  .talents-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
  
  .talent-node {
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #333;
    border-radius: 6px;
    padding: 10px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }
  
  .talent-node:hover:not(:disabled) {
    border-color: #4a9eff;
    transform: scale(1.02);
  }
  
  .talent-node.available {
    border-color: #4a9eff;
    box-shadow: 0 0 10px rgba(74, 158, 255, 0.3);
  }
  
  .talent-node.maxed {
    border-color: #ffd700;
    background: linear-gradient(135deg, #2a2a1e 0%, #3a3a0e 100%);
  }
  
  .talent-node:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .talent-name {
    font-size: 12px;
    font-weight: bold;
    color: #fff;
  }
  
  .talent-rank {
    font-size: 11px;
    color: #4a9eff;
    font-weight: bold;
  }
  
  .talent-desc {
    font-size: 10px;
    color: #888;
    text-align: center;
  }
  
  .talent-node.maxed .talent-rank {
    color: #ffd700;
  }
</style>
