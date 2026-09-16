'use client';

/**
 * Режим «для самых маленьких» (тыкай пары):
 *  - времени НЕТ, проиграть нельзя;
 *  - ВСЕ картинки открыты — ничего не переворачивается и не прячется;
 *  - не нужно соединять линиями: просто тыкай две одинаковые;
 *  - карточки ОГРОМНЫЕ (пар мало: 3 → 6, растут каждые 3 уровня);
 *  - уровни бесконечные и лёгкие: закончил — салют, «Молодец!» —
 *    следующий уровень стартует САМ, без кнопок и подтверждений.
 *
 * Механика выбора — «добрая» к малышу (как просили родители):
 *  - повторный тык по той же карточке НЕ снимает выделение;
 *  - тыкнул другую (не пару) — обе мигают красным, но ВТОРАЯ
 *    остаётся выделенной: ребёнку не нужно тыкать заново.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconPause } from './GameIcons';
import { pickKinds, themeForLevel, type KindSkin, type LevelTheme } from '@/lib/onet/engine';
import { createMemoryDeck, memoryGridForCards, toddlerPairsForLevel } from '@/lib/onet/memory';
import { sound } from '@/lib/onet/sound';
import type { Lang, UIStrings } from '@/lib/onet/i18n';

export interface ToddlerGameProps {
  level: number;
  t: UIStrings;
  lang: Lang;
  soundOn: boolean;
  /** игра на паузе (модалки родителя) */
  paused: boolean;
  /** уровень пройден: салют уже показали, стартуем следующий */
  onNext: (finishedLevel: number) => void;
  onPause: () => void;
}

interface Pop {
  key: number;
  left: number;
  top: number;
  name: string;
  img?: string;
}

/** Картинка всплывающей подписи: если не загрузилась — просто прячем */
function PopImg({ src }: { src?: string }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return null;
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="tile-name-pop-img"
      onError={() => setFailed(true)}
    />
  );
}

/** Замер игровой области (под неё считается размер карточек) */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** зазор между карточками, px */
const GAP = 10;
/** сколько секунд пара открыта, прежде чем улететь */
const MATCH_REVEAL_MS = 750;
/** сколько держим красный «не пара» */
const WRONG_MS = 650;
/** салют после уровня: показываем, потом следующий уровень сам */
const FIREWORKS_MS = 2400;

