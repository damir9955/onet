/**
 * Каталог видов для тайлов (эмодзи → реалистичная картинка из /public/tiles).
 * 90 видов: 53 животных + 37 «растительных» (фрукты, овощи, цветы и пара
 * сладостей для классики — в детском режиме они не встречаются).
 *
 * Механика «похожих семейств» из классического Pao Pao сохранена: виды
 * сгруппированы в ЦВЕТОВЫЕ СЕМЕЙСТВА — у всего семейства один пастельный
 * фон (hsl-оттенок семейства), похожие по цвету карточки легко перепутать.
 *
 * Детский режим: у вида есть категория (animal | plant) и название
 * (ru/en) — оно показывается всплывающей подписью при нахождении пары.
 * Виды с kids:false в детском режиме не участвуют (леденец, хрустальный шар).
 */

export type KindCat = 'animal' | 'plant';

export interface KindDef {
  /** эмодзи-запасной вариант (и ключ вида) */
  e: string;
  /** имя файла картинки: /tiles/{name}.webp */
  name: string;
  cat: KindCat;
  /** название для детской подписи */
  ru: string;
  en: string;
  /** участвует ли в детском режиме (по умолчанию — да) */
  kids?: boolean;
}

interface FamilyDef {
  /** оттенок семейства (пастельный фон карточек) */
  h: number;
  /** насыщенность фона, % (по умолчанию 42) */
  s?: number;
  /** светлота фона, % (по умолчанию 84) */
  l?: number;
  kinds: KindDef[];
}

