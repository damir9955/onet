/**
 * Чистая логика детской игры «Найди одинаковые» (memory / мемори).
 * Все фигуры изначально показаны, потом отсчёт 5 секунд — и они
 * переворачиваются рубашкой вверх. Нажатие разворачивает плитку;
 * вторая такая же — обе «взрываются», другая картинка — первая
 * возвращается рубашкой вверх.
 * Не зависит от React / DOM — тестируется отдельно.
 */

/** Карточка памяти */
export interface MemoryCard {
  id: number;
  /** индекс вида в массиве скинов уровня */
  kind: number;
}

/** Сколько секунд показываются все фигуры перед переворотом */
export const MEMORY_PREVIEW_SEC = 5;

/** Пары для детского уровня memory: 4 → 10 (проще) / 12 (посложнее).
 *  Каждый 3-й уровень — передышка (−1 пара, но не меньше 4). */
const MEMORY_PAIRS_START = 4;
const MEMORY_PAIRS_CAP = { easier: 10, harder: 12 } as const;
export function memoryPairsForLevel(level: number, harder: boolean): number {
  const lv = Math.max(1, Math.floor(level));
  const cap = harder ? MEMORY_PAIRS_CAP.harder : MEMORY_PAIRS_CAP.easier;
  let n = MEMORY_PAIRS_START + Math.floor((lv - 1) / 2);
  n = Math.min(n, cap);
  if (lv % 3 === 0) n = Math.max(MEMORY_PAIRS_START, n - 1);
  return n;
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

let nextCardId = 1;

/** Собрать колоду memory: pairs пар, виды распределяются по количеству
 *  видов максимально равномерно (как в ONET-движке), карточки перемешаны. */
export function createMemoryDeck(pairs: number, kindsCount: number): MemoryCard[] {
  const kinds = Math.max(2, Math.min(kindsCount, pairs));
  const pairCounts: number[] = new Array(kinds).fill(0);
  for (let p = 0; p < pairs; p++) pairCounts[p % kinds]++;
  shuffleInPlace(pairCounts);
  const cards: MemoryCard[] = [];
  for (let kind = 0; kind < pairCounts.length; kind++) {
    for (let p = 0; p < pairCounts[kind]; p++) {
      cards.push({ id: nextCardId++, kind });
      cards.push({ id: nextCardId++, kind });
    }
  }
  return shuffleInPlace(cards);
}

/** Сетка memory под число карточек (landscape: поле шире, чем выше) */
export function memoryGridForCards(cards: number): { rows: number; cols: number } {
  const n = Math.max(4, Math.ceil(cards / 2) * 2);
  // подбираем cols/rows: клетки почти квадратные при landscape-пропорции ~1.4
  let best = { rows: 2, cols: Math.ceil(n / 2), score: Infinity };
  for (let rows = 2; rows <= 8; rows++) {
    const cols = Math.ceil(n / rows);
    if (cols > 12) continue;
    if (cols < rows) continue; // шире, чем выше
    if ((rows * cols - n) > Math.max(1, Math.ceil(n * 0.15))) continue;
    const score = rows * cols - n + Math.abs(cols - rows * 1.35) * 0.4;
    if (score < best.score) best = { rows, cols, score };
  }
  // крайние случаи: последняя строка может быть неполной
  return { rows: best.rows, cols: Math.ceil(n / best.rows) };
}
