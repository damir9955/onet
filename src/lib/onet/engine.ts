/**
 * Чистая игровая логика ONET (Соедини пары).
 * Не зависит от React / DOM — можно тестировать отдельно.
 *
 * Ключевое правило ONET: две одинаковые плитки соединяются, если между ними
 * можно провести ломаную линию не более чем с 2 поворотами (3 отрезка),
 * проходящую только по пустым клеткам. Путь может выходить за пределы поля
 * (по внешней рамке), поэтому логика работает на "расширенной" сетке,
 * где реальное поле окружено пустым кольцом шириной 1.
 *
 * Как в классическом Pao Pao: карточки выровнены по строгой сетке и
 * занимают максимум места, а вокруг поля оставлен отступ ровно в
 * ПОЛПЛИТКИ с каждой стороны — по нему проходит линия соединения
 * (объездной путь по внешнему кольцу), поэтому она не наезжает на меню
 * сверху и не обрезается краем экрана.
 * СЛОЖНОСТЬ — ЛЕСТНИЦА от простого к сложному (фидбек v1.6.0):
 * поле растёт 36 → 126 плиток, виды 8 → 30, секунд на пару 9 → 3.
 * Механика падений вводится постепенно: сначала без падений, потом
 * каждое направление по очереди, затем поле ДЕЛИТСЯ НА ПОЛОСЫ (2–4
 * столбца), и каждая полоса падает в СВОЮ сторону — вниз/вверх/
 * влево/вправо, как в поздних уровнях классического Pao Pao.
 * После 30-го уровня — бесконечный режим на максимуме, комбинации
 * полос меняются от уровня к уровню. На поле всегда несколько
 * «семейств» похожих по цвету видов — фон карточки подкрашен в тон
 * фигурке, и их легко перепутать. Одинаковые карточки разнесены
 * по полю: пары не стоят рядом.
 */

/** Направление гравитации уровня: куда «падают» камни после уборки пары */
export type GravityDir = 'none' | 'down' | 'up' | 'left' | 'right';

export interface Tile {
  /** уникальный id плитки */
  id: number;
  /** индекс вида (картинки) */
  kind: number;
}

/** Клетка поля: плитка или пусто */
export type Cell = Tile | null;

/** Координата в расширенной (padded) сетке: 0..rows+1, 0..cols+1 */
export interface Point {
  r: number;
  c: number;
}

/** Ломаная линия соединения (в padded-координатах), точки — повороты */
export type Path = Point[];

export interface LevelConfig {
  level: number;
  rows: number;
  cols: number;
  /** сколько видов плиток используется на уровне */
  kinds: number;
  /** полное время на уровень, сек: минимум 3 минуты,
   *  за совпадение время НЕ возвращается */
  time: number;
  /** куда падают камни после уборки пары (полосы столбцов, как в Pao Pao) */
  gravity: GravityPlan;
  /** лёгкий уровень (каждый 3-й) — передышка */
  easy: boolean;
  /** тема уровня (детский режим: звери / фрукты-овощи / вперемешку) */
  theme?: LevelTheme;
}

/* Каталог видов (90 видов, реалистичные картинки) живёт в kinds.ts —
 * здесь только ре-экспорт, чтобы компонентам не менять импорты. */
export { pickKinds, kindImage, KINDS_TOTAL } from './kinds';
export type { KindSkin, KindCat, PickKindsOptions } from './kinds';
import { KINDS_TOTAL } from './kinds';

/* ============ Сложность: лестница как в классическом Pao Pao ============ */

/**
 * План гравитации уровня: поле делится на полосы СТОЛБЦОВ (2–4),
 * каждая полоса «падает» в СВОЮ сторону. Один элемент в bands —
 * вся доска едет в одну сторону (как раньше). Пустой массив — без падений.
 * Так устроены поздние уровни классического Pao Pao: половина поля
 * падает вниз, половина вверх; или левая часть уезжает влево, правая —
 * вправо (плиты расходятся от центра) и т.п.
 */
export interface GravityPlan {
  bands: GravityDir[];
}

/** Уровень без падений */
export const NO_GRAVITY: GravityPlan = { bands: [] };

/** Вся доска едет в одну сторону */
export function singleGravity(dir: GravityDir): GravityPlan {
  return dir === 'none' ? NO_GRAVITY : { bands: [dir] };
}