const FAMILIES: FamilyDef[] = [
  // h=0: красное
  {
    h: 0,
    kinds: [
      { e: '🍎', name: 'apple', cat: 'plant', ru: 'Яблоко', en: 'Apple' },
      { e: '🍓', name: 'strawberry', cat: 'plant', ru: 'Клубника', en: 'Strawberry' },
      { e: '🍒', name: 'cherry', cat: 'plant', ru: 'Вишня', en: 'Cherry' },
      { e: '🍅', name: 'tomato', cat: 'plant', ru: 'Помидор', en: 'Tomato' },
    ],
  },
  // h=25: оранжевое
  {
    h: 25,
    kinds: [
      { e: '🍊', name: 'orange', cat: 'plant', ru: 'Апельсин', en: 'Orange' },
      { e: '🥕', name: 'carrot', cat: 'plant', ru: 'Морковка', en: 'Carrot' },
      { e: '🍑', name: 'peach', cat: 'plant', ru: 'Персик', en: 'Peach' },
      { e: '🎃', name: 'pumpkin', cat: 'plant', ru: 'Тыква', en: 'Pumpkin' },
    ],
  },
  // h=50: жёлтое
  {
    h: 50,
    kinds: [
      { e: '🍋', name: 'lemon', cat: 'plant', ru: 'Лимон', en: 'Lemon' },
      { e: '🌻', name: 'sunflower', cat: 'plant', ru: 'Подсолнух', en: 'Sunflower' },
      { e: '🌼', name: 'daisy', cat: 'plant', ru: 'Ромашка', en: 'Daisy' },
      { e: '🍌', name: 'banana', cat: 'plant', ru: 'Банан', en: 'Banana' },
    ],
  },
  // h=100: зелёное
  {
    h: 100,
    kinds: [
      { e: '🍐', name: 'pear', cat: 'plant', ru: 'Груша', en: 'Pear' },
      { e: '🥝', name: 'kiwi', cat: 'plant', ru: 'Киви', en: 'Kiwi' },
      { e: '🥑', name: 'avocado', cat: 'plant', ru: 'Авокадо', en: 'Avocado' },
      { e: '🍀', name: 'clover', cat: 'plant', ru: 'Клевер', en: 'Clover' },
    ],
  },
  // h=150: бирюзовое (огородное)
  {
    h: 150,
    kinds: [
      { e: '🥒', name: 'cucumber', cat: 'plant', ru: 'Огурец', en: 'Cucumber' },
      { e: '🌵', name: 'cactus', cat: 'plant', ru: 'Кактус', en: 'Cactus' },
      { e: '🥬', name: 'lettuce', cat: 'plant', ru: 'Салат', en: 'Lettuce' },
    ],
  },
  // h=190: голубое (море)
  {
    h: 190,
    kinds: [
      { e: '🐬', name: 'dolphin', cat: 'animal', ru: 'Дельфин', en: 'Dolphin' },
      { e: '🦋', name: 'butterfly', cat: 'animal', ru: 'Бабочка', en: 'Butterfly' },
      { e: '🐳', name: 'whale', cat: 'animal', ru: 'Кит', en: 'Whale' },
      { e: '🐟', name: 'fish', cat: 'animal', ru: 'Рыбка', en: 'Fish' },
    ],
  },
  // h=280: фиолетовое
  {
    h: 280,
    kinds: [
      { e: '🍇', name: 'grapes', cat: 'plant', ru: 'Виноград', en: 'Grapes' },
      { e: '🍆', name: 'eggplant', cat: 'plant', ru: 'Баклажан', en: 'Eggplant' },
      { e: '🦑', name: 'squid', cat: 'animal', ru: 'Кальмар', en: 'Squid' },
      { e: '🔮', name: 'crystalball', cat: 'plant', ru: 'Хрустальный шар', en: 'Crystal ball', kids: false },
    ],
  },
  // h=330: розовое
  {
    h: 330,
    kinds: [
      { e: '🌸', name: 'blossom', cat: 'plant', ru: 'Цветок', en: 'Blossom' },
      { e: '🦩', name: 'flamingo', cat: 'animal', ru: 'Фламинго', en: 'Flamingo' },
      { e: '🍭', name: 'lollipop', cat: 'plant', ru: 'Леденец', en: 'Lollipop', kids: false },
      { e: '🦐', name: 'shrimp', cat: 'animal', ru: 'Креветка', en: 'Shrimp' },
    ],
  },
  // коричневое
  {
    h: 25,
    s: 16,
    l: 72,
    kinds: [
      { e: '🌰', name: 'chestnut', cat: 'plant', ru: 'Каштан', en: 'Chestnut' },
      { e: '🥔', name: 'potato', cat: 'plant', ru: 'Картошка', en: 'Potato' },
      { e: '🍄', name: 'mushroom', cat: 'plant', ru: 'Гриб', en: 'Mushroom' },
      { e: '🐻', name: 'bear', cat: 'animal', ru: 'Медведь', en: 'Bear' },
    ],
  },
  // h=345: красное-2 (ягодно-острое)
  {
    h: 345,
    s: 45,
    kinds: [
      { e: '🍉', name: 'watermelon', cat: 'plant', ru: 'Арбуз', en: 'Watermelon' },
      { e: '🌶️', name: 'chili', cat: 'plant', ru: 'Перчик чили', en: 'Chili pepper' },
    ],
  },
  // h=45: золотое тропическое
  {
    h: 45,
    kinds: [
      { e: '🍍', name: 'pineapple', cat: 'plant', ru: 'Ананас', en: 'Pineapple' },
      { e: '🥭', name: 'mango', cat: 'plant', ru: 'Манго', en: 'Mango' },
      { e: '🍈', name: 'melon', cat: 'plant', ru: 'Дыня', en: 'Melon' },
    ],
  },
  // h=120: фермерское
  {
    h: 120,
    kinds: [
      { e: '🌽', name: 'corn', cat: 'plant', ru: 'Кукуруза', en: 'Corn' },
      { e: '🫑', name: 'bellpepper', cat: 'plant', ru: 'Перчик', en: 'Bell pepper' },
      { e: '🥦', name: 'broccoli', cat: 'plant', ru: 'Брокколи', en: 'Broccoli' },
    ],
  },
  // h=70: луковое
  {
    h: 70,
    kinds: [
      { e: '🧅', name: 'onion', cat: 'plant', ru: 'Лук', en: 'Onion' },
      { e: '🧄', name: 'garlic', cat: 'plant', ru: 'Чеснок', en: 'Garlic' },
    ],
  },
  // h=28: золотые кошачьи
  {
    h: 28,
    kinds: [
      { e: '🦁', name: 'lion', cat: 'animal', ru: 'Лев', en: 'Lion' },
      { e: '🐯', name: 'tiger', cat: 'animal', ru: 'Тигр', en: 'Tiger' },
      { e: '🦊', name: 'fox', cat: 'animal', ru: 'Лиса', en: 'Fox' },
      { e: '🦌', name: 'deer', cat: 'animal', ru: 'Оленёнок', en: 'Deer' },
    ],
  },
  // h=35: сафари
  {
    h: 35,
    kinds: [
      { e: '🦒', name: 'giraffe', cat: 'animal', ru: 'Жираф', en: 'Giraffe' },
      { e: '🐪', name: 'camel', cat: 'animal', ru: 'Верблюд', en: 'Camel' },
      { e: '🐴', name: 'horse', cat: 'animal', ru: 'Лошадка', en: 'Horse' },
      { e: '🐮', name: 'cow', cat: 'animal', ru: 'Корова', en: 'Cow' },
    ],
  },
  // h=215: серые великаны
  {
    h: 215,
    s: 8,
    l: 80,
    kinds: [
      { e: '🐘', name: 'elephant', cat: 'animal', ru: 'Слон', en: 'Elephant' },
      { e: '🦏', name: 'rhino', cat: 'animal', ru: 'Носорог', en: 'Rhino' },
      { e: '🦛', name: 'hippo', cat: 'animal', ru: 'Бегемот', en: 'Hippo' },
      { e: '🐺', name: 'wolf', cat: 'animal', ru: 'Волк', en: 'Wolf' },
    ],
  },
  // h=30: коричневое-2
  {
    h: 30,
    s: 12,
    l: 74,
    kinds: [
      { e: '🐒', name: 'monkey', cat: 'animal', ru: 'Обезьянка', en: 'Monkey' },
      { e: '🐶', name: 'dog', cat: 'animal', ru: 'Собачка', en: 'Dog' },
      { e: '🦥', name: 'sloth', cat: 'animal', ru: 'Ленивец', en: 'Sloth' },
      { e: '🦇', name: 'bat', cat: 'animal', ru: 'Летучая мышь', en: 'Bat' },
    ],
  },
  // h=35: кремовое
  {
    h: 35,
    s: 8,
    l: 84,
    kinds: [
      { e: '🐰', name: 'rabbit', cat: 'animal', ru: 'Зайчик', en: 'Rabbit' },
      { e: '🐭', name: 'mouse', cat: 'animal', ru: 'Мышка', en: 'Mouse' },
      { e: '🐑', name: 'sheep', cat: 'animal', ru: 'Овечка', en: 'Sheep' },
      { e: '🦝', name: 'raccoon', cat: 'animal', ru: 'Енот', en: 'Raccoon' },
    ],
  },
  // h=40: бледное
  {
    h: 40,
    s: 6,
    l: 82,
    kinds: [
      { e: '🐼', name: 'panda', cat: 'animal', ru: 'Панда', en: 'Panda' },
      { e: '🐨', name: 'koala', cat: 'animal', ru: 'Коала', en: 'Koala' },
      { e: '🐷', name: 'pig', cat: 'animal', ru: 'Поросёнок', en: 'Piglet' },
      { e: '🦘', name: 'kangaroo', cat: 'animal', ru: 'Кенгуру', en: 'Kangaroo' },
    ],
  },
  // h=95: зелёные звери
  {
    h: 95,
    kinds: [
      { e: '🦜', name: 'parrot', cat: 'animal', ru: 'Попугай', en: 'Parrot' },
      { e: '🐸', name: 'frog', cat: 'animal', ru: 'Лягушка', en: 'Frog' },
      { e: '🦎', name: 'chameleon', cat: 'animal', ru: 'Хамелеон', en: 'Chameleon' },
      { e: '🐢', name: 'turtle', cat: 'animal', ru: 'Черепаха', en: 'Turtle' },
      { e: '🐊', name: 'crocodile', cat: 'animal', ru: 'Крокодил', en: 'Crocodile' },
    ],
  },
  // h=200: море-2
  {
    h: 200,
    s: 15,
    l: 84,
    kinds: [
      { e: '🦈', name: 'shark', cat: 'animal', ru: 'Акула', en: 'Shark' },
      { e: '🐙', name: 'octopus', cat: 'animal', ru: 'Осьминог', en: 'Octopus' },
      { e: '🦀', name: 'crab', cat: 'animal', ru: 'Краб', en: 'Crab' },
      { e: '🦭', name: 'seal', cat: 'animal', ru: 'Тюлень', en: 'Seal' },
    ],
  },
  // h=220: чёрно-белые птицы
  {
    h: 220,
    s: 10,
    l: 82,
    kinds: [
      { e: '🐧', name: 'penguin', cat: 'animal', ru: 'Пингвин', en: 'Penguin' },
      { e: '🦢', name: 'swan', cat: 'animal', ru: 'Лебедь', en: 'Swan' },
      { e: '🦉', name: 'owl', cat: 'animal', ru: 'Сова', en: 'Owl' },
    ],
  },
  // h=185: разноцветные птицы
  {
    h: 185,
    s: 18,
    l: 80,
    kinds: [
      { e: '🦆', name: 'duck', cat: 'animal', ru: 'Утка', en: 'Duck' },
      { e: '🦚', name: 'peacock', cat: 'animal', ru: 'Павлин', en: 'Peacock' },
      { e: '🐔', name: 'chicken', cat: 'animal', ru: 'Курочка', en: 'Hen' },
    ],
  },
  // h=90: жучки
  {
    h: 90,
    s: 20,
    l: 78,
    kinds: [
      { e: '🐝', name: 'bee', cat: 'animal', ru: 'Пчёлка', en: 'Bee' },
      { e: '🐞', name: 'ladybug', cat: 'animal', ru: 'Божья коровка', en: 'Ladybug' },
      { e: '🐌', name: 'snail', cat: 'animal', ru: 'Улитка', en: 'Snail' },
    ],
  },
  // h=30: тёмно-коричневое
  {
    h: 30,
    s: 16,
    l: 70,
    kinds: [
      { e: '🦅', name: 'eagle', cat: 'animal', ru: 'Орёл', en: 'Eagle' },
      { e: '🐿️', name: 'squirrel', cat: 'animal', ru: 'Белочка', en: 'Squirrel' },
      { e: '🦔', name: 'hedgehog', cat: 'animal', ru: 'Ёжик', en: 'Hedgehog' },
    ],
  },
];

