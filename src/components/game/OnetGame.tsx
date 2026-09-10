'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IconExpand, IconFlag, IconFreeze, IconHint, IconPause, IconShrink, IconShuffle, IconSoundOff, IconSoundOn, IconStar } from './GameIcons';
import {
  BONUS_CAPS,
  CHECKPOINT_EVERY,
  applyGravity,
  cellIndex,
  configForLevel,
  findAnyMatch,
  findPath,
  generateBoard,
  isCheckpointLevel,
  kidsConfigForLevel,
  nextCheckpointAfter,
  pickKinds,
  reachedCheckpoint,
  shuffleBoard,
  themeForLevel,
  type BonusKind,
  type Cell,
  type GravityDir,
  type KindSkin,
  type LevelConfig,
  type LevelTheme,
  type Path,
  type Point,
} from '@/lib/onet/engine';
import { stringsFor, type Lang } from '@/lib/onet/i18n';
import { sound } from '@/lib/onet/sound';
import { useFullscreen } from '@/lib/onet/fullscreen';
import { showRewardedAd, type RewardedResult } from '@/lib/ads/yandex';
import Board, { type DyingTile, type NamePopup } from './Board';
import MemoryGame from './MemoryGame';
import TimeBar from './TimeBar';
import {
  AdOfferModal,
  ComboChip,
  ExitConfirmModal,
  GameOverModal,
  LeaderboardModal,
  LevelBanner,
  MenuScreen,
  PauseModal,
  SimAdOverlay,
  SkipConfirmModal,
  Toast,
  WinModal,
  type Bonuses,
  type LeaderRow,
  type WinInfo,
} from './Overlays';

/* ============ Прогресс (localStorage) ============ */

const STORAGE_KEY = 'onet-relax-v2';
const LEGACY_KEY = 'onet-relax-v1';

interface Progress {
  /** текущий (следующий) уровень КЛАССИКИ */
  level: number;
  bestLevel: number;
  bestScore: number;
  /** очки за текущий забег (копятся уровнями) */
  totalScore: number;
  /** копилка бонусов */
  bonuses: Bonuses;
  soundOn: boolean;
  /** язык интерфейса (настройки) */
  lang: Lang;
  /** имя игрока для турнирной таблицы */
  playerName: string;
  /** серия уровней, пройденных подряд без проигрышей */
  streak: number;
  maxStreak: number;
  /** уровни, где рекламу-повтор уже использовали (1 раз на уровень) */
  adRetriedLevels: number[];
  /** турнирная таблица: топ-10 результатов */
  leaderboard: LeaderRow[];
  /** текущий уровень ДЕТСКОГО режима (отдельный, без сбросов) */
  kidsLevel: number;
  /** детская сложность: false — «проще», true — «посложнее» */
  kidsHarder: boolean;
}

const START_BONUSES: Bonuses = { hint: 2, shuffle: 1, freeze: 1 };
const FREEZE_SEC = 10;
const BANNER_MS = 2000;
const LINE_MS = 640;
const DYING_MS = 500;
const COMBO_WINDOW_MS = 4000;
const LEADERBOARD_SIZE = 10;
/** длительность рекламной заглушки (когда РСЯ недоступна), сек */
const SIM_AD_SEC = 5;

/* Стрелка направления гравитации (камни падают) */
const GRAVITY_ARROW: Record<GravityDir, string> = {
  none: '',
  down: '⬇',
  up: '⬆',
  left: '⬅',
  right: '➡',
};
const WRONG_PENALTY_SEC = 2;

/** Для чего показываем рекламу: бонус, повтор уровня или пропуск (детский) */
type AdPurpose = BonusKind | 'retry' | 'skip';

/** итог забега для экрана проигрыша */
interface LastRun {
  level: number;
  score: number;
  streak: number;
  qualified: boolean;
  rowIdx: number | null;
}

const DEFAULT_PROGRESS: Progress = {
  level: 1,
  bestLevel: 1,
  bestScore: 0,
  totalScore: 0,
  bonuses: { ...START_BONUSES },
  soundOn: true,
  lang: 'ru',
  playerName: '',
  streak: 0,
  maxStreak: 0,
  adRetriedLevels: [],
  leaderboard: [],
  kidsLevel: 1,
  kidsHarder: false,
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadProgress(): Progress {
  const fill = (p: Partial<Progress>): Progress => {
    const b = (p.bonuses ?? {}) as Partial<Bonuses>;
    return {
      level: typeof p.level === 'number' && p.level >= 1 ? p.level : 1,
      bestLevel: typeof p.bestLevel === 'number' ? p.bestLevel : 1,
      bestScore: typeof p.bestScore === 'number' ? p.bestScore : 0,
      totalScore: typeof p.totalScore === 'number' ? p.totalScore : 0,
      bonuses: {
        hint: typeof b.hint === 'number' ? b.hint : START_BONUSES.hint,
        shuffle: typeof b.shuffle === 'number' ? b.shuffle : START_BONUSES.shuffle,
        freeze: typeof b.freeze === 'number' ? b.freeze : START_BONUSES.freeze,
      },
      soundOn: p.soundOn !== false,
      lang: p.lang === 'en' ? 'en' : 'ru',
      playerName: typeof p.playerName === 'string' ? p.playerName : '',
      streak: typeof p.streak === 'number' ? p.streak : 0,
      maxStreak: typeof p.maxStreak === 'number' ? p.maxStreak : 0,
      adRetriedLevels: Array.isArray(p.adRetriedLevels)
        ? p.adRetriedLevels.filter((n) => typeof n === 'number')
        : [],
      leaderboard: Array.isArray(p.leaderboard) ? p.leaderboard.slice(0, LEADERBOARD_SIZE) : [],
      kidsLevel: typeof p.kidsLevel === 'number' && p.kidsLevel >= 1 ? p.kidsLevel : 1,
      kidsHarder: p.kidsHarder === true,
    };
  };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return fill(JSON.parse(raw) as Partial<Progress>);
    // мягкая миграция со старой версии
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) return fill(JSON.parse(legacy) as Partial<Progress>);
    return { ...DEFAULT_PROGRESS, bonuses: { ...START_BONUSES } };
  } catch {
    return { ...DEFAULT_PROGRESS, bonuses: { ...START_BONUSES } };
  }
}

function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    /* приватный режим — просто играем без сохранения */
  }
}

/** Записать результат забега в таблицу (топ-10 по очкам).
 *  Возвращает новые leaderboard и индекс добавленной строки (null — не вошла). */
