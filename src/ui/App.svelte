<script lang="ts">
  import HealthBar from './HealthBar.svelte';
  import ExperienceBar from './ExperienceBar.svelte';
  import Inventory from './Inventory.svelte';
  import { onMount } from 'svelte';

  let healthBarComponent = $state<HealthBar | null>(null);
  let inventoryComponent = $state<Inventory | null>(null);

  // Export functions to control UI from game code
  export function updatePlayerHealth(current: number, max: number) {
    healthBarComponent?.setHealth(current, max);
  }

  export function toggleInventory() {
    inventoryComponent?.toggle();
  }

  export function addItem(index: number, itemId: string, quantity: number = 1) {
    inventoryComponent?.setSlot(index, itemId, quantity);
  }

  // Keyboard shortcut for inventory
  function handleKeydown(event: KeyboardEvent) {
    if (event.key.toLowerCase() === 'i') {
      inventoryComponent?.toggle();
    }
  }

  onMount(() => {
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="game-ui" style="pointer-events: none !important;">
  <HealthBar bind:this={healthBarComponent} />
  <ExperienceBar />
  <Inventory bind:this={inventoryComponent} />
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
</style>