/* ============ Скины и выбор видов для уровня ============ */

/** Внешний вид вида: картинка + фон карточки в тон + название */
export interface KindSkin {
  /** эмодзи (запасной вариант, ключ) */
  e: string;
  /** путь к реалистичной картинке (/tiles/xxx.webp) */
  img: string;
  /** фон карточки (CSS-цвет, в тон семейства) */
  bg: string;
  /** рамка карточки (CSS-цвет, чуть темнее фона) */
  ring: string;
  cat: KindCat;
  ru: string;
  en: string;
}

export const KINDS_TOTAL = FAMILIES.reduce((a, f) => a + f.kinds.length, 0);

/** Плоский список всех видов (для тестов каталога) */
export const ALL_KINDS: KindDef[] = FAMILIES.flatMap((f) => f.kinds);

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  }
  return arr;
}

export interface PickKindsOptions {
  /** только эти категории (для детского режима: зверя / фрукты-овощи) */
  cats?: readonly KindCat[];
  /** только виды, разрешённые в детском режиме */
  kids?: boolean;
}

/** Выбрать виды для уровня — ЦЕЛЫМИ семействами: на поле всегда несколько
 *  групп похожих по цвету карточек (как в классике, их легко перепутать).
 *  Возвращает «скины»: картинка + фон и рамка в тон + название. */
