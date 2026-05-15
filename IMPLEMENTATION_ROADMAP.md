# 🎬 Implementation Roadmap: From Concept to Production

## PHASE 1: CORE INFRASTRUCTURE (Weeks 1-2)

### 1.1 Enhanced Three.js World Class
**File:** `src/utils/BirthdayWorld.js` (extend significantly)

**Goals:**
- Refactor to support 15 scenes with proper lifecycle management
- Implement smooth interpolation system for camera + parameters
- Add shader compilation pipeline
- Implement LOD system

**Key Methods to Add:**
```javascript
class BirthdayWorld {
  // Scene management
  registerScene(index, {geometry, materials, lights, particles, audio})
  getSceneProgress(globalProgress) // Returns 0-1 for current scene
  transitionScene(fromIndex, toIndex, duration) // Smooth crossfade
  
  // Camera choreography
  moveCameraAlongPath(waypoints, progress, easingFunction)
  orbitCamera(center, radius, angle, speed)
  
  // Particle & physics
  createParticleSystem(config) // Returns particle controller
  applyGravity(particles, delta)
  applyWind(particles, windVector, delta)
  
  // Rendering optimization
  updateLOD(camera) // Adjust geometry detail based on distance
  renderWithBlooming() // Post-processing
  
  // Timeline synchronization
  updateAudio(progress) // Sync music to scroll
  triggerSceneEvents(progress)
}
```

### 1.2 Scroll Integration Layer
**File:** `src/utils/ScrollController.js` (NEW)

**Implementation:**
```javascript
export class ScrollController {
  constructor(worldInstance) {
    this.world = worldInstance;
    this.scrollProgress = 0;
    this.maxScroll = 0;
    this.setupScrollSync();
  }
  
  setupScrollSync() {
    // Using Intersection Observer + requestAnimationFrame for smooth sync
    // NOT polling scroll events (too jittery)
    window.addEventListener('scroll', this.handleScroll.bind(this), { passive: true });
    gsap.registerPlugin(ScrollTrigger);
  }
  
  handleScroll() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    this.scrollProgress = Math.max(0, Math.min(1, scrollTop / docHeight));
    
    // Update world in sync with animation frame
    this.world.setProgress(this.scrollProgress);
  }
  
  // Trigger additional effects based on progress
  triggerSceneTransitions(progress) {
    const sceneIndex = Math.floor(progress * 11);
    if (sceneIndex !== this.currentScene) {
      this.onSceneChange(sceneIndex);
    }
  }
}
```

### 1.3 Shader Management System
**File:** `src/utils/ShaderManager.js` (NEW)

**Purpose:** Centralized shader compilation, error handling, hot-reloading

```javascript
export class ShaderManager {
  constructor(renderer) {
    this.renderer = renderer;
    this.shaders = new Map();
  }
  
  loadShader(name, vertexPath, fragmentPath) {
    // Load + compile shader
    // Cache compiled material
    // Return THREE.ShaderMaterial
  }
  
  compileShaderProgram(vert, frag) {
    // Compile with error handling
    // Return WebGLProgram
  }
}
```

---

## PHASE 2: SCENE SYSTEMS (Weeks 2-4)

### 2.1 Particle System Architecture
**File:** `src/utils/ParticleSystem.js` (NEW - CRITICAL)

**This is the foundation for ALL effects:**

