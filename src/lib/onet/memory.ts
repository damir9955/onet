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

/** Режим «для самых маленьких» (тыкай пары): пар МАЛО и растут ОЧЕНЬ
 *  медленно — карточки всегда огромные. Уровней бесконечно, все лёгкие:
 *  1-й уровень — 3 пары, каждые 3 уровня +1 пара, потолок 6 пар (12
 *  карточек). Ничего не скрыто, времени нет — только тыкай пары. */
const TODDLER_PAIRS_START = 3;
const TODDLER_PAIRS_CAP = 6;
export function toddlerPairsForLevel(level: number): number {
  const lv = Math.max(1, Math.floor(level));
  const n = TODDLER_PAIRS_START + Math.floor((lv - 1) / 3);
  return Math.min(n, TODDLER_PAIRS_CAP);
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

/** Сетка memory под число карточек: ТОЧНО n клеток (rows × cols = n) —
 *  карточки идеально заполняют поле, без пустых мест в последней строке.
 *  Игра всегда в landscape (портретные телефоны разворачиваются CSS-ом),
 *  поэтому cols ≥ rows. areaAspect — пропорции области (w/h): из всех
 *  точных факторизаций выбираем ту, что даёт самые КРУПНЫЕ квадратные
 *  карточки (как в соединялке — фото не обрезаются). */
export function memoryGridForCards(
  cards: number,
  areaAspect = 1.4
): { rows: number; cols: number } {
  const n = Math.max(4, Math.ceil(cards / 2) * 2);
  const aspect = Number.isFinite(areaAspect) && areaAspect > 0.3 ? areaAspect : 1.4;
  let best = { rows: 2, cols: n / 2, score: -1 };
  for (let rows = 2; rows <= 8; rows++) {
    if (n % rows !== 0) continue; // только точное заполнение
    const cols = n / rows;
    if (cols < rows) continue; // шире, чем выше (landscape)
    if (cols > 14) continue;
    // размер квадратной карточки при высоте области = 1
    const size = Math.min(aspect / cols, 1 / rows);
    if (size > best.score) best = { rows, cols, score: size };
  }
  return { rows: best.rows, cols: best.cols };
}