/** Границы полос столбцов (0-based, включительно) при делении cols на n полос */
export function bandBounds(cols: number, n: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const base = Math.floor(cols / n);
  const extra = cols % n;
  let c = 0;
  for (let b = 0; b < n; b++) {
    const w = Math.max(1, base + (b < extra ? 1 : 0));
    out.push([c, Math.min(cols - 1, c + w - 1)]);
    c += w;
  }
  return out;
}

/** Лёгкий уровень — только для ДЕТСКОГО режима (каждый 3-й: передышка).
 *  В КЛАССИКЕ лёгких «передышек» больше нет — сложность растёт монотонно. */
export function isEasyLevel(level: number): boolean {
  return Math.max(1, Math.floor(level)) % 3 === 0;
}

/**
 * Правило уровня классики: поле, виды, секунд на пару и план гравитации.
 * ЛЕСТНИЦА от простого к сложному (как в Pao Pao):
 *  - 1–2: без падений — научиться соединять;
 *  - 3–10: каждое направление падения по два раза (вниз → вверх → влево → вправо),
 *    поле и виды растут, времени на пару — меньше;
 *  - 11–14: все направления снова, поле плотнее;
 *  - 15–18: ПОЛОСЫ: половина поля падает не туда, куда вторая
 *    (расходятся / навстречу / сходятся к центру);
 *  - 19–22: одиночные направления на самом большом поле;
 *  - 23–30: три и четыре полосы, каждая в свою сторону;
 *  - 31+: бесконечный режим — максимум плиток и видов, комбинации полос
 *    меняются от уровня к уровню (детерминированно), секунды — минимум.
 */
interface LevelRule {
  /** целевое число плиток */
  tiles: number;
  /** сколько видов */
  kinds: number;
  /** секунд на пару */
  sec: number;
  gravity: GravityPlan;
}

const L: GravityDir[] = ['down', 'up', 'left', 'right'];

const LADDER: readonly LevelRule[] = [
  /* 1 */ { tiles: 36, kinds: 8, sec: 9.0, gravity: NO_GRAVITY },
  /* 2 */ { tiles: 48, kinds: 10, sec: 8.5, gravity: NO_GRAVITY },
  /* 3 */ { tiles: 48, kinds: 12, sec: 8.0, gravity: singleGravity('down') },
  /* 4 */ { tiles: 60, kinds: 12, sec: 7.6, gravity: singleGravity('down') },
  /* 5 */ { tiles: 60, kinds: 14, sec: 7.2, gravity: singleGravity('up') },
  /* 6 */ { tiles: 72, kinds: 14, sec: 6.8, gravity: singleGravity('up') },
  /* 7 */ { tiles: 72, kinds: 16, sec: 6.4, gravity: singleGravity('left') },
  /* 8 */ { tiles: 84, kinds: 16, sec: 6.0, gravity: singleGravity('left') },
  /* 9 */ { tiles: 84, kinds: 18, sec: 5.6, gravity: singleGravity('right') },
  /* 10 */ { tiles: 96, kinds: 18, sec: 5.2, gravity: singleGravity('right') },
  /* 11 */ { tiles: 96, kinds: 20, sec: 5.0, gravity: singleGravity('down') },
  /* 12 */ { tiles: 96, kinds: 20, sec: 4.8, gravity: singleGravity('up') },
  /* 13 */ { tiles: 108, kinds: 22, sec: 4.6, gravity: singleGravity('left') },
  /* 14 */ { tiles: 108, kinds: 22, sec: 4.4, gravity: singleGravity('right') },
  /* 15 */ { tiles: 108, kinds: 24, sec: 4.3, gravity: { bands: ['left', 'right'] } },
  /* 16 */ { tiles: 120, kinds: 24, sec: 4.2, gravity: { bands: ['down', 'up'] } },
  /* 17 */ { tiles: 120, kinds: 24, sec: 4.1, gravity: { bands: ['up', 'down'] } },
  /* 18 */ { tiles: 120, kinds: 26, sec: 4.0, gravity: { bands: ['right', 'left'] } },
  /* 19 */ { tiles: 120, kinds: 26, sec: 3.9, gravity: singleGravity('down') },
  /* 20 */ { tiles: 126, kinds: 26, sec: 3.8, gravity: singleGravity('up') },
  /* 21 */ { tiles: 126, kinds: 26, sec: 3.7, gravity: singleGravity('left') },
  /* 22 */ { tiles: 126, kinds: 26, sec: 3.6, gravity: singleGravity('right') },
  /* 23 */ { tiles: 126, kinds: 28, sec: 3.5, gravity: { bands: ['down', 'up', 'down'] } },
  /* 24 */ { tiles: 126, kinds: 28, sec: 3.4, gravity: { bands: ['left', 'right', 'left'] } },
  /* 25 */ { tiles: 126, kinds: 28, sec: 3.4, gravity: { bands: ['up', 'left', 'right'] } },
  /* 26 */ { tiles: 126, kinds: 28, sec: 3.3, gravity: { bands: ['left', 'down', 'up', 'right'] } },
  /* 27 */ { tiles: 126, kinds: 30, sec: 3.3, gravity: { bands: ['down', 'up', 'down', 'up'] } },
  /* 28 */ { tiles: 126, kinds: 30, sec: 3.25, gravity: { bands: ['left', 'right', 'right', 'left'] } },
  /* 29 */ { tiles: 126, kinds: 30, sec: 3.2, gravity: { bands: ['down', 'left', 'up', 'right'] } },
  /* 30 */ { tiles: 126, kinds: 30, sec: 3.1, gravity: { bands: ['up', 'right', 'left', 'down'] } },
];

