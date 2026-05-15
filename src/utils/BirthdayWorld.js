import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Ocean } from './Ocean';
import { IslandTerrain } from './IslandTerrain';
import { ParticleSystem } from './ParticleSystem';
import { Fireworks } from './Fireworks';
import { CameraPath } from './CameraPath';
import { PostProcessing } from './PostProcessing';

export class BirthdayWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.assetBase = '/assets';
    this.environmentTextures = {};
    this.assetModels = {};
    this.modelTimeline = {};
    this.storyStage = null;
    this.cakeRig = null;
    this.scene = new THREE.Scene();
    window.__THREE = THREE;
    this.camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    this.clock = new THREE.Clock();
    this.sceneObjects = {};
    this.animMixers = [];
    this.currentProgress = 0;
    this.frameId = null;

    this.cameraPath = [
      // Scene 0 - The Night Sky: Looking up, vast scale
      { pos: new THREE.Vector3(0, 5, 40), target: new THREE.Vector3(0, 20, -60) },
      // Scene 1 - The Ocean Awakens: Sweeping fast down over the icy water
      { pos: new THREE.Vector3(0, 15, 65), target: new THREE.Vector3(0, -2, -10) },
      // Scene 2 - An Island Emerges: Fly around the massive frozen mountains of the island
      { pos: new THREE.Vector3(55, 20, -20), target: new THREE.Vector3(0, 0, 0) },
      // Scene 3 - Palms Frame the Night: Glide incredibly low over the frosted grass across the huge island
      { pos: new THREE.Vector3(-35, -2, 28), target: new THREE.Vector3(15, -4, -15) },
      // Scene 4 - Your Cake Awaits: Push in through the massive trees towards the center
      { pos: new THREE.Vector3(-12, -2, 22), target: new THREE.Vector3(0, -7.5, 0) },
      // Scene 5 - Candles Ignite: Macro shot on the candles with the huge island in the blurred background
      { pos: new THREE.Vector3(0, -6.5, 5.5), target: new THREE.Vector3(0, -7.5, 0) },
      // Scene 6 - The Sky Erupts: Ground-level awe shot looking up at fireworks over the massive island
      { pos: new THREE.Vector3(0, -2, 65), target: new THREE.Vector3(0, 25, -20) },
      // Scene 7 - Gifts Appear: Sweep around the base of the massive frozen island
      { pos: new THREE.Vector3(-25, -4, 25), target: new THREE.Vector3(-3, -8, 2) },
      // Scene 8 - Flowers of the Night: Extremely close to the frosted ground
      { pos: new THREE.Vector3(18, -5, 18), target: new THREE.Vector3(4.5, -8, 4) },
      // Scene 9 - The Moon Watches: Pan up from behind the huge frozen peaks to the moon
      { pos: new THREE.Vector3(30, 0, 40), target: new THREE.Vector3(-25, 25, -75) },
      // Scene 10 - Final wide shot: Slowly drifting away, showing the entire massive icy island in the mist
      { pos: new THREE.Vector3(0, 15, 95), target: new THREE.Vector3(0, 5, -10) },
    ];

    this.init();
  }

  init() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setClearColor(0x000005);

    this.postProcessing = new PostProcessing(this.renderer, this.scene, this.camera);
    this.cameraPathHandler = new CameraPath(this.cameraPath);
    
    this.camera.position.copy(this.cameraPath[0].pos);
    this.camera.lookAt(this.cameraPath[0].target);

    this.buildWorld();
    this.addLights();
    this.loadEnvironmentAssets();
    this.loadSceneModels();
    this.startRender();

    window.addEventListener('resize', () => this.onResize());
  }

  buildWorld() {
    // Cinematic Fog for God Range Icelandic vibe - Thinned out slightly to reveal the massive scale of the new island
    this.scene.fog = new THREE.FogExp2(0x000a1f, 0.008);
    
    this.buildStars();
    this.buildSnow(); // Add drifting snow
    
    this.oceanObj = new Ocean(this.scene);
    this.sceneObjects.ocean = this.oceanObj.mesh;

    this.storyStage = new THREE.Group();
    this.storyStage.name = 'storyStage';
    this.storyStage.position.set(0, -10, 0);
    this.storyStage.visible = true;
    this.scene.add(this.storyStage);
    this.sceneObjects.island = this.storyStage;

    this.cakeRig = new THREE.Group();
    this.cakeRig.name = 'cakeRig';
    // Place the hero cake rig on the island surface so it doesn't float
    this.cakeRig.position.set(0, -6.5, 0);
    this.cakeRig.visible = true;
    this.storyStage.add(this.cakeRig);
    this.buildHeroCake();
    
    this.particleSystem = new ParticleSystem(this.scene, 5000);
    this.fireworksManager = new Fireworks(this.particleSystem);

    this.buildSkyGradient();
    this.buildSun();
    
    this.buildClouds();
    this.buildBirds();
    // Keep scene night-only: hide daytime clouds and birds
    if (this.sceneObjects.clouds) this.sceneObjects.clouds.visible = false;
    if (this.sceneObjects.birds) this.sceneObjects.birds.visible = false;
    this.buildFinalStars();
  }

  buildStars() {
    const starCount = 1500; // Reduced for performance (latency fix)
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 200 + Math.random() * 100;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      sizes[i] = Math.random() * 2.5 + 0.5;

      // Star colors: mostly white, some blue/yellow tinted
      const colorType = Math.random();
      if (colorType < 0.3) { colors[i * 3] = 0.8; colors[i * 3 + 1] = 0.9; colors[i * 3 + 2] = 1; }
      else if (colorType < 0.6) { colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 0.9; }
      else { colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 1; }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        opacity: { value: 1 }
      },
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        uniform float time;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float twinkle = sin(time * 2.0 + position.x * 0.5 + position.y * 0.3) * 0.3 + 0.7;
          gl_PointSize = size * twinkle * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        uniform float opacity;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor, alpha * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    this.stars = new THREE.Points(geo, mat);
    this.scene.add(this.stars);
    this.sceneObjects.stars = this.stars;
  }

  buildSnow() {
    const snowCount = 3000;
    const positions = new Float32Array(snowCount * 3);
    const speeds = new Float32Array(snowCount);
    for (let i = 0; i < snowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 150;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 150;
      speeds[i] = 0.5 + Math.random() * 1.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float speed;
        uniform float time;
        void main() {
          vec3 pos = position;
          pos.y -= time * speed * 2.0;
          pos.y = mod(pos.y + 10.0, 70.0) - 10.0; // wrap around
          pos.x += sin(time * 0.8 + pos.y * 0.05) * 2.0;
          pos.z += cos(time * 0.6 + pos.x * 0.05) * 2.0;
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = (50.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, (0.5 - d) * 2.0 * 0.6);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.snow = new THREE.Points(geo, mat);
    this.scene.add(this.snow);
    this.sceneObjects.snow = this.snow;
  }

  buildOcean() {
    const geo = new THREE.PlaneGeometry(300, 300, 64, 64); // Reduced vertices for latency
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        deepColor: { value: new THREE.Color(0x000511) }, // Glacial dark blue
        shallowColor: { value: new THREE.Color(0x0a2a44) }, // Cold shallow water
        sunPos: { value: new THREE.Vector3(50, 20, -50) },
        opacity: { value: 0 }
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec3 pos = position;
          float wave1 = sin(pos.x * 0.05 + time * 0.8) * cos(pos.y * 0.04 + time * 0.6) * 0.8;
          float wave2 = sin(pos.x * 0.08 + time * 1.1 + 1.5) * 0.4;
          float wave3 = cos(pos.y * 0.06 + time * 0.9) * 0.3;
          pos.z = wave1 + wave2 + wave3;
          vNormal = normalize(vec3(-wave1 * 0.05, -wave2 * 0.08, 1.0));
          vWorldPos = (modelMatrix * vec4(pos, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 deepColor;
        uniform vec3 shallowColor;
        uniform vec3 sunPos;
        uniform float opacity;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;
        void main() {
          vec3 toSun = normalize(sunPos - vWorldPos);
          float diffuse = max(dot(vNormal, toSun), 0.0);
          float dist = length(vUv - 0.5);
          vec3 color = mix(deepColor, shallowColor, dist * 1.5 + diffuse * 0.3);
          // Specular highlight
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 halfDir = normalize(toSun + viewDir);
          float spec = pow(max(dot(vNormal, halfDir), 0.0), 64.0);
          color += vec3(1.0, 0.95, 0.8) * spec * 0.6;
          gl_FragColor = vec4(color, opacity);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.ocean = new THREE.Mesh(geo, mat);
    this.ocean.rotation.x = -Math.PI / 2;
    this.ocean.position.y = -0.5;
    this.scene.add(this.ocean);
    this.sceneObjects.ocean = this.ocean;
  }



  async loadEnvironmentAssets() {
    const textureLoader = new THREE.TextureLoader();
    const exrLoader = new EXRLoader();

    const loadTexture = (url) => new Promise((resolve, reject) => {
      textureLoader.load(url, resolve, undefined, reject);
    });

    const loadHdr = (url) => new Promise((resolve, reject) => {
      exrLoader.load(url, resolve, undefined, reject);
    });

    const prepareColorTexture = (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.repeat.set(6, 6);
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      return texture;
    };

    const prepareDataTexture = (texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(6, 6);
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      return texture;
    };

    try {
      const [environmentMap, grassColor, grassNormal, grassRoughness, rockColor, rockNormal, rockRoughness] = await Promise.all([
        loadHdr(`${this.assetBase}/hdri/evening/EveningSkyHDRI021A_1K_HDR.exr`),
        loadTexture(`${this.assetBase}/textures/grass/Grass001_1K-JPG_Color.jpg`),
        loadTexture(`${this.assetBase}/textures/grass/Grass001_1K-JPG_NormalGL.jpg`),
        loadTexture(`${this.assetBase}/textures/grass/Grass001_1K-JPG_Roughness.jpg`),
        loadTexture(`${this.assetBase}/textures/rock/Rock063_1K-JPG_Color.jpg`),
        loadTexture(`${this.assetBase}/textures/rock/Rock063_1K-JPG_NormalGL.jpg`),
        loadTexture(`${this.assetBase}/textures/rock/Rock063_1K-JPG_Roughness.jpg`),
      ]);

      environmentMap.mapping = THREE.EquirectangularReflectionMapping;
      environmentMap.colorSpace = THREE.LinearSRGBColorSpace;
      this.scene.background = environmentMap;
      this.scene.environment = environmentMap;

      this.environmentTextures = {
        grassColor: prepareColorTexture(grassColor),
        grassNormal: prepareDataTexture(grassNormal),
        grassRoughness: prepareDataTexture(grassRoughness),
        rockColor: prepareColorTexture(rockColor),
        rockNormal: prepareDataTexture(rockNormal),
        rockRoughness: prepareDataTexture(rockRoughness),
      };

      if (this.islandTerrain?.applyTextures) {
        this.islandTerrain.applyTextures(this.environmentTextures);
      }

      this.applyEnvironmentTextures();
    } catch (error) {
      console.warn('Environment assets could not be loaded:', error);
    }
  }

  applyEnvironmentTextures() {
    if (!this.sceneObjects.mountains || !this.environmentTextures.rockColor) return;

    this.sceneObjects.mountains.children.forEach((mesh) => {
      if (!mesh.isMesh || mesh.userData.kind !== 'mountain') return;
      mesh.material.map = this.environmentTextures.rockColor;
      mesh.material.normalMap = this.environmentTextures.rockNormal;
      mesh.material.roughnessMap = this.environmentTextures.rockRoughness;
      mesh.material.needsUpdate = true;
    });
  }

  async loadSceneModels() {
    const loader = new GLTFLoader();
    const load = (path) => new Promise((resolve, reject) => loader.load(path, resolve, undefined, reject));

    const stageRoot = this.storyStage || this.scene;

    const makeContainer = (parent = stageRoot) => {
      const group = new THREE.Group();
      parent.add(group);
      return group;
    };

    const getVisibleBox = (object3d) => {
      const box = new THREE.Box3();
      box.makeEmpty();
      object3d.updateMatrixWorld(true);
      object3d.traverse((child) => {
        if (child.isMesh && child.visible) {
          if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
          const childBox = child.geometry.boundingBox.clone();
          childBox.applyMatrix4(child.matrixWorld);
          box.union(childBox);
        }
      });
      return box;
    };

    const fitToSize = (object3d, targetSize) => {
      const box = getVisibleBox(object3d);
      const size = new THREE.Vector3();
      box.getSize(size);
      const maxAxis = Math.max(size.x, size.y, size.z) || 1;
      const scale = targetSize / maxAxis;
      object3d.scale.setScalar(scale);
      return scale;
    };

    const centerObject = (object3d) => {
      const box = getVisibleBox(object3d);
      const center = new THREE.Vector3();
      box.getCenter(center);
      object3d.position.x -= center.x;
      object3d.position.z -= center.z;
      object3d.position.y -= box.min.y; // Bottom rests at host origin
    };

    const placeModel = (url, { size, position, rotation, container, parentGroup, hideFallbackKey, cloneCount = 1, cloneOffsets = [], start = 0, end = 1, persistent = true }) => {
      return load(url).then((gltf) => {
        const root = gltf.scene;
        root.traverse((child) => {
          if (child.isMesh) {
            const name = child.name.toLowerCase();
            const matName = child.material?.name?.toLowerCase() || '';
            const isSkyOrWater = ['sky', 'atmosphere', 'water', 'ocean', 'dome', 'bubble', 'cloud'].some(w => name.includes(w) || matName.includes(w));
            
            if (isSkyOrWater) {
              child.visible = false;
            } else if (hideFallbackKey === 'moon') {
              // Fix the black moon bug: Force it to be bright glowing white
              child.material = new THREE.MeshBasicMaterial({ 
                color: 0xffffff,
                transparent: true,
                opacity: 0.95
              });
              child.castShadow = false;
            } else {
              // Optimization: Only cast shadows on main island/hero objects, skip smaller props
              const isSmallProp = name.includes('sprinkle') || name.includes('flower') || name.includes('gift');
              child.castShadow = !isSmallProp;
              child.receiveShadow = true;
              
              // Apply Icelandic Frost/Cinematic Material overrides
              if (child.material) {
                if (child.material.color) {
                   child.material.color.lerp(new THREE.Color(0xccddf0), 0.65); // Icy tint
                }
                child.material.roughness = 0.85;
                
                const mName = child.material.name?.toLowerCase() || '';
                if (mName.includes('leaf') || mName.includes('palm') || mName.includes('grass') || name.includes('tree')) {
                  child.material.color.setHex(0xa8c0d8); // Frosted vegetation
                  child.material.roughness = 0.9;
                }
              }
            }
          }
        });

        centerObject(root);
        fitToSize(root, size);

        const host = container || makeContainer(parentGroup || stageRoot);
        host.position.copy(position);
        host.rotation.set(rotation.x, rotation.y, rotation.z);
        host.add(root);
        const isAssetOnly = hideFallbackKey === 'cakeAsset' || hideFallbackKey === 'candleAsset';
        host.visible = !isAssetOnly;
        host.userData.baseScale = size;
        host.userData.revealStart = start;
        host.userData.revealEnd = end;
        host.userData.persistent = persistent;

        if (hideFallbackKey === 'moon') {
          // Add a massive glowing atmospheric halo to the moon
          const haloGeo = new THREE.PlaneGeometry(45, 45);
          const haloMat = new THREE.ShaderMaterial({
            uniforms: { color: { value: new THREE.Color(0xccddff) } },
            vertexShader: `
              varying vec2 vUv;
              void main() {
                vUv = uv;
                // Make halo always face camera
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              }
            `,
            fragmentShader: `
              uniform vec3 color;
              varying vec2 vUv;
              void main() {
                float dist = length(vUv - 0.5) * 2.0;
                float intensity = max(0.0, 1.0 - dist);
                intensity = pow(intensity, 1.5); // Soft smooth falloff
                if (dist > 1.0) discard;
                gl_FragColor = vec4(color, intensity * 0.85);
              }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
          });
          const halo = new THREE.Mesh(haloGeo, haloMat);
          halo.position.set(0, 0, -2);
          host.add(halo);

          // Give the moon its own actual point light so it illuminates the snow and island
          const moonGlow = new THREE.PointLight(0xaaccff, 2.5, 300);
          host.add(moonGlow);
        }

        if (cloneCount > 1) {
          for (let i = 1; i < cloneCount; i++) {
            const clone = root.clone(true);
            const offset = cloneOffsets[i - 1] || new THREE.Vector3(i * 1.4, 0, 0);
            clone.position.copy(offset);
            host.add(clone);
          }
        }

        if (hideFallbackKey && hideFallbackKey !== 'island' && this.sceneObjects[hideFallbackKey]) {
          this.sceneObjects[hideFallbackKey].visible = false;
        }

        if (hideFallbackKey === 'island' && this.islandTerrain?.group) {
          this.islandTerrain.group.visible = true;
        }

        this.assetModels[hideFallbackKey || url] = host;
        if (!isAssetOnly) {
          this.modelTimeline[hideFallbackKey || url] = host;
        }
        if (hideFallbackKey && hideFallbackKey !== 'island' && !isAssetOnly) {
          this.sceneObjects[hideFallbackKey] = host;
        }
        if (hideFallbackKey === 'island') {
          this.sceneObjects.islandModel = host;
        }

        return host;
      });
    };

    try {
      await Promise.allSettled([
        // 1. Tropical Island (Base converted to Icelandic massive mountains)
        placeModel(`${this.assetBase}/models/environment/tropical_island.glb`, {
          size: 24, // Doubled the size so it takes over the entire composition
          position: new THREE.Vector3(0, -8, 0),
          rotation: new THREE.Vector3(0, Math.PI * 0.15, 0),
          hideFallbackKey: 'island',
          start: 0.0,
          persistent: true,
          parentGroup: stageRoot
        }),
        // 2, 3, 4, 5. Palm Trees (4 clusters grounded on the island)
        placeModel(`${this.assetBase}/models/vegetation/stylized_palm_tree_set.glb`, {
          size: 10,
          // Ground palms to the island height (y ~= -7)
          position: new THREE.Vector3(10, -7, -6),
          rotation: new THREE.Vector3(0, Math.PI * 0.2, 0),
          hideFallbackKey: 'trees',
          cloneCount: 4,
          start: 0.25,
          persistent: true,
          parentGroup: stageRoot,
          cloneOffsets: [
            new THREE.Vector3(-11, -7, -4),
            new THREE.Vector3(7, -7, 8),
            new THREE.Vector3(-5, -7, 7)
          ]
        }),
        // 6. Birthday Cake (Central island hero - on island surface)
        placeModel(`${this.assetBase}/models/props/birthday_cake.glb`, {
          size: 3.5,
          position: new THREE.Vector3(0, -6.5, 0),
          rotation: new THREE.Vector3(0, Math.PI * 0.1, 0),
          hideFallbackKey: 'cakeModel',
          start: 0.32,
          persistent: true,
          parentGroup: stageRoot
        }),
        // 7. Birthday Candle (On the cake)
        placeModel(`${this.assetBase}/models/props/birthday_candle.glb`, {
          size: 0.8,
          position: new THREE.Vector3(0, -2, 0),
          rotation: new THREE.Vector3(0, 0, 0),
          hideFallbackKey: 'candleModel',
          start: 0.38,
          persistent: true,
          parentGroup: stageRoot
        }),
        // 8. Moon (Rising in the night sky)
        placeModel(`${this.assetBase}/models/environment/moon.glb`, {
          size: 12,
          position: new THREE.Vector3(-25, -35, -75),
          rotation: new THREE.Vector3(0, 0, 0),
          hideFallbackKey: 'moon',
          start: 0.2,
          persistent: true,
          parentGroup: this.scene
        }),
        // 9. Flowers (Blooming on the night island)
        placeModel(`${this.assetBase}/models/environment/flowers_lib.glb`, {
          size: 5,
          position: new THREE.Vector3(4.5, -6.8, 4),
          rotation: new THREE.Vector3(0, Math.PI * 0.3, 0),
          hideFallbackKey: 'flowers',
          start: 0.55,
          persistent: true,
          parentGroup: stageRoot
        }),
        // 10, 11, 12. Gift Boxes (After fireworks, at the island base)
        placeModel(`${this.assetBase}/models/props/a_gift_box.glb`, {
          size: 1.6,
          position: new THREE.Vector3(-3, -7, 2.5),
          rotation: new THREE.Vector3(0, Math.PI * 0.1, 0),
          cloneCount: 3,
          hideFallbackKey: 'giftBox',
          start: 0.52,
          persistent: true,
          parentGroup: stageRoot,
          cloneOffsets: [
            new THREE.Vector3(-2, -7, 4),
            new THREE.Vector3(-4.5, -7, 3)
          ]
        }),
        // 13, 14. Fairy Lights (Night decoration on the island)
        placeModel(`${this.assetBase}/models/props/fairy_lights.glb`, {
          size: 12,
          position: new THREE.Vector3(0, -3, -2),
          rotation: new THREE.Vector3(0, Math.PI * 0.25, 0),
          cloneCount: 2,
          hideFallbackKey: 'fairyLights',
          start: 0.35,
          persistent: true,
          parentGroup: stageRoot,
          cloneOffsets: [
            new THREE.Vector3(0, -2, -5)
          ]
        }),
        // 15, 16, 17. Balloon Clusters (Floating above the island at night)
        placeModel(`${this.assetBase}/models/props/test_ballons.glb`, {
          size: 7,
          position: new THREE.Vector3(6, 2, -4),
          rotation: new THREE.Vector3(0, 0, 0),
          cloneCount: 3,
          hideFallbackKey: 'balloons',
          start: 0.48,
          persistent: true,
          parentGroup: stageRoot,
          cloneOffsets: [
            new THREE.Vector3(-6, 3, -6),
            new THREE.Vector3(-3, 4, -8)
          ]
        }),
        // 18. Fireworks (Night sky celebration after cake cutting)
        placeModel(`${this.assetBase}/models/effects/firework.glb`, {
          size: 10,
          position: new THREE.Vector3(0, 15, -18),
          rotation: new THREE.Vector3(0, 0, 0),
          hideFallbackKey: 'fireworkProp',
          start: 0.42,
          end: 0.65,
          persistent: false,
          parentGroup: this.scene
        }),
      ]);
    } catch (error) {
      console.warn('Scene model assets could not be loaded:', error);
    }
  }

  buildHeroCake() {
    const cakeGroup = new THREE.Group();

    const plateGeo = new THREE.CylinderGeometry(3.0, 3.1, 0.18, 32);
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xf6f1ea, roughness: 0.25, metalness: 0.2 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.receiveShadow = true;
    cakeGroup.add(plate);

    const tiers = [
      { r: 2.05, h: 0.95, y: 0.15, color: 0xffa7b8 },
      { r: 1.55, h: 0.82, y: 1.15, color: 0xffd1dc },
      { r: 1.10, h: 0.70, y: 2.05, color: 0xffeef2 },
    ];

    tiers.forEach((tier, index) => {
      const tierGeo = new THREE.CylinderGeometry(tier.r, tier.r, tier.h, 32);
      const tierMat = new THREE.MeshStandardMaterial({ color: tier.color, roughness: 0.55, metalness: 0.03 });
      const tierMesh = new THREE.Mesh(tierGeo, tierMat);
      tierMesh.position.y = tier.y + tier.h / 2;
      tierMesh.castShadow = true;
      tierMesh.receiveShadow = true;
      cakeGroup.add(tierMesh);

      const icingGeo = new THREE.TorusGeometry(tier.r + 0.03, 0.12, 10, 40);
      const icingMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, metalness: 0.0 });
      const icing = new THREE.Mesh(icingGeo, icingMat);
      icing.position.y = tier.y + tier.h;
      icing.rotation.x = Math.PI / 2;
      cakeGroup.add(icing);

      const sprinkleCount = index === 2 ? 10 : 6;
      for (let i = 0; i < sprinkleCount; i++) {
        const sprinkleGeo = new THREE.SphereGeometry(0.06, 8, 8);
        const sprinkleMat = new THREE.MeshStandardMaterial({ color: [0xff6b6b, 0x4d96ff, 0x6bcb77, 0xf4a261, 0xc77dff][i % 5], roughness: 0.45 });
        const sprinkle = new THREE.Mesh(sprinkleGeo, sprinkleMat);
        const angle = (i / sprinkleCount) * Math.PI * 2;
        sprinkle.position.set(
          Math.cos(angle) * (tier.r * 0.68),
          tier.y + tier.h + 0.06,
          Math.sin(angle) * (tier.r * 0.68)
        );
        sprinkle.castShadow = true;
        cakeGroup.add(sprinkle);
      }
    });

    const candleGroup = new THREE.Group();
    const candleColors = [0xffd166, 0xff9f1c, 0x9b5de5, 0xff6b6b, 0x4d96ff];
    const candleCount = 5;
    for (let i = 0; i < candleCount; i++) {
      const candleGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.72, 8);
      const candleMat = new THREE.MeshStandardMaterial({ color: candleColors[i], roughness: 0.55 });
      const candle = new THREE.Mesh(candleGeo, candleMat);
      const angle = (i / candleCount) * Math.PI * 2;
      const radius = 0.28;
      candle.position.set(Math.cos(angle) * radius, 2.92, Math.sin(angle) * radius);
      candle.castShadow = true;
      candleGroup.add(candle);

      const flameGeo = new THREE.SphereGeometry(0.08, 8, 8);
      flameGeo.scale(1, 1.8, 1);
      const flameMat = new THREE.MeshBasicMaterial({ color: 0xffdd77, transparent: true, opacity: 0.92, blending: THREE.AdditiveBlending });
      const flame = new THREE.Mesh(flameGeo, flameMat);
      flame.position.set(candle.position.x, candle.position.y + 0.45, candle.position.z);
      candleGroup.add(flame);
    }

    const glow = new THREE.PointLight(0xffcc77, 1.4, 18);
    glow.position.set(0, 4.0, 0);
    cakeGroup.add(glow);

    cakeGroup.add(candleGroup);
    cakeGroup.position.set(0, 0, 0);
    cakeGroup.scale.setScalar(0.02);
    this.cakeRig.add(cakeGroup);

    this.sceneObjects.cake = this.cakeRig;
    this.sceneObjects.candles = candleGroup;
    this.heroCake = cakeGroup;
  }

  buildSkyGradient() {
    const geo = new THREE.SphereGeometry(250, 32, 32);
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x000005) },
        bottomColor: { value: new THREE.Color(0x000020) },
        sunriseProgress: { value: 0 },
        sunPos: { value: new THREE.Vector3(0, -1, -1) },
        time: { value: 0 }
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float sunriseProgress;
        uniform vec3 sunPos;
        uniform float time;
        varying vec3 vPos;

        // Simplex noise function for aurora
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
        float snoise(vec2 v) {
            const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
            vec2 i  = floor(v + dot(v, C.yy) );
            vec2 x0 = v -   i + dot(i, C.xx);
            vec2 i1; i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
            vec4 x12 = x0.xyxy + C.xxzz;
            x12.xy -= i1;
            i = mod289(i);
            vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 )) + i.x + vec3(0.0, i1.x, 1.0 ));
            vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
            m = m*m; m = m*m;
            vec3 x = 2.0 * fract(p * C.www) - 1.0;
            vec3 h = abs(x) - 0.5;
            vec3 ox = floor(x + 0.5);
            vec3 a0 = x - ox;
            m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
            vec3 g;
            g.x  = a0.x  * x0.x  + h.x  * x0.y;
            g.yz = a0.yz * x12.xz + h.yz * x12.yw;
            return 130.0 * dot(m, g);
        }

        void main() {
          float h = normalize(vPos).y * 0.5 + 0.5;
          // Night to day transition (Icelandic Twilight)
          vec3 nightTop = vec3(0.0, 0.05, 0.15); // Deep cyan/indigo
          vec3 nightBot = vec3(0.01, 0.02, 0.08); // Dark base
          vec3 dayTop = vec3(0.1, 0.25, 0.45);
          vec3 dayBot = vec3(0.3, 0.5, 0.6);
          vec3 sunriseTop = vec3(0.05, 0.15, 0.35);
          vec3 sunriseMid = vec3(0.2, 0.4, 0.5); // Aurora teal instead of orange
          vec3 sunriseBot = vec3(0.3, 0.5, 0.6);
          
          float sr = sunriseProgress;
          vec3 skyTop = mix(nightTop, dayTop, sr);
          vec3 skyBot = mix(nightBot, mix(sunriseBot, dayBot, sr), min(sr * 2.0, 1.0));
          // Sunrise glow band
          float glowBand = smoothstep(0.0, 0.3, 1.0 - abs(h - 0.35) * 5.0) * sr * (1.0 - sr) * 4.0;
          vec3 color = mix(skyBot, skyTop, pow(h, 0.5));
          color += sunriseMid * glowBand;
          
          // Aurora borealis effect
          vec2 uv = normalize(vPos).xz * 2.0;
          float auroraTime = time * 0.15;
          float aurora1 = snoise(uv * 1.5 + vec2(auroraTime, 0.0)) * 0.5 + 0.5;
          float aurora2 = snoise(uv * 3.0 - vec2(0.0, auroraTime * 1.2)) * 0.5 + 0.5;
          float auroraMask = smoothstep(0.3, 0.8, h) * smoothstep(0.9, 0.6, h); // Band in the sky
          float auroraIntensity = aurora1 * aurora2 * auroraMask * (1.0 - sr);
          vec3 auroraColor = vec3(0.0, 0.9, 0.5) * auroraIntensity * 1.8;
          auroraColor += vec3(0.0, 0.4, 0.8) * snoise(uv * 2.0 + auroraTime) * auroraMask * (1.0 - sr);
          
          color += max(vec3(0.0), auroraColor);

          gl_FragColor = vec4(color, 1.0);
        }
      `,
      side: THREE.BackSide
    });

    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);
    this.sceneObjects.sky = this.sky;
  }

  buildSun() {
    const sunGroup = new THREE.Group();
    
    // Sun disk
    const geo = new THREE.SphereGeometry(4, 32, 32);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffffc0 });
    const sun = new THREE.Mesh(geo, mat);
    sunGroup.add(sun);

    // Sun glow
    const glowGeo = new THREE.SphereGeometry(6, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    sunGroup.add(new THREE.Mesh(glowGeo, glowMat));

    sunGroup.position.set(0, -30, -100); // starts below horizon
    this.scene.add(sunGroup);
    this.sceneObjects.sun = sunGroup;
  }



  buildClouds() {
    const cloudGroup = new THREE.Group();
    for (let i = 0; i < 12; i++) {
      const cloud = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 4);
      for (let p = 0; p < puffs; p++) {
        const r = 1.5 + Math.random() * 2;
        const geo = new THREE.SphereGeometry(r, 8, 6);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.85,
          roughness: 1
        });
        const puff = new THREE.Mesh(geo, mat);
        puff.position.set(p * 2 - puffs, Math.random() * 1 - 0.5, Math.random() * 1);
        cloud.add(puff);
      }
      cloud.position.set(
        (Math.random() - 0.5) * 150,
        20 + Math.random() * 15,
        -20 - Math.random() * 60
      );
      cloud.userData.speed = 0.02 + Math.random() * 0.03;
      cloudGroup.add(cloud);
    }
    this.scene.add(cloudGroup);
    this.sceneObjects.clouds = cloudGroup;
  }

  buildBirds() {
    const birdGroup = new THREE.Group();
    for (let i = 0; i < 15; i++) {
      // Simple V-shape bird
      const geo = new THREE.BufferGeometry();
      const verts = new Float32Array([-0.3, 0, 0, 0, 0.1, 0, 0.3, 0, 0]);
      geo.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      const mat = new THREE.LineBasicMaterial({ color: 0x111111 });
      const bird = new THREE.Line(geo, mat);
      bird.position.set(
        (Math.random() - 0.5) * 40,
        15 + Math.random() * 10,
        -10 - Math.random() * 30
      );
      bird.userData.speed = 0.05 + Math.random() * 0.05;
      bird.userData.offset = Math.random() * Math.PI * 2;
      birdGroup.add(bird);
    }
    this.scene.add(birdGroup);
    this.sceneObjects.birds = birdGroup;
  }

  buildFinalStars() {
    // Stars that spell "Happy Birthday Sath" - positioned in 3D space
    const letterStars = [];
    const text = 'HAPPY BIRTHDAY SATH';
    const starData = [];

    // Create a grid of sparkle stars
    for (let i = 0; i < 300; i++) {
      starData.push({
        x: (Math.random() - 0.5) * 80,
        y: 25 + Math.random() * 30,
        z: -40 - Math.random() * 30,
        size: 0.2 + Math.random() * 0.4
      });
    }

    const positions = new Float32Array(starData.length * 3);
    const sizes = new Float32Array(starData.length);
    starData.forEach((s, i) => {
      positions[i * 3] = s.x;
      positions[i * 3 + 1] = s.y;
      positions[i * 3 + 2] = s.z;
      sizes[i] = s.size;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, opacity: { value: 0 } },
      vertexShader: `
        attribute float size;
        uniform float time;
        void main() {
          float twinkle = sin(time * 3.0 + position.x + position.y) * 0.5 + 0.5;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (1.0 + twinkle) * 400.0 / -mv.z;
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform float opacity;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          float a = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(1.0, 0.9, 0.5, a * opacity);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const skyStars = new THREE.Points(geo, mat);
    this.scene.add(skyStars);
    this.sceneObjects.finalStars = skyStars;
  }

  addLights() {
    // Ambient (Icy deep blue)
    this.ambientLight = new THREE.AmbientLight(0x1a2b4c, 0.6);
    this.scene.add(this.ambientLight);

    // Directional sun light (Crisp white/blue)
    this.sunLight = new THREE.DirectionalLight(0xe0f0ff, 0);
    this.sunLight.position.set(10, 30, -20);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 1024; // Reduced for latency
    this.sunLight.shadow.mapSize.height = 1024;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 150;
    this.sunLight.shadow.camera.left = -40;
    this.sunLight.shadow.camera.right = 40;
    this.sunLight.shadow.camera.top = 40;
    this.sunLight.shadow.camera.bottom = -40;
    this.sunLight.shadow.bias = -0.001;
    this.scene.add(this.sunLight);

    // Moon light (Icy)
    this.moonLight = new THREE.DirectionalLight(0xccddff, 0);
    this.moonLight.position.set(-10, 20, -15);
    this.scene.add(this.moonLight);

    // Warm fill for cake scene (Soft warm contrast against the cold)
    this.cakeLight = new THREE.PointLight(0xffa07a, 0, 20);
    this.cakeLight.position.set(0, 8, 3);
    this.scene.add(this.cakeLight);

    // Hemisphere sky light
    this.hemiLight = new THREE.HemisphereLight(0x001a33, 0x051020, 0.5);
    this.scene.add(this.hemiLight);
  }

  // Main update function called every frame
  update(progress, delta) {
    const time = this.clock.getElapsedTime();
    const scene = Math.floor(progress * 11);
    const sceneP = (progress * 11) % 1;

    this.currentProgress = progress;
    
    if (this.oceanObj) this.oceanObj.update(delta);
    if (this.particleSystem) this.particleSystem.update(delta);

    // Update shader uniforms
    if (this.sceneObjects.snow?.material?.uniforms?.time) {
      this.sceneObjects.snow.material.uniforms.time.value = time;
    }
    if (this.sky?.material?.uniforms?.time) {
      this.sky.material.uniforms.time.value = time;
    }
    if (this.stars?.material?.uniforms?.time) {
      this.stars.material.uniforms.time.value = time;
    }
    if (this.ocean?.material?.uniforms?.time) {
      this.ocean.material.uniforms.time.value = time;
    }
    if (this.sceneObjects.finalStars?.material?.uniforms?.time) {
      this.sceneObjects.finalStars.material.uniforms.time.value = time;
    }

    // Animate clouds
    if (this.sceneObjects.clouds) {
      this.sceneObjects.clouds.children.forEach(cloud => {
        cloud.position.x += cloud.userData.speed;
        if (cloud.position.x > 80) cloud.position.x = -80;
      });
    }

    // Animate birds
    if (this.sceneObjects.birds) {
      this.sceneObjects.birds.children.forEach(bird => {
        bird.position.x += bird.userData.speed;
        bird.position.y = bird.position.y + Math.sin(time * 2 + bird.userData.offset) * 0.01;
        if (bird.position.x > 30) bird.position.x = -30;
      });
    }



    // Fireworks animation - triggered externally via triggerSceneEvent


    // Camera interpolation
    this.updateCamera(progress, time);

    // Scene-specific updates
    this.updateSceneState(progress, scene, sceneP, time);
  }

  updateCamera(progress, time) {
    if (this.cameraPathHandler) {
      this.cameraPathHandler.updateCamera(this.camera, progress);
      // Add subtle camera breathing
      this.camera.position.y += Math.sin(time * 0.5) * 0.15;
      this.camera.position.x += Math.sin(time * 0.3) * 0.1;
    }
  }

  updateSceneState(progress, scene, sceneP, time) {
    this.updateModelTimeline(progress, time);

    // === NIGHT CELEBRATION TIMELINE ===
    // Keep everything dark and moonlit throughout
    this.sky.material.uniforms.sunriseProgress.value = 0; // Stay dark
    this.sunLight.intensity = 0; // Sun off for night
    this.ambientLight.intensity = 0.4; // Steady night ambient
    this.ambientLight.color.setHex(0x111133); // Night blue

    // === SCENE 0-1: Stars & Ocean ===
    const starsOpacity = this.smoothstep(0, 0.15, progress);
    this.stars.material.uniforms.opacity.value = starsOpacity;
    
    const oceanOpacity = this.smoothstep(0.08, 0.22, progress);
    if (this.oceanObj && this.oceanObj.mesh.material.uniforms.opacity) {
      this.oceanObj.mesh.material.uniforms.opacity.value = oceanOpacity;
    }

    // === SCENE 2: Island emerges from depths ===
    const islandProgress = this.smoothstep(0.15, 0.3, progress);
    if (this.storyStage) {
      this.storyStage.position.y = THREE.MathUtils.lerp(-20, -2, islandProgress);
    }

    // === SCENE 4: Cake appears on the island ===
    const cakeP = this.smoothstep(0.32, 0.42, progress);
    if (this.heroCake) {
      this.heroCake.scale.setScalar(THREE.MathUtils.lerp(0.01, 0.5, cakeP));
      this.heroCake.rotation.y = Math.sin(time * 0.15) * 0.04;
    }
    this.cakeLight.intensity = cakeP * 2.5; // Warm light on cake

    // === SCENE 5: Candles light for the cake cutting ===
    const candleP = this.smoothstep(0.38, 0.48, progress);
    if (this.sceneObjects.candles) {
      this.sceneObjects.candles.scale.setScalar(THREE.MathUtils.lerp(0.01, 0.5, candleP));
    }

    // === SCENE 6: Fireworks at night (after cake cutting) ===
    // Fireworks are timed to light up the night sky
    const fireworksVisible = progress >= 0.42 && progress <= 0.65;
    
    // === SCENE 7: Gifts reveal ===
    const giftsP = this.smoothstep(0.52, 0.65, progress);
    // Gift visibility already managed by model timeline

    // === SCENE 8: Flowers bloom ===
    const flowerP = this.smoothstep(0.55, 0.68, progress);
    if (this.sceneObjects.flowers) {
      const baseScale = this.sceneObjects.flowers.userData.baseScale || 1;
      this.sceneObjects.flowers.scale.setScalar(baseScale * flowerP);
    }

    // === SCENE 9-10: Moon rises high & stars fade in ===
    const moonP = this.smoothstep(0.3, 0.75, progress);
    if (this.sceneObjects.moon) {
      this.sceneObjects.moon.position.y = THREE.MathUtils.lerp(-50, 35, moonP);
      this.sceneObjects.moon.position.x = THREE.MathUtils.lerp(-20, -10, moonP);
    }
    this.moonLight.intensity = 1.2 + moonP * 0.5; // Constant night moonlight
    
    // Final stars glow as night deepens
    const finalStarP = this.smoothstep(0.65, 0.95, progress);
    if (this.sceneObjects.finalStars?.material?.uniforms?.opacity) {
      this.sceneObjects.finalStars.material.uniforms.opacity.value = finalStarP;
    }
  }

  updateModelTimeline(progress, time) {
    Object.entries(this.modelTimeline).forEach(([key, host]) => {
      const start = host.userData.revealStart ?? 0;
      const end = host.userData.revealEnd ?? 1;
      const persistent = host.userData.persistent ?? true;
      const visible = persistent ? progress >= start : progress >= start && progress <= end;
      host.visible = visible;

      if (!visible) return;

      if (key === 'fairyLights') {
        host.rotation.y = Math.PI * 0.25 + Math.sin(time * 0.4) * 0.04;
      }

      if (key === 'balloons') {
        host.position.y = 4 + Math.sin(time * 0.7) * 0.2;
      }

      if (key === 'giftBox') {
        host.rotation.y = Math.sin(time * 0.25) * 0.08;
      }

      if (key === 'fireworkProp') {
        host.position.y = 12 + Math.sin(time * 1.4) * 0.3;
      }
    });
  }


  smoothstep(edge0, edge1, x) {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
  }

  startRender() {
    let lastTime = 0;
    const render = (time) => {
      this.frameId = requestAnimationFrame(render);
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      this.update(this.currentProgress, delta);
      if (this.postProcessing) {
        this.postProcessing.render(delta);
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };
    this.frameId = requestAnimationFrame(render);
  }

  setProgress(p) {
    this.currentProgress = Math.max(0, Math.min(1, p));
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.postProcessing) {
      this.postProcessing.setSize(window.innerWidth, window.innerHeight);
    }
  }

  dispose() {
    if (this.frameId) cancelAnimationFrame(this.frameId);
    this.renderer.dispose();
  }
}
