'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

/* Игра полностью клиентская (localStorage, Web Audio, ResizeObserver),
   поэтому отключаем SSR — иначе возник бы конфликт гидратации.
   Экран загрузки: ярлык игры + живые реалистичные картинки видов. */

/** Мини-карточка превью: если картинка не загрузилась — прячем,
 *  никаких «битых» иконок на экране загрузки. */
function LoadThumb({ src, delay }: { src: string; delay: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span className="menu-thumb" style={{ animationDelay: `${delay}s` }}>
      <img src={src} alt="" draggable={false} onError={() => setFailed(true)} />
    </span>
  );
}

const OnetGame = dynamic(() => import('@/components/game/OnetGame'), {
  ssr: false,
  loading: () => (
    <div className="relative flex h-dvh w-full flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-b from-teal-100 via-emerald-50 to-amber-100">
      {/* мягкий фон-виаль, как в меню */}
      <div className="menu-bg" aria-hidden="true">
        <img src="/menu-bg.webp" alt="" draggable={false} />
        <div className="menu-bg-veil" />
      </div>

      <div className="relative z-[1] flex items-center gap-4">
        <img
          src="/icons/icon-192.png"
          alt="Клик-Клак"
          width={88}
          height={88}
          draggable={false}
          className="menu-icon"
        />
        <div className="text-left">
          <h1 className="bg-gradient-to-r from-teal-600 via-emerald-600 to-amber-600 bg-clip-text text-4xl font-black tracking-tight text-transparent">
            КЛИК-КЛАК
          </h1>
          <p className="text-lg font-black text-teal-700/90">Соедини пары</p>
        </div>
      </div>

      <div className="relative z-[1] flex gap-2" aria-label="Загрузка">
        <LoadThumb src="/tiles/lion.webp" delay={0} />
        <LoadThumb src="/tiles/apple.webp" delay={0.35} />
        <LoadThumb src="/tiles/dolphin.webp" delay={0.7} />
      </div>

      <div className="relative z-[1] h-1.5 w-40 overflow-hidden rounded-full bg-white/70">
        <div className="loading-bar h-full rounded-full bg-gradient-to-r from-teal-500 to-amber-500" />
      </div>
    </div>
  ),
});

export default function Home() {
  return <OnetGame />;
}
