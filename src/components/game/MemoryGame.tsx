'use client';

/**
 * Детская игра «Найди одинаковые» (memory):
 * все фигуры показываются, потом отсчёт 5 секунд — и карточки
 * переворачиваются рубашкой вверх. Нажатие разворачивает карточку;
 * если вторая открытая — такая же, ОБЕ сначала показываются открытыми
 * (успеваешь увидеть пару и название), и только потом «взрываются».
 * Иначе первая возвращается рубашкой вверх.
 * Таймер считает время вверх — проиграть нельзя, сброса уровней нет.
 *
 * Карточки КВАДРАТНЫЕ — как в «соединялке»: фото зверей не обрезается,
 * рубашка не срезается. Сетка подбирается под число карточек ТОЧНО
 * (rows × cols = кол-во карточек): поле заполнено без пустых мест.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconClock, IconPause, IconSkip, IconSoundOff, IconSoundOn, IconStar } from './GameIcons';
import {
  pickKinds,
  themeForLevel,
  type KindSkin,
  type LevelTheme,
} from '@/lib/onet/engine';
import {
  MEMORY_PREVIEW_SEC,
  createMemoryDeck,
  memoryGridForCards,
  memoryPairsForLevel,
} from '@/lib/onet/memory';
import { sound } from '@/lib/onet/sound';
import type { Lang, UIStrings } from '@/lib/onet/i18n';

export interface MemoryGameProps {
  level: number;
  harder: boolean;
  t: UIStrings;
  lang: Lang;
  soundOn: boolean;
  /** игра на паузе (модалки родителя) */
  paused: boolean;
  /** идёт реклама — клики и таймер стоят */
  adBusy: boolean;
  onWin: (score: number, seconds: number) => void;
  onPause: () => void;
  onExit: () => void;
  onSkip: () => void;
  onToggleSound: () => void;
}

interface Pop {
  key: number;
  /** позиция центра карточки, px внутри сетки */
  left: number;
  top: number;
  name: string;
  img?: string;
}

