import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export class ScrollController {
  constructor(worldInstance, onProgressUpdate, onSceneChange) {
    this.world = worldInstance;
    this.onProgressUpdate = onProgressUpdate;
    this.onSceneChange = onSceneChange;
    this.currentScene = -1;
    this.setupScrollSync();
  }

  setupScrollSync() {
    // Wait for DOM to be ready
    setTimeout(() => {
      ScrollTrigger.create({
        trigger: "#scroll-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1, // Smooth scrubbing
        onUpdate: (self) => {
          const progress = self.progress;
          
          if (this.world && typeof this.world.setProgress === 'function') {
            this.world.setProgress(progress);
          }
          
          if (this.onProgressUpdate) {
            this.onProgressUpdate(progress);
          }
          
          const sceneIndex = Math.min(Math.floor(progress * 11), 10);
          if (sceneIndex !== this.currentScene) {
            this.currentScene = sceneIndex;
            if (this.onSceneChange) {
              this.onSceneChange(sceneIndex);
            }
          }
        }
      });
    }, 100);
  }

  destroy() {
    ScrollTrigger.getAll().forEach(t => t.kill());
  }
}
