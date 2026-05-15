import * as THREE from 'three';

export class IslandTerrain {
  constructor(scene, textures = null) {
    this.scene = scene;
    this.textures = textures;
    this.group = new THREE.Group();
    this.generateTerrain();
    this.generateVegetation();
    this.group.position.set(0, -10, 0);
    scene.add(this.group);
  }

  applyTextures(textures) {
    this.textures = textures;

    if (this.terrainMesh && textures?.grassColor) {
      this.terrainMesh.material.map = textures.grassColor;
      this.terrainMesh.material.normalMap = textures.grassNormal;
      this.terrainMesh.material.roughnessMap = textures.grassRoughness;
      this.terrainMesh.material.needsUpdate = true;
    }
  }

  generateTerrain() {
    const geo = new THREE.ConeGeometry(30, 15, 64, 64);
    const pos = geo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      if (y > -7.0) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const noise = Math.sin(x * 0.4) * Math.cos(z * 0.4) * 1.5 + Math.sin(x * 0.1 + z * 0.2) * 2.0;
        pos.setY(i, y + noise);
      }
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x5a4a3a,
      roughness: 0.9,
      metalness: 0.0,
    });

    if (this.textures?.grassColor) {
      mat.map = this.textures.grassColor;
      mat.normalMap = this.textures.grassNormal;
      mat.roughnessMap = this.textures.grassRoughness;
    }

    this.terrainMesh = new THREE.Mesh(geo, mat);
    this.terrainMesh.castShadow = true;
    this.terrainMesh.receiveShadow = true;
    this.terrainMesh.userData.kind = 'terrain';
    this.group.add(this.terrainMesh);

    const sandGeo = new THREE.CylinderGeometry(32, 35, 1, 64);
    const sandMat = new THREE.MeshStandardMaterial({ color: 0xd4a574, roughness: 1.0 });
    const sand = new THREE.Mesh(sandGeo, sandMat);
    sand.position.y = -7.0;
    sand.receiveShadow = true;
    sand.userData.kind = 'sand';
    this.group.add(sand);
  }

  generateVegetation() {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 5 + Math.random() * 20;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.set(x, 0, z);
      trunk.castShadow = true;

      const foliageGeo = new THREE.ConeGeometry(1.5, 3, 8);
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2d7d2d, roughness: 0.8 });
      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.set(x, 2, z);
      foliage.castShadow = true;

      this.group.add(trunk);
      this.group.add(foliage);
    }
  }
}