/** Картинка всплывающей подписи: если не загрузилась — просто прячем */
function PopImg({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
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

/** Замер игровой области (под неё считается размер квадратных карточек) */
function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        setSize({ w: e.contentRect.width, h: e.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

/** сколько секунд пара открыта, прежде чем улететь */
const MATCH_REVEAL_MS = 900;
/** зазор между карточками, px */
const GAP = 8;

export default function MemoryGame({
  level,
  harder,
  t,
  lang,
  soundOn,
  paused,
  adBusy,
  onWin,
  onPause,
  onExit,
  onSkip,
  onToggleSound,
}: MemoryGameProps) {
  const theme: LevelTheme = themeForLevel(level);
  const pairs = useMemo(() => memoryPairsForLevel(level, harder), [level, harder]);
  const kinds: KindSkin[] = useMemo(
    () =>
      pickKinds(Math.max(4, Math.min(pairs, 8)), {
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

  /* квадратные карточки, как в соединялке: размер = min(по ширине, по высоте) */
  const ready = w > 60 && h > 60;
  const card = ready
    ? Math.floor(
        Math.min(
          (w - (grid.cols - 1) * GAP) / grid.cols,
          (h - (grid.rows - 1) * GAP) / grid.rows
        )
      )
    : 0;
  const boxW = card > 0 ? grid.cols * card + (grid.cols - 1) * GAP : 0;
  const boxH = card > 0 ? grid.rows * card + (grid.rows - 1) * GAP : 0;
  const pitch = card + GAP;

  const [previewLeft, setPreviewLeft] = useState(MEMORY_PREVIEW_SEC);
  const [flipped, setFlipped] = useState<number[]>([]);
  const [matched, setMatched] = useState<number[]>([]);
  const [lock, setLock] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [pops, setPops] = useState<Pop[]>([]);
  const winCalledRef = useRef(false);
  const timersRef = useRef<number[]>([]);

  const inPreview = previewLeft > 0;
  const blocked = paused || adBusy || lock || inPreview;

  /* предпросмотр: все карточки открыты, отсчёт 5 секунд */
  useEffect(() => {
    if (previewLeft <= 0) return;
    const id = window.setTimeout(() => {
      setPreviewLeft((n) => n - 1);
      if (previewLeft > 1) sound.play('tick');
    }, 1000);
    timersRef.current.push(id);
    return () => window.clearTimeout(id);
  }, [previewLeft]);

  /* таймер времени (вверх), пауза/реклама останавливают */
  useEffect(() => {
    if (inPreview || paused || adBusy) return;
    const id = window.setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => window.clearInterval(id);
  }, [inPreview, paused, adBusy]);

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
      /* подпись держится подольше — успеть прочитать */
      const id = window.setTimeout(() => {
        setPops((p) => p.filter((x) => x.key !== pop.key));
      }, 2600);
      timersRef.current.push(id);
    },
    [card, grid.cols, pitch, lang]
  );

  const handleClick = useCallback(
    (idx: number) => {
      if (blocked || winCalledRef.current) return;
      const cardData = deck[idx];
      if (matched.includes(cardData.id) || flipped.includes(cardData.id)) return;

      if (flipped.length === 0) {
        setFlipped([cardData.id]);
        sound.play('select');
        return;
      }
      if (flipped.length >= 2) return;

      const firstId = flipped[0];
      const first = deck.find((c) => c.id === firstId);
      if (!first) return;

      if (first.kind === cardData.kind) {
        /* ПАРА: обе карточки СНАЧАЛА открываются… */
        setFlipped([firstId, cardData.id]);
        setLock(true);
        sound.play('select');
        pushPop(idx, kinds[cardData.kind]);

        const id = window.setTimeout(() => {
          /* …и только потом улетают (взрыв + очки) */
          const newCombo = combo + 1;
          const gained = 10 + Math.min(newCombo - 1, 4) * 5;
          const newMatched = [...matched, firstId, cardData.id];
          setMatched(newMatched);
          setFlipped([]);
          setLock(false);
          setCombo(newCombo);
          setScore((s) => s + gained);
          sound.play(newCombo >= 3 ? 'combo' : 'match');

          if (newMatched.length === deck.length) {
            winCalledRef.current = true;
            const winId = window.setTimeout(() => onWin(score + gained, elapsed), 900);
            timersRef.current.push(winId);
          }
        }, MATCH_REVEAL_MS);
        timersRef.current.push(id);
      } else {
        /* разные: обе открыты, потом первая возвращается рубашкой вверх */
        setFlipped([firstId, cardData.id]);
        setLock(true);
        setCombo(0);
        sound.play('wrong');
        const id = window.setTimeout(() => {
          setFlipped([]);
          setLock(false);
        }, 800);
        timersRef.current.push(id);
      }
    },
    [blocked, deck, matched, flipped, combo, kinds, onWin, pushPop, score, elapsed, winCalledRef]
  );

  /* Dev-only хук для e2e (в прод не попадает): индексы пары одного вида */
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    const w = window as unknown as Record<string, unknown>;
    w.__memoryMatch = (): [number, number] | null => {
      const byKind = new Map<number, number[]>();
      deck.forEach((c, i) => {
        if (matched.includes(c.id)) return;
        const list = byKind.get(c.kind) ?? [];
        list.push(i);
        byKind.set(c.kind, list);
      });
      for (const list of byKind.values()) {
        if (list.length >= 2) return [list[0], list[1]];
      }
      return null;
    };
  }, [deck, matched]);

  const faceUp = (idx: number): boolean => {
    const id = deck[idx].id;
    return inPreview || flipped.includes(id) || matched.includes(id);
  };

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;

  return (
    <div className="flex h-full select-none flex-col">
      {/* Шапка: уровень + тема, пары, время, очки, пропуск, звук, пауза */}
      <header className="px-2 pt-[max(0.375rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <span
            className="shrink-0 rounded-full bg-white/80 px-3 py-1 text-sm font-black text-teal-900 shadow-sm"
            title={t.themeLabel(theme)}
          >
            {t.level(level)} · {t.themeLabel(theme)}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-sm font-black tabular-nums text-teal-900">
            <IconStar className="h-4.5 w-4.5" aria-hidden="true" /> {score}
          </span>
          <span className="shrink-0 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold text-teal-900/80">
            {t.pairsLeft((deck.length - matched.length) / 2)}
          </span>
          <span
            className={
              'flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ' +
              (inPreview
                ? 'mem-count--preview'
                : 'bg-white/70 text-teal-900/80')
            }
            aria-live={inPreview ? 'polite' : undefined}
          >
            <IconClock className="h-4 w-4" aria-hidden="true" />
            {inPreview ? previewLeft : `${minutes}:${String(seconds).padStart(2, '0')}`}
          </span>
          <div className="min-w-0 flex-1" />
          <button
            type="button"
            onClick={onSkip}
            disabled={adBusy || paused}
            aria-label={t.skipLevel}
            title={t.skipLevel}
            className="game-action-btn game-action-btn--sm game-action-btn--hint"
          >
            <IconSkip className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            aria-label={soundOn ? t.soundOn : t.soundOff}
            className="game-action-btn game-action-btn--sm game-action-btn--sound"
          >
            {soundOn ? <IconSoundOn className="h-6 w-6" /> : <IconSoundOff className="h-6 w-6" />}
          </button>
          <button
            type="button"
            onClick={onPause}
            disabled={adBusy}
            aria-label={t.pause}
            className="game-action-btn game-action-btn--sm game-action-btn--pause"
          >
            <IconPause className="h-6 w-6" />
          </button>
        </div>
      </header>

      {/* Поле memory: квадратные карточки, сетка точно под колоду */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        <div
          ref={areaRef}
          className="flex h-full w-full items-center justify-center"
          role="grid"
          aria-label={t.memoryTitle}
        >
          {card > 20 && (
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
                  const up = faceUp(idx);
                  const isMatched = matched.includes(cardData.id);
                  const skin = kinds[cardData.kind];
                  return (
                    <button
                      key={cardData.id}
                      type="button"
                      onClick={() => handleClick(idx)}
                      aria-label={up ? skin?.ru ?? '' : 'Карточка'}
                      className={
                        'mem-card' + (up ? ' mem-card--up' : '') + (isMatched ? ' mem-card--matched' : '')
                      }
                    >
                      <div className="mem-card-inner">
                        {/* рубашка — красивая детская картинка (отдельный ассет) */}
                        <div className="mem-face mem-back">
                          <img src="/tiles/card-back.webp" alt="" draggable={false} />
                        </div>
                        {/* лицо: реалистичная картинка */}
                        <div
                          className="mem-face mem-front"
                          style={
                            { '--tile-bg': skin?.bg, '--tile-ring': skin?.ring } as React.CSSProperties
                          }
                        >
                          {skin?.img ? (
                            <img src={skin.img} alt="" draggable={false} loading="lazy" />
                          ) : (
                            <span>{skin?.e}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* всплывающие названия («кто это») — крупно и подолгу */}
              {pops.map((p) => (
                <div key={p.key} className="tile-name-pop" style={{ left: p.left, top: p.top }}>
                  {p.img && <PopImg src={p.img} />}
                  <span>{p.name}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
