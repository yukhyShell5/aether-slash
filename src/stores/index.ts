// Svelte stores exports
export { 
  playerHealth, 
  healthPercent,
  playerMana, 
  manaPercent,
  playerExperience, 
  expPercent,
  playerStats,
  targetInfo,
} from './player';

export {
  inventorySlots,
  addItemToInventory,
  removeItemFromInventory,
  clearInventory,
  isInventoryFull,
  findEmptySlot,
  type InventorySlot,
} from './inventory';
