<script lang="ts">
  import { inventorySlots, type InventorySlot } from '../stores/inventory';
  import { playerStats } from '../stores/player';
  import { RarityEnum, EquipmentSlot } from '../core/components';
  import { equipItem, unequipItem, getEquippedItems, getSlotForItem, getSlotName } from '../core/equipment-system';
  import { updateEquipmentStore } from '../stores/equipment';
  import lootTables from '../data/loot_tables.json';
  
  interface Props {
    playerEid: number | null;
    onEquipmentChanged: (() => void) | null;
  }
  
  let { playerEid = null, onEquipmentChanged = null }: Props = $props();
  
  let isOpen = $state(false);
  let hoveredSlot = $state<InventorySlot | null>(null);
  let hoveredEquipSlot = $state<{ slot: number; itemData: any } | null>(null);
  let tooltipPos = $state({ x: 0, y: 0 });
  
  // Equipment data (refreshed on changes)
  let equippedItems = $state<Array<{ slot: number; slotName: string; itemData: any | null }>>([]);
  
  // Refresh equipment display
  function refreshEquipment() {
    if (playerEid !== null) {
      equippedItems = getEquippedItems(playerEid);
      updateEquipmentStore(equippedItems);
    }
  }

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

  function getItemColor(itemData: any): string {
    if (!itemData) return '#666';
    return rarityColors[itemData.rarity] || '#666';
  }

  function getItemIcon(itemData: any): string {
    if (!itemData) return '?';
    return itemData.name.charAt(0).toUpperCase();
  }
  
  // Equipment slot icons
  const slotIcons: Record<number, string> = {
    [EquipmentSlot.MAINHAND]: '⚔️',
    [EquipmentSlot.OFFHAND]: '🛡️',
    [EquipmentSlot.HEAD]: '🪖',
    [EquipmentSlot.CHEST]: '👕',
    [EquipmentSlot.LEGS]: '👖',
    [EquipmentSlot.FEET]: '👢',
    [EquipmentSlot.RING1]: '💍',
    [EquipmentSlot.RING2]: '💍',
    [EquipmentSlot.AMULET]: '📿',
  };
  
  function handleMouseEnterInventory(event: MouseEvent, slot: InventorySlot) {
    if (!slot.itemData) return;
    hoveredSlot = slot;
    hoveredEquipSlot = null;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    tooltipPos = { x: rect.right + 10, y: rect.top };
  }
  
  function handleMouseEnterEquip(event: MouseEvent, eq: { slot: number; itemData: any }) {
    if (!eq.itemData) return;
    hoveredEquipSlot = eq;
    hoveredSlot = null;
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    tooltipPos = { x: rect.right + 10, y: rect.top };
  }
  
  function handleMouseLeave() {
    hoveredSlot = null;
    hoveredEquipSlot = null;
  }
  
  /**
   * Handle double-click to equip item from inventory
   */
  function handleEquip(slot: InventorySlot, index: number) {
    if (!slot.itemData || playerEid === null) {
      console.log('❌ Cannot equip: no item data or no playerEid', { itemData: slot.itemData, playerEid });
      return;
    }
    
    // Check if item can be equipped
    const targetSlot = getSlotForItem(slot.itemData.baseItemId);
    if (targetSlot === null) {
      console.log('❌ Cet objet ne peut pas être équipé:', slot.itemData.baseItemId);
      return;
    }
    
    console.log(`🔄 Equipping ${slot.itemData.name} from slot ${index} to ${getSlotName(targetSlot)}`);
    
    // Equip the item
    if (equipItem(playerEid, index, targetSlot)) {
      console.log(`✅ ${slot.itemData.name} équipé!`);
      hoveredSlot = null;
      refreshEquipment();
      
      // Notify parent of equipment change
      if (onEquipmentChanged) {
        onEquipmentChanged();
      }
    } else {
      console.log('❌ equipItem returned false');
    }
  }
  
  /**
   * Handle double-click to unequip item
   */
  function handleUnequip(eq: { slot: number; itemData: any }) {
    if (!eq.itemData || playerEid === null) return;
    
    console.log(`🔄 Unequipping from slot ${getSlotName(eq.slot)}`);
    
    if (unequipItem(playerEid, eq.slot)) {
      console.log(`✅ ${eq.itemData.name} déséquipé!`);
      hoveredEquipSlot = null;
      refreshEquipment();
      
      if (onEquipmentChanged) {
        onEquipmentChanged();
      }
    }
  }

  export function toggle() {
    isOpen = !isOpen;
    if (!isOpen) {
      hoveredSlot = null;
      hoveredEquipSlot = null;
    } else {
      refreshEquipment();
    }
  }

  export function open() {
    isOpen = true;
    refreshEquipment();
  }

  export function close() {
    isOpen = false;
    hoveredSlot = null;
    hoveredEquipSlot = null;
  }