```javascript
export class ParticleSystem {
  constructor(config = {}) {
    this.config = {
      maxParticles: 5000,
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      acceleration: new THREE.Vector3(0, -9.8, 0), // gravity
      lifetime: 2.0,
      ...config
    };
    
    this.particles = [];
    this.deadParticles = [];
    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial();
    this.mesh = new THREE.Points(this.geometry, this.material);
  }
  
  // Core methods
  spawn(pos, vel, lifetime, color, size) {
    // Efficient object pooling
    let particle;
    if (this.deadParticles.length > 0) {
      particle = this.deadParticles.pop();
      particle.reset();
    } else {
      particle = new Particle(pos, vel, lifetime, color, size);
    }
    this.particles.push(particle);
    return particle;
  }
  
  update(deltaTime) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].update(deltaTime);
      if (this.particles[i].isDead) {
        this.deadParticles.push(this.particles.splice(i, 1)[0]);
      }
    }
    this.updateGeometry();
  }
  
  burst(position, velocityRange, particleCount, color) {
    for (let i = 0; i < particleCount; i++) {
      const vel = this.randomVelocity(velocityRange);
      this.spawn(position, vel, 2.0, color, 0.5);
    }
  }
  
  updateGeometry() {
    // Update buffer geometry for rendering
    // Use THREE.BufferAttribute for positions, colors, sizes
  }
}

class Particle {
  constructor(pos, vel, lifetime, color, size) {
    this.position = pos.clone();
    this.velocity = vel.clone();
    this.acceleration = new THREE.Vector3(0, -9.8, 0);
    this.lifetime = lifetime;
    this.age = 0;
    this.color = color;
    this.size = size;
  }
  
  update(deltaTime) {
    this.velocity.addScaledVector(this.acceleration, deltaTime);
    this.velocity.multiplyScalar(0.98); // air resistance
    this.position.addScaledVector(this.velocity, deltaTime);
    this.age += deltaTime;
  }
  
  get isDead() {
    return this.age >= this.lifetime;
  }
}
```

### 2.2 Enhanced Ocean Renderer
**File:** `src/utils/Ocean.js` (NEW)

**Advanced water simulation:**

```javascript
export class Ocean {
  constructor(scene, size = 400) {
    this.geometry = new THREE.PlaneGeometry(size, size, 256, 256);
    this.material = this.createOceanMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    scene.add(this.mesh);
    
    // Gerstner waves configuration
    this.waves = [
      { direction: new THREE.Vector2(1, 0).normalize(), amplitude: 2.0, wavelength: 60, speed: 3.0 },
      { direction: new THREE.Vector2(0.8, 0.6).normalize(), amplitude: 1.5, wavelength: 40, speed: 2.5 },
      { direction: new THREE.Vector2(-0.5, 0.5).normalize(), amplitude: 1.0, wavelength: 25, speed: 2.0 }
    ];
  }
  
  createOceanMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        waves: { value: this.createWaveUniform() },
        caustics: { value: new THREE.TextureLoader().load('caustics.jpg') },
      },
      vertexShader: this.oceanVertexShader,
      fragmentShader: this.oceanFragmentShader,
      side: THREE.DoubleSide,
    });
  }
  
  oceanVertexShader = `
    // Gerstner wave calculation
    vec3 gerstnerWave(vec4 wave, vec3 p) {
      float steepness = wave.z;
      float wavelength = wave.w;
      float k = 2.0 * 3.14159 / wavelength;
      float c = sqrt(9.8 / k);
      vec2 d = normalize(wave.xy);
      float f = k * (dot(d, p.xz) - c * time);
      float a = steepness / k;
      
      return vec3(
        d.x * (a * cos(f)),
        a * sin(f),
        d.y * (a * cos(f))
      );
    }
    
    void main() {
      // Sample 3 waves, sum them
      vec3 p = position;
      p += gerstnerWave(vec4(1.0, 0.0, 0.25, 60.0), position);
      p += gerstnerWave(vec4(0.8, 0.6, 0.15, 40.0), position);
      p += gerstnerWave(vec4(-0.5, 0.5, 0.1, 25.0), position);
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;
  
  oceanFragmentShader = `
    // Fresnel + reflection + refraction
    uniform sampler2D caustics;
    
    void main() {
      vec3 color = mix(
        vec3(0.1, 0.3, 0.6),  // deep
        vec3(0.2, 0.7, 1.0),  // shallow
        gl_FragCoord.y / 800.0
      );
      
      gl_FragColor = vec4(color, 0.8);
    }
  `;
  
  update(deltaTime) {
    this.material.uniforms.time.value += deltaTime;
  }
}
```

### 2.3 Camera Path System
**File:** `src/utils/CameraPath.js` (NEW)

**Smooth Bezier-based camera interpolation:**

```javascript
export class CameraPath {
  constructor(waypoints = []) {
    this.waypoints = waypoints; // Array of {pos, target, duration}
    this.currentWaypoint = 0;
    this.pathProgress = 0;
  }
  
