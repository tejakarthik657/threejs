import * as THREE from 'three';

class Particle {
  constructor() {
    this.position = new THREE.Vector3();
    this.velocity = new THREE.Vector3();
    this.acceleration = new THREE.Vector3();
    this.color = new THREE.Color();
    this.size = 1.0;
    this.lifetime = 1.0;
    this.age = 0.0;
    this.isDead = true;
  }
}

export class ParticleSystem {
  constructor(scene, maxParticles = 5000) {
    this.maxParticles = maxParticles;
    this.particles = [];
    this.aliveParticles = [];
    this.deadParticles = [];
    
    for (let i = 0; i < maxParticles; i++) {
      const p = new Particle();
      this.particles.push(p);
      this.deadParticles.push(p);
    }
    
    this.positions = new Float32Array(maxParticles * 3);
    this.colors = new Float32Array(maxParticles * 3);
    this.sizes = new Float32Array(maxParticles);
    this.opacities = new Float32Array(maxParticles);
    
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('opacity', new THREE.BufferAttribute(this.opacities, 1));
    
    this.material = new THREE.ShaderMaterial({
      vertexShader: `
        attribute float size;
        attribute float opacity;
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          vColor = color;
          vOpacity = opacity;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vOpacity;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vOpacity;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });
    
    this.mesh = new THREE.Points(this.geometry, this.material);
    scene.add(this.mesh);
  }
  
  spawn(pos, vel, accel, colorHex, size, lifetime) {
    if (this.deadParticles.length === 0) return null;
    
    const p = this.deadParticles.pop();
    p.position.copy(pos);
    p.velocity.copy(vel);
    p.acceleration.copy(accel);
    p.color.setHex(colorHex);
    p.size = size;
    p.lifetime = lifetime;
    p.age = 0;
    p.isDead = false;
    
    this.aliveParticles.push(p);
    return p;
  }
  
  update(deltaTime) {
    let activeCount = 0;
    
    for (let i = this.aliveParticles.length - 1; i >= 0; i--) {
      const p = this.aliveParticles[i];
      p.age += deltaTime;
      
      if (p.age >= p.lifetime) {
        p.isDead = true;
        this.deadParticles.push(p);
        this.aliveParticles.splice(i, 1);
        continue;
      }
      
      p.velocity.addScaledVector(p.acceleration, deltaTime);
      p.velocity.multiplyScalar(0.98); // Drag
      p.position.addScaledVector(p.velocity, deltaTime);
      
      const idx3 = activeCount * 3;
      this.positions[idx3] = p.position.x;
      this.positions[idx3 + 1] = p.position.y;
      this.positions[idx3 + 2] = p.position.z;
      
      this.colors[idx3] = p.color.r;
      this.colors[idx3 + 1] = p.color.g;
      this.colors[idx3 + 2] = p.color.b;
      
      this.sizes[activeCount] = p.size;
      
      const lifeRatio = p.age / p.lifetime;
      let opacity = 1.0;
      if (lifeRatio < 0.1) opacity = lifeRatio / 0.1;
      else if (lifeRatio > 0.6) opacity = 1.0 - (lifeRatio - 0.6) / 0.4;
      this.opacities[activeCount] = opacity;
      
      activeCount++;
    }
    
    this.geometry.setDrawRange(0, activeCount);
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.opacity.needsUpdate = true;
  }
}
