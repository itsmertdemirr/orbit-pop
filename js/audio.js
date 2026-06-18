export class AudioManager {
  constructor(settings) {
    this.settings = settings;
    this.context = null;
    this.master = null;
    this.ambience = null;
    this.ambienceNodes = [];
  }

  updateSettings(settings) {
    this.settings = settings;
    if (!settings.music) this.stopAmbience();
    else if (this.context) this.startAmbience();
  }

  ensureContext() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume().catch(() => {});
      return this.context;
    }
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.gain.value = 0.18;
    this.master.connect(this.context.destination);
    return this.context;
  }

  tone(frequency, duration = 0.08, type = 'sine', volume = 0.16, slide = 0) {
    if (!this.settings.sound) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, now);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + slide), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(now);
    osc.stop(now + duration + 0.03);
  }

  hit(combo = 1) {
    const note = 310 + Math.min(combo, 20) * 12;
    this.tone(note, 0.09, 'sine', 0.15, 90);
    if (combo > 0 && combo % 5 === 0) setTimeout(() => this.tone(note * 1.35, 0.11, 'triangle', 0.11, 120), 55);
  }

  miss() { this.tone(145, 0.18, 'sawtooth', 0.09, -70); }
  shoot() { this.tone(220, 0.055, 'triangle', 0.07, 80); }
  power() { this.tone(420, 0.15, 'sine', 0.12, 340); }
  click() { this.tone(270, 0.045, 'sine', 0.06, 40); }
  finish() {
    this.tone(300, 0.13, 'triangle', 0.11, 120);
    setTimeout(() => this.tone(450, 0.18, 'triangle', 0.12, 160), 110);
  }

  startAmbience() {
    if (!this.settings.music || this.ambienceNodes.length) return;
    const ctx = this.ensureContext();
    if (!ctx) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.012;
    gain.connect(this.master);
    [55, 82.41].forEach((frequency, index) => {
      const osc = ctx.createOscillator();
      osc.type = index ? 'sine' : 'triangle';
      osc.frequency.value = frequency;
      osc.connect(gain);
      osc.start();
      this.ambienceNodes.push(osc);
    });
    this.ambience = gain;
  }

  stopAmbience() {
    this.ambienceNodes.forEach(node => {
      try { node.stop(); } catch (_) { /* already stopped */ }
    });
    this.ambienceNodes = [];
    if (this.ambience) {
      try { this.ambience.disconnect(); } catch (_) { /* no-op */ }
      this.ambience = null;
    }
  }
}
