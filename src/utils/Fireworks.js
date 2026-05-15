import * as THREE from 'three';

export class Fireworks {
  constructor(particleSystem) {
    this.ps = particleSystem;
  }
  
  trigger(position, count = 300, color = 0xff0000) {
    // Launch trail
    for (let i = 0; i < 15; i++) {
      // gentler launch so trails rise slower and feel more graceful
      const vel = new THREE.Vector3(0, 8 + Math.random()*3, 0);
      const accel = new THREE.Vector3(0, -6.0, 0);
      this.ps.spawn(position, vel, accel, 0xffffff, 0.45, 0.7 + Math.random()*0.7);
    }
    
    // Schedule burst
    // Slightly longer delay before burst for a more deliberate rhythm
    setTimeout(() => {
      this.burst(new THREE.Vector3(position.x, position.y + 18, position.z), count, color);
    }, 1200);
  }
  
  burst(position, count, colorHex) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const elevation = Math.random() * Math.PI - Math.PI / 2;
      // slower, softer burst speeds for nighttime fireworks
      const speed = 6 + Math.random() * 8;
      const vel = new THREE.Vector3(
        Math.cos(elevation) * Math.cos(angle) * speed,
        Math.cos(elevation) * Math.sin(angle) * speed,
        Math.sin(elevation) * speed
      );
      
      const accel = new THREE.Vector3(0, -4, 0);
      const life = 1.8 + Math.random() * 1.2;
      
      this.ps.spawn(position, vel, accel, colorHex, 0.6, life);
    }
  }
  
  triggerSequence(position, count = 5) {
    const colors = [0xff0000, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0xffaa00];
    for (let i = 0; i < count; i++) {
      // increase spacing between bursts to feel more ceremonial at night
      setTimeout(() => {
        const offset = new THREE.Vector3(
          (Math.random() - 0.5) * 40,
          0,
          (Math.random() - 0.5) * 40
        );
        const color = colors[i % colors.length];
        this.trigger(position.clone().add(offset), 250, color);
      }, i * 700 + Math.random() * 300);
    }
  }
}
