/**
 * Лёгкая локализация игры (RU / EN) — без внешних библиотек.
 * Язык хранится в прогрессе (localStorage) и переключается в настройках.
 */
import type { GravityDir } from './engine';
import type { BonusKind } from './engine';
import type { LevelTheme } from './engine';

export type Lang = 'ru' | 'en';

export interface BonusNames {
  /** название во множественном: «Подсказки закончились» */
  many: string;
  /** «получить 1 подсказку» (винительный падеж в русском) */
  one: string;
  icon: string;
}

export interface UIStrings {
  gameTitle: string;
  gameSubtitle: string;
  tagline: string;

  play: string;
  continueLevel: (level: number) => string;
  newGame: string;
  confirmNewTitle: string;
  confirmNewBody: string;
  startOver: string;
  cancel: string;

  streakLine: (streak: number, max: number) => string;
  leaderboard: string;
  settings: string;
  settingsTitle: string;
  language: string;
  sound: string;
  /** подсказка: как применяется имя */
  nameHint: string;

  level: (n: number) => string;
  hint: string;
  shuffle: string;
  freeze: string;
  hintLeft: (n: number) => string;
  shuffleLeft: (n: number) => string;
  freezeLeft: (n: number) => string;
  freezeActive: (n: number) => string;
  soundOn: string;
  soundOff: string;
  /** полноэкранный режим (кнопка-стрелки в меню и в игре) */
  fullscreenOn: string;
  fullscreenOff: string;
  pause: string;

  bannerEasy: string;
  gravity: Record<GravityDir, string>;

  pauseTitle: string;
  resume: string;
  exitToMenu: string;

  /* v1.2.0: детский режим, «найди одинаковые», индикатор чекпоинта */
  kidsTitle: string;
  kidsDesc: string;
  classicTitle: string;
  classicDesc: string;
  continueKids: (level: number) => string;
  kidsOnetTitle: string;
  kidsOnetDesc: string;
  memoryTitle: string;
  memoryDesc: string;
  difficulty: string;
  easier: string;
  harder: string;
  themeAnimals: string;
  themePlants: string;
  themeMixed: string;
  themeLabel: (theme: LevelTheme) => string;
  bannerCheckpoint: string;
  cpChip: (n: number) => string;
  cpChipSave: string;
  winSaved: string;
  skipLevel: string;
  skipConfirmTitle: string;
  skipConfirmBody: (nextLevel: number) => string;
  watchAdSkip: string;
  kidsOverTitle: string;
  kidsOverBody: string;
  tryAgain: string;
  memoryPreview: string;
  memoryPreviewLeft: (n: number) => string;
  pairsLeft: (n: number) => string;
  loading: string;
  back: string;

  exitTitle: string;
  exitBody: (reset: number) => string;
  exitConfirm: string;
  stay: string;

  winTitle: (level: number) => string;
  next: string;
  toMenu: string;
  winStreak: (streak: number) => string;

  gameOverTitle: string;
  gameOverReset: (reset: number, next: number) => string;
  adRetry: (level: number) => string;
  fromCheckpoint: (reset: number) => string;
  yourName: string;
  inTop10: string;

  bonusOver: (b: BonusNames) => string;
  adOfferBody: (b: BonusNames) => string;
  watchAd: string;

  adLabel: string;
  adRewardIn: (n: number) => string;
  adDemo: string;

  toastShuffled: string;
  toastNoMoves: string;
  toastFrozen: string;
  toastAdBonus: (b: BonusNames) => string;

  lbTitle: string;
  lbEmpty: string;
  lbBestStreak: (n: number) => string;
  lbRank: string;
  lbName: string;
  lbScore: string;
  lbLevel: string;
  lbStreak: string;
  lbDate: string;
  lbClose: string;

  nameDefault: string;
  bonusNames: Record<BonusKind, BonusNames>;
}

