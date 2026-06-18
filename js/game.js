import { MODE_CONFIG, PALETTES, POWER_UPS } from './config.js';
import { ParticleSystem } from './particles.js';

const TAU = Math.PI * 2;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const angleDistance = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

function daySeed() {
  const now = new Date();
  const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  let seed = 0;
  for (const char of key) seed = ((seed << 5) - seed + char.charCodeAt(0)) | 0;
  return { key, seed: Math.abs(seed) || 1 };
}

function seededRandom(seedObj) {
  seedObj.value = (seedObj.value * 1664525 + 1013904223) % 4294967296;
  return seedObj.value / 4294967296;
}

export class OrbitGame {
  constructor(canvas, audio, callbacks = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.audio = audio;
    this.callbacks = callbacks;
    this.settings = {};
    this.mode = MODE_CONFIG.classic;
    this.state = 'idle';
    this.raf = 0;
    this.lastTime = 0;
    this.elapsed = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.shots = 0;
    this.hits = 0;
    this.lives = 3;
    this.timeLeft = null;
    this.aimAngle = -Math.PI / 2;
    this.aimSpeed = 1.05;
    this.projectile = null;
    this.targets = [];
    this.particles = new ParticleSystem();
    this.palette = PALETTES.default;
    this.currentColorIndex = 0;
    this.activePowers = new Map();
    this.shield = 0;
    this.rings = [];
    this.stars = [];
    this.width = 800;
    this.height = 600;
    this.dpr = 1;
    this.center = { x: 400, y: 300 };
    this.maxRadius = 230;
    this.seed = { value: 1 };
    this.dayKey = null;
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas.parentElement);
    this.resize();
  }

  setSettings(settings) {
    this.settings = settings;
    this.palette = settings.colorblind ? PALETTES.colorblind : PALETTES.default;
  }

  random() {
    return this.mode.id === 'daily' ? seededRandom(this.seed) : Math.random();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this.dpr = Math.min(window.devicePixelRatio || 1, this.settings.quality === 'low' ? 1 : 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr);
    this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.center = { x: this.width / 2, y: this.height / 2 };
    const base = Math.min(this.width, this.height);
    this.maxRadius = base * 0.42;
    this.rings = [this.maxRadius * 0.45, this.maxRadius * 0.7, this.maxRadius * 0.95];
    this.buildStars();
    if (this.targets.length) this.targets.forEach(t => { t.radius = this.rings[t.ring]; });
  }

  buildStars() {
    const count = this.settings.quality === 'low' ? 28 : this.settings.quality === 'medium' ? 55 : 85;
    this.stars = Array.from({ length: count }, () => ({
      x: Math.random() * this.width,
      y: Math.random() * this.height,
      r: 0.4 + Math.random() * 1.2,
      a: 0.12 + Math.random() * 0.35
    }));
  }

  start(modeId = 'classic') {
    this.stop(false);
    this.resize();
    this.mode = MODE_CONFIG[modeId] || MODE_CONFIG.classic;
    const daily = daySeed();
    this.dayKey = daily.key;
    this.seed = { value: daily.seed };
    this.state = 'running';
    this.elapsed = 0;
    this.score = 0;
    this.combo = 0;
    this.bestCombo = 0;
    this.shots = 0;
    this.hits = 0;
    this.lives = this.mode.lives;
    this.timeLeft = this.mode.duration;
    this.aimAngle = -Math.PI / 2;
    this.aimSpeed = 1.02 * this.mode.speed;
    this.projectile = null;
    this.targets = [];
    this.activePowers.clear();
    this.shield = 0;
    this.particles.clear();
    this.currentColorIndex = Math.floor(this.random() * this.palette.length);
    this.spawnInitialTargets();
    this.lastTime = performance.now();
    this.audio.startAmbience();
    this.emitHud();
    this.raf = requestAnimationFrame(time => this.loop(time));
  }

  spawnInitialTargets() {
    for (let ring = 0; ring < this.rings.length; ring += 1) {
      const amount = ring === 0 ? 3 : 4;
      for (let i = 0; i < amount; i += 1) {
        const base = (i / amount) * TAU;
        this.targets.push(this.createTarget(ring, base + this.random() * 0.35));
      }
    }
    this.ensureCurrentColorExists();
  }

  createTarget(ring, angle = this.random() * TAU) {
    const direction = ring % 2 === 0 ? 1 : -1;
    return {
      ring,
      radius: this.rings[ring],
      angle,
      colorIndex: Math.floor(this.random() * this.palette.length),
      speed: direction * (0.22 + ring * 0.045 + this.random() * 0.055),
      size: clamp(this.maxRadius * 0.035, 10, 17),
      pulse: this.random() * TAU,
      alive: true
    };
  }

  ensureCurrentColorExists() {
    if (!this.targets.some(t => t.alive && t.colorIndex === this.currentColorIndex)) {
      const candidate = this.targets[Math.floor(this.random() * this.targets.length)];
      if (candidate) candidate.colorIndex = this.currentColorIndex;
    }
  }

  shoot() {
    if (this.state !== 'running' || this.projectile) return;
    this.audio.ensureContext();
    this.audio.shoot();
    this.shots += 1;
    this.projectile = {
      angle: this.aimAngle,
      distance: this.maxRadius * 0.08,
      previousDistance: this.maxRadius * 0.08,
      speed: Math.max(480, this.maxRadius * 2.8),
      colorIndex: this.currentColorIndex
    };
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    cancelAnimationFrame(this.raf);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this.lastTime = performance.now();
    this.raf = requestAnimationFrame(time => this.loop(time));
  }

  stop(clear = true) {
    cancelAnimationFrame(this.raf);
    if (clear) {
      this.state = 'idle';
      this.projectile = null;
      this.targets = [];
      this.particles.clear();
      this.drawIdle();
    }
  }

  loop(time) {
    if (this.state !== 'running') return;
    const dt = Math.min(0.033, Math.max(0, (time - this.lastTime) / 1000));
    this.lastTime = time;
    this.update(dt);
    this.draw();
    this.raf = requestAnimationFrame(next => this.loop(next));
  }

  update(dt) {
    this.elapsed += dt;
    if (this.timeLeft !== null) {
      this.timeLeft = Math.max(0, this.mode.duration - this.elapsed);
      if (this.timeLeft <= 0) {
        this.finish('time');
        return;
      }
    }

    this.updatePowers(dt);
    const difficulty = this.mode.id === 'zen' ? 1 : 1 + Math.min(1.6, this.score / 1750);
    const slowed = this.activePowers.has('slow') ? 0.52 : 1;
    this.aimAngle = (this.aimAngle + this.aimSpeed * difficulty * slowed * dt) % TAU;

    for (const target of this.targets) {
      target.angle = (target.angle + target.speed * difficulty * this.mode.speed * slowed * dt) % TAU;
      target.pulse += dt * 3;
    }

    if (this.projectile) this.updateProjectile(dt);
    this.particles.update(dt);
    this.emitHud();
  }

  updatePowers(dt) {
    const now = this.elapsed * 1000;
    for (const [id, endAt] of this.activePowers.entries()) {
      if (endAt > 0 && now >= endAt) this.activePowers.delete(id);
    }
  }

  updateProjectile(dt) {
    const p = this.projectile;
    p.previousDistance = p.distance;
    p.distance += p.speed * dt;
    const color = this.palette[p.colorIndex].hex;
    const x = this.center.x + Math.cos(p.angle) * p.distance;
    const y = this.center.y + Math.sin(p.angle) * p.distance;
    if (this.settings.quality !== 'low') this.particles.trail(x, y, color);

    let collided = null;
    for (const target of this.targets) {
      if (!target.alive) continue;
      const crossed = p.previousDistance <= target.radius + target.size && p.distance >= target.radius - target.size;
      const magnetBoost = this.activePowers.has('magnet') ? 1.75 : 1;
      const threshold = ((target.size + 7) / target.radius) * magnetBoost;
      if (crossed && angleDistance(p.angle, target.angle) <= threshold) {
        collided = target;
        break;
      }
    }

    if (collided) {
      this.resolveHit(collided, x, y);
      this.projectile = null;
    } else if (p.distance > this.maxRadius * 1.08) {
      this.projectile = null;
      this.resolveMiss('Kaçırdın');
    }
  }

  resolveHit(target) {
    const x = this.center.x + Math.cos(target.angle) * target.radius;
    const y = this.center.y + Math.sin(target.angle) * target.radius;
    if (target.colorIndex !== this.currentColorIndex) {
      this.particles.burst(x, y, '#ff5f78', this.particleAmount(12), 115);
      this.resolveMiss('Yanlış renk');
      return;
    }

    this.hits += 1;
    this.combo += 1;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    const tier = this.combo >= 20 ? 5 : this.combo >= 10 ? 3 : this.combo >= 5 ? 2 : 1;
    const double = this.activePowers.has('double') ? 2 : 1;
    const ringBonus = 10 + target.ring * 8;
    const gained = Math.round(ringBonus * tier * double * this.mode.scoreMultiplier);
    this.score += gained;
    this.audio.hit(this.combo);
    this.particles.burst(x, y, this.palette[target.colorIndex].hex, this.particleAmount(22), 175);
    this.callbacks.message?.(`+${gained}`, this.palette[target.colorIndex].hex);

    target.alive = false;
    const targetIndex = this.targets.indexOf(target);
    const replacement = this.createTarget(target.ring, target.angle + Math.PI * (0.65 + this.random() * 0.7));
    this.targets[targetIndex] = replacement;
    this.currentColorIndex = this.chooseNextColor();
    this.ensureCurrentColorExists();

    if (this.combo >= 5 && this.combo % 5 === 0) this.triggerPowerUp();
  }

  chooseNextColor() {
    const available = [...new Set(this.targets.filter(t => t.alive).map(t => t.colorIndex))];
    return available[Math.floor(this.random() * available.length)] ?? 0;
  }

  resolveMiss(label) {
    this.audio.miss();
    this.callbacks.message?.(label, '#ff6f91');
    this.combo = 0;
    if (this.mode.id === 'zen' || this.mode.id === 'timed') return;
    if (this.shield > 0) {
      this.shield -= 1;
      this.callbacks.power?.('◇ Kalkan hatayı engelledi');
      return;
    }
    this.lives -= 1;
    if (this.lives <= 0) this.finish('lives');
  }

  triggerPowerUp() {
    const power = POWER_UPS[Math.floor(this.random() * POWER_UPS.length)];
    this.audio.power();
    if (power.id === 'shield') this.shield = Math.min(2, this.shield + 1);
    else if (power.id === 'bomb') this.colorBomb();
    else this.activePowers.set(power.id, this.elapsed * 1000 + power.duration);
    this.callbacks.power?.(`${power.icon} ${power.label}`);
  }

  colorBomb() {
    const matches = this.targets.filter(t => t.colorIndex === this.currentColorIndex).slice(0, 3);
    for (const target of matches) {
      const x = this.center.x + Math.cos(target.angle) * target.radius;
      const y = this.center.y + Math.sin(target.angle) * target.radius;
      this.particles.burst(x, y, this.palette[target.colorIndex].hex, this.particleAmount(16), 145);
      this.score += Math.round(12 * this.mode.scoreMultiplier);
      const index = this.targets.indexOf(target);
      this.targets[index] = this.createTarget(target.ring, target.angle + 1.2);
    }
    this.currentColorIndex = this.chooseNextColor();
    this.ensureCurrentColorExists();
  }

  particleAmount(amount) {
    if (this.settings.reducedMotion) return Math.max(4, Math.round(amount * 0.25));
    if (this.settings.quality === 'low') return Math.max(5, Math.round(amount * 0.4));
    if (this.settings.quality === 'medium') return Math.round(amount * 0.7);
    return amount;
  }

  emitHud() {
    this.callbacks.hud?.({
      score: this.score,
      combo: this.combo,
      bestCombo: this.bestCombo,
      lives: this.lives,
      timeLeft: this.timeLeft,
      mode: this.mode,
      shield: this.shield,
      currentColor: this.palette[this.currentColorIndex].hex
    });
  }

  finish(reason) {
    if (this.state === 'finished') return;
    this.state = 'finished';
    cancelAnimationFrame(this.raf);
    this.audio.finish();
    const accuracy = this.shots ? Math.round((this.hits / this.shots) * 100) : 0;
    this.callbacks.finish?.({
      reason,
      mode: this.mode.id,
      score: this.score,
      bestCombo: this.bestCombo,
      shots: this.shots,
      hits: this.hits,
      accuracy,
      duration: Math.round(this.elapsed),
      dayKey: this.mode.id === 'daily' ? this.dayKey : null
    });
  }

  drawIdle() {
    this.ctx.save();
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.fillStyle = '#07101d';
    this.ctx.fillRect(0, 0, this.width, this.height);
    this.ctx.restore();
  }

  draw() {
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBackground(ctx);
    this.drawRings(ctx);
    this.drawTargets(ctx);
    this.drawAim(ctx);
    if (this.projectile) this.drawProjectile(ctx);
    this.drawCore(ctx);
    this.drawPowerIndicators(ctx);
    this.particles.draw(ctx);
    ctx.restore();
  }

  drawBackground(ctx) {
    const gradient = ctx.createRadialGradient(this.center.x, this.center.y, 0, this.center.x, this.center.y, Math.max(this.width, this.height) * 0.75);
    gradient.addColorStop(0, '#102a40');
    gradient.addColorStop(0.48, '#0a1a2c');
    gradient.addColorStop(1, '#050c16');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
    for (const star of this.stars) {
      ctx.globalAlpha = star.a;
      ctx.fillStyle = '#c9e4ff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(110, 150, 184, .045)';
    ctx.lineWidth = 1;
    const step = Math.max(44, this.maxRadius * 0.22);
    for (let x = this.center.x % step; x < this.width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, this.height); ctx.stroke();
    }
    for (let y = this.center.y % step; y < this.height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(this.width, y); ctx.stroke();
    }
  }

  drawRings(ctx) {
    for (let i = 0; i < this.rings.length; i += 1) {
      ctx.strokeStyle = `rgba(132, 169, 200, ${0.14 - i * 0.015})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.center.x, this.center.y, this.rings[i], 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = i % 2 ? 'rgba(157,113,255,.08)' : 'rgba(66,232,224,.08)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(this.center.x, this.center.y, this.rings[i], this.aimAngle - .2, this.aimAngle + .2);
      ctx.stroke();
    }
  }

  drawTargets(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const target of this.targets) {
      const x = this.center.x + Math.cos(target.angle) * target.radius;
      const y = this.center.y + Math.sin(target.angle) * target.radius;
      const color = this.palette[target.colorIndex].hex;
      const pulse = 1 + Math.sin(target.pulse) * 0.08;
      ctx.shadowColor = color;
      ctx.shadowBlur = 17;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, target.size * pulse, 0, TAU);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.globalAlpha = .33;
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, target.size * 1.75 * pulse, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,.72)';
      ctx.beginPath();
      ctx.arc(x - target.size * .25, y - target.size * .28, target.size * .18, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  drawAim(ctx) {
    const color = this.palette[this.currentColorIndex].hex;
    const start = this.maxRadius * 0.12;
    const end = this.maxRadius * 1.04;
    const x1 = this.center.x + Math.cos(this.aimAngle) * start;
    const y1 = this.center.y + Math.sin(this.aimAngle) * start;
    const x2 = this.center.x + Math.cos(this.aimAngle) * end;
    const y2 = this.center.y + Math.sin(this.aimAngle) * end;
    const grad = ctx.createLinearGradient(x1, y1, x2, y2);
    grad.addColorStop(0, color);
    grad.addColorStop(.65, `${color}55`);
    grad.addColorStop(1, 'transparent');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  drawProjectile(ctx) {
    const p = this.projectile;
    const x = this.center.x + Math.cos(p.angle) * p.distance;
    const y = this.center.y + Math.sin(p.angle) * p.distance;
    const color = this.palette[p.colorIndex].hex;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = color;
    ctx.shadowBlur = 20;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, clamp(this.maxRadius * .022, 5, 9), 0, TAU);
    ctx.fill();
    ctx.restore();
  }

  drawCore(ctx) {
    const color = this.palette[this.currentColorIndex].hex;
    const radius = clamp(this.maxRadius * .13, 30, 58);
    const glow = ctx.createRadialGradient(this.center.x - radius * .25, this.center.y - radius * .25, 2, this.center.x, this.center.y, radius * 1.2);
    glow.addColorStop(0, '#ffffff');
    glow.addColorStop(.18, color);
    glow.addColorStop(1, `${color}44`);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.shadowColor = color;
    ctx.shadowBlur = 32;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, radius, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `${color}66`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.center.x, this.center.y, radius * 1.35 + Math.sin(this.elapsed * 2.4) * 3, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }

  drawPowerIndicators(ctx) {
    const items = [];
    if (this.shield > 0) items.push(`◇ ${this.shield}`);
    if (this.activePowers.has('double')) items.push('×2');
    if (this.activePowers.has('slow')) items.push('◷');
    if (this.activePowers.has('magnet')) items.push('⌁');
    if (!items.length) return;
    ctx.save();
    ctx.font = '700 12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(225,244,255,.85)';
    ctx.fillText(items.join('  '), this.center.x, this.center.y + this.maxRadius * 1.13);
    ctx.restore();
  }
}
