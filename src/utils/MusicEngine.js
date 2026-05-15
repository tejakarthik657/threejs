// Full cinematic music engine using Web Audio API
export class MusicEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.playing = false;
    this.nodes = [];
    this.currentScene = 0;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (e) {
      console.warn("Web Audio API not supported or blocked");
      return;
    }
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    
    // Reverb convolver
    this.reverb = this.createReverb(3.5);
    this.reverb.connect(this.masterGain);
    this.masterGain.connect(this.ctx.destination);

    // Dry path
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    this.dryGain.connect(this.masterGain);
  }

  createReverb(duration) {
    const convolver = this.ctx.createConvolver();
    const rate = this.ctx.sampleRate;
    const length = rate * duration;
    const impulse = this.ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
      }
    }
    convolver.buffer = impulse;
    return convolver;
  }

  createOscillator(freq, type = 'sine', gain = 0.3, startTime = 0, duration = 1) {
    const osc = this.ctx.createOscillator();
    const gainNode = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);
    gainNode.gain.setValueAtTime(0, this.ctx.currentTime + startTime);
    gainNode.gain.linearRampToValueAtTime(gain, this.ctx.currentTime + startTime + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + startTime + duration);
    osc.connect(gainNode);
    gainNode.connect(this.dryGain);
    gainNode.connect(this.reverb);
    osc.start(this.ctx.currentTime + startTime);
    osc.stop(this.ctx.currentTime + startTime + duration + 0.1);
    return { osc, gainNode };
  }

  // Play a gentle ambient pad chord
  playAmbientPad(baseFreq, duration = 4) {
    const harmonics = [1, 1.25, 1.5, 2, 2.5];
    harmonics.forEach((h, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * h, this.ctx.currentTime);
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.06 / (i + 1), this.ctx.currentTime + 1);
      gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.reverb);
      osc.start(this.ctx.currentTime);
      osc.stop(this.ctx.currentTime + duration + 0.5);
      this.nodes.push({ osc, gain });
    });
  }

  // Slow, emotional lofi ambient track instead of upbeat melody
  playLofiAmbient() {
    // A slow, emotional lofi progression (Cmaj9 -> Am9 -> Fmaj7 -> Gsus4)
    const chords = [
      [130.81, 196.00, 246.94, 293.66], // Cmaj9
      [110.00, 164.81, 220.00, 246.94], // Am9
      [87.31, 130.81, 174.61, 220.00],  // Fmaj7
      [98.00, 146.83, 196.00, 261.63],  // Gsus4
    ];

    const beatDur = 3.0; // Very slow tempo for emotional impact
    
    // Play chords in a sequence
    for (let loop = 0; loop < 12; loop++) {
      chords.forEach((chord, idx) => {
        const time = loop * (chords.length * beatDur) + (idx * beatDur);
        chord.forEach(freq => {
          // Warm sine pad
          this.createOscillator(freq, 'sine', 0.035, time, beatDur * 1.5);
          // Subtle electric piano "tine"
          this.createOscillator(freq * 2, 'triangle', 0.015, time, beatDur * 0.8);
        });
      });
    }

    // Distant, reverb-heavy melodic plucks
    const melody = [
      [293.66, 0], [329.63, 1.5], [392.00, 3], // D4, E4, G4
      [261.63, 5], [246.94, 6.5], [196.00, 8], // C4, B3, G3
      [293.66, 10], [329.63, 11.5], [440.00, 13], // D4, E4, A4
      [392.00, 15], [329.63, 17], [261.63, 18.5] // G4, E4, C4
    ];

    for (let loop = 0; loop < 6; loop++) {
      const loopOffset = loop * 24;
      melody.forEach(([freq, beat]) => {
        const time = loopOffset + (beat * 1.2);
        this.createOscillator(freq, 'sine', 0.04, time, 2.5);
        this.createOscillator(freq * 1.5, 'triangle', 0.008, time, 1.0); // Harmonic delay effect
      });
    }
  }

  // Adds a warm, nostalgic vinyl record crackle
  playVinylCrackle() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.03; // Base hiss
      if (Math.random() < 0.0015) output[i] += (Math.random() * 2 - 1) * 0.6; // Random pop
    }

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2500, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 3);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    source.start(this.ctx.currentTime);
    this.nodes.push({ osc: source, gain });
  }

  // Ambient ocean/night sounds
  playAmbientOcean() {
    const bufferSize = this.ctx.sampleRate * 2;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;

    const source = this.ctx.createBufferSource();
    source.buffer = noiseBuffer;
    source.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(400, this.ctx.currentTime);
    filter.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 2);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.reverb);
    source.start(this.ctx.currentTime);
    this.nodes.push({ osc: source, gain });
    return { source, gain };
  }

  // Sparkle/twinkle sounds
  playSparkle() {
    const freqs = [1046.5, 1318.5, 1567.98, 2093, 2637];
    freqs.forEach((f, i) => {
      setTimeout(() => {
        this.createOscillator(f, 'sine', 0.15, 0, 0.3);
        this.createOscillator(f * 1.5, 'sine', 0.05, 0.05, 0.2);
      }, i * 80);
    });
  }

  // Firework boom
  playFirework() {
    // Boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(20, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.5, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + 0.6);

    // Crackle
    for (let i = 0; i < 8; i++) {
      setTimeout(() => this.playSparkle(), i * 150 + 200);
    }
  }

  setSceneMusic(sceneIndex) {
    if (!this.ctx || !this.playing) return;
    this.currentScene = sceneIndex;

    // Different ambient music per scene
    const scenePads = {
      0: [110, 138.59, 164.81], // dark space - A2, C#3, E3
      1: [130.81, 164.81, 196], // ocean - C3 chord
      2: [146.83, 184.99, 220], // island emerge - D3
      3: [174.61, 220, 261.63], // sunrise - F3
      4: [196, 246.94, 293.66], // cake - G3
    };

    const padFreqs = scenePads[Math.min(sceneIndex, 4)];
    if (padFreqs && sceneIndex < 8) {
      padFreqs.forEach((f, i) => {
        this.createOscillator(f, 'sine', 0.06, i * 0.3, 6);
      });
    }

    if (sceneIndex === 6) this.playFirework();
    if (sceneIndex === 9) {
      setTimeout(() => this.playLofiAmbient(), 500);
    }
  }

  start() {
    this.init();
    if (!this.ctx) return; // Guard if audio failed
    this.playing = true;
    try {
      this.playAmbientOcean();
      this.playVinylCrackle(); // Start the lofi hiss immediately
      this.setSceneMusic(this.currentScene || 0);
    } catch (e) {
      console.warn("Error starting audio nodes:", e);
    }
  }

  stop() {
    this.playing = false;
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1);
    }
    setTimeout(() => {
      this.nodes.forEach(n => {
        try { n.osc.stop(); } catch(e) {}
      });
      if (this.ctx) { this.ctx.close(); this.ctx = null; }
    }, 1200);
  }

  setVolume(v) {
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(v, this.ctx.currentTime + 0.5);
    }
  }
}
