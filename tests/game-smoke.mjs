globalThis.window = { devicePixelRatio: 1 };
globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback; }
  observe() {}
  disconnect() {}
};
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

const fakeContext = {
  setTransform() {},
  fillRect() {},
  save() {},
  restore() {}
};
const fakeCanvas = {
  parentElement: {},
  width: 0,
  height: 0,
  getBoundingClientRect() { return { width: 800, height: 600 }; },
  getContext() { return fakeContext; }
};
const fakeAudio = {
  startAmbience() {}, ensureContext() {}, shoot() {}, hit() {}, miss() {}, power() {}, finish() {}
};

const { OrbitGame } = await import('../js/game.js');
const game = new OrbitGame(fakeCanvas, fakeAudio, {});
game.setSettings({ quality: 'high', colorblind: false, reducedMotion: false });
game.start('classic');

if (game.state !== 'running') throw new Error('Oyun running durumuna geçmedi.');
if (game.targets.length !== 11) throw new Error(`Beklenen 11 hedef, bulunan ${game.targets.length}.`);
if (game.lives !== 3) throw new Error('Klasik mod 3 canla başlamadı.');
if (game.rings.length !== 3) throw new Error('Üç yörünge oluşturulmadı.');

game.shoot();
if (!game.projectile || game.shots !== 1) throw new Error('Atış oluşturulamadı.');
game.update(0.016);
if (game.elapsed <= 0) throw new Error('Oyun zamanı ilerlemedi.');
game.stop();

console.log('Oyun motoru smoke testi başarılı: mod, hedef, yörünge ve atış sistemi çalışıyor.');
