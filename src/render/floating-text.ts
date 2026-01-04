import * as THREE from 'three';
import { CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * Floating text instance data
 */
interface FloatingTextInstance {
  object: CSS2DObject;
  element: HTMLDivElement;
  timer: number;
  duration: number;
  startY: number;
  riseSpeed: number;
  active: boolean;
}

const POOL_SIZE = 30;
const DEFAULT_DURATION = 1.0;
const RISE_SPEED = 2.0;

/**
 * Object pool for floating combat text
 * Uses CSS2DObject for performant text rendering
 */
export class FloatingTextPool {
  private pool: FloatingTextInstance[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initPool();
    this.injectStyles();
  }

  /**
   * Initialize the object pool
   */
  private initPool(): void {
    for (let i = 0; i < POOL_SIZE; i++) {
      const element = document.createElement('div');
      element.className = 'floating-combat-text';
      element.style.display = 'none';

      const object = new CSS2DObject(element);
      object.visible = false;

      this.pool.push({
        object,
        element,
        timer: 0,
        duration: DEFAULT_DURATION,
        startY: 0,
        riseSpeed: RISE_SPEED,
        active: false,
      });
    }
  }

  /**
   * Inject CSS styles for floating text
   */
  private injectStyles(): void {
    if (document.getElementById('floating-text-styles')) return;

    const style = document.createElement('style');
    style.id = 'floating-text-styles';
    style.textContent = `
      .floating-combat-text {
        font-family: 'Segoe UI', Arial, sans-serif;
        font-weight: bold;
        font-size: 18px;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.8),
                     -1px -1px 2px rgba(0, 0, 0, 0.5);
        pointer-events: none;
        white-space: nowrap;
        transition: opacity 0.1s ease;
        position: relative;
        transform-origin: center center;
      }
      .floating-combat-text.damage { color: #ff4444; }
      .floating-combat-text.crit { 
        color: #ffdd00; 
        font-size: 24px;
      }
      .floating-combat-text.heal { color: #44ff44; }
      .floating-combat-text.miss { color: #aaaaaa; font-style: italic; }
      .floating-combat-text.exp { color: #aa88ff; font-size: 14px; }
    `;
    document.head.appendChild(style);
  }

  /**
   * Get an available text instance from the pool
   */
  private acquire(): FloatingTextInstance | null {
    for (const instance of this.pool) {
      if (!instance.active) {
        return instance;
      }
    }
    return null;
  }

  /**
   * Spawn floating damage text
   */
  spawnDamage(x: number, y: number, z: number, damage: number, isCrit: boolean = false): void {
    const instance = this.acquire();
    if (!instance) return;

    const text = isCrit ? `CRIT ${Math.round(damage)}!` : `-${Math.round(damage)}`;
    this.spawn(instance, x, y, z, text, isCrit ? 'crit' : 'damage');
  }

  /**
   * Spawn floating heal text
   */
  spawnHeal(x: number, y: number, z: number, amount: number): void {
    const instance = this.acquire();
    if (!instance) return;

    this.spawn(instance, x, y, z, `+${Math.round(amount)}`, 'heal');
  }

  /**
   * Spawn miss text
   */
  spawnMiss(x: number, y: number, z: number): void {
    const instance = this.acquire();
    if (!instance) return;

    this.spawn(instance, x, y, z, 'MISS', 'miss');
  }

  /**
   * Spawn experience text
   */
  spawnExp(x: number, y: number, z: number, amount: number): void {
    const instance = this.acquire();
    if (!instance) return;

    this.spawn(instance, x, y, z, `+${amount} XP`, 'exp');
  }

  /**
   * Generic spawn function
   */
  private spawn(
    instance: FloatingTextInstance,
    x: number, y: number, z: number,
    text: string,
    type: string
  ): void {
    instance.element.textContent = text;
    instance.element.className = `floating-combat-text ${type}`;
    instance.element.style.display = 'block';
    instance.element.style.opacity = '1';

    instance.object.position.set(x, y + 1.5, z);
    instance.object.visible = true;
    instance.startY = y + 1.5;
    instance.timer = 0;
    instance.duration = type === 'crit' ? 1.2 : DEFAULT_DURATION;
    instance.riseSpeed = type === 'crit' ? 2.5 : RISE_SPEED;
    instance.active = true;

    // Add random horizontal offset for variety
    const offsetX = (Math.random() - 0.5) * 0.5;
    instance.object.position.x += offsetX;

    if (!instance.object.parent) {
      this.scene.add(instance.object);
    }
  }

  /**
   * Update all active floating texts
   */
  update(deltaTime: number): void {
    for (const instance of this.pool) {
      if (!instance.active) continue;

      instance.timer += deltaTime;
      const progress = instance.timer / instance.duration;

      // Rise animation
      instance.object.position.y = instance.startY + progress * instance.riseSpeed;

      // Fade out in last 30% of duration
      if (progress > 0.7) {
        const fadeProgress = (progress - 0.7) / 0.3;
        instance.element.style.opacity = String(1 - fadeProgress);
      }

      // Deactivate when done
      if (progress >= 1) {
        instance.active = false;
        instance.object.visible = false;
        instance.element.style.display = 'none';
      }
    }
  }

  /**
   * Dispose of the pool
   */
  dispose(): void {
    for (const instance of this.pool) {
      if (instance.object.parent) {
        this.scene.remove(instance.object);
      }
    }
    this.pool = [];
  }
}
