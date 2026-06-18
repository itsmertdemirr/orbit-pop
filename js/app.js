import { ACHIEVEMENTS } from './config.js';
import { AudioManager } from './audio.js';
import { OrbitGame } from './game.js';
import { addScore, bestScore, loadProfile, resetProfile, saveProfile } from './storage.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

let profile = loadProfile();
let pendingMode = profile.lastMode || 'classic';
let activeMode = pendingMode;
let deferredInstallPrompt = null;
let toastTimer = 0;
let powerTimer = 0;

const screens = $$('.screen');
const modals = $$('.modal');
const backdrop = $('#modalBackdrop');
const audio = new AudioManager(profile.settings);
const game = new OrbitGame($('#gameCanvas'), audio, {
  hud: updateHud,
  message: showGameMessage,
  power: showPowerToast,
  finish: handleGameFinish
});
game.setSettings(profile.settings);

const modeNames = {
  tr: { classic: 'Klasik', timed: '60 Saniye', daily: 'Günlük', zen: 'Zen' },
  en: { classic: 'Classic', timed: '60 Seconds', daily: 'Daily', zen: 'Zen' }
};

const translations = {
  tr: {
    title: 'Rengi yakala,<br><em>yörüngeyi bozma.</em>',
    intro: 'Tek dokunuşla oynanan, kısa molalar için tasarlanmış modern bir refleks oyunu. Doğru renge ateş et, kombonu büyüt ve hızlanan yörüngelere meydan oku.',
    quick: '<span class="play-icon">▶</span> Hemen Oyna',
    modes: 'Oyun Modları',
    bestScore: 'En iyi skor', games: 'Toplam oyun', bestCombo: 'En iyi kombo',
    modesTitle: 'Her mola için bir tempo',
    play: 'Oyna', settings: 'Ayarlar', leaderboard: 'En İyi Skorlar',
    score: 'SKOR', combo: 'KOMBO', time: 'SÜRE', mode: 'MOD',
    paused: 'Nefesini topla.', resume: 'Devam Et', restart: 'Yeniden Başlat', home: 'Ana Menüye Dön',
    again: 'Tekrar Oyna', share: 'Skoru Paylaş', resultHome: 'Ana Menü',
    install: 'Uygulamayı yükle'
  },
  en: {
    title: 'Catch the color,<br><em>keep the orbit.</em>',
    intro: 'A modern one-touch reflex game built for short breaks. Fire at the matching color, grow your combo and challenge ever-faster orbits.',
    quick: '<span class="play-icon">▶</span> Play Now',
    modes: 'Game Modes',
    bestScore: 'Best score', games: 'Games played', bestCombo: 'Best combo',
    modesTitle: 'A pace for every break',
    play: 'Play', settings: 'Settings', leaderboard: 'High Scores',
    score: 'SCORE', combo: 'COMBO', time: 'TIME', mode: 'MODE',
    paused: 'Catch your breath.', resume: 'Resume', restart: 'Restart', home: 'Return Home',
    again: 'Play Again', share: 'Share Score', resultHome: 'Home',
    install: 'Install app'
  }
};

function showScreen(id) {
  screens.forEach(screen => screen.classList.toggle('active', screen.id === id));
  if (id !== 'gameScreen') game.stop();
  window.scrollTo({ top: 0, behavior: profile.settings.reducedMotion ? 'auto' : 'smooth' });
}

function openModal(id) {
  modals.forEach(modal => { modal.hidden = modal.id !== id; });
  backdrop.hidden = false;
  const modal = $(`#${id}`);
  modal?.querySelector('button, input, select')?.focus({ preventScroll: true });
}

function closeModals() {
  modals.forEach(modal => { modal.hidden = true; });
  backdrop.hidden = true;
}

