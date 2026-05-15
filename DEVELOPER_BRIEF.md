# 🎯 Quick Developer Brief: Sath's Birthday 3D World

**TL;DR:** Build an unrealistically beautiful, scroll-driven 3D birthday experience similar to Bruno Simon's portfolio or Apple's product pages. Every scroll reveals cinematic scenes (stars → ocean → island → sunrise → cake → fireworks → flowers → moon → stars spelling "SATH" → final celebration). Target: 60 FPS desktop, realistic particle systems, professional music via Web Audio API, 15+ choreographed scenes.

---

## REQUIREMENTS AT A GLANCE

### Core Vision
- **Scroll-driven narrative:** User scrolls down, entire 3D world animates
- **11 scenes:** Each scene has unique 3D elements, camera path, music, particle effects
- **Cinematic quality:** Like Pixar-level visual polish
- **Emotional impact:** Should make Sath cry happy tears when she sees it
- **Mobile responsive:** Must work on iPhone + Android

### Tech Stack
```
Frontend: React + Vite + Three.js
Rendering: Three.js (WebGL2)
Scroll sync: GSAP + ScrollTrigger
Music: Web Audio API (synthesizer-based)
Particles: Custom system with physics (gravity, wind, collision)
Post-processing: Bloom, AO, tone mapping
Deployment: Vercel or Netlify
```

---

## SCENE STRUCTURE (11 Scenes)

| Scene | Theme | Key Elements | Camera Motion | Duration |
|-------|-------|--------------|---------------|----------|
| 0 | Cosmic void | 5000 stars, nebula fog | Approach from space | 0-9% scroll |
| 1 | Ocean awakens | Gerstner waves, foam, mist particles | Descend toward water | 9-18% |
| 2 | Island emerges | Terrain rising, vegetation | Orbit around island | 18-27% |
| 3 | Sunrise | Golden sky gradient, sun glow, clouds | Pan horizon | 27-36% |
| 4 | Magical cake | 3-layer cake with particles converging | Approach cake | 36-45% |
| 5 | Candles ignite | 12 candles light sequentially, flames | Orbit cake top | 45-54% |
| 6 | Wish & blow out | Wind effect, extinguish candles | Zoom out dramatically | 54-63% |
| 7 | Fireworks explosion | 8-12 burst sequences, colored particles | Wide view, subtle orbit | 63-72% |
| 8 | Flowers bloom | 20 flower patches bloom + confetti | Orbit, gradually lower | 72-81% |
| 9 | Moon rises | Moon ascends, atmosphere darkens | Camera pulls back & up | 81-90% |
| 10 | Stars spell name | Stars morph to form "HAPPY BIRTHDAY SATH" | Positioned to view text | 90-100% |

---

## CRITICAL SYSTEMS

### 1. Particle System (HIGH PRIORITY)
**File:** `src/utils/ParticleSystem.js`

**Must implement:**
- Object pooling (reuse particle instances)
- Per-particle: position, velocity, acceleration, lifetime, color, size
- Physics: Gravity, wind simulation, air resistance (velocity × 0.98)
- Rendering: Use THREE.Points + BufferGeometry (NOT individual meshes)
- Target: Support 5000 particles at 60 FPS desktop, 500-2000 mobile

**Particle effects needed:**
- Magic sparkles (converge to cake, burst outward)
- Fireworks (8 colors, 300-500 per burst, gravity + drag)
- Confetti (1000 pieces, rotating, wobbling)
- Candle flames (particles per candle, upward motion)
- Flower blooms (scale animation per flower)
- Smoke trails (gray, rising)

### 2. Camera Path System
**File:** `src/utils/CameraPath.js`

**Implementation:**
```javascript
// 11 waypoints (one per scene)
cameraPath = [
  {pos: Vec3(0, 0, -60), target: Vec3(0, 10, 0)},   // Scene 0
  {pos: Vec3(0, 35, 80), target: Vec3(0, 0, 0)},    // Scene 1
  {pos: Vec3(0, 15, 60), target: Vec3(0, 0, 0)},    // ... etc
  // ...
]

// Smooth interpolation
function updateCamera(globalProgress) {
  sceneIndex = floor(progress * 11)
  localProgress = (progress * 11) % 1
  
  current = cameraPath[sceneIndex]
  next = cameraPath[sceneIndex + 1]
  
  eased = easeInOutCubic(localProgress)
  camera.position = lerp(current.pos, next.pos, eased)
  camera.lookAt(lerp(current.target, next.target, eased))
}
```

### 3. Ocean Rendering (Advanced)
**File:** `src/utils/Ocean.js`

**Implementation:**
- Large plane (400×400 units), 256×256 subdivisions
- Custom vertex shader: Gerstner wave algorithm
  - 3 octaves of sine waves for realism
  - Wave equation: `y = A * sin(2π/λ * (d·pos - c·t))`
- Fragment shader: Fresnel effect + depth-based coloring
- Use THREE.CubeCamera for reflections (optional, performance cost)

### 4. Advanced Music System
**File:** `src/utils/MusicEngine.js`

**Don't use audio files. Synthesize using Web Audio API:**

```javascript
// Per-scene music definition
const sceneMusic = {
  0: {bpm: 40, chords: ['D2','D2','D2'], melody: []}, // Deep drone
  1: {bpm: 60, chords: ['Em','Em','Em','Am'], melody: ['E4','G4','B4']},
  // ... all 11 scenes
}

// Implementation approach:
// - Create OscillatorNode per voice (bass, chords, melody)
// - Use GainNode for ADSR envelope (Attack, Decay, Sustain, Release)
// - Schedule notes via Web Audio timing
// - Apply reverb/delay via BiquadFilter + ConvolverNode
```