</script>

{#if isOpen}
<div class="inventory-overlay">
  <div class="inventory-panel">
    <div class="inventory-header">
      <h2>🎒 Inventaire & Équipement</h2>
      <button class="close-btn" onclick={toggle}>×</button>
    </div>
    
    <div class="content-grid">
      <!-- Equipment Section -->
      <div class="equipment-section">
        <h3>Équipement</h3>
        <div class="equipment-grid">
          {#each equippedItems as eq}
            <div 
              class="equipment-slot"
              class:filled={eq.itemData !== null}
              style={eq.itemData ? `border-color: ${getItemColor(eq.itemData)}` : ''}
              role="button"
              tabindex="0"
              onmouseenter={(e) => handleMouseEnterEquip(e, eq)}
              onmouseleave={handleMouseLeave}
              ondblclick={() => handleUnequip(eq)}
              onkeydown={(e) => e.key === 'Enter' && handleUnequip(eq)}
            >
              {#if eq.itemData}
                <span class="item-icon" style="color: {getItemColor(eq.itemData)}">
                  {getItemIcon(eq.itemData)}
                </span>
              {:else}
                <span class="slot-icon">{slotIcons[eq.slot] || '❓'}</span>
              {/if}
              <span class="slot-name">{eq.slotName}</span>
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Inventory Section -->
      <div class="inventory-section">
        <h3>Sac</h3>
        <div class="inventory-grid">
          {#each $inventorySlots as slot, index}
            <div 
              class="inventory-slot" 
              class:filled={slot.itemData !== null}
              class:equippable={slot.itemData !== null && getSlotForItem(slot.itemData.baseItemId) !== null}
              role="button"
              tabindex="0"
              onmouseenter={(e) => handleMouseEnterInventory(e, slot)}
              onmouseleave={handleMouseLeave}
              ondblclick={() => handleEquip(slot, index)}
              onkeydown={(e) => e.key === 'Enter' && handleEquip(slot, index)}
            >
              {#if slot.itemData}
                <div class="item-icon" style="color: {getItemColor(slot.itemData)};">
                  {getItemIcon(slot.itemData)}
                </div>
                <div class="item-rarity-indicator" style="background-color: {getItemColor(slot.itemData)};"></div>
              {/if}
            </div>
          {/each}
        </div>
      </div>
      
      <!-- Stats Section -->
      <div class="stats-section">
        <h3>Statistiques</h3>
        <div class="stats-grid">
          <div class="stat-row">
            <span class="stat-icon">❤️</span>
            <span class="stat-label">Vie max</span>
            <span class="stat-value">{$playerStats.maxHealth}</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">💧</span>
            <span class="stat-label">Mana max</span>
            <span class="stat-value">{$playerStats.maxMana}</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">⚔️</span>
            <span class="stat-label">Dégâts</span>
            <span class="stat-value">{$playerStats.damageMin} - {$playerStats.damageMax}</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">⚡</span>
            <span class="stat-label">Vitesse d'attaque</span>
            <span class="stat-value">{$playerStats.attackSpeed.toFixed(2)}/s</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">🛡️</span>
            <span class="stat-label">Armure</span>
            <span class="stat-value">{$playerStats.armor}</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">💪</span>
            <span class="stat-label">Force</span>
            <span class="stat-value">{$playerStats.strength}</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">🧡</span>
            <span class="stat-label">Vitalité</span>
            <span class="stat-value">{$playerStats.vitality}</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">🎯</span>
            <span class="stat-label">Critique</span>
            <span class="stat-value">{$playerStats.critChance.toFixed(1)}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">💥</span>
            <span class="stat-label">Dégâts crit</span>
            <span class="stat-value">{$playerStats.critDamage}%</span>
          </div>
          <div class="stat-row">
            <span class="stat-icon">💚</span>
            <span class="stat-label">Régénération</span>
            <span class="stat-value">{$playerStats.healthRegen}/s</span>
          </div>
          {#if $playerStats.lifeSteal > 0}
          <div class="stat-row">
            <span class="stat-icon">🩸</span>
            <span class="stat-label">Vol de vie</span>
            <span class="stat-value">{$playerStats.lifeSteal}%</span>
          </div>
          {/if}
        </div>
      </div>
    </div>
    
    <div class="inventory-tip">
      <kbd>I</kbd> fermer • <strong>Double-clic</strong> pour équiper/déséquiper
    </div>
  </div>
  
  <!-- Tooltip -->
  {#if hoveredSlot?.itemData || hoveredEquipSlot?.itemData}
    {@const itemData = hoveredSlot?.itemData || hoveredEquipSlot?.itemData}
    {@const baseItem = lootTables.baseItems.find(b => b.id === itemData.baseItemId)}
    <div 
      class="item-tooltip" 
      style="left: {tooltipPos.x}px; top: {tooltipPos.y}px;"
    >
      <div class="tooltip-header" style="color: {getItemColor(itemData)};">
        {itemData.name}
      </div>
      <div class="tooltip-rarity" style="color: {getItemColor(itemData)};">
        {rarityNames[itemData.rarity]} • Niveau {itemData.level}
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
      {#if itemData.affixes && itemData.affixes.length > 0}
        <div class="tooltip-divider"></div>
        <div class="tooltip-affixes">
          {#each itemData.affixes as affix}
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
    min-width: 500px;
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
  
  .content-grid {
    display: flex;
    gap: 24px;
  }
  
  /* Equipment Section */
  .equipment-section {
    flex: 0 0 auto;
  }
  
  .equipment-section h3,
  .inventory-section h3,
  .stats-section h3 {
    margin: 0 0 12px 0;
    color: #aaa;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  
  /* Stats Section */
  .stats-section {
    flex: 0 0 160px;
    border-left: 1px solid #3a3a5a;
    padding-left: 16px;
  }
  
  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  
  .stat-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
  }
  
  .stat-icon {
    width: 18px;
    text-align: center;
  }
  
  .stat-label {
    flex: 1;
    color: #888;
  }
  
  .stat-value {
    color: #4a9eff;
    font-weight: bold;
    font-family: monospace;
  }
  
  .equipment-grid {
    display: grid;
    grid-template-columns: repeat(3, 50px);
    gap: 6px;
  }
  
  .equipment-slot {
    width: 50px;
    height: 50px;
    background: rgba(0, 0, 0, 0.4);
    border: 2px solid #3a3a5a;
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
  
  .equipment-slot .slot-icon {
    font-size: 16px;
    opacity: 0.5;
  }
  
  .equipment-slot .slot-name {
    font-size: 7px;
    color: #666;
    text-align: center;
    margin-top: 2px;
  }
  
  .equipment-slot .item-icon {
    font-size: 18px;
    font-weight: bold;
  }
  
  /* Inventory Section */
  .inventory-section {
    flex: 1;
  }

  .inventory-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
  }

  .inventory-slot {
    width: 50px;
    height: 50px;
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
  
  .inventory-slot.equippable:hover {
    border-color: #4a9eff;
    box-shadow: 0 0 12px rgba(74, 158, 255, 0.4);
  }

  .inventory-slot .item-icon {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 20px;
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

  .inventory-tip {
    margin-top: 16px;
    text-align: center;
    color: #666;
    font-size: 11px;
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