function showToast(message) {
  const toast = $('#appToast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function formatTime(seconds) {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '∞';
  const total = Math.max(0, Math.ceil(seconds));
  const min = Math.floor(total / 60);
  const sec = String(total % 60).padStart(2, '0');
  return `${min}:${sec}`;
}

function startMode(mode) {
  pendingMode = mode;
  activeMode = mode;
  profile.lastMode = mode;
  saveProfile(profile);
  showScreen('gameScreen');
  closeModals();
  if (!profile.tutorialSeen) {
    openModal('tutorialModal');
    return;
  }
  launchGame(mode);
}

function launchGame(mode) {
  closeModals();
  activeMode = mode;
  game.setSettings(profile.settings);
  game.start(mode);
}

function updateHud(state) {
  const score = state.score.toLocaleString(profile.settings.language === 'en' ? 'en-US' : 'tr-TR');
  const combo = `${state.combo}×`;
  const time = formatTime(state.timeLeft);
  $('#scoreValue').textContent = score;
  $('#mobileScoreValue').textContent = score;
  $('#comboValue').textContent = combo;
  $('#mobileComboValue').textContent = combo;
  $('#timerValue').textContent = time;
  $('#mobileTimerValue').textContent = time;
  $('#modeValue').textContent = state.mode.label;
  $('#comboFill').style.width = `${Math.min(100, (state.combo % 5) * 20)}%`;
  $('#timerStat').hidden = state.timeLeft === null;
  const lives = $('#livesValue');
  if (!Number.isFinite(state.lives)) {
    lives.innerHTML = '<strong style="font-size:28px">∞</strong>';
  } else {
    lives.innerHTML = Array.from({ length: 3 }, (_, i) => `<i class="${i >= state.lives ? 'lost' : ''}"></i>`).join('');
  }
}

function showGameMessage(text, color) {
  const element = $('#gameMessage');
  element.textContent = text;
  element.style.color = color;
  element.classList.remove('show');
  void element.offsetWidth;
  element.classList.add('show');
}

function showPowerToast(text) {
  const element = $('#powerToast');
  element.textContent = text;
  element.classList.add('show');
  clearTimeout(powerTimer);
  powerTimer = setTimeout(() => element.classList.remove('show'), 1700);
}

function handleGameFinish(result) {
  const previousBest = profile.scores[result.mode]?.[0]?.score || 0;
  const isNewRecord = addScore(profile, result);
  profile.stats.gamesPlayed += 1;
  profile.stats.totalHits += result.hits;
  profile.stats.totalShots += result.shots;
  profile.stats.bestCombo = Math.max(profile.stats.bestCombo, result.bestCombo);
  profile.stats.playTimeSeconds += result.duration;

  const achievementState = { ...result, totalHits: profile.stats.totalHits };
  const newlyUnlocked = ACHIEVEMENTS.filter(item => !profile.achievements.includes(item.id) && item.test(achievementState));
  newlyUnlocked.forEach(item => profile.achievements.push(item.id));
  saveProfile(profile);
  refreshHomeStats();

  $('#resultBadge').hidden = !isNewRecord;
  $('#resultTitle').textContent = result.score >= 1000 ? 'Yörünge senin!' : result.score >= 400 ? 'Harika ritim!' : 'Güzel başlangıç!';
  $('#finalScore').textContent = result.score.toLocaleString('tr-TR');
  $('#scoreDelta').textContent = isNewRecord ? `Önceki rekor: ${previousBest.toLocaleString('tr-TR')}` : `Rekor: ${Math.max(previousBest, result.score).toLocaleString('tr-TR')}`;
  $('#finalCombo').textContent = `${result.bestCombo}×`;
  $('#finalAccuracy').textContent = `${result.accuracy}%`;
  $('#finalDuration').textContent = formatTime(result.duration);
  const achievementBox = $('#achievementPop');
  if (newlyUnlocked.length) {
    achievementBox.hidden = false;
    $('#achievementText').textContent = newlyUnlocked[0].title;
  } else {
    achievementBox.hidden = true;
  }
  openModal('resultModal');
}

function refreshHomeStats() {
  $('#homeBestScore').textContent = bestScore(profile).toLocaleString('tr-TR');
  $('#homeGamesPlayed').textContent = profile.stats.gamesPlayed.toLocaleString('tr-TR');
  $('#homeBestCombo').textContent = `${profile.stats.bestCombo}×`;
  const now = new Date();
  $('#dailyLabel').textContent = now.toLocaleDateString(profile.settings.language === 'en' ? 'en-US' : 'tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function renderLeaderboard(mode = 'classic') {
  const list = $('#leaderboardList');
  const scores = profile.scores[mode] || [];
  $$('#leaderboardTabs button').forEach(button => button.classList.toggle('active', button.dataset.board === mode));
  if (!scores.length) {
    list.innerHTML = `<div class="empty-state"><div><strong>${profile.settings.language === 'en' ? 'No scores yet' : 'Henüz skor yok'}</strong><p>${profile.settings.language === 'en' ? 'Play a round and claim first place.' : 'Bir tur oyna ve ilk sırayı kap.'}</p></div></div>`;
    return;
  }
  list.innerHTML = scores.map((item, index) => {
    const date = new Date(item.date).toLocaleDateString(profile.settings.language === 'en' ? 'en-US' : 'tr-TR', { day: '2-digit', month: 'short' });
    return `<div class="leader-row"><span class="rank">#${index + 1}</span><div><strong>${item.score.toLocaleString('tr-TR')}</strong><br><small>${date} · ${item.accuracy}% doğruluk</small></div><small>${item.combo}×</small></div>`;
  }).join('');
}

function applySettings() {
  const s = profile.settings;
  $('#soundToggle').checked = s.sound;
  $('#musicToggle').checked = s.music;
  $('#motionToggle').checked = s.reducedMotion;
  $('#colorblindToggle').checked = s.colorblind;
  $('#qualitySelect').value = s.quality;
  $('#languageSelect').value = s.language;
  document.body.classList.toggle('reduced-motion', s.reducedMotion);
  document.body.classList.toggle('colorblind', s.colorblind);
  document.documentElement.lang = s.language;
  audio.updateSettings(s);
  game.setSettings(s);
  applyLanguage(s.language);
}

function applyLanguage(language) {
  const t = translations[language] || translations.tr;
  $('#homeTitle').innerHTML = t.title;
  $('.hero-copy > p').textContent = t.intro;
  $('#quickPlayButton').innerHTML = t.quick;
  $('#modesButton').textContent = t.modes;
  $$('.hero-stats span')[0].textContent = t.bestScore;
  $$('.hero-stats span')[1].textContent = t.games;
  $$('.hero-stats span')[2].textContent = t.bestCombo;
  $('#modesTitle').textContent = t.modesTitle;
  $$('.card-play').forEach(button => { button.textContent = t.play; });
  $('#settingsTitle').textContent = t.settings;
  $('#leaderboardTitle').textContent = t.leaderboard;
  $$('.hud-stat span').forEach(span => {
    if (span.textContent.includes('SKOR') || span.textContent.includes('SCORE')) span.textContent = t.score;
    else if (span.textContent.includes('KOMBO') || span.textContent.includes('COMBO')) span.textContent = t.combo;
    else if (span.textContent.includes('SÜRE') || span.textContent.includes('TIME')) span.textContent = t.time;
    else if (span.textContent.includes('MOD') || span.textContent.includes('MODE')) span.textContent = t.mode;
  });
  $('#pauseTitle').textContent = t.paused;
  $('#resumeButton').textContent = t.resume;
  $('#restartButton').textContent = t.restart;
  $('#quitButton').textContent = t.home;
  $('#playAgainButton').textContent = t.again;
  $('#shareScoreButton').textContent = t.share;
  $('#resultHomeButton').textContent = t.resultHome;
  $('#installButton').textContent = t.install;
  $$('#leaderboardTabs button').forEach(button => { button.textContent = modeNames[language][button.dataset.board]; });
  refreshHomeStats();
}

function updateSetting(key, value) {
  profile.settings[key] = value;
  saveProfile(profile);
  applySettings();
}

function pauseGame() {
  if (game.state !== 'running') return;
  game.pause();
  openModal('pauseModal');
}

async function shareScore() {
  const score = $('#finalScore').textContent;
  const text = `Orbit Pop'ta ${score} puan yaptım. Rekorumu geçebilir misin?`;
  try {
    if (navigator.share) await navigator.share({ title: 'Orbit Pop', text, url: location.href });
    else {
      await navigator.clipboard.writeText(`${text} ${location.href}`);
      showToast('Skor bağlantısı panoya kopyalandı.');
    }
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Paylaşım başlatılamadı.');
  }
}

$('#quickPlayButton').addEventListener('click', () => startMode(profile.lastMode || 'classic'));
$('#modesButton').addEventListener('click', () => showScreen('modesScreen'));
$('#dailyPlayButton').addEventListener('click', () => startMode('daily'));
$('#brandButton').addEventListener('click', () => { closeModals(); showScreen('homeScreen'); });
$$('[data-back]').forEach(button => button.addEventListener('click', () => showScreen(button.dataset.back)));
$$('[data-mode]').forEach(element => {
  element.addEventListener('click', event => {
    event.stopPropagation();
    const mode = event.currentTarget.dataset.mode;
    if (mode) startMode(mode);
  });
  element.addEventListener('keydown', event => {
    if ((event.code === 'Enter' || event.code === 'Space') && event.currentTarget.classList.contains('mode-card')) {
      event.preventDefault();
      startMode(event.currentTarget.dataset.mode);
    }
  });
});

$('#settingsButton').addEventListener('click', () => openModal('settingsModal'));
$('#leaderboardButton').addEventListener('click', () => { renderLeaderboard('classic'); openModal('leaderboardModal'); });
$('#creditsButton').addEventListener('click', () => openModal('creditsModal'));
$$('[data-close-modal]').forEach(button => button.addEventListener('click', closeModals));
backdrop.addEventListener('click', () => {
  if (!$('#pauseModal').hidden || !$('#resultModal').hidden || !$('#tutorialModal').hidden) return;
  closeModals();
});

$('#soundToggle').addEventListener('change', event => updateSetting('sound', event.target.checked));
$('#musicToggle').addEventListener('change', event => updateSetting('music', event.target.checked));
$('#motionToggle').addEventListener('change', event => updateSetting('reducedMotion', event.target.checked));
$('#colorblindToggle').addEventListener('change', event => updateSetting('colorblind', event.target.checked));
$('#qualitySelect').addEventListener('change', event => updateSetting('quality', event.target.value));
$('#languageSelect').addEventListener('change', event => updateSetting('language', event.target.value));
$('#resetDataButton').addEventListener('click', () => {
  const confirmed = window.confirm('Tüm skorlar, ayarlar ve başarımlar silinsin mi?');
  if (!confirmed) return;
  profile = resetProfile();
  applySettings();
  refreshHomeStats();
  renderLeaderboard('classic');
  showToast('Oyun verileri sıfırlandı.');
});

$('#gameCanvas').addEventListener('pointerdown', event => {
  event.preventDefault();
  game.shoot();
});
$('#pauseButton').addEventListener('click', pauseGame);
$('#mobilePauseButton').addEventListener('click', pauseGame);
$('#resumeButton').addEventListener('click', () => { closeModals(); game.resume(); });
$('#restartButton').addEventListener('click', () => { closeModals(); launchGame(activeMode); });
$('#quitButton').addEventListener('click', () => { closeModals(); showScreen('homeScreen'); });
$('#playAgainButton').addEventListener('click', () => launchGame(activeMode));
$('#resultHomeButton').addEventListener('click', () => { closeModals(); showScreen('homeScreen'); });
$('#shareScoreButton').addEventListener('click', shareScore);
$('#tutorialStartButton').addEventListener('click', () => {
  profile.tutorialSeen = true;
  saveProfile(profile);
  launchGame(pendingMode);
});

$('#leaderboardTabs').addEventListener('click', event => {
  const button = event.target.closest('[data-board]');
  if (button) renderLeaderboard(button.dataset.board);
});

window.addEventListener('keydown', event => {
  if ((event.code === 'Space' || event.code === 'Enter') && game.state === 'running') {
    event.preventDefault();
    game.shoot();
  } else if (event.code === 'Escape' || event.code === 'KeyP') {
    if (game.state === 'running') pauseGame();
    else if (game.state === 'paused' && !$('#pauseModal').hidden) {
      closeModals();
      game.resume();
    }
  }
});

window.addEventListener('blur', () => {
  if (game.state === 'running') pauseGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && game.state === 'running') pauseGame();
});

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $('#installButton').hidden = false;
});
$('#installButton').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  $('#installButton').hidden = true;
});
window.addEventListener('appinstalled', () => showToast('Orbit Pop cihazına yüklendi.'));

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => console.warn('Service worker kaydı başarısız:', error)));
}

applySettings();
refreshHomeStats();
showScreen('homeScreen');