/** Салют: три залпа цветных искр по всему экрану + «Молодец!» */
function Fireworks({ label }: { label: string }) {
  /* искры генерируем один раз на монтировании (не на каждый ререндер) */
  const bursts = useMemo(
    () =>
      Array.from({ length: 3 }, (_, b) => ({
        left: 22 + b * 28 + Math.random() * 8,
        top: 24 + Math.random() * 20,
        delay: b * 0.33,
        sparks: Array.from({ length: 14 }, () => ({
          angle: Math.random() * 360,
          dist: 60 + Math.random() * 90,
          color: ['#fbbf24', '#34d399', '#38bdf8', '#f472b6', '#a78bfa', '#fb923c'][
            Math.floor(Math.random() * 6)
          ],
          size: 7 + Math.random() * 7,
        })),
      })),
    []
  );
  return (
    <div className="toddler-fireworks" aria-live="polite">
      {bursts.map((b, i) => (
        <div
          key={i}
          className="fw-burst"
          style={{ left: `${b.left}%`, top: `${b.top}%`, animationDelay: `${b.delay}s` }}
        >
          {b.sparks.map((s, j) => (
            <span
              key={j}
              className="fw-spark"
              style={
                {
                  background: s.color,
                  width: s.size,
                  height: s.size,
                  '--fw-x': `${Math.cos((s.angle * Math.PI) / 180) * s.dist}px`,
                  '--fw-y': `${Math.sin((s.angle * Math.PI) / 180) * s.dist}px`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      ))}
      <div className="fw-text">{label}</div>
    </div>
  );
}

export default function ToddlerGame({
  level,
  t,
  lang,
  soundOn,
  paused,
  onNext,
  onPause,
}: ToddlerGameProps) {
  const theme: LevelTheme = themeForLevel(level);
  const pairs = useMemo(() => toddlerPairsForLevel(level), [level]);
  const kinds: KindSkin[] = useMemo(
    () =>
      pickKinds(Math.max(2, pairs), {
        kids: true,
        cats: theme === 'mixed' ? undefined : [theme === 'animals' ? 'animal' : 'plant'],
      }),
    [pairs, theme]
  );
  const deck = useMemo(() => createMemoryDeck(pairs, kinds.length), [pairs, kinds.length]);

  const [areaRef, { w, h }] = useElementSize<HTMLDivElement>();
  const areaAspect = w > 60 && h > 60 ? w / h : 1.4;
  /* сетка ТОЧНО под колоду: rows × cols = deck.length, без пустых мест */
  const grid = useMemo(() => memoryGridForCards(deck.length, areaAspect), [deck.length, areaAspect]);

  /* квадратные огромные карточки */
  const ready = w > 60 && h > 60;
  const card = ready
    ? Math.floor(
        Math.min((w - (grid.cols - 1) * GAP) / grid.cols, (h - (grid.rows - 1) * GAP) / grid.rows)
      )
    : 0;
  const boxW = card > 0 ? grid.cols * card + (grid.cols - 1) * GAP : 0;
  const boxH = card > 0 ? grid.rows * card + (grid.rows - 1) * GAP : 0;
  const pitch = card + GAP;

  /* выделенная карточка (id) — «первая» из пары */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  /* красная пара (два id) на WRONG_MS */
  const [wrongIds, setWrongIds] = useState<number[]>([]);
  /* найденные id */
  const [matched, setMatched] = useState<number[]>([]);
  /* всплывающие названия «кто это» */
  const [pops, setPops] = useState<Pop[]>([]);
  /* салют: уровень собран */
  const [celebrating, setCelebrating] = useState(false);
  const nextCalledRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  useEffect(
    () => () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  const pushPop = useCallback(
    (cardIdx: number, skin: KindSkin) => {
      if (card <= 0) return;
      const pop: Pop = {
        key: Date.now() + cardIdx,
        left: (cardIdx % grid.cols) * pitch + card / 2,
        top: Math.floor(cardIdx / grid.cols) * pitch + 4,
        name: lang === 'en' ? skin.en : skin.ru,
        img: skin.img,
      };
      setPops((p) => [...p, pop]);
      const id = window.setTimeout(() => {
        setPops((p) => p.filter((x) => x.key !== pop.key));
      }, 2600);
      timersRef.current.push(id);
    },
    [card, grid.cols, pitch, lang]
  );

  const handleClick = useCallback(
    (idx: number) => {
      if (paused || celebrating || nextCalledRef.current) return;
      const cardData = deck[idx];
      if (matched.includes(cardData.id)) return;

      /* повторный тык в ту же карточку: выделение НЕ снимаем —
         малыш уже выбрал, пусть выбор остаётся */
      if (cardData.id === selectedId) {
        sound.play('select');
        return;
      }

      if (selectedId === null) {
        setSelectedId(cardData.id);
        sound.play('select');
        return;
      }

      const first = deck.find((c) => c.id === selectedId);
      if (!first) {
        setSelectedId(cardData.id);
        return;
      }

      if (first.kind === cardData.kind) {
        /* ПАРА: карточки и так открыты → взрыв + название «кто это» */
        const newMatched = [...matched, first.id, cardData.id];
        setMatched(newMatched);
        setSelectedId(null);
        setWrongIds([]);
        sound.play('match');
        pushPop(idx, kinds[cardData.kind]);

        if (newMatched.length === deck.length) {
          /* уровень собран: салют → следующий уровень САМ (все карточки
             уже matched — клики по ним игнорируются, лок не нужен) */
          const id = window.setTimeout(() => {
            setCelebrating(true);
            sound.play('win');
            const id2 = window.setTimeout(() => {
              nextCalledRef.current = true;
              onNext(level);
            }, FIREWORKS_MS);
            timersRef.current.push(id2);
          }, MATCH_REVEAL_MS);
          timersRef.current.push(id);
        }
      } else {
        /* НЕ пара: обе на миг краснеют, а ВТОРАЯ СРАЗУ становится
           выбранной — тыкать заново не нужно; красное — просто миг */
        setWrongIds([first.id, cardData.id]);
        setSelectedId(cardData.id);
        sound.play('wrong');
        const id = window.setTimeout(() => setWrongIds([]), WRONG_MS);
        timersRef.current.push(id);
      }
    },
    [paused, celebrating, deck, matched, selectedId, kinds, pushPop, level, onNext]
  );

  return (
    <div className="flex h-full select-none flex-col">
      {/* Шапка: только уровень, звук и пауза — ничего лишнего */}
      <header className="px-2 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          {/* Пауза — СЛЕВА и «обычная» (фидбек v1.7.0) — как в классике */}
          <button
            type="button"
            onClick={onPause}
            aria-label={t.pause}
            className="game-action-btn game-action-btn--sm game-action-btn--plain"
          >
            <IconPause className="h-5 w-5" aria-hidden="true" />
          </button>
          <span
            className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-sm font-black text-teal-900 shadow-sm"
            title={t.themeLabel(theme)}
          >
            {t.level(level)} · {t.themeLabel(theme)}
          </span>
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-teal-900/80">
            {t.pairsLeft((deck.length - matched.length) / 2)}
          </span>
          <div className="min-w-0 flex-1" />
          {/* Звук — только в настройках (фидбек v1.6.0): кнопки звука
              на уровнях больше нет */}
        </div>
      </header>

      {/* Поле: огромные открытые карточки */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        <div
          ref={areaRef}
          className="flex h-full w-full items-center justify-center"
          role="grid"
          aria-label={t.toddlerTitle}
        >
          {card > 0 && (
            <div className="relative" style={{ width: boxW, height: boxH }}>
              <div
                className="mem-grid"
                style={{
                  gridTemplateColumns: `repeat(${grid.cols}, ${card}px)`,
                  gridTemplateRows: `repeat(${grid.rows}, ${card}px)`,
                  gap: `${GAP}px`,
                }}
              >
                {deck.map((cardData, idx) => {
                  const isMatched = matched.includes(cardData.id);
                  const isSel = selectedId === cardData.id;
                  const isWrong = wrongIds.includes(cardData.id);
                  const skin = kinds[cardData.kind];
                  return (
                    <button
                      key={cardData.id}
                      type="button"
                      onClick={() => handleClick(idx)}
                      aria-label={skin?.ru ?? ''}
                      className={
                        'toddler-card' +
                        (isSel ? ' toddler-card--sel' : '') +
                        (isWrong ? ' toddler-card--wrong' : '') +
                        (isMatched ? ' toddler-card--matched' : '')
                      }
                      style={
                        { '--tile-bg': skin?.bg, '--tile-ring': skin?.ring } as React.CSSProperties
                      }
                    >
                      {skin?.img ? (
                        <img src={skin.img} alt="" draggable={false} loading="lazy" />
                      ) : (
                        <span>{skin?.e}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* всплывающие названия («кто это») */}
              {pops.map((p) => (
                <div key={p.key} className="tile-name-pop" style={{ left: p.left, top: p.top }}>
                  {p.img && <PopImg src={p.img} />}
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Салют: уровень собран — «Молодец!» и дальше сами */}
        {celebrating && <Fireworks label={t.toddlerYay} />}
      </main>
    </div>
  );
}