/** потолки бесконечного режима (как в оригинале 18×7 = 126 плиток) */
const TILES_CAP = 126;
const KINDS_CAP = 30;
const SEC_PER_PAIR_MIN = 3.0;

/** Бесконечный режим (31+): полосы 2–4, направления — детерминированная
 *  «вращалка» от номера уровня: уровни не повторяются, но всегда сложные */
function endlessRule(lv: number): LevelRule {
  const bands = 2 + (lv % 3); // 2..4
  const dirs: GravityDir[] = [];
  for (let b = 0; b < bands; b++) {
    dirs.push(L[(lv * 5 + b * 3 + Math.floor(lv / 7)) % 4]);
  }
  /* следим, чтобы полосы не совпали все в одну сторону — иначе это не «полосы» */
  if (dirs.every((d) => d === dirs[0])) {
    dirs[dirs.length - 1] = L[(lv + 1) % 4] === dirs[0] ? L[(lv + 2) % 4] : L[(lv + 1) % 4];
  }
  return { tiles: TILES_CAP, kinds: KINDS_CAP, sec: SEC_PER_PAIR_MIN, gravity: { bands: dirs } };
}

/** Правило уровня (классика): монотонная лестница до 30, дальше — бесконечный максимум */
export function levelRuleFor(level: number): LevelRule {
  const lv = Math.max(1, Math.floor(level));
  return lv <= LADDER.length ? LADDER[lv - 1] : endlessRule(lv);
}

/* Время: минимум 3 минуты на уровне — поля плотные, карточек много */
const MIN_LEVEL_TIME = 180;

/* ============ Чекпоинты (сброс при проигрыше/выходе) ============ */

/** Чекпоинт каждые 5 уровней: 5, 10, 15, ... */
export const CHECKPOINT_EVERY = 5;

/** Последний ДОСТИГНУТЫЙ чекпоинт к моменту уровня level —
 *  до него сбрасывается прогресс при проигрыше или выходе из игры.
 *  Проигрыш на 1-5 -> уровень 1, на 6-10 -> уровень 5, на 11-15 -> 10 и т.д. */
export function reachedCheckpoint(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return Math.max(1, Math.floor((lv - 1) / CHECKPOINT_EVERY) * CHECKPOINT_EVERY);
}

/** Следующий чекпоинт после уровня сброса (для подсказки игроку):
 *  сброс на 1 -> следующий чекпоинт 5, сброс на 5 -> 10 */
export function nextCheckpointAfter(resetLevel: number): number {
  const r = Math.max(1, Math.floor(resetLevel));
  return (Math.floor(r / CHECKPOINT_EVERY) + 1) * CHECKPOINT_EVERY;
}

/** Является ли уровень чекпоинтом (5, 10, 15, ...) */
export function isCheckpointLevel(level: number): boolean {
  return Math.max(1, Math.floor(level)) % CHECKPOINT_EVERY === 0;
}

/* ============ Детский режим ============ */

/** Детская сложность: «проще» или «посложнее» */
export type KidsDifficulty = 'easier' | 'harder';

/** Тема детского уровня: 1 → звери, 2 → фрукты и овощи, каждый 3-й → вперемешку */
export type LevelTheme = 'animals' | 'plants' | 'mixed';
export function themeForLevel(level: number): LevelTheme {
  const lv = Math.max(1, Math.floor(level));
  const m = lv % 3;
  return m === 1 ? 'animals' : m === 2 ? 'plants' : 'mixed';
}

/** Детский ONET: плиток МАЛО (и они крупные). Каждый 3-й уровень —
 *  передышка (−4 плитки). «Посложнее» — чуть больше плиток. */
