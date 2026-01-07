<script lang="ts">
  import HealthBar from './HealthBar.svelte';
  import ExperienceBar from './ExperienceBar.svelte';
  import InventoryPanel from './InventoryPanel.svelte';
  import TalentTree from './TalentTree.svelte';
  import { onMount } from 'svelte';
  import { calculateFinalStats, applyFinalStats, syncStatsToStore } from '../core/stat-calculator';
  import { getEquippedItems, onEquipmentChanged } from '../core/equipment-system';
  import { updateEquipmentStore } from '../stores/equipment';

  interface Props {
    playerEid: number | null;
  }

  let { playerEid = null }: Props = $props();

  let healthBarComponent = $state<HealthBar | null>(null);
  let inventoryComponent = $state<InventoryPanel | null>(null);
  
  // Panel visibility states
  let showTalents = $state(false);

  // Export functions to control UI from game code
  export function updatePlayerHealth(current: number, max: number) {
    healthBarComponent?.setHealth(current, max);
  }

  export function toggleInventory() {
    inventoryComponent?.toggle();
  }
  
  /**
   * Recalculate stats after equipment or talent change
   */
  function handleStatsRecalc() {
    if (playerEid === null) return;
    
    const finalStats = calculateFinalStats(playerEid);
    applyFinalStats(playerEid, finalStats);
    syncStatsToStore(finalStats);
    
    // Refresh equipment display
    const items = getEquippedItems(playerEid);
    updateEquipmentStore(items);
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    
    // Ignore if typing in input
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    
    switch (key) {
      case 'i':
        inventoryComponent?.toggle();
        break;
      case 't':
        showTalents = !showTalents;
        break;
      case 'escape':
        inventoryComponent?.close();
        showTalents = false;
        break;
    }
  }

  onMount(() => {
    // Register global callback for stats/equipment changes
    onEquipmentChanged(handleStatsRecalc);
    
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="game-ui" style="pointer-events: none !important;">
  <HealthBar bind:this={healthBarComponent} />
  <ExperienceBar />
  <InventoryPanel 
    bind:this={inventoryComponent} 
    {playerEid} 
    onEquipmentChanged={handleStatsRecalc} 
  />
  
  <!-- Side Panels Container -->
  <div class="side-panels">
    {#if showTalents}
      <div class="panel-wrapper" style="pointer-events: auto;">
        <TalentTree 
          {playerEid}
          onTalentAllocated={handleStatsRecalc}
        />
      </div>
    {/if}
  </div>
  
  <!-- Keyboard hints -->
  <div class="keyboard-hints" style="pointer-events: none;">
    <span class="hint"><kbd>I</kbd> Inventaire</span>
    <span class="hint"><kbd>T</kbd> Talents</span>
  </div>
</div>

<style>
  .game-ui {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 100;
  }
  
  .side-panels {
    position: fixed;
    right: 16px;
    top: 100px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    pointer-events: none;
  }
  
  .panel-wrapper {
    animation: slideIn 0.2s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  .keyboard-hints {
    position: fixed;
    bottom: 16px;
    right: 16px;
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #666;
  }
  
  .hint {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  
  kbd {
    background: rgba(0, 0, 0, 0.6);
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    border: 1px solid #444;
    color: #aaa;
  }
</style>
