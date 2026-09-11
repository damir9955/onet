'use client';

/**
 * Тематические иконки игры «Клик-Клак».
 *
 * Все иконки нарисованы вручную в ЕДИНОМ мультяшном стиле игры:
 * толстые скруглённые линии, яркие заливки, мягкие тени-обводки —
 * как «игрушечные» значки, а не системные outline-иконки «как на ПК».
 * Размер задаётся снаружи через className (h-4 w-4 и т.п.).
 */

import React from 'react';

export interface GameIconProps {
  className?: string;
}

function Svg({ className, children }: GameIconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

/* ============ Бонусы ============ */

/** Подсказка — лампочка с лучиками */
export function IconHint({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <g stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
        <path d="M4.2 4.6l1.7 1.7" />
        <path d="M19.8 4.6l-1.7 1.7" />
        <path d="M1.8 9.6h2.3" />
        <path d="M19.9 9.6h2.3" />
      </g>
      <path
        d="M12 3.6a5.9 5.9 0 0 1 5.9 5.9c0 2.2-1.2 3.7-2.5 4.9-.6.6-1 1.3-1.1 2.1H9.7c-.1-.8-.5-1.5-1.1-2.1-1.3-1.2-2.5-2.7-2.5-4.9A5.9 5.9 0 0 1 12 3.6z"
        fill="#fde68a"
        stroke="#f59e0b"
        strokeWidth="1.8"
      />
      <path d="M9.7 18.6h4.6" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      <path d="M10.4 21h3.2" stroke="#b45309" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 6.8a2.7 2.7 0 0 1 2.7 2.7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Перемешать — два скрещённых цветных изогнутых «потока» */
export function IconShuffle({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M3.2 7.4c4.1 0 5.9 2.1 7.9 4.6s3.8 4.6 7.9 4.6"
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M20.8 7.4c-4.1 0-5.9 2.1-7.9 4.6s-3.8 4.6-7.9 4.6"
        fill="none"
        stroke="#14b8a6"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M17.3 13.7l2.7 2.9-4 .9" fill="none" stroke="#8b5cf6" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.7 10.3L4 7.4l4-.9" fill="none" stroke="#14b8a6" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Заморозка — снежинка с шариками на концах */
export function IconFreeze({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <g stroke="#38bdf8" strokeWidth="2.3" strokeLinecap="round">
        <path d="M12 2.6v18.8" />
        <path d="M3.8 7.3l16.4 9.4" />
        <path d="M20.2 7.3L3.8 16.7" />
      </g>
      <g fill="#bae6fd">
        <circle cx="12" cy="2.9" r="1.5" />
        <circle cx="12" cy="21.1" r="1.5" />
        <circle cx="3.9" cy="7.5" r="1.5" />
        <circle cx="20.1" cy="7.5" r="1.5" />
        <circle cx="3.9" cy="16.5" r="1.5" />
        <circle cx="20.1" cy="16.5" r="1.5" />
        <circle cx="12" cy="12" r="1.9" />
      </g>
    </Svg>
  );
}

/* ============ Очки, серия, сохранение ============ */

/** Звезда очков */
export function IconStar({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.2L12 17.1l-5.6 2.9 1.1-6.2L2.9 9.4l6.3-.9L12 2.8z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M10 8.4a2.2 2.2 0 0 1 1.7-1.6" stroke="#fff7e6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Огонь серии */
export function IconFire({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M12 2.4c.9 2.7 2.3 4.2 3.9 5.8 1.7 1.7 3.1 3.3 3.1 5.8a7 7 0 1 1-14 0c0-1.9.8-3.3 2-4.7.4 1.1 1 1.9 1.9 2.4-.2-2.7.8-6.4 3.1-9.3z"
        fill="#fb923c"
      />
      <path
        d="M12 10.2c.5 1.5 1.2 2.3 2.1 3.1.9.9 1.6 1.7 1.6 3a3.7 3.7 0 1 1-7.4 0c0-1 .4-1.8 1-2.5.3.6.7 1 1.2 1.3-.1-1.5.2-3.4 1.5-4.9z"
        fill="#fde047"
      />
    </Svg>
  );
}

/** Флажок сохранения (чекпоинт) */
export function IconFlag({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path d="M6.4 2.9v18.2" stroke="#0f766e" strokeWidth="2.4" strokeLinecap="round" />
      <path
        d="M6.4 4.3h10.2c.8 0 1.2.9.7 1.5l-1.7 2.2 1.7 2.2c.5.6.1 1.5-.7 1.5H6.4v-7.4z"
        fill="#34d399"
        stroke="#10b981"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 7.2l.9 1.4 1.6.2-1.2 1.1.3 1.6L9 10.7l-1.6.8.3-1.6-1.2-1.1 1.6-.2.9-1.4z" fill="#fff" opacity="0.85" />
    </Svg>
  );
}

/* ============ Действия ============ */

/** Пауза — две «пилюли» */
export function IconPause({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <rect x="7" y="5" width="3.6" height="14" rx="1.8" fill="#0f766e" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.8" fill="#0f766e" />
    </Svg>
  );
}

/** Играть — скруглённый треугольник */
export function IconPlay({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M8 5.4v13.2c0 1.2 1.3 1.9 2.3 1.3l10.4-6.6c.9-.6.9-2 0-2.6L10.3 4.1C9.3 3.5 8 4.2 8 5.4z"
        fill="#10b981"
        stroke="#059669"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Звук вкл */
export function IconSoundOn({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M4 9.3v5.4h3.4l4.4 3.6c.6.5 1.5.1 1.5-.7V6.4c0-.8-.9-1.2-1.5-.7L7.4 9.3H4z"
        fill="#0d9488"
      />
      <path d="M15.7 9.6a3.4 3.4 0 0 1 0 4.8" fill="none" stroke="#0d9488" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M18.2 7.6a6.6 6.6 0 0 1 0 8.8" fill="none" stroke="#0d9488" strokeWidth="2.1" strokeLinecap="round" />
    </Svg>
  );
}

/** Звук выкл */
export function IconSoundOff({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M4 9.3v5.4h3.4l4.4 3.6c.6.5 1.5.1 1.5-.7V6.4c0-.8-.9-1.2-1.5-.7L7.4 9.3H4z"
        fill="#94a3b8"
      />
      <g stroke="#f43f5e" strokeWidth="2.3" strokeLinecap="round">
        <path d="M15.6 9.6l5.4 5.4" />
        <path d="M21 9.6l-5.4 5.4" />
      </g>
    </Svg>
  );
}

/** Домой */
export function IconHome({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path d="M4.2 11.4L12 4.4l7.8 7" fill="none" stroke="#0f766e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M6.4 10.6v8.2c0 .8.6 1.4 1.4 1.4h8.4c.8 0 1.4-.6 1.4-1.4v-8.2"
        fill="#ccfbf1"
        stroke="#0f766e"
        strokeWidth="2.2"
        strokeLinejoin="round"
      />
      <path d="M10.2 20.2v-4.6h3.6v4.6" fill="#99f6e4" stroke="#0f766e" strokeWidth="1.8" strokeLinejoin="round" />
    </Svg>
  );
}

/** Назад */
export function IconBack({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <g fill="none" stroke="#0f766e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.4 5.2L3.8 12l6.6 6.8" />
        <path d="M4.6 12h15" />
      </g>
    </Svg>
  );
}

/** Стрелка «нажми» (для кнопок-карточек) */
export function IconArrowRight({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4.6 12h13.6" />
        <path d="M12.8 6.2L19.4 12l-6.6 5.8" />
      </g>
    </Svg>
  );
}

/** Пропустить (за рекламу) */
export function IconSkip({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path d="M3.8 6.4v11.2c0 .8.9 1.3 1.6.9l7.4-4.6c.7-.4.7-1.4 0-1.8L5.4 5.5c-.7-.4-1.6.1-1.6.9z" fill="#14b8a6" />
      <path d="M12.2 6.4v11.2c0 .8.9 1.3 1.6.9l7.4-4.6c.7-.4.7-1.4 0-1.8l-7.4-5.6c-.7-.4-1.6.1-1.6.9z" fill="#14b8a6" opacity="0.55" />
    </Svg>
  );
}

/** Повторить/заново — круговая стрелка */
export function IconRefresh({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M4.4 12a7.6 7.6 0 0 1 13.2-5.2"
        fill="none"
        stroke="#0d9488"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M19.6 12a7.6 7.6 0 0 1-13.2 5.2"
        fill="none"
        stroke="#0d9488"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path d="M18.6 2.9v4.3h-4.3" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.4 21.1v-4.3h4.3" fill="none" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Реклама — мультяшный телевизор с кнопкой Play */
export function IconAd({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path d="M12 6.3L9.2 3.2M12 6.3l2.8-3.1" stroke="#b45309" strokeWidth="2.1" strokeLinecap="round" fill="none" />
      <rect x="3.2" y="6.3" width="17.6" height="12.6" rx="2.6" fill="#fbbf24" stroke="#b45309" strokeWidth="1.8" />
      <path d="M10.3 9.8v5.6c0 .8.9 1.3 1.6.9l4.7-2.8c.7-.4.7-1.4 0-1.8l-4.7-2.8c-.7-.4-1.6.1-1.6.9z" fill="#fff" />
      <rect x="5.6" y="8.6" width="1.8" height="3" rx="0.9" fill="#fde68a" />
    </Svg>
  );
}

/** Классика — две карточки, соединённые линией (суть игры) */
export function IconClassic({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <rect x="2.6" y="7.2" width="6.6" height="6.6" rx="1.9" fill="#34d399" stroke="#059669" strokeWidth="1.5" />
      <rect x="14.8" y="10.2" width="6.6" height="6.6" rx="1.9" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
      <path
        d="M9.2 10.5c2.4 0 2.6 3 5.6 3"
        fill="none"
        stroke="#0f766e"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="9.2" cy="10.5" r="1.3" fill="#0f766e" />
      <circle cx="14.8" cy="13.5" r="1.3" fill="#0f766e" />
    </Svg>
  );
}

/** Детский режим — весёлая мордочка */
export function IconKids({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.6" fill="#fde68a" stroke="#f59e0b" strokeWidth="1.8" />
      <circle cx="9.1" cy="10.2" r="1.15" fill="#78350f" />
      <circle cx="14.9" cy="10.2" r="1.15" fill="#78350f" />
      <path d="M8.7 14.1c.9 1.5 2 2.3 3.3 2.3s2.4-.8 3.3-2.3" fill="none" stroke="#78350f" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="6.9" cy="12.9" r="1" fill="#fb923c" opacity="0.7" />
      <circle cx="17.1" cy="12.9" r="1" fill="#fb923c" opacity="0.7" />
    </Svg>
  );
}

/** Соединялка — карточки и путь с поворотом */
export function IconLink({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <rect x="2.6" y="3.4" width="6.4" height="6.4" rx="1.8" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
      <rect x="15" y="14.2" width="6.4" height="6.4" rx="1.8" fill="#34d399" stroke="#059669" strokeWidth="1.5" />
      <path
        d="M5.8 9.8v6.3c0 1 .8 1.8 1.8 1.8h7.4"
        fill="none"
        stroke="#0f766e"
        strokeWidth="2.3"
        strokeLinecap="round"
      />
      <circle cx="5.8" cy="9.8" r="1.2" fill="#0f766e" />
      <circle cx="15" cy="17.9" r="1.2" fill="#0f766e" />
    </Svg>
  );
}

/** «Найди одинаковые» — две карточки (мемори) */
export function IconCards({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <rect x="3.2" y="4.2" width="10.4" height="13" rx="2.2" fill="#ffffff" stroke="#0f766e" strokeWidth="1.8" />
      <rect x="10.2" y="7" width="10.4" height="13" rx="2.2" fill="#0d9488" stroke="#115e59" strokeWidth="1.8" />
      <path d="M15.4 10.6l1 2 2.2.3-1.6 1.5.4 2.2-2-1-2 1 .4-2.2-1.6-1.5 2.2-.3 1-2z" fill="#fde68a" />
      <circle cx="6.4" cy="7.6" r="1.1" fill="#fbbf24" />
      <path d="M4.8 12.2h4.4M4.8 14.8h4.4" stroke="#99f6e4" strokeWidth="1.6" strokeLinecap="round" />
    </Svg>
  );
}

/** «Тыкай пары» (для самых маленьких) — пальчик касается карточки */
export function IconTap({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <rect x="2.6" y="2.8" width="9" height="9" rx="2.2" fill="#fbbf24" stroke="#d97706" strokeWidth="1.6" />
      <rect x="12.4" y="2.8" width="9" height="9" rx="2.2" fill="#34d399" stroke="#059669" strokeWidth="1.6" />
      <circle cx="7.1" cy="7.3" r="1.5" fill="#f472b6" />
      <circle cx="16.9" cy="7.3" r="1.5" fill="#f472b6" />
      {/* пальчик: указательный тыкает вниз в правую карточку */}
      <path
        d="M13.2 20.8c-1.6-.6-2.6-1.9-2.7-3.6l-.2-3.1c0-.9.7-1.6 1.6-1.6.7 0 1.3.4 1.5 1.1l.3.9V6.9c0-1 .8-1.8 1.8-1.8s1.8.8 1.8 1.8v5.6l.7-.9c.4-.5 1.1-.7 1.7-.5.7.2 1.2.9 1.2 1.6v2.8c0 2.6-1.5 4.9-3.9 5.8l-.2.1h-2.6z"
        fill="#fde68a"
        stroke="#b45309"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* волны тыка */}
      <path d="M20.6 9.6c.9.6 1.5 1.6 1.6 2.7" fill="none" stroke="#38bdf8" strokeWidth="1.7" strokeLinecap="round" />
      <path d="M21.8 7.2c1.5 1 2.5 2.7 2.6 4.5" fill="none" stroke="#38bdf8" strokeWidth="1.7" strokeLinecap="round" opacity="0.75" />
    </Svg>
  );
}

/** Турнирная таблица — кубок */
export function IconTrophy({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path d="M7.2 3.6h9.6v3.9a4.8 4.8 0 0 1-9.6 0V3.6z" fill="#fbbf24" stroke="#d97706" strokeWidth="1.6" />
      <path d="M7.2 5H4.4c-.4 0-.6.4-.5.7.4 2 1.6 3 3.1 3.3" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M16.8 5h2.8c.4 0 .6.4.5.7-.4 2-1.6 3-3.1 3.3" fill="none" stroke="#d97706" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M12 12.3v3.4" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
      <path d="M8.4 20.4c.5-1.9 1.8-2.9 3.6-2.9s3.1 1 3.6 2.9H8.4z" fill="#f59e0b" stroke="#d97706" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 5.2l.8 1.6 1.8.3-1.3 1.2.3 1.8L12 9.2l-1.6.9.3-1.8-1.3-1.2 1.8-.3.8-1.6z" fill="#fff" opacity="0.9" />
    </Svg>
  );
}

/** Настройки — шестерёнка со скруглёнными зубьями */
export function IconGear({ className }: GameIconProps) {
  const teeth = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const x1 = 12 + Math.cos(a) * 6.4;
    const y1 = 12 + Math.sin(a) * 6.4;
    const x2 = 12 + Math.cos(a) * 9.4;
    const y2 = 12 + Math.sin(a) * 9.4;
    return <path key={i} d={`M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`} />;
  });
  return (
    <Svg className={className}>
      <g stroke="#0f766e" strokeWidth="2.7" strokeLinecap="round">{teeth}</g>
      <circle cx="12" cy="12" r="6.4" fill="#ccfbf1" stroke="#0f766e" strokeWidth="2.2" />
      <circle cx="12" cy="12" r="2.6" fill="#0d9488" />
    </Svg>
  );
}

/** Язык — глобус */
export function IconGlobe({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="8.6" fill="#e0f2fe" stroke="#0284c7" strokeWidth="2" />
      <ellipse cx="12" cy="12" rx="3.9" ry="8.6" fill="none" stroke="#0284c7" strokeWidth="1.7" />
      <path d="M3.4 12h17.2M4.6 7.4c2.1 1.5 4.7 2.3 7.4 2.3s5.3-.8 7.4-2.3M4.6 16.6c2.1-1.5 4.7-2.3 7.4-2.3s5.3.8 7.4 2.3" fill="none" stroke="#0284c7" strokeWidth="1.7" strokeLinecap="round" />
    </Svg>
  );
}

/** Закрыть — скруглённый крест */
export function IconX({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <g stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
        <path d="M6.4 6.4l11.2 11.2" />
        <path d="M17.6 6.4L6.4 17.6" />
      </g>
    </Svg>
  );
}

/** Время вышло — будильник */
export function IconClock({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="13" r="8.2" fill="#ecfeff" stroke="#0f766e" strokeWidth="2.2" />
      <path d="M12 8.8V13l3 2.1" fill="none" stroke="#0f766e" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M5.4 4.8L2.6 7.6M18.6 4.8l2.8 2.8" stroke="#0f766e" strokeWidth="2.1" strokeLinecap="round" />
      <circle cx="12" cy="13" r="1.2" fill="#0f766e" />
    </Svg>
  );
}

/** Победа — звезда с конфетти */
export function IconParty({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <path
        d="M12 4.6l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 4.6z"
        fill="#fbbf24"
        stroke="#f59e0b"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="4" cy="6.2" r="1.4" fill="#34d399" />
      <circle cx="20" cy="5.4" r="1.4" fill="#f472b6" />
      <circle cx="4.4" cy="18" r="1.4" fill="#38bdf8" />
      <circle cx="19.8" cy="18.6" r="1.4" fill="#a78bfa" />
    </Svg>
  );
}

/** Выход — мультяшная дверь со стрелкой */
export function IconDoor({ className }: GameIconProps) {
  return (
    <Svg className={className}>
      <rect x="6.2" y="3.4" width="10.4" height="17.2" rx="1.8" fill="#fbbf24" stroke="#b45309" strokeWidth="1.8" />
      <circle cx="14" cy="12" r="1.2" fill="#78350f" />
      <path d="M14 12h6.6" stroke="#0f766e" strokeWidth="2.4" strokeLinecap="round" fill="none" />
      <path d="M17.8 8.8l3.2 3.2-3.2 3.2" fill="none" stroke="#0f766e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
