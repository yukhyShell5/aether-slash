<script lang="ts">
  import { inventorySlots, type InventorySlot } from '../stores/inventory';
  import { RarityEnum } from '../core/components';
  import { equipItem, getSlotForItem } from '../core/equipment-system';
  import lootTables from '../data/loot_tables.json';
  
  interface Props {
    playerEid: number | null;
    onEquipmentChanged: (() => void) | null;
  }
  
  let { playerEid = null, onEquipmentChanged = null }: Props = $props();
  
  let isOpen = $state(false);
  let hoveredSlot = $state<InventorySlot | null>(null);
  let tooltipPos = $state({ x: 0, y: 0 });

  // Rarity colors and names
  const rarityColors: Record<number, string> = {
    [RarityEnum.COMMON]: '#9d9d9d',
    [RarityEnum.MAGIC]: '#4169e1',
    [RarityEnum.RARE]: '#ffd700',
    [RarityEnum.LEGENDARY]: '#ff8c00',
  };
  
  const rarityNames: Record<number, string> = {
    [RarityEnum.COMMON]: 'Commun',
    [RarityEnum.MAGIC]: 'Magique',
    [RarityEnum.RARE]: 'Rare',
    [RarityEnum.LEGENDARY]: 'Légendaire',
  };

  // Get affix name from loot tables
  function getAffixName(affixId: string): string {
    const allAffixes = [...lootTables.affixes.prefixes, ...lootTables.affixes.suffixes];
    const affix = allAffixes.find(a => a.id === affixId);
    return affix?.stat || affixId;
  }

  // Format stat name for display
  function formatStatName(stat: string): string {
    const statNames: Record<string, string> = {
      strength: 'Force',
      vitality: 'Vitalité',
      attackSpeed: 'Vitesse d\'attaque',
      damagePercent: 'Dégâts',
      maxHealth: 'Vie max',
      maxMana: 'Mana max',
      armor: 'Armure',
      healthRegen: 'Régénération',
      critChance: 'Chance de crit',
      critDamage: 'Dégâts critiques',
      lifeSteal: 'Vol de vie',
      moveSpeed: 'Vitesse',
    };
    return statNames[stat] || stat;
  }

  function getItemColor(slot: InventorySlot): string {
    if (!slot.itemData) return '#00ff88';
    return rarityColors[slot.itemData.rarity] || '#00ff88';
  }

  function getItemIcon(slot: InventorySlot): string {
    if (!slot.itemData) return '?';
    return slot.itemData.name.charAt(0).toUpperCase();
  }
  
  function handleMouseEnter(event: MouseEvent, slot: InventorySlot) {
    if (!slot.itemData) return;
    hoveredSlot = slot;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    tooltipPos = { x: rect.right + 10, y: rect.top };
  }
  
  function handleMouseLeave() {
    hoveredSlot = null;
  }
  
  /**
   * Get inventory slot index from the slot object
   */
  function getSlotIndex(targetSlot: InventorySlot): number {
    let idx = -1;
    inventorySlots.subscribe(slots => {
      idx = slots.findIndex(s => s.itemEid === targetSlot.itemEid);
    })();
    return idx;
  }
  
  /**
   * Handle double-click to equip item
   */
  function handleEquip(slot: InventorySlot) {
    if (!slot.itemData || playerEid === null) return;
    
    // Check if item can be equipped
    const targetSlot = getSlotForItem(slot.itemData.baseItemId);
    if (targetSlot === null) {
      console.log('❌ Cet objet ne peut pas être équipé');
      return;
    }
    
    const slotIndex = getSlotIndex(slot);
    if (slotIndex === -1) return;
    
    // Equip the item
    if (equipItem(playerEid, slotIndex, targetSlot)) {
      console.log(`✅ ${slot.itemData.name} équipé!`);
      hoveredSlot = null;
      
      // Notify parent of equipment change
      if (onEquipmentChanged) {
        onEquipmentChanged();
      }
    }
  }

  export function toggle() {
    isOpen = !isOpen;
    if (!isOpen) hoveredSlot = null;
  }

  export function open() {
    isOpen = true;
  }

  export function close() {
    isOpen = false;
    hoveredSlot = null;
  }
</script>