const KIDS_TILES_START = 12;
const KIDS_TILES_STEP = 2;
const KIDS_TILES_CAP: Record<KidsDifficulty, number> = { easier: 30, harder: 36 };
export function kidsTilesForLevel(level: number, harder: boolean): number {
  const lv = Math.max(1, Math.floor(level));
  let n = KIDS_TILES_START + (lv - 1) * KIDS_TILES_STEP;
  n = Math.min(n, KIDS_TILES_CAP[harder ? 'harder' : 'easier']);
  if (isEasyLevel(lv)) n = Math.max(KIDS_TILES_START, n - 4);
  if (n % 2 !== 0) n += 1;
  return n;
}

/** Виды на детском уровне: 5–8. Не 2–3 (слишком легко) и не 15 (каша). */
const KIDS_KINDS_CAP = 8;
export function kidsKindsForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  return Math.min(5 + Math.floor((lv - 1) / 2), KIDS_KINDS_CAP);
}

/** Детское время: с запасом, но не бесконечное. Лёгкий уровень — +15 с. */
const KIDS_SEC_PER_PAIR: Record<KidsDifficulty, number> = { easier: 10, harder: 7 };
const KIDS_MIN_TIME = 90;
export function kidsTimeForLevel(pairs: number, level: number, harder: boolean): number {
  const lv = Math.max(1, Math.floor(level));
  const per = KIDS_SEC_PER_PAIR[harder ? 'harder' : 'easier'];
  const easyBonus = isEasyLevel(lv) ? 15 : 0;
  return Math.max(KIDS_MIN_TIME, Math.round(pairs * per + easyBonus));
}

/* ============ Лимиты бонусов ============ */

/** Максимум бонусов в копилке: подсказки 15, перемешивания 10, заморозки 10 */
export const BONUS_CAPS = { hint: 15, shuffle: 10, freeze: 10 } as const;
export type BonusKind = keyof typeof BONUS_CAPS;

/** Целевое число плиток для уровня (лестница Pao Pao, см. LADDER) */
export function targetTilesForLevel(level: number): number {
  return levelRuleFor(level).tiles;
}

/** Число видов плиток для уровня (растёт с уровнем, потолок 30) */
export function kindsForLevel(level: number): number {
  return levelRuleFor(level).kinds;
}

/** План падения камней для уровня (направления полос столбцов) */
export function gravityForLevel(level: number): GravityPlan {
  return levelRuleFor(level).gravity;
}

/** Секунд на уровень: pairs × сек/пару из лестницы,
 *  но НЕ МЕНЬШЕ 3 минут — поле плотное и карточек много */
export function timeForLevel(pairs: number, level: number): number {
  return Math.max(MIN_LEVEL_TIME, Math.round(pairs * levelRuleFor(level).sec));
}

/**
 * Геометрия поля под доступную область (логически всегда landscape —
 * портретные экраны поворачиваются CSS'ом, см. .app-viewport).
 * Подбирает rows×cols так, чтобы сетка поля + отступ ровно в ПОЛПЛИТКИ
 * с каждой стороны (+ RING_PAD на толщину линии) ЗАПОЛНЯЛИ область
 * целиком: область = (cols+1)×(rows+1) клеток + 2·RING_PAD по каждой
 * оси. В этом отступе проходит линия соединения по внешнему кольцу —
 * она видна со всех четырёх сторон и не попадает на экранное меню.
 * Клетки могут быть слегка прямоугольными (шаг по X и Y подстраивается
 * под экран) — на глаз незаметно.
 * Поле всегда шире, чем выше. Плитки не мельче 24px.
 */

/** Отступ от края игровой области до линии соединения (на её толщину:
 *  линия идёт по внешнему кольцу в полплитки от сетки, но её свечение
 *  не должно доставать до меню и краёв экрана) */
export const RING_PAD = 8;

export interface GeometryOptions {
  /** минимальный размер плитки, px (детский режим — крупнее) */
  minTile?: number;
  minRows?: number;
  minCols?: number;
  maxRows?: number;
  maxCols?: number;
  /** насколько поле обязано быть шире, чем выше (в клетках) */
  wider?: number;
}

const GEOM_DEFAULTS = {
  minTile: 24,
  minRows: 4,
  minCols: 8,
  maxRows: 14,
  maxCols: 26,
  wider: 2,
};