export function pickKinds(count: number, opts: PickKindsOptions = {}): KindSkin[] {
  const want = Math.max(2, Math.floor(count));
  const pool = FAMILIES.map((f) => {
    const s = f.s ?? 42;
    const l = f.l ?? 84;
    const kinds = f.kinds.filter((k) => {
      if (opts.kids && k.kids === false) return false;
      if (opts.cats && !opts.cats.includes(k.cat)) return false;
      return true;
    });
    return { f, s, l, kinds };
  }).filter((fam) => fam.kinds.length > 0);

  const famIdx = pool.map((_, i) => i);
  shuffleInPlace(famIdx);
  const skins: KindSkin[] = [];
  for (const fi of famIdx) {
    const fam = pool[fi];
    const kinds = fam.kinds.slice();
    shuffleInPlace(kinds);
    for (const k of kinds) {
      if (skins.length >= want) break;
      skins.push({
        e: k.e,
        img: `/tiles/${k.name}.webp`,
        bg: `hsl(${fam.f.h}, ${fam.s}%, ${fam.l}%)`,
        ring: `hsl(${fam.f.h}, ${Math.max(fam.s - 12, 12)}%, ${Math.max(fam.l - 18, 46)}%)`,
        cat: k.cat,
        ru: k.ru,
        en: k.en,
      });
    }
    if (skins.length >= want) break;
  }
  return skins;
}

/** Путь к картинке вида по имени файла (для меню и загрузки) */
export function kindImage(name: string): string {
  return `/tiles/${name}.webp`;
}
