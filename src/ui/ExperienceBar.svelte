<script lang="ts">
  import { playerExperience, expPercent } from '../stores/player';

  let currentXP = $derived($playerExperience.current);
  let maxXP = $derived($playerExperience.toNextLevel);
  let level = $derived($playerExperience.level);
  let percent = $derived($expPercent);
</script>

<div class="xp-bar-container">
  <div class="level-indicator">
    <span class="level-badge">{level}</span>
  </div>
  
  <div class="bar-background">
    <div 
      class="bar-fill" 
      style="width: {percent}%"
    ></div>
    <div class="xp-text">
      XP: {Math.floor(currentXP)} / {Math.floor(maxXP)} ({Math.floor(percent)}%)
    </div>
  </div>
</div>

<style>
  .xp-bar-container {
    position: fixed;
    bottom: 10px;
    left: 50%;
    transform: translateX(-50%);
    width: 600px;
    height: 24px;
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: auto;
    z-index: 100;
  }

  .level-indicator {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #FFD700, #B8860B);
    border: 3px solid #FFF;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 10px rgba(0,0,0,0.5);
    z-index: 101;
    position: relative;
  }

  .level-badge {
    color: #000;
    font-weight: 900;
    font-size: 18px;
    text-shadow: 0 1px 0 rgba(255,255,255,0.4);
  }

  .bar-background {
    flex: 1;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    border: 2px solid #555;
    border-radius: 12px;
    position: relative;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: linear-gradient(to right, #4a9eff, #8bc2ff);
    transition: width 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
    box-shadow: 0 0 10px rgba(74, 158, 255, 0.5);
  }

  .xp-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    color: #fff;
    font-size: 12px;
    font-weight: bold;
    text-shadow: 1px 1px 2px #000;
    white-space: nowrap;
    z-index: 2;
  }
</style>
