import { access, readFile } from 'node:fs/promises';

const required = [
  'index.html', 'styles.css', 'manifest.webmanifest', 'sw.js',
  'js/app.js', 'js/game.js', 'js/audio.js', 'js/config.js',
  'js/storage.js', 'js/particles.js', 'assets/icon.svg'
];

for (const file of required) await access(new URL(`../${file}`, import.meta.url));
const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const checks = ['id="gameCanvas"', 'id="homeScreen"', 'type="module"', 'manifest.webmanifest'];
for (const token of checks) {
  if (!html.includes(token)) throw new Error(`Eksik HTML öğesi: ${token}`);
}
console.log(`Smoke test başarılı: ${required.length} temel dosya ve ${checks.length} HTML kontrolü.`);