  updateCamera(camera, globalProgress) {
    const sceneIndex = Math.floor(globalProgress * 11);
    const localProgress = (globalProgress * 11) % 1;
    
    if (sceneIndex >= this.waypoints.length) return;
    
    const current = this.waypoints[sceneIndex];
    const next = this.waypoints[Math.min(sceneIndex + 1, this.waypoints.length - 1)];
    
    // Hermite interpolation for smooth motion
    const eased = this.easeInOutCubic(localProgress);
    
    camera.position.lerp(next.pos, eased);
    const targetLerpPos = new THREE.Vector3().lerpVectors(current.target, next.target, eased);
    camera.lookAt(targetLerpPos);
  }
  
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
```

---

## PHASE 3: AUDIO SYSTEM (Weeks 3-4)

### 3.1 Web Audio API Synthesizer
**File:** `src/utils/MusicEngine.js` (COMPLETE REWRITE)

**Advanced synth-based music generation:**

```javascript
export class MusicEngine {
  constructor() {
    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    
    this.synths = [];
    this.currentScene = 0;
    this.isPlaying = false;
  }
  
  // Scene music definitions
  sceneMusicNotes = {
    0: {
      bpm: 40,
      key: 'D',
      chords: ['D2', 'D2', 'D2'], // Deep drone
      bassline: [],
      melody: [],
    },
    1: {
      bpm: 60,
      key: 'Em',
      chords: ['Em', 'Em', 'Em', 'Am'],
      bassline: ['E1', 'E1', 'A1', 'A1'],
      melody: ['E4', 'G4', 'B4', 'G4'],
    },
    // ... all 11 scenes
  };
  
  playSceneMusic(sceneIndex) {
    if (this.currentScene === sceneIndex) return;
    
    const sceneMusic = this.sceneMusicNotes[sceneIndex];
    
    // Stop previous
    this.stopAllSynths();
    
    // Create synths for this scene
    const basslineSynth = this.createSynth('triangle', 0.3);
    const chordSynth = this.createSynth('sine', 0.2);
    const melodySynth = this.createSynth('square', 0.25);
    
    // Schedule notes
    this.scheduleNotes(basslineSynth, sceneMusic.bassline, sceneMusic.bpm);
    this.scheduleNotes(chordSynth, sceneMusic.chords, sceneMusic.bpm);
    this.scheduleNotes(melodySynth, sceneMusic.melody, sceneMusic.bpm * 2);
    
    this.currentScene = sceneIndex;
  }
  
  createSynth(waveform, volume) {
    const oscillator = this.audioContext.createOscillator();
    const envelope = this.audioContext.createGain();
    
    oscillator.type = waveform;
    envelope.gain.value = 0;
    envelope.connect(this.masterGain);
    oscillator.connect(envelope);
    oscillator.start();
    
    return { oscillator, envelope, gain: volume };
  }
  
  scheduleNotes(synth, notes, bpm) {
    const beatDuration = 60 / bpm;
    let currentTime = this.audioContext.currentTime;
    
    notes.forEach(note => {
      synth.oscillator.frequency.setTargetAtTime(
        this.noteToFrequency(note),
        currentTime,
        0.01
      );
      
      // ADSR envelope
      synth.envelope.gain.setValueAtTime(0, currentTime);
      synth.envelope.gain.linearRampToValueAtTime(synth.gain, currentTime + 0.01); // Attack
      synth.envelope.gain.linearRampToValueAtTime(synth.gain * 0.7, currentTime + 0.1); // Decay
      synth.envelope.gain.setValueAtTime(synth.gain * 0.7, currentTime + beatDuration - 0.1); // Sustain
      synth.envelope.gain.linearRampToValueAtTime(0, currentTime + beatDuration); // Release
      
      currentTime += beatDuration;
    });
  }
  
