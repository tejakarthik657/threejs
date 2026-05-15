import * as THREE from 'three';

export class Ocean {
  constructor(scene, size = 400) {
    this.geometry = new THREE.PlaneGeometry(size, size, 256, 256);
    this.material = this.createOceanMaterial();
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.position.y = -0.5;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);
  }
  
  createOceanMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        deepColor: { value: new THREE.Color(0x0a1f3f) },
        shallowColor: { value: new THREE.Color(0x2a5f7f) },
        sunPos: { value: new THREE.Vector3(50, 40, 50) },
        opacity: { value: 0.0 },
      },
      vertexShader: `
        uniform float time;
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vWorldPos;

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
          vUv = uv;
          vec3 p = position;
          
          vec3 waveOffset = vec3(0.0);
          waveOffset += gerstnerWave(vec4(1.0, 0.2, 0.2, 60.0), p);
          waveOffset += gerstnerWave(vec4(0.7, 0.7, 0.15, 30.0), p);
          waveOffset += gerstnerWave(vec4(-0.2, 1.0, 0.1, 15.0), p);
          
          p += waveOffset;
          
          vec3 n = vec3(0.0, 1.0, 0.0);
          n.x -= (gerstnerWave(vec4(1.0, 0.2, 0.2, 60.0), p + vec3(0.1,0,0)).y - p.y) / 0.1;
          n.z -= (gerstnerWave(vec4(1.0, 0.2, 0.2, 60.0), p + vec3(0,0,0.1)).y - p.y) / 0.1;
          vNormal = normalize(n);
          
          vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
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
          vec3 viewDir = normalize(cameraPosition - vWorldPos);
          vec3 toSun = normalize(sunPos - vWorldPos);
          
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          vec3 color = mix(deepColor, shallowColor, fresnel);
          
          vec3 halfVector = normalize(toSun + viewDir);
          float spec = pow(max(dot(vNormal, halfVector), 0.0), 100.0) * 0.5;
          color += vec3(1.0, 0.9, 0.8) * spec;
          
          float dist = length(vWorldPos.xz);
          float alpha = 1.0 - smoothstep(150.0, 300.0, dist);
          
          gl_FragColor = vec4(color, alpha * opacity);
        }
      `,
      transparent: true,
      side: THREE.FrontSide
    });
  }

  update(deltaTime) {
    this.material.uniforms.time.value += deltaTime;
  }
}
