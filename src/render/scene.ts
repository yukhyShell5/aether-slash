import * as THREE from 'three';
import { IsometricCamera } from './camera';

/**
 * Main Three.js scene wrapper with WebGPU/WebGL2 fallback
 */
export class GameScene {
  readonly scene: THREE.Scene;
  readonly renderer: THREE.WebGLRenderer;
  readonly isometricCamera: IsometricCamera;
  private animationId: number | null = null;
  private readonly container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Initialize renderer (WebGL2 with fallback)
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Initialize camera
    const aspect = container.clientWidth / container.clientHeight;
    this.isometricCamera = new IsometricCamera(aspect);

    // Setup scene
    this.setupLighting();
    this.setupGround();

    // Handle resize
    window.addEventListener('resize', this.handleResize);
  }

  private setupLighting(): void {
    // Ambient light for base illumination
    const ambient = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambient);

    // Directional light for shadows
    const directional = new THREE.DirectionalLight(0xffffff, 1.0);
    directional.position.set(10, 20, 10);
    directional.castShadow = true;
    this.scene.add(directional);

    // Hemisphere light for sky/ground variation
    const hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x362d1f, 0.4);
    this.scene.add(hemisphere);
  }

  private setupGround(): void {
    // Grid helper for visual reference
    const gridSize = 50;
    const gridDivisions = 50;
    const gridHelper = new THREE.GridHelper(
      gridSize,
      gridDivisions,
      0x4a4a6a,
      0x2a2a4a
    );
    this.scene.add(gridHelper);

    // Ground plane for raycasting (invisible)
    const groundGeometry = new THREE.PlaneGeometry(100, 100);
    const groundMaterial = new THREE.MeshBasicMaterial({
      visible: false,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.name = 'ground';
    this.scene.add(ground);
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.renderer.setSize(width, height);
    this.isometricCamera.updateAspect(width / height);
  };

  /**
   * Start the render loop
   */
  start(onUpdate: (deltaTime: number) => void): void {
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      this.animationId = requestAnimationFrame(animate);
      
      const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
      lastTime = currentTime;

      onUpdate(deltaTime);
      this.renderer.render(this.scene, this.isometricCamera.camera);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  /**
   * Stop the render loop
   */
  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    
    // Dispose of all scene objects
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((m) => m.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    
    this.renderer.dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}