  noteToFrequency(note) {
    // C4 = 261.63 Hz base
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octaveRegex = /([A-G#]+)(\d)/;
    const match = note.match(octaveRegex);
    
    if (!match) return 440;
    
    const noteName = match[1];
    const octave = parseInt(match[2]);
    const noteIndex = notes.indexOf(noteName);
    const semitones = (octave - 4) * 12 + noteIndex;
    
    return 261.63 * Math.pow(2, semitones / 12);
  }
  
  play() {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isPlaying = true;
  }
  
  stop() {
    this.stopAllSynths();
    this.isPlaying = false;
  }
  
  stopAllSynths() {
    this.synths.forEach(synth => {
      synth.oscillator.stop();
      synth.envelope.disconnect();
    });
    this.synths = [];
  }
}
```

### 3.2 SFX Trigger System
**File:** `src/utils/SoundEffects.js` (NEW)

```javascript
export class SoundEffects {
  constructor(audioContext) {
    this.audioContext = audioContext;
    this.masterGain = this.audioContext.createGain();
    this.masterGain.connect(this.audioContext.destination);
    this.sfxLibrary = new Map();
    
    this.initializeSFX();
  }
  
  initializeSFX() {
    // Synthesized sound effects (no file dependencies)
    this.sfxLibrary.set('sparkle', () => this.generateSparkle());
    this.sfxLibrary.set('whoosh', () => this.generateWhoosh());
    this.sfxLibrary.set('explosion', () => this.generateExplosion());
    this.sfxLibrary.set('chime', () => this.generateChime());
  }
  
  play(effectName, time = this.audioContext.currentTime) {
    if (this.sfxLibrary.has(effectName)) {
      const effect = this.sfxLibrary.get(effectName);
      effect.call(this, time);
    }
  }
  
  generateSparkle(time = this.audioContext.currentTime) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    osc.connect(gain);
    gain.connect(this.masterGain);
    
    // Frequency sweep: high to low
    osc.frequency.setValueAtTime(4000, time);
    osc.frequency.exponentialRampToValueAtTime(2000, time + 0.1);
    
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    osc.start(time);
    osc.stop(time + 0.1);
  }
  
  generateWhoosh(time = this.audioContext.currentTime) {
    // Similar sweep, longer duration, lower frequency range
    // Implement similar pattern
  }
  
  generateExplosion(time = this.audioContext.currentTime) {
    // Combination of noise + tone burst
    // Use BiquadFilter + brown noise
  }
}
```

---

## PHASE 4: ADVANCED RENDERING (Weeks 4-5)

### 4.1 Post-Processing Pipeline
**File:** `src/utils/PostProcessing.js` (NEW)

```javascript
export class PostProcessing {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, camera));
    
