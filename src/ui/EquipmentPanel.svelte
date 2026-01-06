<script lang="ts">
  import { equippedItems, updateEquipmentStore } from '../stores/equipment';
  import { getEquippedItems, unequipItem, getSlotName } from '../core/equipment-system';
  import { EquipmentSlot } from '../core/components';
  import lootTables from '../data/loot_tables.json';
  
  interface Props {
    playerEid: number | null;
    onEquipmentChanged: (() => void) | null;
  }
  
  let { playerEid = null, onEquipmentChanged = null }: Props = $props();
  
  // Update store when playerEid changes
  $effect(() => {
    if (playerEid !== null) {
      const items = getEquippedItems(playerEid);
      updateEquipmentStore(items);
    }
  });
  
  function getRarityColor(rarity: number): string {
    const colors = lootTables.rarityColors as Record<string, string>;
    const rarityNames = ['common', 'magic', 'rare', 'legendary'];
    return colors[rarityNames[rarity]] || '#888';
  }
  
  function handleUnequip(slot: number) {
    if (playerEid === null) return;
    
    if (unequipItem(playerEid, slot)) {
      // Refresh display
      const items = getEquippedItems(playerEid);
      updateEquipmentStore(items);
      
      if (onEquipmentChanged) {
        onEquipmentChanged();
      }
    }
  }
  
  // Equipment slot layout
  const slotLayout = [
    { slot: EquipmentSlot.HEAD, label: '🪖', gridArea: 'head' },
    { slot: EquipmentSlot.AMULET, label: '📿', gridArea: 'amulet' },
    { slot: EquipmentSlot.MAINHAND, label: '⚔️', gridArea: 'weapon' },
    { slot: EquipmentSlot.CHEST, label: '🛡️', gridArea: 'chest' },
    { slot: EquipmentSlot.OFFHAND, label: '🛡️', gridArea: 'offhand' },
    { slot: EquipmentSlot.LEGS, label: '👖', gridArea: 'legs' },
    { slot: EquipmentSlot.RING1, label: '💍', gridArea: 'ring1' },
    { slot: EquipmentSlot.FEET, label: '👢', gridArea: 'feet' },
    { slot: EquipmentSlot.RING2, label: '💍', gridArea: 'ring2' },
  ];
</script>

<div class="equipment-panel">
  <h3>⚔️ Équipement</h3>
  
  <div class="equipment-grid">
    {#each slotLayout as { slot, label, gridArea }}
      {@const equipped = $equippedItems.find(e => e.slot === slot)}
      <div 
        class="equipment-slot"
        style="grid-area: {gridArea}; {equipped?.itemData ? `border-color: ${getRarityColor(equipped.itemData.rarity)}` : ''}"
        class:filled={equipped?.itemData}
        on:dblclick={() => equipped?.itemData && handleUnequip(slot)}
        on:keydown={(e) => e.key === 'Enter' && equipped?.itemData && handleUnequip(slot)}
        role="button"
        tabindex="0"
      >
        {#if equipped?.itemData}
          <span class="item-icon">{label}</span>
          <span class="item-name" style="color: {getRarityColor(equipped.itemData.rarity)}">
            {equipped.itemData.name.split(' ').slice(-1)[0]}
          </span>
        {:else}
          <span class="slot-icon">{label}</span>
          <span class="slot-name">{getSlotName(slot)}</span>
        {/if}
      </div>
    {/each}
  </div>
  
  <p class="hint">Double-clic pour déséquiper</p>
</div>

<style>
  .equipment-panel {
    background: rgba(0, 0, 0, 0.8);
    border: 1px solid #444;
    border-radius: 8px;
    padding: 12px;
    color: white;
    min-width: 200px;
  }
  
  h3 {
    margin: 0 0 12px 0;
    text-align: center;
    font-size: 14px;
  }
  
  .equipment-grid {
    display: grid;
    grid-template-areas:
      ". head amulet"
      "weapon chest offhand"
      "ring1 legs ring2"
      ". feet .";
    grid-template-columns: repeat(3, 60px);
    grid-template-rows: repeat(4, 60px);
    gap: 4px;
    justify-content: center;
  }
  
  .equipment-slot {
    background: rgba(30, 30, 40, 0.9);
    border: 2px solid #333;
    border-radius: 6px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .equipment-slot:hover {
    border-color: #666;
    background: rgba(50, 50, 60, 0.9);
  }
  
  .equipment-slot.filled {
    box-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
  }
  
  .slot-icon, .item-icon {
    font-size: 18px;
  }
  
  .slot-name {
    font-size: 8px;
    color: #666;
    text-align: center;
  }
  
  .item-name {
    font-size: 8px;
    font-weight: bold;
    text-align: center;
    line-height: 1.1;
  }
  
  .hint {
    text-align: center;
    font-size: 10px;
    color: #666;
    margin: 8px 0 0 0;
  }
</style>
