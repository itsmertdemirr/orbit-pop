import { DEFAULT_SETTINGS } from './config.js';

const KEY = 'orbit-pop-profile-v1';

function freshProfile() {
  return {
    settings: { ...DEFAULT_SETTINGS },
    stats: {
      gamesPlayed: 0,
      totalHits: 0,
      totalShots: 0,
      bestCombo: 0,
      playTimeSeconds: 0
    },
    scores: {
      classic: [],
      timed: [],
      daily: [],
      zen: []
    },
    achievements: [],
    tutorialSeen: false,
    lastMode: 'classic'
  };
}

export function loadProfile() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return freshProfile();
    const parsed = JSON.parse(raw);
    const base = freshProfile();
    return {
      ...base,
      ...parsed,
      settings: { ...base.settings, ...(parsed.settings || {}) },
      stats: { ...base.stats, ...(parsed.stats || {}) },
      scores: { ...base.scores, ...(parsed.scores || {}) }
    };
  } catch (error) {
    console.warn('Orbit Pop verileri okunamadı:', error);
    return freshProfile();
  }
}

export function saveProfile(profile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profile));
  } catch (error) {
    console.warn('Orbit Pop verileri kaydedilemedi:', error);
  }
}

export function addScore(profile, result) {
  const modeScores = profile.scores[result.mode] || [];
  const entry = {
    score: result.score,
    combo: result.bestCombo,
    accuracy: result.accuracy,
    duration: result.duration,
    date: new Date().toISOString(),
    dayKey: result.dayKey || null
  };
  modeScores.push(entry);
  modeScores.sort((a, b) => b.score - a.score || b.combo - a.combo);
  profile.scores[result.mode] = modeScores.slice(0, 10);
  return profile.scores[result.mode].indexOf(entry) === 0;
}

export function bestScore(profile, mode = null) {
  if (mode) return profile.scores[mode]?.[0]?.score || 0;
  return Math.max(0, ...Object.values(profile.scores).flat().map(item => item.score || 0));
}

export function resetProfile() {
  localStorage.removeItem(KEY);
  return freshProfile();
}
