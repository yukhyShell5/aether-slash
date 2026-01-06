import * as THREE from 'three';

/**
 * Isometric camera controller
 * Uses OrthographicCamera at 45° angle typical for isometric games
 */
export class IsometricCamera {
  readonly camera: THREE.OrthographicCamera;
  private zoom = 20;
  private rotationAngle = Math.PI / 4; // 45 degrees
  private readonly tiltAngle = Math.atan(1 / Math.sqrt(2)); // ~35.264° for true isometric

  // Camera shake properties
  private shakeIntensity = 0;
  private shakeDuration = 0;
  private shakeTimer = 0;
  private basePosition = new THREE.Vector3();

  // Target tracking
  private target = new THREE.Vector3(0, 0, 0);
  private currentLookAt = new THREE.Vector3(0, 0, 0);
  private readonly followSmoothing = 8.0; // Higher = faster follow

  constructor(aspect: number) {
    const frustumSize = this.zoom;
    this.camera = new THREE.OrthographicCamera(
      -frustumSize * aspect,
      frustumSize * aspect,
      frustumSize,
      -frustumSize,
      0.1,
      1000
    );
    this.updateCameraPosition();
  }

  private updateCameraPosition(): void {
    const distance = 50;
    
    // Calculate position using spherical coordinates relative to target
    const x = this.currentLookAt.x + distance * Math.cos(this.tiltAngle) * Math.sin(this.rotationAngle);
    const y = this.currentLookAt.y + distance * Math.sin(this.tiltAngle);
    const z = this.currentLookAt.z + distance * Math.cos(this.tiltAngle) * Math.cos(this.rotationAngle);
    
    this.basePosition.set(x, y, z);
    this.camera.position.copy(this.basePosition);
    this.camera.lookAt(this.currentLookAt);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Set the target position for the camera to follow
   */
  setTarget(x: number, y: number, z: number): void {
    this.target.set(x, y, z);
  }

  /**
   * Update camera position to follow target (call each frame)
   */
  update(deltaTime: number): void {
    // Smooth follow - lerp towards target
    const t = Math.min(1, this.followSmoothing * deltaTime);
    this.currentLookAt.lerp(this.target, t);
    
    // Update camera position
    this.updateCameraPosition();
    
    // Update shake
    this.updateShake(deltaTime);
  }

  /**
   * Rotate camera around the scene
   * @param deltaAngle Rotation in radians
   */
  rotate(deltaAngle: number): void {
    this.rotationAngle += deltaAngle;
    this.updateCameraPosition();
  }

  /**
   * Zoom in/out
   * @param delta Zoom amount (positive = zoom in)
   */
  setZoom(delta: number): void {
    this.zoom = Math.max(5, Math.min(100, this.zoom - delta));
    const aspect = this.camera.right / this.camera.top;
    
    this.camera.left = -this.zoom * aspect;
    this.camera.right = this.zoom * aspect;
    this.camera.top = this.zoom;
    this.camera.bottom = -this.zoom;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Update camera aspect ratio on resize
   */
  updateAspect(aspect: number): void {
    this.camera.left = -this.zoom * aspect;
    this.camera.right = this.zoom * aspect;
    this.camera.top = this.zoom;
    this.camera.bottom = -this.zoom;
    this.camera.updateProjectionMatrix();
  }

  /**
   * Trigger camera shake effect
   * @param intensity Shake amplitude (0.1 = subtle, 0.5 = strong)
   * @param duration Duration in seconds
   */
  shakeCamera(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
    this.shakeTimer = duration;
  }

  /**
   * Update camera shake (call each frame)
   * @param deltaTime Time since last frame in seconds
   */
  private updateShake(deltaTime: number): void {
    if (this.shakeTimer <= 0) return;

    this.shakeTimer -= deltaTime;
    
    // Decay factor (shake decreases over time)
    const progress = this.shakeTimer / this.shakeDuration;
    const currentIntensity = this.shakeIntensity * progress;

    // Random offset
    const offsetX = (Math.random() - 0.5) * 2 * currentIntensity;
    const offsetY = (Math.random() - 0.5) * 2 * currentIntensity;
    const offsetZ = (Math.random() - 0.5) * 2 * currentIntensity;

    // Apply shake offset to camera position
    this.camera.position.set(
      this.basePosition.x + offsetX,
      this.basePosition.y + offsetY,
      this.basePosition.z + offsetZ
    );

    // Reset when done
    if (this.shakeTimer <= 0) {
      this.shakeTimer = 0;
      this.camera.position.copy(this.basePosition);
    }
  }

  getZoom(): number {
    return this.zoom;
  }

  getRotationAngle(): number {
    return this.rotationAngle;
  }
}