function pushLeaderboard(
  p: Progress,
  level: number
): { leaderboard: LeaderRow[]; rowIdx: number | null; qualified: boolean } {
  if (p.totalScore <= 0 && p.streak <= 0) return { leaderboard: p.leaderboard, rowIdx: null, qualified: false };
  const row: LeaderRow = {
    name: p.playerName || stringsFor(p.lang).nameDefault,
    score: p.totalScore,
    level,
    streak: p.streak,
    date: todayStr(),
  };
  const rows = [...p.leaderboard, row]
    .sort((a, b) => b.score - a.score)
    .slice(0, LEADERBOARD_SIZE);
  const rowIdx = rows.indexOf(row);
  if (rowIdx < 0) return { leaderboard: p.leaderboard, rowIdx: null, qualified: false };
  return { leaderboard: rows, rowIdx, qualified: true };
}

/* ============ Сессия уровня ============ */

/** игровой режим сессии */
export type GameMode = 'classic' | 'kids';
/** какая детская игра активна */
export type KidsGame = 'onet' | 'memory';

type Phase =
  | 'menu'
  | 'starting'
  | 'playing'
  | 'paused'
  | 'exit-confirm'
  | 'win'
  | 'gameover';

interface Session {
  mode: GameMode;
  /** какая детская игра (для mode='kids') */
  kidsGame: KidsGame;
  level: number;
  board: Cell[];
  rows: number;
  cols: number;
  kinds: KindSkin[];
  timeTotal: number;
  /** очки за текущий уровень */
  score: number;
  combo: number;
  lastMatchAt: number;
  pairsLeft: number;
  /** гравитация уровня: куда падают камни после уборки пары */
  gravity: GravityDir;
  /** лёгкий уровень (каждый 3-й) — передышка */
  easy: boolean;
  /** тема детского уровня (звери / фрукты-овощи / вперемешку) */
  theme?: LevelTheme;
}

