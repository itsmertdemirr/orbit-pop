export const GAME_VERSION = '1.0.0';

export const PALETTES = {
  default: [
    { name: 'Turkuaz', hex: '#42e8e0' },
    { name: 'Mor', hex: '#9d71ff' },
    { name: 'Mercan', hex: '#ff6f91' },
    { name: 'Altın', hex: '#ffc65c' }
  ],
  colorblind: [
    { name: 'Mavi', hex: '#49d6ff' },
    { name: 'Sarı', hex: '#f2c94c' },
    { name: 'Turuncu', hex: '#ff6b5f' },
    { name: 'Mor', hex: '#b785ff' }
  ]
};

export const MODE_CONFIG = {
  classic: {
    id: 'classic',
    label: 'KLASİK',
    lives: 3,
    duration: null,
    speed: 1,
    scoreMultiplier: 1,
    description: 'Üç canla en yüksek skora ulaş.'
  },
  timed: {
    id: 'timed',
    label: '60 SANİYE',
    lives: Infinity,
    duration: 60,
    speed: 1.04,
    scoreMultiplier: 1.1,
    description: 'Bir dakika içinde mümkün olan en yüksek puanı topla.'
  },
  daily: {
    id: 'daily',
    label: 'GÜNLÜK',
    lives: 3,
    duration: 45,
    speed: 1.08,
    scoreMultiplier: 1.25,
    description: 'Bugünün sabit yörünge düzeninde yarış.'
  },
  zen: {
    id: 'zen',
    label: 'ZEN',
    lives: Infinity,
    duration: null,
    speed: 0.68,
    scoreMultiplier: 0.75,
    description: 'Süre ve can baskısı olmadan rahatla.'
  }
};

export const POWER_UPS = [
  { id: 'slow', label: 'Zaman Yavaşladı', icon: '◷', duration: 5200 },
  { id: 'shield', label: 'Kalkan Hazır', icon: '◇', duration: 0 },
  { id: 'double', label: 'Çift Puan', icon: '×2', duration: 6500 },
  { id: 'bomb', label: 'Renk Dalgası', icon: '✦', duration: 0 },
  { id: 'magnet', label: 'Hedef Mıknatısı', icon: '⌁', duration: 6000 }
];

export const ACHIEVEMENTS = [
  { id: 'first_hit', title: 'İlk Kıvılcım', test: s => s.totalHits >= 1 },
  { id: 'combo_10', title: 'Ritmi Buldun', test: s => s.bestCombo >= 10 },
  { id: 'combo_25', title: 'Yörünge Ustası', test: s => s.bestCombo >= 25 },
  { id: 'score_1000', title: 'Dört Haneli', test: s => s.score >= 1000 },
  { id: 'accuracy_90', title: 'Keskin Nişancı', test: s => s.shots >= 10 && s.accuracy >= 90 }
];

export const DEFAULT_SETTINGS = {
  sound: true,
  music: true,
  reducedMotion: false,
  colorblind: false,
  quality: 'high',
  language: 'tr'
};
