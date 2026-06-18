export class ParticleSystem {
  constructor() {
    this.items = [];
  }

  burst(x, y, color, amount = 18, force = 150) {
    for (let i = 0; i < amount; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = force * (0.35 + Math.random() * 0.8);
      this.items.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.45 + Math.random() * 0.45,
        maxLife: 0.9,
        size: 1.5 + Math.random() * 4,
        color
      });
    }
  }

  trail(x, y, color) {
    this.items.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 18,
      vy: (Math.random() - 0.5) * 18,
      life: 0.22,
      maxLife: 0.22,
      size: 1 + Math.random() * 2.4,
      color
    });
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      const p = this.items[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.items.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.972;
      p.vy *= 0.972;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha + 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  clear() { this.items.length = 0; }
}