const RU: UIStrings = {
  gameTitle: 'КЛИК-КЛАК',
  gameSubtitle: 'Соедини пары',
  tagline: 'Нажимай на одинаковые картинки',

  play: 'Играть',
  continueLevel: (level) => `Продолжить — уровень ${level}`,
  newGame: 'Новая игра',
  confirmNewTitle: 'Новая игра?',
  confirmNewBody: 'Очки и бонусы пропадут, результаты останутся в таблице',
  startOver: 'Начать сначала',
  cancel: 'Отмена',

  streakLine: (streak, max) => `Серия: ${streak} (рекорд ${max})`,
  leaderboard: 'Турнирная таблица',
  settings: 'Настройки',
  settingsTitle: 'Настройки',
  language: 'Язык',
  sound: 'Звук',
  nameHint: 'Имя появится в турнирной таблице',

  level: (n) => `Уровень ${n}`,
  hint: 'Подсказка',
  shuffle: 'Перемешать',
  freeze: 'Остановить время',
  hintLeft: (n) => `Подсказка, осталось ${n}`,
  shuffleLeft: (n) => `Перемешать, осталось ${n}`,
  freezeLeft: (n) => `Остановить время, осталось ${n}`,
  freezeActive: (n) => `Время стоит, ещё ${n} с`,
  soundOn: 'Выключить звук',
  soundOff: 'Включить звук',
  fullscreenOn: 'На весь экран',
  fullscreenOff: 'Выйти из полного экрана',
  pause: 'Пауза',

  bannerEasy: 'этот полегче 😊',
  gravity: {
    none: '',
    down: 'камни падают вниз ⬇',
    up: 'камни падают вверх ⬆',
    left: 'камни едут влево ⬅',
    right: 'камни едут вправо ➡',
  },

  pauseTitle: 'Пауза',
  resume: 'Продолжить',
  exitToMenu: 'Выйти в меню',

  kidsTitle: 'Детский режим',
  kidsDesc: 'Крупные плитки, времени с запасом, без сброса уровней — не входит в рейтинг',
  classicTitle: 'Классика',
  classicDesc: 'Чем дальше — тем сложнее. Чекпоинты и турнирная таблица',
  continueKids: (level) => `Уровень ${level}`,
  kidsOnetTitle: 'Соединялка',
  kidsOnetDesc: 'Соединяй одинаковые картинки линиями',
  memoryTitle: 'Найди одинаковые',
  memoryDesc: 'Запомни карточки и найди пары',
  difficulty: 'Сложность',
  easier: 'Проще',
  harder: 'Посложнее',
  themeAnimals: 'Звери',
  themePlants: 'Фрукты и овощи',
  themeMixed: 'Вперемешку',
  themeLabel: (theme) =>
    theme === 'animals' ? 'Звери' : theme === 'plants' ? 'Фрукты и овощи' : 'Вперемешку',
  bannerCheckpoint: 'пройди этот уровень — игра сохранится',
  cpChip: (n) => `до сохранения ${n}`,
  cpChipSave: 'сохранение!',
  winSaved: 'Прогресс сохранён',
  skipLevel: 'Пропустить за рекламу',
  skipConfirmTitle: 'Пропустить уровень?',
  skipConfirmBody: (nextLevel) =>
    `Посмотрите короткую рекламу — и сразу начнётся уровень ${nextLevel}`,
  watchAdSkip: 'Смотреть рекламу и пропустить',
  kidsOverTitle: 'Время вышло!',
  kidsOverBody: 'Ничего страшного! Уровень не сбрасывается — попробуй ещё раз',
  tryAgain: 'Ещё раз',
  memoryPreview: 'Запоминай!',
  memoryPreviewLeft: (n) => `${n}…`,
  pairsLeft: (n) => `Пар: ${n}`,
  loading: 'Загрузка…',
  back: 'Назад',

  exitTitle: 'Выйти из игры?',
  exitBody: (reset) =>
    `Прогресс уровня будет потерян — игра продолжится с уровня ${reset} (чекпоинт).`,
  exitConfirm: 'Выйти',
  stay: 'Остаться',

  winTitle: (level) => `Уровень ${level} пройден!`,
  next: 'Дальше',
  toMenu: 'В меню',
  winStreak: (streak) => `Серия без проигрышей: ${streak}`,

  gameOverTitle: 'Время вышло!',
  gameOverReset: (reset, next) =>
    `Уровень сбросится до ${reset}. Следующий чекпоинт: ${next}.`,
  adRetry: (level) => `Реклама → повторить уровень ${level}`,
  fromCheckpoint: (reset) => `Начать с уровня ${reset}`,
  yourName: 'Ваше имя',
  inTop10: 'Вы попали в топ-10!',

  bonusOver: (b) => `${b.many} закончились!`,
  adOfferBody: (b) => `Посмотрите рекламу и получите 1 ${b.one} бесплатно`,
  watchAd: 'Смотреть рекламу',

  adLabel: 'РЕКЛАМА',
  adRewardIn: (n) => `Награда через ${n}…`,
  adDemo: 'заглушка',

  toastShuffled: 'Перемешали!',
  toastNoMoves: 'Нет ходов — перемешали',
  toastFrozen: '❄️ Время стоит',
  toastAdBonus: (b) => `+1 ${b.icon} за рекламу`,

  lbTitle: 'Турнирная таблица',
  lbEmpty: 'Пока нет результатов — пройдите пару уровней!',
  lbBestStreak: (n) => `Рекорд серии уровней без проигрышей: ${n}`,
  lbRank: '№',
  lbName: 'Игрок',
  lbScore: 'Очки',
  lbLevel: 'Уровень',
  lbStreak: 'Серия',
  lbDate: 'Дата',
  lbClose: 'Закрыть',

  nameDefault: 'Игрок',
  bonusNames: {
    hint: { many: 'Подсказки', one: 'подсказку', icon: '💡' },
    shuffle: { many: 'Перемешивания', one: 'перемешивание', icon: '🔀' },
    freeze: { many: 'Заморозки', one: 'заморозку', icon: '❄️' },
  },
};