    // Bloom pass (for glowing objects)
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.5, // strength
      0.4, // radius
      0.85 // threshold
    );
    this.composer.addPass(this.bloomPass);
    
    // Ambient Occlusion
    this.ssaoPass = new SSAOPass(scene, camera);
    this.ssaoPass.output = SSAOPass.OUTPUT.Beauty;
    this.ssaoPass.kernelRadius = 16;
    this.composer.addPass(this.ssaoPass);
    
    // Tone mapping
    this.shaderPass = new ShaderPass(THREE.ACESFilmicToneMapping);
    this.composer.addPass(this.shaderPass);
  }
  
  render() {
    this.composer.render();
  }
  
  adjustBloom(intensity) {
    this.bloomPass.strength = intensity;
  }
}
```

### 4.2 Advanced Lighting System
**File:** `src/utils/LightingSystem.js` (NEW)

```javascript
export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.lights = [];
    
    this.setupEnvironmentLighting();
    this.setupDynamicLights();
  }
  
  setupEnvironmentLighting() {
    // HDR environment map loading (if available)
    // Fallback to procedural sky + hemisphere light
    
    const skyLight = new THREE.HemisphereLight(0xe8f4f8, 0x1a3f4f, 0.6);
    this.scene.add(skyLight);
    
    const directional = new THREE.DirectionalLight(0xffffff, 0.8);
    directional.position.set(50, 40, 50);
    directional.castShadow = true;
    directional.shadow.mapSize.width = 2048;
    directional.shadow.mapSize.height = 2048;
    directional.shadow.camera.far = 500;
    this.scene.add(directional);
    
    this.lights.push(skyLight, directional);
  }
  
  setupDynamicLights() {
    // Pool of point lights for particles/effects
    this.dynamicLightPool = [];
    for (let i = 0; i < 50; i++) {
      const light = new THREE.PointLight(0xffffff, 0);
      light.castShadow = false; // Too expensive for dynamic
      this.scene.add(light);
      this.dynamicLightPool.push(light);
    }
  }
  
  addTemporaryLight(position, color, intensity, duration) {
    const light = this.dynamicLightPool.find(l => l.intensity === 0);
    if (light) {
      light.position.copy(position);
      light.color.setHex(color);
      light.intensity = intensity;
      
      // Fade out
      gsap.to(light, {
        intensity: 0,
        duration: duration,
      });
    }
  }
}
```

---

## PHASE 5: SCENE-SPECIFIC IMPLEMENTATIONS (Weeks 5-6)

### 5.1 Fireworks System (Scene 7)
**File:** `src/utils/Fireworks.js` (NEW)

```javascript
export class Fireworks {
  constructor(scene, particleSystem) {
    this.scene = scene;
    this.particleSystem = particleSystem;
    this.activeExplosions = [];
  }
  
  trigger(position, particleCount = 300, color = 0xff0000) {
    // Launch phase: Single projectile rises
    const launchDuration = 1.5;
    const burstHeight = 300;
    const burstPosition = position.clone();
    burstPosition.y += burstHeight;
    
    // Trail particles during ascent
    const trailParticles = 20;
    for (let i = 0; i < trailParticles; i++) {
      const delay = (i / trailParticles) * launchDuration;
      const trailPos = new THREE.Vector3().lerpVectors(position, burstPosition, delay / launchDuration);
      this.particleSystem.spawn(trailPos, new THREE.Vector3(0, 0, 0), 0.5, color, 0.3);
    }
    
    // Burst phase: Explosion at peak
    setTimeout(() => {
      this.createExplosion(burstPosition, particleCount, color);
    }, launchDuration * 1000);
  }
  
  createExplosion(position, particleCount, color) {
    // Emit particles in all directions
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI - Math.PI / 2;
      
      const vel = new THREE.Vector3(
        Math.cos(elevation) * Math.cos(angle) * 50,
        Math.cos(elevation) * Math.sin(angle) * 50 + Math.random() * 20,
        Math.sin(elevation) * 50
      );
      
      const life = 2 + Math.random() * 1;
      this.particleSystem.spawn(position, vel, life, color, 0.8);
    }
  }
  
  triggerSequence(position, count = 8, interval = 0.5) {
    // Multiple bursts staggered
    const colors = [0xff0000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffaa00];
    
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 100,
          Math.random() * 50,
          (Math.random() - 0.5) * 100
        );
        const color = colors[i % colors.length];
        this.trigger(position.clone().add(offset), 300, color);
      }, i * interval * 1000);
    }
  }
}
```

### 5.2 Island Terrain Generation
**File:** `src/utils/IslandTerrain.js` (NEW)

```javascript
export class IslandTerrain {
  constructor(scene) {
    this.scene = scene;
    this.terrain = null;
    
    this.generateTerrain();
  }
  
  generateTerrain() {
    const geometry = new THREE.ConeGeometry(50, 40, 64, 64);
    
    // Perlin noise displacement
    const positions = geometry.attributes.position.array;
    const heightMap = this.generateHeightMap(256);
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const z = positions[i + 2];
      const u = (x / 50 + 1) / 2;
      const v = (z / 50 + 1) / 2;
      
      const height = this.sampleHeightMap(heightMap, u, v) * 40;
      positions[i + 1] = height;
    }
    
