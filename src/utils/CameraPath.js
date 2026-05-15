import * as THREE from 'three';

export class CameraPath {
  constructor(waypoints = []) {
    this.waypoints = waypoints;
  }

  updateCamera(camera, globalProgress) {
    if (!this.waypoints.length) return;

    // We have 11 scenes (0 to 10), which means 10 intervals.
    // If progress is 1.0, sceneIndex should be 10 and localProgress 0.
    const intervals = this.waypoints.length - 1;
    const rawIndex = globalProgress * intervals;
    let sceneIndex = Math.floor(rawIndex);
    let localProgress = rawIndex % 1;

    if (globalProgress >= 1.0) {
      sceneIndex = intervals;
      localProgress = 0;
    }

    const current = this.waypoints[sceneIndex];
    const next = this.waypoints[Math.min(sceneIndex + 1, this.waypoints.length - 1)];

    // Hermite interpolation for smooth motion
    const eased = this.easeInOutCubic(localProgress);

    // Lerp position
    camera.position.lerpVectors(current.pos, next.pos, eased);

    // Lerp target
    const targetLerpPos = new THREE.Vector3().lerpVectors(current.target, next.target, eased);
    camera.lookAt(targetLerpPos);
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