export function geometryForArea(
  areaW: number,
  areaH: number,
  targetTiles: number,
  opts: GeometryOptions = {}
): { rows: number; cols: number } {
  const o = { ...GEOM_DEFAULTS, ...opts };
  const fallback = { rows: Math.max(o.minRows, 6), cols: Math.max(o.minCols, 12) };
  if (!(areaW >= 160) || !(areaH >= 120)) return fallback;
  const target = Math.max(o.minRows * o.minCols, Math.min(targetTiles, 200));

  const search = (minTile: number, maxRows: number, maxCols: number) => {
    let best: { rows: number; cols: number; score: number } | null = null;
    for (let rows = o.minRows; rows <= maxRows; rows++) {
      for (let cols = o.minCols; cols <= maxCols; cols++) {
        if (cols < rows + o.wider) continue; // поле шире, чем выше (landscape)
        const total = rows * cols;
        if (total % 2 !== 0) continue; // пары — чётное число плиток
        // область = (cols+1)×(rows+1) клеток + 2·RING_PAD: полплитки
        // запаса с каждой стороны под линию соединения
        const pitchX = (areaW - 2 * RING_PAD) / (cols + 1);
        const pitchY = (areaH - 2 * RING_PAD) / (rows + 1);
        const tile = Math.min(pitchX, pitchY);
        if (tile < minTile) continue;
        // клетки близки к квадрату (пропорции сетки ≈ пропорции экрана),
        // а число плиток близко к целевому
        const cellAR = pitchX / pitchY;
        const score =
          Math.abs(Math.log(cellAR)) * 3 +
          Math.abs(total - target) / target;
        if (!best || score < best.score) best = { rows, cols, score };
      }
    }
    return best;
  };

  // первый проход: комфортный размер плитки
  let best = search(o.minTile, o.maxRows, o.maxCols);
  // запасной проход для маленьких экранов
  if (!best) best = search(Math.max(16, o.minTile - 6), Math.max(o.minRows, o.maxRows - 2), Math.max(o.minCols, o.maxCols - 6));
  return best ? { rows: best.rows, cols: best.cols } : fallback;
}

/**
 * Конфиг уровня под конкретную область экрана: поле заполняет её целиком,
 * число плиток и видов растёт с уровнем, времени на пару — меньше.
 */
export function configForLevel(level: number, areaW: number, areaH: number): LevelConfig {
  const lv = Math.max(1, Math.floor(level));
  const target = targetTilesForLevel(lv);
  const { rows, cols } = geometryForArea(areaW, areaH, target);
  const pairs = (rows * cols) / 2;
  const kinds = Math.min(kindsForLevel(lv), Math.max(2, pairs));
  const time = timeForLevel(pairs, lv);
  return {
    level: lv,
    rows,
    cols,
    kinds,
    time,
    gravity: gravityForLevel(lv),
    easy: false,
  };
}

/** Конфиг ДЕТСКОГО уровня ONET: мало крупных плиток, времени с запасом,
 *  без гравитации. Тема — звери / фрукты-овощи / вперемешку. */
export function kidsConfigForLevel(
  level: number,
  areaW: number,
  areaH: number,
  harder: boolean,
  theme: LevelTheme
): LevelConfig {
  const lv = Math.max(1, Math.floor(level));
  const target = kidsTilesForLevel(lv, harder);
  /* детские плитки крупные: минимум 34px и сетка от 2×4 */
  const { rows, cols } = geometryForArea(areaW, areaH, target, {
    minTile: 34,
    minRows: 2,
    minCols: 4,
    maxRows: 8,
    maxCols: 16,
    wider: 0,
  });
  const pairs = (rows * cols) / 2;
  const kinds = Math.min(kidsKindsForLevel(lv), Math.max(2, pairs));
  const time = kidsTimeForLevel(pairs, lv, harder);
  return {
    level: lv,
    rows,
    cols,
    kinds,
    time,
    gravity: NO_GRAVITY,
    easy: isEasyLevel(lv),
    theme,
  };
}

let nextTileId = 1;

/**
 * Сгенерировать новое поле rows×cols: каждая картинка встречается чётное
 * число раз, одинаковые РАЗНЕСЕНЫ по полю (не касаются друг друга —
 * пары не стоят рядом, как в классике), и в стартовой позиции
 * гарантированно есть хотя бы один ход.
 */