    geometry.computeVertexNormals();
    
    const material = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0,
      map: this.createTerrainTexture(),
    });
    
    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.castShadow = true;
    this.terrain.receiveShadow = true;
    this.scene.add(this.terrain);
  }
  
  generateHeightMap(size) {
    // Perlin noise using THREE.Math.perlin or simplex noise library
    const map = new Uint8Array(size * size);
    
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = i / size;
        const y = j / size;
        
        const value = this.perlin2D(x * 4, y * 4);
        map[i + j * size] = Math.floor((value + 1) / 2 * 255);
      }
    }
    
    return map;
  }
  
  perlin2D(x, y) {
    // Use THREE.Math.perlin or external library
    // Fallback: simple sine-based pseudo-Perlin
    return Math.sin(x) * Math.cos(y) * 0.5 + Math.sin(x * 0.5) * 0.3;
  }
  
  sampleHeightMap(map, u, v) {
    const size = Math.sqrt(map.length);
    const x = Math.floor(u * size);
    const y = Math.floor(v * size);
    return map[Math.min(x + y * size, map.length - 1)] / 255;
  }
  
  createTerrainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // Paint terrain texture (brown, sandy tones)
    const gradient = ctx.createLinearGradient(0, 0, 512, 512);
    gradient.addColorStop(0, '#5a4a3a');
    gradient.addColorStop(0.5, '#8b6f47');
    gradient.addColorStop(1, '#d4a574');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    
    // Add noise texture
    const imageData = ctx.getImageData(0, 0, 512, 512);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = Math.random() * 20 - 10;
      data[i] += noise;
      data[i + 1] += noise;
      data[i + 2] += noise;
    }
    ctx.putImageData(imageData, 0, 0);
    
    return new THREE.CanvasTexture(canvas);
  }
}
```

---

## PHASE 6: OPTIMIZATION & POLISH (Weeks 6-7)

### 6.1 Performance Monitoring
**File:** `src/utils/PerformanceMonitor.js` (NEW)

```javascript
export class PerformanceMonitor {
  constructor() {
    this.stats = new Stats();
    document.body.appendChild(this.stats.dom);
    
    this.metrics = {
      fps: 0,
      frameTime: 0,
      memoryUsage: 0,
    };
  }
  
  update() {
    this.stats.update();
    
    if (performance.memory) {
      this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
    }
  }
  
  getReport() {
    return {
      ...this.metrics,
      timestamp: Date.now(),
    };
  }
}
```

### 6.2 Mobile Optimization
**File:** `src/utils/MobileOptimizer.js` (NEW)

```javascript
export class MobileOptimizer {
  static optimizeForDevice() {
    const ua = navigator.userAgent;
    const isMobile = /Mobile|Android|iPhone/.test(ua);
    const isLowEnd = /Nexus 5|Galaxy S6|iPhone 5/.test(ua);
    
    return {
      maxParticles: isLowEnd ? 500 : isMobile ? 2000 : 5000,
      shadowMapSize: isLowEnd ? 512 : isMobile ? 1024 : 2048,
      bloomEnabled: !isLowEnd,
      ssaoEnabled: false,
      targetFPS: isMobile ? 30 : 60,
      textureQuality: isLowEnd ? 0.5 : 1.0,
    };
  }
}
```

---

## PHASE 7: INTEGRATION & TESTING (Week 7)

### 7.1 Main App Component Integration
**File:** `src/App.jsx` (Complete rewrite)

```javascript
import { useEffect, useRef, useState } from 'react';
import { BirthdayWorld } from './utils/BirthdayWorld';
import { MusicEngine } from './utils/MusicEngine';
import { ScrollController } from './utils/ScrollController';
import { PerformanceMonitor } from './utils/PerformanceMonitor';

const SCENES = [
  { title: 'A Universe Begins', description: '...' },
  // ... all 11 scenes
];

