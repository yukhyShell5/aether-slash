/**
 * Level Up VFX - Particle system for level up celebrations
 */
import * as THREE from 'three';

const PARTICLE_COUNT = 50;
const PARTICLE_LIFETIME = 1.5; // seconds
const RING_RADIUS = 1.5;
const RISE_SPEED = 3;
const EXPANSION_SPEED = 2;

interface LevelUpEffect {
  mesh: THREE.Points;
  startTime: number;
  position: THREE.Vector3;
  velocities: Float32Array;
}

/**
 * Level Up VFX Manager
 */
export class LevelUpVFX {
  private scene: THREE.Scene;
  private activeEffects: LevelUpEffect[] = [];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    
    // Create shared geometry for particles
    this.geometry = new THREE.BufferGeometry();
    
    // Create material with golden glow
    this.material = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.15,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }
  
  /**
   * Spawn a level up effect at position
   */
  spawn(x: number, y: number, z: number): void {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    
    // Initialize particles in a ring
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      const radius = RING_RADIUS * (0.8 + Math.random() * 0.4);
      
      // Starting position (ring around player)
      positions[i * 3] = x + Math.cos(angle) * radius * 0.3;
      positions[i * 3 + 1] = y + 0.5;
      positions[i * 3 + 2] = z + Math.sin(angle) * radius * 0.3;
      
      // Velocity (outward + upward)
      velocities[i * 3] = Math.cos(angle) * EXPANSION_SPEED + (Math.random() - 0.5) * 0.5;
      velocities[i * 3 + 1] = RISE_SPEED + Math.random() * 1.5;
      velocities[i * 3 + 2] = Math.sin(angle) * EXPANSION_SPEED + (Math.random() - 0.5) * 0.5;
    }
    
    // Create new geometry instance for this effect
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    // Create mesh
    const mesh = new THREE.Points(geometry, this.material.clone());
    this.scene.add(mesh);
    
    this.activeEffects.push({
      mesh,
      startTime: performance.now() / 1000,
      position: new THREE.Vector3(x, y, z),
      velocities,
    });
    
    console.log('✨ Level Up VFX spawned!');
  }
  
  /**
   * Update all active effects
   */
  update(deltaTime: number): void {
    const currentTime = performance.now() / 1000;
    
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const effect = this.activeEffects[i];
      const elapsed = currentTime - effect.startTime;
      const progress = elapsed / PARTICLE_LIFETIME;
      
      if (progress >= 1) {
        // Remove expired effect
        this.scene.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        (effect.mesh.material as THREE.Material).dispose();
        this.activeEffects.splice(i, 1);
        continue;
      }
      
      // Update particle positions
      const positions = effect.mesh.geometry.attributes.position.array as Float32Array;
      
      for (let j = 0; j < PARTICLE_COUNT; j++) {
        positions[j * 3] += effect.velocities[j * 3] * deltaTime;
        positions[j * 3 + 1] += effect.velocities[j * 3 + 1] * deltaTime;
        positions[j * 3 + 2] += effect.velocities[j * 3 + 2] * deltaTime;
        
        // Slow down over time
        effect.velocities[j * 3] *= 0.98;
        effect.velocities[j * 3 + 1] *= 0.97;
        effect.velocities[j * 3 + 2] *= 0.98;
      }
      
      effect.mesh.geometry.attributes.position.needsUpdate = true;
      
      // Fade out
      const mat = effect.mesh.material as THREE.PointsMaterial;
      mat.opacity = 1 - progress;
      
      // Color shift from gold to white
      const colorProgress = Math.min(progress * 2, 1);
      mat.color.setRGB(
        1,
        0.84 + colorProgress * 0.16,
        colorProgress
      );
    }
  }
  
  /**
   * Dispose of resources
   */
  dispose(): void {
    for (const effect of this.activeEffects) {
      this.scene.remove(effect.mesh);
      effect.mesh.geometry.dispose();
      (effect.mesh.material as THREE.Material).dispose();
    }
    this.activeEffects = [];
    this.geometry.dispose();
    this.material.dispose();
  }
}