export function generateBoard(
  rows: number,
  cols: number,
  kindsCount: number
): { board: Cell[]; rows: number; cols: number } {
  const total = rows * cols;
  const pairs = total / 2;
  const kinds = Math.max(2, Math.min(kindsCount, pairs, KINDS_TOTAL));

  // распределить пары по видам максимально равномерно
  const pairCounts: number[] = new Array(kinds).fill(0);
  for (let p = 0; p < pairs; p++) {
    pairCounts[p % kinds]++;
  }
  shuffleInPlace(pairCounts);

  const tiles: Tile[] = [];
  for (let kind = 0; kind < pairCounts.length; kind++) {
    for (let p = 0; p < pairCounts[kind]; p++) {
      tiles.push({ id: nextTileId++, kind });
      tiles.push({ id: nextTileId++, kind });
    }
  }

  // основной путь: перемешать и разнести одинаковые, сохраняя стартовый ход
  for (let attempt = 0; attempt < 50; attempt++) {
    const board: Cell[] = tiles.slice();
    shuffleInPlace(board);
    scatterSameKinds(board, rows, cols);
    if (findAnyMatch(board, rows, cols)) return { board, rows, cols };
  }

  // фолбэк: обычное перемешивание до стартового хода
  const board: Cell[] = tiles.slice();
  let guard = 0;
  while (guard < 60 && !findAnyMatch(board, rows, cols)) {
    shuffleInPlace(board);
    guard++;
  }
  return { board, rows, cols };
}

/**
 * «Разнести» одинаковые карточки: никакие две одинаковые не касаются
 * друг друга даже по диагонали (расстояние Чебышёва ≥ 2). Обмены —
 * только между занятыми клетками разного вида, каждый обмен не создаёт
 * новых «касаний», поэтому процесс сходится. Состав поля сохраняется.
 */