export default function App() {
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const scrollControllerRef = useRef(null);
  const musicRef = useRef(null);
  const perfMonitorRef = useRef(null);
  
  const [musicOn, setMusicOn] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  
  useEffect(() => {
    const world = new BirthdayWorld(canvasRef.current);
    worldRef.current = world;
    
    const scrollController = new ScrollController(world);
    scrollControllerRef.current = scrollController;
    
    const music = new MusicEngine();
    musicRef.current = music;
    
    const perfMonitor = new PerformanceMonitor();
    perfMonitorRef.current = perfMonitor;
    
    const handleScroll = () => {
      const progress = scrollControllerRef.current.scrollProgress;
      const sceneIdx = Math.floor(progress * 11);
      setCurrentScene(sceneIdx);
      
      if (musicOn) {
        musicRef.current.playSceneMusic(sceneIdx);
      }
      
      perfMonitor.update();
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      world.dispose();
    };
  }, [musicOn]);
  
  const toggleMusic = () => {
    if (musicOn) {
      musicRef.current?.stop();
    } else {
      musicRef.current?.play();
      musicRef.current?.playSceneMusic(currentScene);
    }
    setMusicOn(!musicOn);
  };
  
  return (
    <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
      
      {/* UI Overlay */}
      <div style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        color: '#fff',
        fontFamily: 'Arial',
      }}>
        <button
          onClick={toggleMusic}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: musicOn ? '#ff6b6b' : '#4ecdc4',
            color: '#fff',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
          }}
        >
          {musicOn ? '♪ Music On' : '♪ Music Off'}
        </button>
      </div>
      
      {/* Scene Text Overlay */}
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        color: '#fff',
        zIndex: 500,
        maxWidth: '80%',
      }}>
        <h1 style={{ fontSize: '3em', margin: '0 0 20px 0' }}>
          {SCENES[currentScene].title}
        </h1>
        <p style={{ fontSize: '1.2em', lineHeight: '1.6' }}>
          {SCENES[currentScene].description}
        </p>
      </div>
      
      {/* Scroll content (invisible, just for scroll height) */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: `${SCENES.length * 100}vh`,
        pointerEvents: 'none',
      }} />
    </div>
  );
}
```

---

## CRITICAL DEPENDENCIES TO ADD

```bash
npm install \
  three@latest \
  gsap@latest \
  @babel/polyfill \
  three-full \
  cannon-es \
  tone.js \
  stats.js \
  simplex-noise
```

**Version Lock:**
- `three`: "^0.165.0"
- `gsap`: "^3.12.5"
- `tone`: "^14.8.0"

---

## TESTING CHECKLIST

### Desktop (Chrome)
- [ ] 60 FPS at 2560×1440
- [ ] All shaders compile
- [ ] Scroll smooth (no jank)
- [ ] Music plays seamlessly
- [ ] All particles render
- [ ] Shadows visible

### Mobile (iPhone 12)
- [ ] 30-60 FPS
- [ ] Touch scroll works
- [ ] No white screen delay
- [ ] Music plays (iOS requires user gesture first)

### Cross-browser
- [ ] Firefox: Works, performance acceptable
- [ ] Safari: WebGL2 support, Audio context
- [ ] Edge: No issues

---

## KEY PERFORMANCE METRICS

**Target Budget per Frame:**
- Render time: < 5ms
- Physics: < 2ms
- Particle updates: < 1ms
- Audio synthesis: < 0.5ms
- **Total: < 16ms for 60 FPS**

**Memory Target:**
- JavaScript heap: < 100MB
- WebGL textures: < 50MB
- Particle pool: 10MB
- **Total: < 200MB** (leaving headroom for browser)

---

## FINAL DELIVERABLES

1. **Deployed URL** → sath.birthday (or similar custom domain)
2. **Code Repository** → GitHub (if sharing with developers)
3. **Performance Report** → Average FPS, memory usage, browser compatibility
4. **Video Recording** → Screen capture of entire experience (for sharing before URL goes live)

---

**This is the blueprint for building a production-grade scroll-driven 3D experience. Every section is a real, implementable component. The complexity is substantial but structured logically.**

