import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';

/**
 * CSS2D Renderer Manager
 * Handles text rendering above 3D entities (more performant than 3D text)
 */
export class CSS2DManager {
  public renderer: CSS2DRenderer;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderer = new CSS2DRenderer();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.pointerEvents = 'none';
    this.renderer.domElement.style.zIndex = '10';
    container.appendChild(this.renderer.domElement);
  }

  /**
   * Update renderer size on window resize
   */
  setSize(width: number, height: number): void {
    this.renderer.setSize(width, height);
  }

  /**
   * Render the CSS2D layer
   */
  render(scene: THREE.Scene, camera: THREE.Camera): void {
    this.renderer.render(scene, camera);
  }

  /**
   * Create a CSS2D text object
   */
  createTextObject(text: string, className: string = ''): CSS2DObject {
    const div = document.createElement('div');
    div.className = `floating-text ${className}`;
    div.textContent = text;
    return new CSS2DObject(div);
  }

  /**
   * Dispose of the renderer
   */
  dispose(): void {
    this.container.removeChild(this.renderer.domElement);
  }
}

// Re-export CSS2DObject for convenience
export { CSS2DObject };