function scatterSameKinds(board: Cell[], rows: number, cols: number): void {
  const byKind = new Map<number, number[]>();
  const occupied: number[] = [];
  for (let i = 0; i < board.length; i++) {
    const t = board[i];
    if (!t) continue;
    occupied.push(i);
    let list = byKind.get(t.kind);
    if (!list) {
      list = [];
      byKind.set(t.kind, list);
    }
    list.push(i);
  }
  if (byKind.size <= 1) return;

  const cheb = (a: number, b: number) => {
    const dr = Math.abs(Math.floor(a / cols) - Math.floor(b / cols));
    const dc = Math.abs((a % cols) - (b % cols));
    return Math.max(dr, dc);
  };

  const findViolation = (): [number, number] | null => {
    for (const list of byKind.values()) {
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          if (cheb(list[i], list[j]) < 2) return [list[i], list[j]];
        }
      }
    }
    return null;
  };

  for (let iter = 0; iter < 400; iter++) {
    const v = findViolation();
    if (!v) return; // всё разнесено
    const [va, vb] = v;
    const kindA = (board[va] as Tile).kind;

    // меняем одну из пары местами со случайной карточкой ДРУГОГО вида так,
    // чтобы обмен не создал новых «касаний»
    for (let tries = 0; tries < 60; tries++) {
      const q = occupied[(Math.random() * occupied.length) | 0];
      const t = board[q];
      if (!t || t.kind === kindA) continue;
      const p = Math.random() < 0.5 ? va : vb;
      const listA = byKind.get(kindA)!;
      const listB = byKind.get(t.kind)!;
      let ok = true;
      for (const x of listA) {
        if (x !== p && cheb(x, q) < 2) {
          ok = false;
          break;
        }
      }
      if (ok) {
        for (const x of listB) {
          if (x !== q && cheb(x, p) < 2) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;

      // обмен карточек p ↔ q
      const a = board[p] as Tile;
      board[p] = t;
      board[q] = a;
      listA[listA.indexOf(p)] = q;
      listB[listB.indexOf(q)] = p;
      break;
    }
  }
}

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

/** Пуста ли клетка padded-сетки (за пределами поля — всегда пусто) */
function isEmptyPadded(board: Cell[], rows: number, cols: number, r: number, c: number): boolean {
  if (r < 1 || r > rows || c < 1 || c > cols) return true;
  return board[(r - 1) * cols + (c - 1)] === null;
}

const DIRS: Array<[number, number]> = [
  [-1, 0], // 0: up
  [1, 0], // 1: down
  [0, -1], // 2: left
  [0, 1], // 3: right
];

/**
 * Поиск пути между двумя плитками: BFS по состояниям (r, c, направление),
 * стоимость — число поворотов; максимум 2 поворота (3 отрезка).
 * a и b — координаты в padded-сетке (реальные клетки поля).
 * Возвращает список точек поворотов (включая концы) или null.
 */
export function findPath(
  board: Cell[],
  rows: number,
  cols: number,
  a: Point,
  b: Point
): Path | null {
  if (a.r === b.r && a.c === b.c) return null;
  if (!board[(a.r - 1) * cols + (a.c - 1)] || !board[(b.r - 1) * cols + (b.c - 1)]) return null;

  const H = rows + 2;
  const W = cols + 2;
  // turns[r][c][d] — минимальное число поворотов, чтобы прийти в (r,c) двигаясь в направлении d
  const turns: number[][][] = Array.from({ length: H }, () =>
    Array.from({ length: W }, () => [Infinity, Infinity, Infinity, Infinity] as number[])
  );
  const parent: Array<Array<Array<{ r: number; c: number; d: number } | null>>> = Array.from(
    { length: H },
    () =>
      Array.from({ length: W }, () => [null, null, null, null] as Array<
        { r: number; c: number; d: number } | null
      >)
  );

  type State = { r: number; c: number; d: number; t: number };
  const queue: State[] = [];

  // старт: из a во всех 4 направлениях, 0 поворотов
  for (let d = 0; d < 4; d++) {
    const nr = a.r + DIRS[d][0];
    const nc = a.c + DIRS[d][1];
    if (!insidePadded(nr, nc, rows, cols)) continue;
    const isTarget = nr === b.r && nc === b.c;
    if (isTarget || isEmptyPadded(board, rows, cols, nr, nc)) {
      if (turns[nr][nc][d] > 0) {
        turns[nr][nc][d] = 0;
        parent[nr][nc][d] = { r: a.r, c: a.c, d: -1 };
        queue.push({ r: nr, c: nc, d, t: 0 });
      }
    }
  }

  let found: { r: number; c: number; d: number } | null = null;

  let qi = 0;
  while (qi < queue.length) {
    const st = queue[qi++];
    const { r, c, d, t } = st;
    if (r === b.r && c === b.c) {
      found = { r, c, d };
      break;
    }
    for (let nd = 0; nd < 4; nd++) {
      const nt = nd === d ? t : t + 1;
      if (nt > 2) continue;
      const nr = r + DIRS[nd][0];
      const nc = c + DIRS[nd][1];
      if (!insidePadded(nr, nc, rows, cols)) continue;
      const isTarget = nr === b.r && nc === b.c;
      if (!isTarget && !isEmptyPadded(board, rows, cols, nr, nc)) continue;
      if (turns[nr][nc][nd] > nt) {
        turns[nr][nc][nd] = nt;
        parent[nr][nc][nd] = { r, c, d };
        queue.push({ r: nr, c: nc, d: nd, t: nt });
      }
    }
  }

  if (!found) return null;

  // восстановить цепочку клеток от b к a
  const cells: Point[] = [];
  let cur: { r: number; c: number; d: number } | null = found;
  while (cur) {
    cells.push({ r: cur.r, c: cur.c });
    const p = parent[cur.r][cur.c][cur.d];
    if (!p) break;
    if (p.d === -1) {
      cells.push({ r: p.r, c: p.c });
      break;
    }
    cur = { r: p.r, c: p.c, d: p.d };
  }
  cells.reverse();
  if (cells[0].r !== a.r || cells[0].c !== a.c) cells.unshift({ r: a.r, c: a.c });

  return compressPath(cells);
}

function insidePadded(r: number, c: number, rows: number, cols: number): boolean {
  return r >= 0 && r <= rows + 1 && c >= 0 && c <= cols + 1;
}

function compressPath(cells: Point[]): Path {
  if (cells.length <= 2) return cells;
  const out: Point[] = [cells[0]];
  for (let i = 1; i < cells.length - 1; i++) {
    const prev = cells[i - 1];
    const cur = cells[i];
    const next = cells[i + 1];
    const straight =
      (prev.r === cur.r && cur.r === next.r) || (prev.c === cur.c && cur.c === next.c);
    if (!straight) out.push(cur);
  }
  out.push(cells[cells.length - 1]);
  return out;
}

/**
 * Найти любую соединимую пару на поле.
 * Возвращает координаты двух плиток (padded) или null.
 */
export function findAnyMatch(board: Cell[], rows: number, cols: number): [Point, Point] | null {
  const byKind = new Map<number, Point[]>();
  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= cols; c++) {
      const t = board[(r - 1) * cols + (c - 1)];
      if (!t) continue;
      let list = byKind.get(t.kind);
      if (!list) {
        list = [];
        byKind.set(t.kind, list);
      }
      list.push({ r, c });
    }
  }
  for (const list of byKind.values()) {
    if (list.length < 2) continue;
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (findPath(board, rows, cols, list[i], list[j])) {
          return [list[i], list[j]];
        }
      }
    }
  }
  return null;
}