export default function OnetGame() {
  const [phase, setPhase] = useState<Phase>('menu');
  const [session, setSession] = useState<Session | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [frozenLeft, setFrozenLeft] = useState(0);
  const [selected, setSelected] = useState<Point | null>(null);
  const [wrongPair, setWrongPair] = useState<[Point, Point] | null>(null);
  const [hintPair, setHintPair] = useState<[Point, Point] | null>(null);
  const [dying, setDying] = useState<DyingTile[]>([]);
  const [matchLine, setMatchLine] = useState<Path | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [banner, setBanner] = useState<number | null>(null);
  const [winInfo, setWinInfo] = useState<WinInfo | null>(null);
  /** уровень, который ждёт измерения области (фаза 'starting') */
  const [pendingLevel, setPendingLevel] = useState<number | null>(null);
  /** всплывающая подпись «кто это» (детский режим) */
  const [namePopup, setNamePopup] = useState<NamePopup | null>(null);

  /* NEW: реклама, таблица, язык */
  /** открыт ли диалог «бонус закончился → +1 за рекламу» */
  const [adOffer, setAdOffer] = useState<BonusKind | null>(null);
  /** идёт рекламная заглушка (РСЯ недоступна) — хранит колбэк завершения */
  const [simAd, setSimAd] = useState<null | { done: () => void }>(null);
  /** любая реклама в процессе — кнопки блокируются */
  const [adBusy, setAdBusy] = useState(false);
  /** открыт ли экран турнирной таблицы */
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  /** итог забега для экрана проигрыша */
  const [lastRun, setLastRun] = useState<LastRun | null>(null);
  /** подтверждение пропуска уровня: «посмотреть рекламу и пропустить?» */
  const [skipOffer, setSkipOffer] = useState(false);
  /** полноэкранный режим (кнопка-стрелки в шапке) */
  const fs = useFullscreen();

  /* Прогресс читается один раз при старте (компонент только клиентский) */
  const [progress, setProgress] = useState<Progress>(() => {
    const p = loadProgress();
    sound.setEnabled(p.soundOn);
    return p;
  });

  const t = stringsFor(progress.lang);

  /* Зеркала в ref — колбэки таймеров читают актуальные значения без stale-проблем */
  const sessionRef = useRef<Session | null>(null);
  const progressRef = useRef(progress);
  const lastRunRef = useRef<LastRun | null>(null);
  const adBusyRef = useRef(false);
  /** таймер стоит, пока идёт реклама */
  const adPlayingRef = useRef(false);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);
  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    lastRunRef.current = lastRun;
  }, [lastRun]);

  /* язык интерфейса — синхронизируем <html lang> */
  useEffect(() => {
    document.documentElement.lang = progress.lang;
  }, [progress.lang]);

  /* Таймер на "дедлайне": endsAtRef — момент окончания времени.
     Пауза, заморозка и РЕКЛАМА двигают метку, интервал лишь отображает. */
  const endsAtRef = useRef(0);
  const pausedAtRef = useRef(0);
  const freezeUntilRef = useRef(0);
  const frozenLeftRef = useRef(0);
  const timeLeftRef = useRef(0);
  const totalRef = useRef(0);
  const lastRunRef2 = useRef(0);
  const lastTickRef = useRef(-1);
  const finishedRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const trackTimer = useCallback((id: number) => {
    timersRef.current.push(id);
  }, []);

  const clearTransient = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    setSelected(null);
    setWrongPair(null);
    setHintPair(null);
    setDying([]);
    setMatchLine(null);
    setToast(null);
    setBanner(null);
    setNamePopup(null);
  }, []);

  /* ============ Проигрыш: классика — сброс до чекпоинта;
     детский — без сброса и без таблицы ============ */

  /** время вышло: уровень сбрасывается до чекпоинта,
   *  результат забега пишется в турнирную таблицу.
   *  В детском режиме — ничего не сбрасывается.
   *  (Определён ДО эффекта таймера — таймер зовёт его при tl <= 0) */
  const handleTimeUp = useCallback(() => {
    setSelected(null);
    const s = sessionRef.current;
    if (!s) {
      setPhase('gameover');
      return;
    }
    /* детский: уровень никуда не денется — просто «попробуй ещё раз» */
    if (s.mode === 'kids') {
      setPhase('gameover');
      return;
    }
    const p = progressRef.current;
    const reset = reachedCheckpoint(s.level);
    const res = pushLeaderboard(p, s.level);
    const np: Progress = {
      ...p,
      level: reset,
      streak: 0,
      leaderboard: res.leaderboard,
    };
    progressRef.current = np;
    setProgress(np);
    saveProgress(np);
    setLastRun({
      level: s.level,
      score: p.totalScore,
      streak: p.streak,
      qualified: res.qualified,
      rowIdx: res.rowIdx,
    });
    setPhase('gameover');
  }, []);

  /* ============ Таймер: полоса времени непрерывно убывает ============ */

  useEffect(() => {
    /* у memory-игры нет лимита времени — таймер не нужен */
    if (phase !== 'playing' || sessionRef.current?.kidsGame === 'memory') return;
    lastRunRef2.current = Date.now();
    const iv = window.setInterval(() => {
      const now = Date.now();
      const dt = Math.max(0, now - lastRunRef2.current);
      lastRunRef2.current = now;

      /* заморозка и реклама: дедлайн едет вперёд вместе с реальным временем —
         полоса стоит. Реклама не сжигает активную заморозку. */
      const frozen = freezeUntilRef.current > now;
      const adPausing = adPlayingRef.current;
      if (frozen || adPausing) {
        endsAtRef.current += dt;
        if (frozen && adPausing) freezeUntilRef.current += dt;
      }

      if (frozen) {
        const fl = Math.max(0, Math.ceil((freezeUntilRef.current - now) / 1000));
        if (fl !== frozenLeftRef.current) {
          frozenLeftRef.current = fl;
          setFrozenLeft(fl);
        }
      } else if (frozenLeftRef.current !== 0) {
        frozenLeftRef.current = 0;
        setFrozenLeft(0);
      }

      const tl = Math.max(0, (endsAtRef.current - now) / 1000);
      timeLeftRef.current = tl;
      const disp = totalRef.current > 0 ? Math.min(tl, totalRef.current) : tl;
      setTimeLeft(Math.round(disp * 10) / 10);

      const s = Math.ceil(tl);
      if (!frozen && !adPausing && s <= 10 && s > 0 && s !== lastTickRef.current) {
        lastTickRef.current = s;
        sound.play('tick');
      }

      if (tl <= 0) {
        window.clearInterval(iv);
        sound.play('lose');
        handleTimeUp();
      }
    }, 100);
    return () => window.clearInterval(iv);
  }, [phase, handleTimeUp]);

  const pauseGame = useCallback(() => {
    pausedAtRef.current = Date.now();
    sound.play('click');
    setPhase('paused');
  }, []);

  const resumeGame = useCallback(() => {
    if (pausedAtRef.current > 0) {
      endsAtRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = 0;
      lastRunRef2.current = Date.now();
    }
    sound.play('click');
    setPhase('playing');
  }, []);

  /* Авто-пауза при сворачивании вкладки */
  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        setPhase((ph) => {
          if (ph === 'playing') {
            pausedAtRef.current = Date.now();
            return 'paused';
          }
          return ph;
        });
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  /* Предупреждение браузера при закрытии вкладки во время игры */
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'paused' && phase !== 'exit-confirm') return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [phase]);

  /* ============ Управление игрой ============ */

  /* Старт уровня двухфазный: сначала монтируется каркас (шапка + область
     поля) — фаза 'starting', затем ResizeObserver измеряет реальную область
     и поле генерируется точно под неё (заполняет от края до края).
     Измерение живёт в ref и обновляется на каждый resize.
     Memory-игре измерение не нужно — стартует сразу. */
  const mainRef = useRef<HTMLElement | null>(null);
  const mainSizeRef = useRef({ w: 0, h: 0 });
  const pendingLevelRef = useRef<number | null>(null);
  const pendingTimerRef = useRef(0);
  /** какой режим ждёт старта после измерения области */
  const pendingModeRef = useRef<{ mode: GameMode; kidsGame: KidsGame }>({
    mode: 'classic',
    kidsGame: 'onet',
  });

  const startLevelNow = useCallback(
    (level: number, areaW: number, areaH: number, mode: GameMode, kidsGame: KidsGame) => {
      const harder = progressRef.current.kidsHarder;
      let cfg: LevelConfig;
      let kinds: KindSkin[];
      if (mode === 'kids') {
        const theme = themeForLevel(level);
        cfg = kidsConfigForLevel(level, areaW, areaH, harder, theme);
        kinds = pickKinds(cfg.kinds, {
          kids: true,
          cats: theme === 'mixed' ? undefined : [theme === 'animals' ? 'animal' : 'plant'],
        });
      } else {
        cfg = configForLevel(level, areaW, areaH);
        kinds = pickKinds(cfg.kinds);
      }
      const gen = generateBoard(cfg.rows, cfg.cols, kinds.length);
      clearTransient();
      lastTickRef.current = -1;
      pausedAtRef.current = 0;
      freezeUntilRef.current = 0;
      frozenLeftRef.current = 0;
      setFrozenLeft(0);
      finishedRef.current = false;
      totalRef.current = cfg.time;
      /* баннер уровня не блокирует: время стартует сразу, но фора на прочтение */
      endsAtRef.current = Date.now() + BANNER_MS + cfg.time * 1000;
      timeLeftRef.current = cfg.time;
      setSession({
        mode,
        kidsGame,
        level,
        board: gen.board,
        rows: gen.rows,
        cols: gen.cols,
        kinds,
        timeTotal: cfg.time,
        score: 0,
        combo: 0,
        lastMatchAt: 0,
        pairsLeft: (gen.rows * gen.cols) / 2,
        gravity: cfg.gravity,
        easy: cfg.easy,
        theme: cfg.theme,
      });
      setTimeLeft(cfg.time);
      setBanner(level);
      setPhase('playing');
      const id = window.setTimeout(() => setBanner(null), BANNER_MS + 60);
      trackTimer(id);
    },
    [clearTransient, trackTimer]
  );

  /* Memory-игра: поле самодостаточное, без измерения и лимита времени */
  const startMemoryNow = useCallback(
    (level: number) => {
      clearTransient();
      pausedAtRef.current = 0;
      freezeUntilRef.current = 0;
      frozenLeftRef.current = 0;
      setFrozenLeft(0);
      finishedRef.current = false;
      totalRef.current = 0;
      endsAtRef.current = Infinity;
      timeLeftRef.current = 0;
      setSession({
        mode: 'kids',
        kidsGame: 'memory',
        level,
        board: [],
        rows: 0,
        cols: 0,
        kinds: [],
        timeTotal: 0,
        score: 0,
        combo: 0,
        lastMatchAt: 0,
        pairsLeft: 0,
        gravity: 'none',
        easy: false,
        theme: themeForLevel(level),
      });
      setBanner(level);
      setPhase('playing');
      const id = window.setTimeout(() => setBanner(null), BANNER_MS + 60);
      trackTimer(id);
    },
    [clearTransient, trackTimer]
  );

  /* Запуск: показываем каркас и ждём первого измерения области поля */
  const beginLevel = useCallback(
    (level: number, mode: GameMode = 'classic', kidsGame: KidsGame = 'onet') => {
      clearTransient();
      setSession(null);
      setWinInfo(null);
      setLastRun(null);
      setAdOffer(null);
      setPendingLevel(level);
      pendingLevelRef.current = level;
      pendingModeRef.current = { mode, kidsGame };
      /* memory стартует без измерения области */
      if (mode === 'kids' && kidsGame === 'memory') {
        pendingLevelRef.current = null;
        startMemoryNow(level);
        return;
      }
      /* страховка: если измерение не придёт — строим по окну (landscape-логика) */
      window.clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = window.setTimeout(() => {
        if (pendingLevelRef.current === level) {
          pendingLevelRef.current = null;
          const w = Math.max(window.innerWidth, window.innerHeight) - 12;
          const h = Math.min(window.innerWidth, window.innerHeight) - 104;
          startLevelNow(
            level,
            Math.max(w, 320),
            Math.max(h, 160),
            pendingModeRef.current.mode,
            pendingModeRef.current.kidsGame
          );
        }
      }, 600);
      setPhase('starting');
    },
    [clearTransient, startLevelNow, startMemoryNow]
  );

  /* Измерение области поля: срабатывает и на первый монтаж, и на resize
     (следующий уровень генерируется под актуальный размер экрана) */
  const inGameShell = phase !== 'menu';
  useEffect(() => {
    if (!inGameShell) return;
    const el = mainRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        mainSizeRef.current = { w: e.contentRect.width, h: e.contentRect.height };
      }
      const lv = pendingLevelRef.current;
      if (lv != null && mainSizeRef.current.w >= 160 && mainSizeRef.current.h >= 120) {
        pendingLevelRef.current = null;
        window.clearTimeout(pendingTimerRef.current);
        startLevelNow(
          lv,
          mainSizeRef.current.w,
          mainSizeRef.current.h,
          pendingModeRef.current.mode,
          pendingModeRef.current.kidsGame
        );
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [inGameShell, startLevelNow]);

  useEffect(
    () => () => {
      window.clearTimeout(pendingTimerRef.current);
    },
    []
  );

  const handlePlay = useCallback(() => {
    sound.ensure();
    sound.play('click');
    beginLevel(progressRef.current.level, 'classic', 'onet');
  }, [beginLevel]);

  /** Детский режим: «Соединялка» (ONET) */
  const handleKidsOnet = useCallback(() => {
    sound.ensure();
    sound.play('click');
    beginLevel(progressRef.current.kidsLevel, 'kids', 'onet');
  }, [beginLevel]);

  /** Детский режим: «Найди одинаковые» (memory) */
  const handleKidsMemory = useCallback(() => {
    sound.ensure();
    sound.play('click');
    beginLevel(progressRef.current.kidsLevel, 'kids', 'memory');
  }, [beginLevel]);

  /** Детская сложность: «проще» / «посложнее» */
  const handleKidsDifficulty = useCallback((harder: boolean) => {
    const p = progressRef.current;
    const np: Progress = { ...p, kidsHarder: harder };
    progressRef.current = np;
    setProgress(np);
    saveProgress(np);
    sound.play('click');
  }, []);

  /** Новая игра: сброс прогресса (язык, имя и таблица остаются) */
  const handleNewGame = useCallback(() => {
    const p0 = progressRef.current;
    /* забег заканчивается — фиксируем результат в таблице */
    const { leaderboard } = pushLeaderboard(p0, Math.max(1, p0.level - 1));
    const p: Progress = {
      ...DEFAULT_PROGRESS,
      soundOn: p0.soundOn,
      lang: p0.lang,
      playerName: p0.playerName,
      leaderboard,
      bonuses: { ...START_BONUSES },
    };
    progressRef.current = p;
    setProgress(p);
    saveProgress(p);
    sound.ensure();
    sound.play('click');
    beginLevel(1, 'classic', 'onet');
  }, [beginLevel]);

  const handleToggleSound = useCallback(() => {
    const next = !sound.enabled;
    sound.setEnabled(next);
    if (next) sound.play('click');
    setProgress((p) => {
      const np = { ...p, soundOn: next };
      progressRef.current = np;
      saveProgress(np);
      return np;
    });
  }, []);

  const handleLangChange = useCallback((lang: Lang) => {
    const p = progressRef.current;
    const np: Progress = { ...p, lang };
    progressRef.current = np;
    setProgress(np);
    saveProgress(np);
    sound.play('click');
  }, []);

  const spendBonus = useCallback((kind: keyof Bonuses): boolean => {
    const p = progressRef.current;
    if (p.bonuses[kind] <= 0) return false;
    const np: Progress = {
      ...p,
      bonuses: { ...p.bonuses, [kind]: p.bonuses[kind] - 1 },
    };
    progressRef.current = np;
    setProgress(np);
    saveProgress(np);
    return true;
  }, []);

  /* ============ Победа ============ */

  /** Детская победа: уровень +1, без серии/таблицы/рекордов */
  const finishWinKids = useCallback(
    (level: number, kidsGame: KidsGame, levelScore: number, timeBonus: number) => {
      const p0 = progressRef.current;
      const earned: Bonuses = {
        hint: p0.bonuses.hint >= BONUS_CAPS.hint ? 0 : 1,
        shuffle: p0.bonuses.shuffle >= BONUS_CAPS.shuffle ? 0 : 1,
        freeze: p0.bonuses.freeze >= BONUS_CAPS.freeze ? 0 : 1,
      };
      const np: Progress = {
        ...p0,
        kidsLevel: level + 1,
        bonuses: {
          hint: Math.min(BONUS_CAPS.hint, p0.bonuses.hint + earned.hint),
          shuffle: Math.min(BONUS_CAPS.shuffle, p0.bonuses.shuffle + earned.shuffle),
          freeze: Math.min(BONUS_CAPS.freeze, p0.bonuses.freeze + earned.freeze),
        },
      };
      progressRef.current = np;
      setProgress(np);
      saveProgress(np);
      setWinInfo({
        level,
        levelScore,
        timeBonus,
        earned,
        mode: 'kids',
        kidsGame,
      });
      sound.play('win');
      setPhase('win');
    },
    []
  );

  const finishWin = useCallback(() => {
    const s = sessionRef.current;
    if (!s || finishedRef.current) return;
    finishedRef.current = true;

    const timeBonus = Math.round(Math.min(timeLeftRef.current, s.timeTotal)) * 2;
    const levelScore = s.score;

    /* детский уровень: без серии и таблицы */
    if (s.mode === 'kids') {
      finishWinKids(s.level, s.kidsGame, levelScore, timeBonus);
      return;
    }

    const totalAfter = progressRef.current.totalScore + levelScore + timeBonus;

    const p0 = progressRef.current;
    /* серия уровней без проигрышей */
    const streak = p0.streak + 1;
    const maxStreak = Math.max(p0.maxStreak, streak);
    const earned: Bonuses = {
      hint: p0.bonuses.hint >= BONUS_CAPS.hint ? 0 : 1,
      shuffle: p0.bonuses.shuffle >= BONUS_CAPS.shuffle ? 0 : 1,
      freeze: p0.bonuses.freeze >= BONUS_CAPS.freeze ? 0 : 1,
    };
    const np: Progress = {
      ...p0,
      level: s.level + 1,
      bestLevel: Math.max(p0.bestLevel, s.level),
      bestScore: Math.max(p0.bestScore, totalAfter),
      totalScore: totalAfter,
      bonuses: {
        hint: Math.min(BONUS_CAPS.hint, p0.bonuses.hint + earned.hint),
        shuffle: Math.min(BONUS_CAPS.shuffle, p0.bonuses.shuffle + earned.shuffle),
        freeze: Math.min(BONUS_CAPS.freeze, p0.bonuses.freeze + earned.freeze),
      },
      streak,
      maxStreak,
    };
    progressRef.current = np;
    setProgress(np);
    saveProgress(np);

    setWinInfo({
      level: s.level,
      levelScore,
      timeBonus,
      earned,
    });
    sound.play('win');
    setPhase('win');
  }, [finishWinKids]);

  /* Победа в memory: очки и время без лимита */
  const handleMemoryWin = useCallback(
    (score: number) => {
      const s = sessionRef.current;
      if (!s || finishedRef.current) return;
      finishedRef.current = true;
      finishWinKids(s.level, 'memory', score, 0);
    },
    [finishWinKids]
  );

  const doShuffle = useCallback(
    (board: Cell[], rows: number, cols: number, message: string) => {
      const shuffled = shuffleBoard(board, rows, cols);
      setSession((s) => (s ? { ...s, board: shuffled } : s));
      setSelected(null);
      setHintPair(null);
      setDying([]);
      setToast(message);
      sound.play('shuffle');
      const id = window.setTimeout(() => setToast(null), 1800);
      trackTimer(id);
    },
    [trackTimer]
  );

  /* ============ Клик по плитке ============ */

  const handleTileClick = useCallback(
    (r: number, c: number) => {
      if (phase !== 'playing' || !session || adBusyRef.current) return;
      const idx = cellIndex(r, c, session.cols);
      const tile = session.board[idx];
      if (!tile) return;

      if (!selected) {
        setSelected({ r, c });
        sound.play('select');
        return;
      }
      if (selected.r === r && selected.c === c) {
        setSelected(null);
        return;
      }

      const selIdx = cellIndex(selected.r, selected.c, session.cols);
      const selTile = session.board[selIdx];
      if (!selTile) {
        setSelected({ r, c });
        return;
      }

      if (selTile.kind === tile.kind) {
        const path = findPath(session.board, session.rows, session.cols, selected, { r, c });
        if (path) {
          /* Совпадение! (время за пару НЕ возвращается) */
          const nb0 = session.board.slice();
          nb0[selIdx] = null;
          nb0[idx] = null;
          /* Гравитация как в Pao Pao: оставшиеся камни падают на место
             убранной пары (вниз/вверх/влево/вправо — направление уровня) */
          const nb =
            session.gravity !== 'none'
              ? applyGravity(nb0, session.rows, session.cols, session.gravity)
              : nb0;

          const now = Date.now();
          const combo =
            session.lastMatchAt > 0 && now - session.lastMatchAt < COMBO_WINDOW_MS
              ? session.combo + 1
              : 1;
          const gained = 10 + Math.min(combo - 1, 4) * 5;
          const pairsLeftNew = session.pairsLeft - 1;

          setSession({
            ...session,
            board: nb,
            score: session.score + gained,
            combo,
            lastMatchAt: now,
            pairsLeft: pairsLeftNew,
          });
          setSelected(null);
          setHintPair(null);

          sound.play(combo >= 3 ? 'combo' : 'match');

          /* детский режим: показываем название зверька/фрукта — «кто это» */
          if (session.mode === 'kids') {
            const skin = session.kinds[tile.kind];
            if (skin) {
              const lang = progressRef.current.lang;
              setNamePopup({
                pr: r,
                pc: c,
                name: lang === 'en' ? skin.en : skin.ru,
                img: skin.img,
                key: now,
              });
              /* подпись держится подольше — успеть прочитать */
              const idPop = window.setTimeout(() => setNamePopup(null), 2600);
              trackTimer(idPop);
            }
          }

          /* линия соединения + анимация исчезновения */
          setMatchLine(path);
          const dTiles: DyingTile[] = [
            { pr: selected.r, pc: selected.c, kind: tile.kind, key: `d${selTile.id}` },
            { pr: r, pc: c, kind: tile.kind, key: `d${tile.id}` },
          ];
          setDying((d) => [...d, ...dTiles]);
          const idLine = window.setTimeout(() => setMatchLine(null), LINE_MS);
          const idDying = window.setTimeout(() => {
            setDying((d) => d.filter((x) => x.key !== `d${selTile.id}` && x.key !== `d${tile.id}`));
          }, DYING_MS);
          trackTimer(idLine);
          trackTimer(idDying);

          if (pairsLeftNew === 0) {
            const idWin = window.setTimeout(() => finishWin(), 650);
            trackTimer(idWin);
          } else if (!findAnyMatch(nb, session.rows, session.cols)) {
            const tt = stringsFor(progressRef.current.lang);
            const idSh = window.setTimeout(
              () => doShuffle(nb, session.rows, session.cols, tt.toastNoMoves),
              450
            );
            trackTimer(idSh);
          }
        } else {
          /* одинаковые, но путь заблокирован */
          setWrongPair([selected, { r, c }]);
          const id = window.setTimeout(() => setWrongPair(null), 420);
          trackTimer(id);
          setSelected(null);
          setSession((s) => (s ? { ...s, combo: 0 } : s));
          if (freezeUntilRef.current <= Date.now()) {
            endsAtRef.current = Math.max(Date.now(), endsAtRef.current - WRONG_PENALTY_SEC * 1000);
          }
          sound.play('wrong');
        }
      } else {
        /* другая картинка — переносим выбор */
        setSelected({ r, c });
        sound.play('select');
      }
    },
    [phase, session, selected, finishWin, doShuffle, trackTimer]
  );

  /* ============ Бонусы: подсказка, перемешивание, заморозка ============ */
  /* Если бонус закончился — по клику предлагаем получить 1 за рекламу */

  const handleHint = useCallback(() => {
    if (phase !== 'playing' || !session || adBusyRef.current) return;
    if (progressRef.current.bonuses.hint <= 0) {
      sound.play('click');
      setAdOffer('hint');
      return;
    }
    const m = findAnyMatch(session.board, session.rows, session.cols);
    if (!m) return;
    if (!spendBonus('hint')) return;
    setHintPair(m);
    sound.play('hint');
    const id = window.setTimeout(() => setHintPair(null), 5000);
    trackTimer(id);
  }, [phase, session, spendBonus, trackTimer]);

  const handleShuffle = useCallback(() => {
    if (phase !== 'playing' || !session || adBusyRef.current) return;
    if (progressRef.current.bonuses.shuffle <= 0) {
      sound.play('click');
      setAdOffer('shuffle');
      return;
    }
    if (!spendBonus('shuffle')) return;
    const tt = stringsFor(progressRef.current.lang);
    doShuffle(session.board, session.rows, session.cols, tt.toastShuffled);
  }, [phase, session, doShuffle, spendBonus]);

  const handleFreeze = useCallback(() => {
    if (phase !== 'playing' || adBusyRef.current) return;
    const now = Date.now();
    if (freezeUntilRef.current > now) return;
    if (timeLeftRef.current <= 0) return;
    if (progressRef.current.bonuses.freeze <= 0) {
      sound.play('click');
      setAdOffer('freeze');
      return;
    }
    if (!spendBonus('freeze')) return;
    freezeUntilRef.current = now + FREEZE_SEC * 1000;
    frozenLeftRef.current = FREEZE_SEC;
    setFrozenLeft(FREEZE_SEC);
    sound.play('freeze');
    const tt = stringsFor(progressRef.current.lang);
    setToast(tt.toastFrozen);
    const id = window.setTimeout(() => setToast(null), 1600);
    trackTimer(id);
  }, [phase, spendBonus, trackTimer]);

  /* ============ Выход из игры: классика — подтверждение со сбросом до
     чекпоинта; детский — сразу в меню (сброса нет, уровень никуда не денется) ============ */

  const goMenu = useCallback(() => {
    clearTransient();
    setSession(null);
    setWinInfo(null);
    setLastRun(null);
    setAdOffer(null);
    setPhase('menu');
    sound.play('click');
  }, [clearTransient]);

  const requestExit = useCallback(() => {
    sound.play('click');
    const s = sessionRef.current;
    if (s && s.mode === 'kids') {
      goMenu();
      return;
    }
    setPhase('exit-confirm');
  }, [goMenu]);

  const confirmExit = useCallback(() => {
    const s = sessionRef.current;
    if (s && s.mode === 'classic') {
      const p = progressRef.current;
      const res = pushLeaderboard(p, s.level);
      const np: Progress = {
        ...p,
        level: reachedCheckpoint(s.level),
        streak: 0,
        leaderboard: res.leaderboard,
      };
      progressRef.current = np;
      setProgress(np);
      saveProgress(np);
    }
    goMenu();
  }, [goMenu]);

  /* ============ Реклама с вознаграждением (РСЯ) ============ */

  /** выдать награду за просмотренную рекламу */
  const grantAdReward = useCallback(
    (purpose: AdPurpose) => {
      const tt = stringsFor(progressRef.current.lang);
      if (purpose === 'retry') {
        const s = sessionRef.current;
        if (!s) return;
        const lr = lastRunRef.current;
        const p = progressRef.current;
        /* забег продолжается: возвращаем уровень и серию,
           убираем поспешно записанную строку таблицы */
        const leaderboard =
          lr && lr.rowIdx != null
            ? p.leaderboard.filter((_, i) => i !== lr.rowIdx)
            : p.leaderboard;
        const np: Progress = {
          ...p,
          level: s.level,
          streak: lr?.streak ?? p.streak,
          leaderboard,
          adRetriedLevels: p.adRetriedLevels.includes(s.level)
            ? p.adRetriedLevels
            : [...p.adRetriedLevels, s.level],
        };
        progressRef.current = np;
        setProgress(np);
        saveProgress(np);
        setLastRun(null);
        beginLevel(s.level, 'classic', 'onet');
        return;
      }
      if (purpose === 'skip') {
        /* детский: пропустить уровень — сразу следующий */
        const s = sessionRef.current;
        if (!s) return;
        const p = progressRef.current;
        const next = s.level + 1;
        const np: Progress = { ...p, kidsLevel: Math.max(p.kidsLevel, next) };
        progressRef.current = np;
        setProgress(np);
        saveProgress(np);
        beginLevel(next, 'kids', s.kidsGame);
        return;
      }
      const p = progressRef.current;
      const cap = BONUS_CAPS[purpose];
      if (p.bonuses[purpose] >= cap) return;
      const np: Progress = {
        ...p,
        bonuses: { ...p.bonuses, [purpose]: p.bonuses[purpose] + 1 },
      };
      progressRef.current = np;
      setProgress(np);
      saveProgress(np);
      setToast(tt.toastAdBonus(tt.bonusNames[purpose]));
      const id = window.setTimeout(() => setToast(null), 1800);
      trackTimer(id);
    },
    [beginLevel, trackTimer]
  );

  /**
   * Показать рекламу с вознаграждением (блок РСЯ R-M-20010879-1).
   * Пока идёт показ — игровое время СТОИТ. Если реклама недоступна
   * (дев-среда / нет показа / блокировщик) — заглушка с отсчётом,
   * чтобы игрок гарантированно получил награду и не застревал.
   */
  const runAd = useCallback(
    async (purpose: AdPurpose) => {
      if (adBusyRef.current) return;
      adBusyRef.current = true;
      setAdBusy(true);
      adPlayingRef.current = true;
      setAdOffer(null);
      let result: RewardedResult;
      try {
        result = await showRewardedAd();
        if (result === 'error') {
          /* РСЯ недоступна — показываем заглушку */
          result = await new Promise<RewardedResult>((resolve) => {
            setSimAd({ done: () => resolve('rewarded') });
          });
        }
      } catch {
        result = 'closed';
      }
      adPlayingRef.current = false;
      setSimAd(null);
      adBusyRef.current = false;
      setAdBusy(false);
      if (result === 'rewarded') {
        sound.play('win');
        grantAdReward(purpose);
      }
    },
    [grantAdReward]
  );

  /** имя игрока на экране проигрыша (если попал в топ-10) */
  const handleNameChange = useCallback((name: string) => {
    const p = progressRef.current;
    const lr = lastRunRef.current;
    const idx = lr && lr.rowIdx != null ? lr.rowIdx : -1;
    const leaderboard =
      idx >= 0 ? p.leaderboard.map((r, i) => (i === idx ? { ...r, name } : r)) : p.leaderboard;
    const np: Progress = { ...p, playerName: name, leaderboard };
    progressRef.current = np;
    setProgress(np);
    saveProgress(np);
  }, []);

  /** имя игрока в турнирной таблице (вводится в окне таблицы) */
  const handlePlayerName = useCallback((name: string) => {
    const p = progressRef.current;
    const np: Progress = { ...p, playerName: name };
    progressRef.current = np;
    setProgress(np);
    saveProgress(np);
  }, []);

  /* Очистка таймеров при размонтировании */
  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, []);

  /* Dev-only хук для e2e-тестов (в прод не попадает):
     __onetMatch — текущий соединимый ход; __onetTimeout — быстро кончить время */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as Record<string, unknown>;
    w.__onetMatch = (): [number, number, number, number] | null => {
      const s = sessionRef.current;
      if (!s) return null;
      const m = findAnyMatch(s.board, s.rows, s.cols);
      return m ? [m[0].r, m[0].c, m[1].r, m[1].c] : null;
    };
    w.__onetTimeout = (): void => {
      endsAtRef.current = Date.now() - 1;
    };
  }, [session]);

  /* ============ Рендер ============ */

  /* Каркас показываем всегда, кроме меню: и во время игры, и в фазе
     'starting' (когда поле ещё генерируется под измеренную область) */
  const showGame = inGameShell;
  const bonuses = progress.bonuses;
  const isMemory = !!session && session.mode === 'kids' && session.kidsGame === 'memory';
  const isKids = !!session && session.mode === 'kids';
  const comboActive =
    !!session &&
    session.combo >= 2 &&
    session.lastMatchAt > 0 &&
    Date.now() - session.lastMatchAt < COMBO_WINDOW_MS;
  const headerLevel = session?.level ?? pendingLevel ?? 1;
  const resetLevelNow = session ? reachedCheckpoint(session.level) : progress.level;
  /* индикатор чекпоинта (классика): игрок всегда видит, когда сохранится */
  const cpIsNow = isCheckpointLevel(headerLevel);
  const cpUntil = CHECKPOINT_EVERY - (headerLevel % CHECKPOINT_EVERY);
  const showCpChip =
    !isMemory && (session ? session.mode === 'classic' : pendingModeRef.current.mode === 'classic');
  /* победу на уровне-чекпоинте отмечаем «прогресс сохранён» */
  const winSaved = !!winInfo && winInfo.mode !== 'kids' && isCheckpointLevel(winInfo.level);

  return (
    /* Горизонтальный вьюпорт: в портретной ориентации экран поворачивается
        CSS'ом (.app-viewport из globals.css) — игра сразу открывается
        в горизонтальном режиме на любом устройстве.
        Детский режим — тёплый персиковый фон (отличается от бирюзового
        классического, не сливается с ним и с меню) */
    <div
      className={
        'app-viewport ' +
        (isKids
          ? 'bg-gradient-to-b from-amber-100 via-orange-50 to-rose-100'
          : 'bg-gradient-to-b from-teal-100 via-emerald-50 to-amber-100')
      }
    >
      <div className="h-full w-full overflow-hidden text-teal-950">
      {showGame ? (
        <div className="flex h-full select-none flex-col">
          {/* Верхняя панель (кроме memory — у неё своя): всё в ОДИН ряд */}
          {!isMemory && (
          <header className="px-2 pt-[max(0.375rem,env(safe-area-inset-top))]">
            <div className="flex items-center gap-2">
              <span
                className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-sm font-black text-teal-900 shadow-sm"
                title={
                  isKids
                    ? t.themeLabel(session?.theme ?? 'mixed')
                    : session
                      ? t.gravity[session.gravity] || undefined
                      : undefined
                }
              >
                {t.level(headerLevel)}
                {isKids && session?.theme && (
                  <span className="text-teal-700/80"> · {t.themeLabel(session.theme)}</span>
                )}
                {!isKids && session && session.gravity !== 'none' && (
                  <span aria-hidden="true"> {GRAVITY_ARROW[session.gravity]}</span>
                )}
              </span>
              {showCpChip && (
                <span
                  className={cpIsNow ? 'cp-chip cp-chip--now' : 'cp-chip'}
                  title={
                    cpIsNow
                      ? t.bannerCheckpoint
                      : t.cpChip(cpUntil)
                  }
                >
                  <IconFlag className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">
                    {cpIsNow ? t.cpChipSave : t.cpChip(cpUntil)}
                  </span>
                </span>
              )}
              <span className="flex shrink-0 items-center gap-1.5 text-sm font-black tabular-nums text-teal-900">
                <IconStar className="h-4.5 w-4.5" aria-hidden="true" />
                {isKids ? session?.score ?? 0 : progress.totalScore + (session?.score ?? 0)}
              </span>
              <div className="min-w-0 flex-1">
                {session ? (
                  <TimeBar timeLeft={timeLeft} total={session.timeTotal} frozen={frozenLeft > 0} />
                ) : (
                  <div className="h-2.5 w-full rounded-full bg-white/50" />
                )}
              </div>
              <button
                type="button"
                onClick={handleHint}
                disabled={phase !== 'playing' || adBusy}
                aria-label={t.hintLeft(bonuses.hint)}
                className="game-action-btn game-action-btn--sm game-action-btn--hint"
              >
                <IconHint className="h-6 w-6" />
                <span
                  className={`game-action-badge ${bonuses.hint <= 0 ? 'game-action-badge--zero' : ''}`}
                >
                  {bonuses.hint}
                </span>
              </button>
              <button
                type="button"
                onClick={handleShuffle}
                disabled={phase !== 'playing' || adBusy}
                aria-label={t.shuffleLeft(bonuses.shuffle)}
                className="game-action-btn game-action-btn--sm game-action-btn--shuffle"
              >
                <IconShuffle className="h-6 w-6" />
                <span
                  className={`game-action-badge ${bonuses.shuffle <= 0 ? 'game-action-badge--zero' : ''}`}
                >
                  {bonuses.shuffle}
                </span>
              </button>
              <button
                type="button"
                onClick={handleFreeze}
                disabled={phase !== 'playing' || adBusy || frozenLeft > 0}
                aria-label={
                  frozenLeft > 0 ? t.freezeActive(frozenLeft) : t.freezeLeft(bonuses.freeze)
                }
                className="game-action-btn game-action-btn--sm game-action-btn--freeze"
              >
                <IconFreeze className="h-6 w-6" />
                <span
                  className={`game-action-badge ${frozenLeft > 0 ? 'game-action-badge--freeze' : bonuses.freeze <= 0 ? 'game-action-badge--zero' : ''}`}
                >
                  {frozenLeft > 0 ? frozenLeft : bonuses.freeze}
                </span>
              </button>
              <button
                type="button"
                onClick={handleToggleSound}
                aria-label={sound.enabled ? t.soundOn : t.soundOff}
                className="game-action-btn game-action-btn--sm game-action-btn--sound"
              >
                {sound.enabled ? <IconSoundOn className="h-6 w-6" /> : <IconSoundOff className="h-6 w-6" />}
              </button>
              {fs.supported && (
                <button
                  type="button"
                  onClick={fs.toggle}
                  aria-label={fs.isFullscreen ? t.fullscreenOff : t.fullscreenOn}
                  title={fs.isFullscreen ? t.fullscreenOff : t.fullscreenOn}
                  className="game-action-btn game-action-btn--sm game-action-btn--sound"
                >
                  {fs.isFullscreen ? <IconShrink className="h-6 w-6" /> : <IconExpand className="h-6 w-6" />}
                </button>
              )}
              {phase === 'playing' && (
                <button
                  type="button"
                  onClick={pauseGame}
                  disabled={adBusy}
                  aria-label={t.pause}
                  className="game-action-btn game-action-btn--sm game-action-btn--pause"
                >
                  <IconPause className="h-6 w-6" />
                </button>
              )}
            </div>
          </header>
          )}

          {/* Поле (реф нужен для измерения области — под неё генерируется
              уровень): сетка занимает всю область, а вокруг неё — отступ
              ровно в полплитки, в котором идёт линия соединения */}
          <main
            ref={mainRef}
            className="relative flex min-h-0 flex-1 flex-col"
          >
            {banner !== null && (
              <LevelBanner
                level={banner}
                t={t}
                kids={isKids}
                theme={session?.theme}
                checkpoint={!isKids && isCheckpointLevel(banner)}
              />
            )}
            {toast && <Toast message={toast} />}
            {comboActive && session && !isMemory && (
              <div className="pointer-events-none absolute left-2 top-2 z-30">
                <ComboChip combo={session.combo} />
              </div>
            )}
            {session && isMemory && (
              <MemoryGame
                key={session.level}
                level={session.level}
                harder={progress.kidsHarder}
                t={t}
                lang={progress.lang}
                soundOn={sound.enabled}
                paused={phase !== 'playing'}
                adBusy={adBusy || !!simAd}
                onWin={handleMemoryWin}
                onPause={pauseGame}
                onExit={goMenu}
                onSkip={() => setSkipOffer(true)}
                onToggleSound={handleToggleSound}
              />
            )}
            {session && !isMemory && (
              <Board
                board={session.board}
                rows={session.rows}
                cols={session.cols}
                kinds={session.kinds}
                selected={selected}
                wrongPair={wrongPair}
                hintPair={hintPair}
                dying={dying}
                matchLine={matchLine}
                gravity={session.gravity}
                namePopup={namePopup}
                onTileClick={handleTileClick}
              />
            )}
          </main>
        </div>
      ) : (
        <MenuScreen
          t={t}
          lang={progress.lang}
          level={progress.level}
          kidsLevel={progress.kidsLevel}
          kidsHarder={progress.kidsHarder}
          totalScore={progress.totalScore}
          bonuses={progress.bonuses}
          soundOn={progress.soundOn}
          streak={progress.streak}
          maxStreak={progress.maxStreak}
          onPlay={handlePlay}
          onNewGame={handleNewGame}
          onToggleSound={handleToggleSound}
          onLangChange={handleLangChange}
          onShowLeaderboard={() => setShowLeaderboard(true)}
          onKidsOnet={handleKidsOnet}
          onKidsMemory={handleKidsMemory}
          onKidsDifficulty={handleKidsDifficulty}
        />
      )}

      {/* Модальные экраны */}
      {phase === 'paused' && session && (
        <PauseModal
          t={t}
          level={session.level}
          onResume={resumeGame}
          onMenu={requestExit}
          onSkipLevel={isKids ? () => setSkipOffer(true) : undefined}
          adBusy={adBusy}
        />
      )}

      {phase === 'exit-confirm' && (
        <ExitConfirmModal
          t={t}
          resetLevel={resetLevelNow}
          onConfirm={confirmExit}
          onCancel={() => setPhase('paused')}
        />
      )}

      {phase === 'win' && winInfo && (
        <WinModal
          t={t}
          info={winInfo}
          streak={progress.streak}
          saved={winSaved}
          kids={winInfo.mode === 'kids'}
          onNext={() =>
            beginLevel(winInfo.level + 1, winInfo.mode ?? 'classic', winInfo.kidsGame ?? 'onet')
          }
          onMenu={goMenu}
        />
      )}

      {phase === 'gameover' && session && (
        <GameOverModal
          t={t}
          level={session.level}
          resetLevel={isKids ? session.level : progress.level}
          nextCp={isKids ? session.level : nextCheckpointAfter(progress.level)}
          totalScore={isKids ? session.score : progress.totalScore}
          canAdRetry={!isKids && !progress.adRetriedLevels.includes(session.level)}
          adBusy={adBusy}
          qualified={!!lastRun?.qualified && !isKids}
          playerName={progress.playerName}
          mode={isKids ? 'kids' : 'classic'}
          onNameChange={handleNameChange}
          onAdRetry={() => runAd('retry')}
          onFromCheckpoint={() =>
            beginLevel(
              isKids ? session.level : progress.level,
              isKids ? 'kids' : 'classic',
              isKids ? session.kidsGame : 'onet'
            )
          }
          onSkip={isKids ? () => setSkipOffer(true) : undefined}
          onMenu={goMenu}
        />
      )}

      {/* Пропуск уровня: сначала спрашиваем — «смотреть рекламу и пропустить?» */}
      {skipOffer && !simAd && phase !== 'menu' && (
        <SkipConfirmModal
          t={t}
          level={session?.level ?? pendingLevel ?? 1}
          onWatch={() => {
            setSkipOffer(false);
            runAd('skip');
          }}
          onClose={() => setSkipOffer(false)}
        />
      )}

      {/* Бонус закончился: предложить +1 за рекламу */}
      {adOffer && phase === 'playing' && !simAd && (
        <AdOfferModal
          t={t}
          bonus={adOffer}
          onWatch={() => runAd(adOffer)}
          onClose={() => setAdOffer(null)}
        />
      )}

      {/* Заглушка рекламы (РСЯ недоступна: дев-среда / нет показа) */}
      {simAd && <SimAdOverlay t={t} seconds={SIM_AD_SEC} onDone={simAd.done} />}

      {/* Турнирная таблица */}
      {showLeaderboard && phase === 'menu' && (
        <LeaderboardModal
          t={t}
          rows={progress.leaderboard}
          bestStreak={progress.maxStreak}
          playerName={progress.playerName}
          onNameChange={handlePlayerName}
          onClose={() => setShowLeaderboard(false)}
        />
      )}
      </div>
    </div>
  );
}