**Note:** Audio must respond to scroll (fade out when music stops, sync frequency shifts to scene transitions)

### 5. Post-Processing
**File:** `src/utils/PostProcessing.js`

**Implement:**
- **Bloom:** UnrealBloomPass (for glowing stars, sun, flames)
- **Ambient Occlusion:** SSAO for depth perception
- **Tone Mapping:** ACESFilmicToneMapping for cinematic look
- **Motion Blur:** Optional, on camera fast movements

Use EffectComposer + RenderPass pattern.

### 6. Advanced Lighting
- **Main light:** Directional light (simulates sun), shifts position per scene
- **Hemisphere light:** Sky/ground colors for natural ambience
- **Dynamic point lights:** Pool of 50 reusable lights for particles (fireworks, candles)
- **Shadows:** 2048×2048 shadow maps, only on main objects (performance)

---

## SHADER REQUIREMENTS

Write custom shaders for:

1. **Ocean:** Gerstner waves + Fresnel
2. **Stars:** Twinkling (sine wave based on position), parallax effect
3. **Particles:** Noise-based distortion, additive blending
4. **Sky:** Atmospheric scattering (Rayleigh approximation)
5. **Bloom:** Post-processing isolate bright pixels

All shaders must compile without errors. Use glsl validation tools.

---

## AUDIO EFFECTS NEEDED (60+ sounds)

Synthesize these using Web Audio API (NO file downloads):

- Sparkles (10 versions): Descending frequency sweep
- Whoosh sounds: Pink noise with envelope
- Explosions: Noise burst + tone drop
- Chimes/bells: Sine wave decays
- Bird chirps: Frequency-modulated tones
- Wind ambience: Filtered noise
- Magic shimmer: Bell tones + reverb
- Flower pop: Percussive transient

---

## PERFORMANCE TARGETS

**Desktop (Chrome):**
- 60 FPS at 2560×1440
- Max JS heap: 100MB
- Particle budget: 5000 concurrent
- Frame time: < 16ms

**Mobile (iPhone 12):**
- 30-60 FPS
- Max particles: 2000
- Reduced geometry LOD
- No bloom on low-end devices

**Testing:** Use Chrome DevTools Performance tab + stats.js

---

## DEPLOYMENT

1. **Build:** `npm run build` (Vite output to `/dist`)
2. **Host:** Vercel (auto-deploys from GitHub)
3. **Domain:** Custom domain or Vercel URL
4. **SSL:** Auto-enabled
5. **Share:** Send final URL to Sath on birthday

---

## CRITICAL GOTCHAS

1. **Audio Context:** iOS requires user gesture to start (add play button)
2. **Scroll jank:** Use `passive: true` listener, RAF for updates
3. **Mobile GPU:** Particles + shadows are expensive; reduce on mobile
4. **Memory leaks:** Dispose geometries/materials/textures on cleanup
5. **Shader compilation:** Test all shaders in shader validator first
6. **Frame drops:** Monitor with stats.js, use GPU profiler in DevTools

---

## FILE STRUCTURE TO CREATE

```
src/
├── utils/
│   ├── BirthdayWorld.js (main THREE.js class)
│   ├── ParticleSystem.js (CRITICAL - object pool for 5000 particles)
│   ├── CameraPath.js (waypoint interpolation)
│   ├── Ocean.js (Gerstner wave shader)
│   ├── MusicEngine.js (Web Audio synth)
│   ├── SoundEffects.js (synthesized SFX)
│   ├── PostProcessing.js (bloom, AO, tone mapping)
│   ├── LightingSystem.js (dynamic light pool)
│   ├── IslandTerrain.js (procedural terrain)
│   ├── Fireworks.js (burst sequences)
│   ├── PerformanceMonitor.js (stats tracking)
│   ├── MobileOptimizer.js (device-specific settings)
│   ├── shaders/
│   │   ├── ocean.glsl
│   │   ├── stars.glsl
│   │   ├── particles.glsl
│   │   └── sky.glsl
│   └── config.js (scene definitions, timing)
├── App.jsx (React component, scroll handler)
├── index.css (fullscreen, no scrollbar styling)
└── main.jsx
```

---

## STEP-BY-STEP BUILD ORDER

1. **Week 1:** Particle system + camera controller (foundation)
2. **Week 2:** Ocean renderer + island terrain
3. **Week 3:** Music engine + SFX
4. **Week 4:** All 11 scenes (geometry + cameras)
5. **Week 5:** Particle effects per scene (fireworks, confetti, etc.)
6. **Week 6:** Lighting + post-processing + polish
7. **Week 7:** Mobile optimization + testing + deploy

---

## SUCCESS CRITERIA

✅ **Technical:**
- 60 FPS desktop, 30-60 FPS mobile
- All 11 scenes smooth transitions
- Audio syncs perfectly to scroll
- No console errors/warnings
- No memory leaks
- Responsive on 5+ device sizes

✅ **User Experience:**
- Each scroll feels cinematic
- Music enhances emotion
- Visual polish is "wow" level
- Text is readable (mobile)
- Load time < 3 seconds
- Works offline (cache assets with service worker)

✅ **Emotional Impact:**
- Sath cries happy tears ✨
- Feels like a personalized love letter
- Shares it on social media
- Developer gets hero credit

---

## CONTACT / QUESTIONS

If anything is unclear:
1. Check `TECHNICAL_SPEC.md` for deep dives
2. Check `IMPLEMENTATION_ROADMAP.md` for code patterns
3. Reference Bruno Simon's portfolio (threejs-journey.com) for inspiration
4. Refer to three.js docs (threejs.org)

---

**Good luck! This will be epic.** 🎂✨

