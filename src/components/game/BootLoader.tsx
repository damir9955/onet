'use client';

/**
 * Загрузочный экран ПЕРВОЙ установки (v1.6.0): скачиваем ВСЕ файлы игры
 * на устройство с полоской прогресса — только после полной загрузки
 * открываем игру (иначе «потом при заходе много картинок не прогружается»).
 *
 * Состояния:
 *  - check    — мгновенная проверка маркера (обычно < 1 кадра);
 *  - download — полоса прогресса + счётчик файлов;
 *  - error    — сети нет: кнопка «Повторить».
 *
 * Повторные запуски сюда НЕ попадают: маркер установлен → OnetGame
 * сразу рендерит меню (см. offline.ts).
 */

import type { UIStrings } from '@/lib/onet/i18n';

interface BootLoaderProps {
  t: UIStrings;
  state: 'check' | 'download' | 'error';
  done: number;
  total: number;
  onRetry: () => void;
}

export default function BootLoader({ t, state, done, total, onRetry }: BootLoaderProps) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center gap-5 overflow-hidden bg-gradient-to-b from-teal-100 via-emerald-50 to-amber-100 p-6 text-center">
      {/* мягкий фон-вуаль, как в меню */}
      <div className="menu-bg" aria-hidden="true">
        <img src="/menu-bg.webp" alt="" draggable={false} />
        <div className="menu-bg-veil" />
      </div>

      {/* ярлык + название */}
      <div className="relative z-[1] flex items-center gap-4">
        <img
          src="/icons/icon-192.png"
          alt=""
          width={96}
          height={96}
          draggable={false}
          className="menu-icon"
        />
        <div className="text-left">
          <h1 className="bg-gradient-to-r from-teal-600 via-emerald-600 to-amber-600 bg-clip-text text-4xl font-black tracking-tight text-transparent drop-shadow-sm xl:text-5xl">
            {t.gameTitle}
          </h1>
          <p className="text-lg font-black text-teal-700/90 xl:text-xl">{t.gameSubtitle}</p>
        </div>
      </div>

      {state === 'error' ? (
        /* нет сети — просим подключение и даём кнопку повторить */
        <div className="relative z-[1] flex w-full max-w-md flex-col items-center gap-4 rounded-3xl bg-white/85 p-6 shadow-lg ring-1 ring-white/70">
          <p className="text-lg font-black text-rose-600">{t.bootError}</p>
          <p className="text-sm font-bold text-teal-800/80">{t.bootNote}</p>
          <button
            type="button"
            onClick={onRetry}
            className="rounded-full bg-gradient-to-b from-teal-500 to-teal-600 px-8 py-3 text-lg font-black text-white shadow-lg shadow-teal-600/30 ring-2 ring-teal-300 transition hover:brightness-105 active:scale-95"
          >
            {t.bootRetry}
          </button>
        </div>
      ) : (
        <div className="relative z-[1] flex w-full max-w-md flex-col items-center gap-3">
          {/* статус */}
          <p className="text-lg font-black text-teal-900">{t.bootTitle}</p>

          {/* полоса загрузки */}
          <div
            className="h-4 w-full overflow-hidden rounded-full bg-white/75 shadow-inner ring-1 ring-white/80"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
          >
            <div
              className="loading-bar h-full rounded-full bg-gradient-to-r from-teal-500 via-emerald-500 to-amber-500 transition-[width] duration-200"
              style={{ width: state === 'download' ? `${Math.max(pct, 4)}%` : '4%' }}
            />
          </div>

          {/* счётчик файлов */}
          <p className="text-sm font-black tabular-nums text-teal-800/85">
            {state === 'download' && total > 0
              ? `${done} / ${total} · ${pct}%`
              : t.bootPrepare}
          </p>

          <p className="max-w-xs text-xs font-bold leading-relaxed text-teal-700/70">
            {t.bootNote}
          </p>
        </div>
      )}
    </div>
  );
}
