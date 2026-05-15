import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    // Setup composer
    this.composer = new EffectComposer(renderer);
    
    // Setup render pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    
    // Setup bloom pass for a magical, dreamy "God Level" look
    const resolution = new THREE.Vector2(window.innerWidth, window.innerHeight);
    // Parameters: resolution, strength, radius, threshold
    this.bloomPass = new UnrealBloomPass(resolution, 1.8, 1.2, 0.65);
    this.composer.addPass(this.bloomPass);
  }

  setSize(width, height) {
    this.composer.setSize(width, height);
  }

  render(deltaTime) {
    this.composer.render(deltaTime);
  }
  
  setBloomIntensity(intensity) {
    this.bloomPass.strength = intensity;
  }
}