/**
 * ГРАВИТАЦИЯ (как в классическом Pao Pao): после уборки пары оставшиеся
 * камни «падают» — как будто выбиваешь камень, и верхние камни падают
 * вниз на его место. ПЛАН: полосы столбцов, каждая — в свою сторону
 * (вниз/вверх — уплотнение по столбцам полосы, влево/вправо — по рядам
 * в пределах полосы). Состав поля сохраняется.
 * Возвращает НОВЫЙ массив (пустой план — исходный без изменений).
 */
export function applyGravity(
  board: Cell[],
  rows: number,
  cols: number,
  plan: GravityPlan
): Cell[] {
  const bands = plan.bands.filter((d) => d !== 'none');
  if (bands.length === 0) return board;
  if (bands.length === 1) return applyGravityDir(board, rows, cols, bands[0]);

  const nb: Cell[] = new Array(board.length).fill(null);
  const bounds = bandBounds(cols, bands.length);
  bands.forEach((dir, b) => {
    const [c0, c1] = bounds[b];
    if (dir === 'down' || dir === 'up') {
      for (let c = c0; c <= c1; c++) {
        const stack: Cell[] = [];
        for (let r = 0; r < rows; r++) {
          const t = board[r * cols + c];
          if (t) stack.push(t);
        }
        for (let i = 0; i < stack.length; i++) {
          const r = dir === 'down' ? rows - stack.length + i : i;
          nb[r * cols + c] = stack[i];
        }
      }
    } else {
      for (let r = 0; r < rows; r++) {
        const stack: Cell[] = [];
        for (let c = c0; c <= c1; c++) {
          const t = board[r * cols + c];
          if (t) stack.push(t);
        }
        /* c1 — ВКЛЮЧИТЕЛЬНАЯ граница полосы: при N плитках они занимают
           последние N клеток полосы, т.е. c1+1-N .. c1 */
        for (let i = 0; i < stack.length; i++) {
          const c = dir === 'right' ? c1 + 1 - stack.length + i : c0 + i;
          nb[r * cols + c] = stack[i];
        }
      }
    }
  });
  return nb;
}

/** Простой случай: вся доска едет в одну сторону */
function applyGravityDir(board: Cell[], rows: number, cols: number, dir: GravityDir): Cell[] {
  const nb: Cell[] = new Array(board.length).fill(null);
  if (dir === 'down' || dir === 'up') {
    for (let c = 0; c < cols; c++) {
      const stack: Cell[] = [];
      for (let r = 0; r < rows; r++) {
        const t = board[r * cols + c];
        if (t) stack.push(t);
      }
      for (let i = 0; i < stack.length; i++) {
        const r = dir === 'down' ? rows - stack.length + i : i;
        nb[r * cols + c] = stack[i];
      }
    }
  } else {
    for (let r = 0; r < rows; r++) {
      const stack: Cell[] = [];
      for (let c = 0; c < cols; c++) {
        const t = board[r * cols + c];
        if (t) stack.push(t);
      }
      for (let i = 0; i < stack.length; i++) {
        const c = dir === 'right' ? cols - stack.length + i : i;
        nb[r * cols + c] = stack[i];
      }
    }
  }
  return nb;
}

/**
 * Перемешать оставшиеся карточки (набор занятых клеток сохраняется)
 * и снова разнести одинаковые. Гарантирует наличие хода.
 * Возвращает НОВЫЙ массив.
 */
export function shuffleBoard(board: Cell[], rows: number, cols: number): Cell[] {
  const tiles: Tile[] = [];
  const positions: number[] = [];
  for (let i = 0; i < board.length; i++) {
    if (board[i]) {
      tiles.push(board[i] as Tile);
      positions.push(i);
    }
  }
  for (let attempt = 0; attempt < 200; attempt++) {
    shuffleInPlace(tiles);
    const nb: Cell[] = board.slice();
    positions.forEach((pos, idx) => {
      nb[pos] = tiles[idx];
    });
    scatterSameKinds(nb, rows, cols);
    if (findAnyMatch(nb, rows, cols)) return nb;
  }
  // крайне маловероятный фолбэк — вернуть как есть
  return board.slice();
}

/** Индекс клетки (padded r,c) в плоском массиве */
export function cellIndex(r: number, c: number, cols: number): number {
  return (r - 1) * cols + (c - 1);
}
