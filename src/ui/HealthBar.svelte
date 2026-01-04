<script lang="ts">
  import { playerHealth, healthPercent, playerMana, manaPercent } from '../stores/player';
  
  // Derived values from stores
  const healthColor = $derived($healthPercent > 60 ? '#22c55e' : $healthPercent > 30 ? '#eab308' : '#ef4444');

  // Keep setHealth for backwards compatibility during transition
  export function setHealth(current: number, max: number) {
    playerHealth.set({ current, max });
  }
</script>

<div class="health-container">
  <div class="health-bar">
    <div 
      class="health-fill" 
      style="width: {$healthPercent}%; background-color: {healthColor};"
    ></div>
    <div class="health-text">
      {Math.round($playerHealth.current)} / {$playerHealth.max}
    </div>
  </div>
  <div class="mana-bar">
    <div class="mana-fill" style="width: {$manaPercent}%;"></div>
    <div class="mana-text">
      {Math.round($playerMana.current)} / {$playerMana.max}
    </div>
  </div>
</div>

<style>
  .health-container {
    position: absolute;
    bottom: 20px;
    left: 20px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 4px;
    pointer-events: auto;
  }

  .health-bar, .mana-bar {
    width: 220px;
    height: 24px;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 4px;
    overflow: hidden;
    position: relative;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
  }

  .health-fill {
    height: 100%;
    transition: width 0.2s ease, background-color 0.3s ease;
    background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
  }

  .mana-bar {
    height: 16px;
  }

  .mana-fill {
    height: 100%;
    background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
    transition: width 0.2s ease;
  }

  .health-text, .mana-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: white;
    font-family: 'Segoe UI', sans-serif;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 1px 1px 2px black;
  }
  
  .mana-text {
    font-size: 10px;
  }
</style>
