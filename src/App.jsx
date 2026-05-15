import { useEffect, useRef, useState } from 'react';
import { BirthdayWorld } from './utils/BirthdayWorld';
import { MusicEngine } from './utils/MusicEngine';
import { ScrollController } from './utils/ScrollController';
import './index.css';

const SCENES = [
  {
    title: 'The Night Sky',
    text: 'A starlit night. The universe has gathered to celebrate you.',
  },
  {
    title: 'The Ocean Awakens',
    text: 'Beneath the moonlight, the waters stir. Magic is in the air.',
  },
  {
    title: 'An Island Emerges',
    text: 'From the depths, your world rises. A sacred space, built just for tonight.',
  },
  {
    title: 'Palms Frame the Night',
    text: 'Ancient trees stand guard. Witnesses to a moment that will echo forever.',
  },
  {
    title: 'Your Cake Awaits',
    text: 'One wish. One moment. One cake to celebrate you.',
  },
  {
    title: 'Candles Ignite',
    text: 'Each flame is your story. Each glow is our belief in you.',
  },
  {
    title: 'The Sky Erupts',
    text: 'Fireworks! The night sky screams joy. Every burst of light says: Happy Birthday, Sath.',
  },
  {
    title: 'Gifts Appear',
    text: 'Wrapped in love. Waiting at your feet. For you.',
  },
  {
    title: 'Flowers of the Night',
    text: 'Even the earth celebrates. Petals unfurl in your honor.',
  },
  {
    title: 'The Moon Watches',
    text: 'She has risen high. To light your path. Always.',
  },
  {
    title: '✨ Happy Birthday, Sath ✨',
    text: 'Hlo Sath, Karthik here. No matter what comes, I\'m here. Always. Forever, your best friend. Happy Birthday ee.',
  },
];

export default function App() {
  const canvasRef = useRef(null);
  const worldRef = useRef(null);
  const musicRef = useRef(null);
  const [musicOn, setMusicOn] = useState(false);
  const [currentScene, setCurrentScene] = useState(0);
  const [progress, setProgress] = useState(0);
  const [textVisible, setTextVisible] = useState(true);
  const [showFinal, setShowFinal] = useState(false);
  const scrollContainerRef = useRef(null);
  const lastSceneRef = useRef(0);

  useEffect(() => {
    // Init Three.js world
    const world = new BirthdayWorld(canvasRef.current);
    worldRef.current = world;
    window.__birthdayWorld = world;
    window.world = world;

    // Init music engine
    musicRef.current = new MusicEngine();

    // Scroll handler using ScrollController
    const scrollController = new ScrollController(
      world,
      (p) => {
        setProgress(p);
        setShowFinal(p > 0.92);
      },
      (sceneIdx) => {
        setCurrentScene(sceneIdx);
        
        // Trigger scene music
        if (musicRef.current?.playing) {
          musicRef.current.setSceneMusic(sceneIdx);
        }
        
        // Trigger fireworks at scene 6 but only after cake scene progress reached (avoid morning/premature triggers)
        if (sceneIdx === 6 && world.fireworksManager && world.currentProgress >= 0.42) {
          // Prefer world-local cake world position if available
          try {
            const cakePos = new window.THREE.Vector3();
            if (world.sceneObjects?.cake?.getWorldPosition) {
              world.sceneObjects.cake.getWorldPosition(cakePos);
              world.fireworksManager.triggerSequence(cakePos, 6);
            } else {
              world.fireworksManager.triggerSequence(world.sceneObjects.cake.position, 6);
            }
          } catch (e) {
            world.fireworksManager.triggerSequence(world.sceneObjects.cake.position, 6);
          }
        }

        // Text visibility
        const sceneLocal = ((sceneIdx / 11) * 11) % 1; // Approximate
        setTextVisible(true);
      }
    );

    return () => {
      scrollController.destroy();
      world.dispose();
      if (window.__birthdayWorld === world) {
        window.__birthdayWorld = null;
      }
    };
  }, []);

  const toggleMusic = () => {
    if (!musicOn) {
      musicRef.current?.start();
      setMusicOn(true);
    } else {
      musicRef.current?.stop();
      musicRef.current = new MusicEngine();
      setMusicOn(false);
    }
  };

  return (
    <>
      <div className="vignette"></div>

      {/* Three.js Canvas */}
      <canvas ref={canvasRef} id="canvas-container" style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 1 }} />

      {/* Music button */}
      <button className="music-btn" onClick={toggleMusic}>
        {musicOn ? '♪ Music On' : '♪ Music Off'}
      </button>

      {/* Scene text overlay */}
      <div className={`scene-text ${textVisible && !showFinal ? 'visible' : ''}`}>
        <h2>{SCENES[currentScene]?.title}</h2>
        <p>{SCENES[currentScene]?.text}</p>
      </div>

      {/* Scroll hint */}
      {progress < 0.05 && (
        <div className="scroll-hint">Scroll to begin</div>
      )}

      {/* Final overlay */}
      <div className={`final-overlay ${showFinal ? 'visible' : ''}`}>
        <h1>Happy Birthday</h1>
        <div className="subtitle">S A T H</div>
        <div className="subtitle" style={{ fontSize: 'clamp(0.8rem, 1.5vw, 1.1rem)', opacity: 0.7, letterSpacing: '0.15em' }}>
          May every dream of yours come true
        </div>
        <div className="letter-container">
          <p>Hlo sath karthik here happy birthday ee</p>
          <p>very happy after some distabance manam malla mundhu la unnam contact ippudhu sath ayindhi</p>
          <p>bayata world ki oka ammai abbai eppudhu frds kaleru ani untadhee we proved everyone wrong enni night fights ayina okari medha okaram give up ivvale nammakam kolpole kopam ochindhi emo kani some how edo okati chesi we are there and now we are best frds</p>
          <p>no matter what I will be ur side supporting u..</p>
          <p>no matter what we will be frds for ever and ever..</p>
          <p>first time matladhinapudhu anukole like I got a life time frd ani but now we are..</p>
          <p>One thing for sure things eppudhu oke la undavu changes ostay aa changes ni manam ela face chestham matter..</p>
          <p className="signature">one or an other way we figure things out happy to be ur best frd ee..</p>
        </div>
      </div>

      {/* Scroll spacer — creates the scrollable height */}
      <div
        id="scroll-container"
        ref={scrollContainerRef}
        style={{
          position: 'relative',
          height: `${SCENES.length * 100 + 150}vh`, // Extra 150vh so user has plenty of room to scroll without hitting the bottom abruptly
          zIndex: 2,
          pointerEvents: 'none'
        }}
      />
    </>
  );
}
