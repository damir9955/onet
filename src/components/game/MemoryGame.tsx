'use client';

/**
 * Детская игра «Найди одинаковые» (memory):
 * все фигуры показываются, потом отсчёт 5 секунд — и карточки
 * переворачиваются рубашкой вверх. Нажатие разворачивает карточку;
 * если вторая открытая — такая же, обе «взрываются» (и появляется
 * название животного/фрукта), иначе первая возвращается рубашкой вверх.
 * Таймер считает время вверх — проиграть нельзя, сброса уровней нет.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IconClock, IconPause, IconSkip, IconSoundOff, IconSoundOn, IconStar } from './GameIcons';
import {
  kidsKindsForLevel,
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
  row: number;
  col: number;
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
  const grid = useMemo(() => memoryGridForCards(deck.length), [deck.length]);

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
      const pop: Pop = {
        key: Date.now() + cardIdx,
        row: Math.floor(cardIdx / grid.cols),
        col: cardIdx % grid.cols,
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
    [grid.cols, lang]
  );

  const handleClick = useCallback(
    (idx: number) => {
      if (blocked || winCalledRef.current) return;
      const card = deck[idx];
      if (matched.includes(card.id) || flipped.includes(card.id)) return;

      if (flipped.length === 0) {
        setFlipped([card.id]);
        sound.play('select');
        return;
      }
      if (flipped.length >= 2) return;

      const firstId = flipped[0];
      const first = deck.find((c) => c.id === firstId);
      if (!first) return;

      if (first.kind === card.kind) {
        /* ПАРА: обе взрываются + название */
        const newCombo = combo + 1;
        const gained = 10 + Math.min(newCombo - 1, 4) * 5;
        const newMatched = [...matched, firstId, card.id];
        setMatched(newMatched);
        setFlipped([]);
        setCombo(newCombo);
        setScore((s) => s + gained);
        sound.play(newCombo >= 3 ? 'combo' : 'match');
        pushPop(idx, kinds[card.kind]);

        if (newMatched.length === deck.length) {
          winCalledRef.current = true;
          const id = window.setTimeout(() => onWin(score + gained, elapsed), 900);
          timersRef.current.push(id);
        }
      } else {
        /* разные: первая возвращается рубашкой вверх */
        setFlipped([firstId, card.id]);
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
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/70 px-2.5 py-1 text-xs font-bold tabular-nums text-teal-900/80">
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

      {/* Поле memory */}
      <main className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        <div
          className="relative flex h-full w-full items-center justify-center"
          role="grid"
          aria-label={t.memoryTitle}
        >
          <div
            className="mem-grid"
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
            }}
          >
            {deck.map((card, idx) => {
              const up = faceUp(idx);
              const isMatched = matched.includes(card.id);
              const skin = kinds[card.kind];
              return (
                <button
                  key={card.id}
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
            <div
              key={p.key}
              className="tile-name-pop"
              style={{
                left: `${((p.col + 0.5) / grid.cols) * 100}%`,
                top: `${((p.row + 0.5) / grid.rows) * 100 - 4}%`,
              }}
            >
              {p.img && <PopImg src={p.img} />}
              <span>{p.name}</span>
            </div>
          ))}

          {/* предпросмотр: «Запоминай! N…» */}
          {inPreview && (
            <div className="mem-preview" role="status" aria-live="polite">
              <span>{t.memoryPreview}</span>
              <span className="mem-preview-count">{t.memoryPreviewLeft(previewLeft)}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
