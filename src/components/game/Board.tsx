'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import {
  RING_PAD,
  type Cell,
  type GravityPlan,
  type KindSkin,
  type Path,
  type Point,
} from '@/lib/onet/engine';
import { cn } from '@/lib/utils';

/** Плитка, играющая анимацию исчезновения */
export interface DyingTile {
  pr: number;
  pc: number;
  kind: number;
  key: string;
}

/** Всплывающая подпись «кто это» при нахождении пары (детский режим) */
export interface NamePopup {
  pr: number;
  pc: number;
  name: string;
  img?: string;
  key: number;
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

export interface BoardProps {
  board: Cell[];
  rows: number;
  cols: number;
  kinds: KindSkin[];
  selected: Point | null;
  wrongPair: [Point, Point] | null;
  hintPair: [Point, Point] | null;
  dying: DyingTile[];
  matchLine: Path | null;
  /** гравитация уровня: полосы столбцов, каждая — в свою сторону (для анимации) */
  gravity: GravityPlan;
  /** подпись названия вида над найденной парой */
  namePopup?: NamePopup | null;
  onTileClick: (r: number, c: number) => void;
}

/** Лицо карточки: реалистичная картинка из каталога видов (/public/tiles),
 *  при ошибке загрузки — запасной эмодзи. Компонент на уровне модуля,
 *  чтобы состояние загрузки не сбрасывалось при ререндерах Board. */
function TileFace({ skin, fontSize }: { skin?: KindSkin; fontSize: number }) {
  const [failed, setFailed] = useState(false);
  const img = skin?.img;
  if (img && !failed) {
    return (
      <img
        src={img}
        alt=""
        draggable={false}
        loading="lazy"
        className="tile-img"
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <span className="drop-shadow-sm" aria-hidden="true" style={{ fontSize }}>
      {skin?.e ?? ''}
    </span>
  );
}

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

/**
 * Игровое поле ONET — как в классике.
 *
 * Область = (cols+1)×(rows+1) клеток: сама сетка rows×cols + запас
 * ровно в ПОЛПЛИТКИ с каждой стороны (+ RING_PAD на толщину линии).
 * В этом запасе проходит объездная линия соединения по внешнему
 * кольцу — она видна со всех четырёх сторон, но НЕ выходит за
 * область поля: SVG обрезается точно по ней, поэтому линия не
 * попадает на меню сверху и не срезается краем экрана.
 *
 * Клетки выровнены по строгой сетке (шаги pitchX/pitchY подстраиваются
 * под пропорции экрана, клетки могут быть чуть прямоугольными —
 * на глаз незаметно).
 */
const Board = memo(function Board({
  board,
  rows,
  cols,
  kinds,
  selected,
  wrongPair,
  hintPair,
  dying,
  matchLine,
  gravity,
  namePopup,
  onTileClick,
}: BoardProps) {
  const [areaRef, { w, h }] = useElementSize<HTMLDivElement>();

  /* Область = (cols+1)×(rows+1) клеток + 2·RING_PAD: вокруг сетки —
     запас ровно в полплитки с каждой стороны для линии соединения */
  const ready = w > 40 && h > 40;
  const pitchX = ready ? (w - 2 * RING_PAD) / (cols + 1) : 0;
  const pitchY = ready ? (h - 2 * RING_PAD) / (rows + 1) : 0;

  /* Плитка: клетка минус тонкий зазор (≈4.5%, не меньше 1.5px) —
     карточки занимают максимум места, как в классике */
  const gapX = pitchX > 0 ? Math.max(1.5, pitchX * 0.045) : 0;
  const gapY = pitchY > 0 ? Math.max(1.5, pitchY * 0.045) : 0;
  const tileW = pitchX > 0 ? pitchX - gapX : 0;
  const tileH = pitchY > 0 ? pitchY - gapY : 0;
  const fontSize = Math.min(tileW, tileH) * 0.6;

  /* Сетка поля: панель ровно в rows×cols клеток, flex центрирует её —
     по построению отступ до краёв области = полплитки + RING_PAD */
  const boxW = pitchX * cols;
  const boxH = pitchY * rows;

  /* Отступ сетки от краёв области — координаты SVG-линии */
  const ox = (w - boxW) / 2;
  const oy = (h - boxH) / 2;

  /* Верхний левый угол клетки (r, c) в координатах панели: строгая сетка */
  const tilePos = (r: number, c: number) => ({
    left: (c - 0.5) * pitchX - tileW / 2,
    top: (r - 0.5) * pitchY - tileH / 2,
  });

  const isSel = (r: number, c: number) => !!selected && selected.r === r && selected.c === c;
  const isWrong = (r: number, c: number) =>
    !!wrongPair && wrongPair.some((p) => p.r === r && p.c === c);
  const isHint = (r: number, c: number) =>
    !!hintPair && hintPair.some((p) => p.r === r && p.c === c);

  /* Линия соединения: центры клеток (в padded-координатах 0..rows+1).
     Точки кольца (r=0/rows+1, c=0/cols+1) попадают в отступ полплитки:
     RING_PAD ≤ x ≤ w−RING_PAD — линия целиком внутри области поля */
  const centers = matchLine
    ? matchLine.map((p) => ({ x: ox + (p.c - 0.5) * pitchX, y: oy + (p.r - 0.5) * pitchY }))
    : [];
  let lineLen = 0;
  for (let i = 1; i < centers.length; i++) {
    lineLen += Math.hypot(centers[i].x - centers[i - 1].x, centers[i].y - centers[i - 1].y);
  }
  const ptsStr = centers.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div ref={areaRef} className="flex h-full min-h-0 w-full items-center justify-center">
      {pitchX > 4 && pitchY > 4 && (
        <div
          className="relative"
          style={{ width: boxW, height: boxH }}
          role="grid"
          aria-label={`Игровое поле ${rows} на ${cols}`}
        >
          {/* Линия соединения: двухслойный "луч" — мягкий ореол + яркое ядро,
              прорисовывается от первой плитки ко второй, без точек в углах.
              SVG накрывает ВСЮ область поля и обрезается по ней (overflow
              скрыт по умолчанию): линия всегда внутри поля — на меню
              не попадает и краем экрана не срезается */}
          {centers.length >= 2 && (
            <svg
              className="pointer-events-none absolute z-20"
              style={{ left: -ox, top: -oy }}
              width={w}
              height={h}
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="onetGradLine" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#fbbf24" />
                </linearGradient>
              </defs>
              <polyline
                className="match-line-halo"
                points={ptsStr}
                fill="none"
                stroke="rgba(52, 211, 153, 0.5)"
                strokeWidth={Math.max(6, Math.min(tileW, tileH) * 0.34)}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                className="match-line-core"
                points={ptsStr}
                fill="none"
                stroke="url(#onetGradLine)"
                strokeWidth={Math.max(3, Math.min(tileW, tileH) * 0.14)}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={
                  {
                    strokeDasharray: lineLen,
                    strokeDashoffset: lineLen,
                    '--line-len': lineLen,
                  } as React.CSSProperties
                }
              />
            </svg>
          )}

          {/* Карточки */}
          {board.map((cell, i) => {
            if (!cell) return null;
            const r = Math.floor(i / cols) + 1;
            const c = (i % cols) + 1;
            const pos = tilePos(r, c);
            const skin = kinds[cell.kind];
            return (
              <button
                key={cell.id}
                type="button"
                onClick={() => onTileClick(r, c)}
                aria-label={`Картинка ${skin?.ru ?? skin?.e ?? ''}`}
                data-r={r}
                data-c={c}
                className={cn(
                  'tile',
                  gravity.bands.length > 0 && 'tile-fall',
                  isSel(r, c) && 'tile-selected',
                  isWrong(r, c) && 'tile-wrong',
                  isHint(r, c) && 'tile-hint'
                )}
                style={
                  {
                    left: pos.left,
                    top: pos.top,
                    width: tileW,
                    height: tileH,
                    fontSize,
                    '--tile-bg': skin?.bg,
                    '--tile-ring': skin?.ring,
                  } as React.CSSProperties
                }
              >
                <TileFace skin={skin} fontSize={fontSize} />
              </button>
            );
          })}

          {/* Всплывающая подпись названия при нахождении пары (детский режим) */}
          {namePopup && (() => {
            const pos = tilePos(namePopup.pr, namePopup.pc);
            return (
              <div
                key={namePopup.key}
                className="tile-name-pop"
                style={{ left: pos.left + tileW / 2, top: pos.top - tileH * 0.12 }}
              >
                <PopImg src={namePopup.img} />
                <span>{namePopup.name}</span>
              </div>
            );
          })()}

          {/* Исчезающие карточки (анимация поверх) */}
          {dying.map((d) => {
            const pos = tilePos(d.pr, d.pc);
            const skin = kinds[d.kind];
            return (
              <div
                key={d.key}
                className="tile tile-dying pointer-events-none"
                style={
                  {
                    left: pos.left,
                    top: pos.top,
                    width: tileW,
                    height: tileH,
                    fontSize,
                    zIndex: 15,
                    '--tile-bg': skin?.bg,
                    '--tile-ring': skin?.ring,
                  } as React.CSSProperties
                }
                aria-hidden="true"
              >
                <TileFace skin={skin} fontSize={fontSize} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default Board;