{#if isOpen}
<div class="inventory-overlay">
  <div class="inventory-panel">
    <div class="inventory-header">
      <h2>📦 Inventaire</h2>
      <button class="close-btn" onclick={toggle}>×</button>
    </div>
    <div class="inventory-grid">
      {#each $inventorySlots as slot}
        <div 
          class="inventory-slot" 
          class:filled={slot.itemData !== null}
          class:equippable={slot.itemData !== null && getSlotForItem(slot.itemData.baseItemId) !== null}
          role="button"
          tabindex="0"
          onmouseenter={(e) => handleMouseEnter(e, slot)}
          onmouseleave={handleMouseLeave}
          ondblclick={() => handleEquip(slot)}
          onkeydown={(e) => e.key === 'Enter' && handleEquip(slot)}
        >
          {#if slot.itemData}
            <div class="item-icon" style="color: {getItemColor(slot)};">
              {getItemIcon(slot)}
            </div>
            <div class="item-rarity-indicator" style="background-color: {getItemColor(slot)};"></div>
            {#if slot.quantity > 1}
              <span class="item-quantity">{slot.quantity}</span>
            {/if}
          {/if}
        </div>
      {/each}
    </div>
    <div class="inventory-tip">
      <kbd>I</kbd> fermer • <strong>Double-clic</strong> pour équiper
    </div>
  </div>
  
  <!-- Tooltip -->
  {#if hoveredSlot?.itemData}
    {@const baseItem = lootTables.baseItems.find(b => b.id === hoveredSlot.itemData!.baseItemId)}
    <div 
      class="item-tooltip" 
      style="left: {tooltipPos.x}px; top: {tooltipPos.y}px;"
    >
      <div class="tooltip-header" style="color: {getItemColor(hoveredSlot)};">
        {hoveredSlot.itemData.name}
      </div>
      <div class="tooltip-rarity" style="color: {getItemColor(hoveredSlot)};">
        {rarityNames[hoveredSlot.itemData.rarity]} • Niveau {hoveredSlot.itemData.level}
      </div>
      
      <!-- Base Stats -->
      {#if baseItem?.baseStats}
        <div class="tooltip-divider"></div>
        <div class="tooltip-base-stats">
          {#if baseItem.baseStats.damageMin !== undefined}
            <div class="base-stat-line">⚔️ Dégâts: {baseItem.baseStats.damageMin} - {baseItem.baseStats.damageMax}</div>
          {/if}
          {#if baseItem.baseStats.armor !== undefined}
            <div class="base-stat-line">🛡️ Armure: {baseItem.baseStats.armor}</div>
          {/if}
        </div>
      {/if}
      
      <!-- Affixes -->
      {#if hoveredSlot.itemData.affixes && hoveredSlot.itemData.affixes.length > 0}
        <div class="tooltip-divider"></div>
        <div class="tooltip-affixes">
          {#each hoveredSlot.itemData.affixes as affix}
            <div class="affix-line">
              +{affix.value} {formatStatName(getAffixName(affix.id))}
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
{/if}

<style>
  .inventory-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
    backdrop-filter: blur(4px);
    pointer-events: auto;
  }

  .inventory-panel {
    background: linear-gradient(145deg, #1a1a2e, #16213e);
    border: 2px solid #4a4a6a;
    border-radius: 12px;
    padding: 24px;
    min-width: 380px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  .inventory-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    border-bottom: 1px solid #4a4a6a;
    padding-bottom: 12px;
  }

  .inventory-header h2 {
    margin: 0;
    color: #e0e0e0;
    font-family: 'Segoe UI', sans-serif;
    font-size: 18px;
  }

  .close-btn {
    background: none;
    border: none;
    color: #888;
    font-size: 28px;
    cursor: pointer;
    transition: color 0.2s;
    line-height: 1;
  }

  .close-btn:hover {
    color: #fff;
  }

  .inventory-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 8px;
  }

  .inventory-slot {
    width: 60px;
    height: 60px;
    background: rgba(0, 0, 0, 0.4);
    border: 2px solid #3a3a5a;
    border-radius: 6px;
    position: relative;
    cursor: pointer;
    transition: border-color 0.2s, background 0.2s, transform 0.1s;
  }

  .inventory-slot:hover {
    border-color: #7a7a9a;
    background: rgba(255, 255, 255, 0.08);
    transform: scale(1.05);
  }

  .inventory-slot.filled {
    border-color: #5a7a5a;
    background: rgba(34, 197, 94, 0.1);
  }
  
  .inventory-slot.equippable {
    cursor: pointer;
  }
  
  .inventory-slot.equippable:hover {
    border-color: #4a9eff;
    box-shadow: 0 0 12px rgba(74, 158, 255, 0.4);
  }

  .item-icon {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 22px;
    text-shadow: 1px 1px 3px black;
  }

  .item-rarity-indicator {
    position: absolute;
    bottom: 2px;
    left: 2px;
    right: 2px;
    height: 3px;
    border-radius: 2px;
    opacity: 0.8;
  }

  .item-quantity {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 11px;
    color: #fff;
    text-shadow: 1px 1px 2px black;
    font-weight: bold;
  }

  .inventory-tip {
    margin-top: 16px;
    text-align: center;
    color: #666;
    font-size: 12px;
  }

  kbd {
    background: #333;
    padding: 2px 6px;
    border-radius: 3px;
    font-family: monospace;
    border: 1px solid #555;
  }
  
  /* Tooltip styles */
  .item-tooltip {
    position: fixed;
    background: linear-gradient(145deg, #1a1a2e, #0f0f1a);
    border: 2px solid #4a4a6a;
    border-radius: 8px;
    padding: 12px 16px;
    min-width: 200px;
    max-width: 280px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    z-index: 300;
    pointer-events: none;
  }
  
  .tooltip-header {
    font-family: 'Segoe UI', sans-serif;
    font-size: 14px;
    font-weight: bold;
    margin-bottom: 4px;
    text-shadow: 1px 1px 2px black;
  }
  
  .tooltip-rarity {
    font-size: 11px;
    opacity: 0.8;
    margin-bottom: 8px;
  }
  
  .tooltip-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, #4a4a6a, transparent);
    margin: 8px 0;
  }
  
  .tooltip-affixes {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .affix-line {
    color: #88ff88;
    font-size: 12px;
    font-family: 'Segoe UI', sans-serif;
  }
  
  .tooltip-base-stats {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .base-stat-line {
    color: #aaccff;
    font-size: 12px;
    font-family: 'Segoe UI', sans-serif;
  }
</style>