const EN: UIStrings = {
  gameTitle: 'CLICK-CLACK',
  gameSubtitle: 'Match the pairs',
  tagline: 'Tap two identical pictures to connect them',

  play: 'Play',
  continueLevel: (level) => `Continue — level ${level}`,
  newGame: 'New game',
  confirmNewTitle: 'Start over?',
  confirmNewBody: 'Points and bonuses will be lost, results stay in the table',
  startOver: 'Start over',
  cancel: 'Cancel',

  streakLine: (streak, max) => `Streak: ${streak} (best ${max})`,
  leaderboard: 'Leaderboard',
  settings: 'Settings',
  settingsTitle: 'Settings',
  language: 'Language',
  sound: 'Sound',
  nameHint: 'The name will appear in the leaderboard',

  level: (n) => `Level ${n}`,
  hint: 'Hint',
  shuffle: 'Shuffle',
  freeze: 'Freeze time',
  hintLeft: (n) => `Hint, ${n} left`,
  shuffleLeft: (n) => `Shuffle, ${n} left`,
  freezeLeft: (n) => `Freeze time, ${n} left`,
  freezeActive: (n) => `Time is frozen, ${n}s left`,
  soundOn: 'Mute',
  soundOff: 'Unmute',
  fullscreenOn: 'Fullscreen',
  fullscreenOff: 'Exit fullscreen',
  pause: 'Pause',

  bannerEasy: 'an easier one 😊',
  gravity: {
    none: '',
    down: 'stones fall down ⬇',
    up: 'stones fall up ⬆',
    left: 'stones slide left ⬅',
    right: 'stones slide right ➡',
  },

  pauseTitle: 'Pause',
  resume: 'Resume',
  exitToMenu: 'Exit to menu',

  kidsTitle: 'Kids mode',
  kidsDesc: 'Big tiles, plenty of time, no level resets — not rated',
  classicTitle: 'Classic',
  classicDesc: 'Gets harder as you go. Checkpoints and leaderboard',
  continueKids: (level) => `Level ${level}`,
  kidsOnetTitle: 'Link the pairs',
  kidsOnetDesc: 'Link two identical pictures with a line',
  memoryTitle: 'Find the same',
  memoryDesc: 'Memorize the cards and find the pairs',
  difficulty: 'Difficulty',
  easier: 'Easier',
  harder: 'Harder',
  themeAnimals: 'Animals',
  themePlants: 'Fruits & veggies',
  themeMixed: 'Mixed',
  themeLabel: (theme) =>
    theme === 'animals' ? 'Animals' : theme === 'plants' ? 'Fruits & veggies' : 'Mixed',
  bannerCheckpoint: 'pass this level to save your progress',
  cpChip: (n) => `${n} to save`,
  cpChipSave: 'saving!',
  winSaved: 'Progress saved',
  skipLevel: 'Skip for an ad',
  skipConfirmTitle: 'Skip the level?',
  skipConfirmBody: (nextLevel) => `Watch a short ad and jump straight to level ${nextLevel}`,
  watchAdSkip: 'Watch ad & skip',
  kidsOverTitle: 'Time is up!',
  kidsOverBody: 'No worries! The level is not reset — try again',
  tryAgain: 'Try again',
  memoryPreview: 'Memorize!',
  memoryPreviewLeft: (n) => `${n}…`,
  pairsLeft: (n) => `Pairs: ${n}`,
  loading: 'Loading…',
  back: 'Back',

  exitTitle: 'Leave the game?',
  exitBody: (reset) =>
    `Level progress will be lost — the game continues from level ${reset} (checkpoint).`,
  exitConfirm: 'Leave',
  stay: 'Stay',

  winTitle: (level) => `Level ${level} complete!`,
  next: 'Next',
  toMenu: 'Menu',
  winStreak: (streak) => `Win streak: ${streak}`,

  gameOverTitle: 'Time is up!',
  gameOverReset: (reset, next) =>
    `The level resets to ${reset}. Next checkpoint: ${next}.`,
  adRetry: (level) => `Watch ad → retry level ${level}`,
  fromCheckpoint: (reset) => `Start from level ${reset}`,
  yourName: 'Your name',
  inTop10: 'You made the top 10!',

  bonusOver: (b) => `Out of ${b.many.toLowerCase()}!`,
  adOfferBody: (b) => `Watch an ad and get 1 ${b.one} for free`,
  watchAd: 'Watch ad',

  adLabel: 'AD',
  adRewardIn: (n) => `Reward in ${n}…`,
  adDemo: 'demo',

  toastShuffled: 'Shuffled!',
  toastNoMoves: 'No moves — reshuffled',
  toastFrozen: '❄️ Time is frozen',
  toastAdBonus: (b) => `+1 ${b.icon} for the ad`,

  lbTitle: 'Leaderboard',
  lbEmpty: 'No results yet — pass a couple of levels!',
  lbBestStreak: (n) => `Best streak of levels without a loss: ${n}`,
  lbRank: '#',
  lbName: 'Player',
  lbScore: 'Score',
  lbLevel: 'Level',
  lbStreak: 'Streak',
  lbDate: 'Date',
  lbClose: 'Close',

  nameDefault: 'Player',
  bonusNames: {
    hint: { many: 'Hints', one: 'hint', icon: '💡' },
    shuffle: { many: 'Shuffles', one: 'shuffle', icon: '🔀' },
    freeze: { many: 'Freezes', one: 'freeze', icon: '❄️' },
  },
};

export function stringsFor(lang: Lang): UIStrings {
  return lang === 'en' ? EN : RU;
}
