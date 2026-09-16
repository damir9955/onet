'use client';

import React, { useState } from 'react';
import type { GameIconProps } from './GameIcons';

/**
 * Реалистичная 3D-иконка бонуса/управления (public/ui/{name}.webp) —
 * в том же фотореалистичном стиле, что карточки игры. Каждая иконка —
 * глянцевый «значок-плитка» со своим насыщенным фоном, поэтому бонусы
 * и кнопки НЕ сливаются с меню и фоном (фидбек v1.6.0).
 * Если картинка не загрузилась — запасной SVG из GameIcons,
 * чтобы кнопка никогда не пустела.
 */
export function Ico3D({
  name,
  fallback: Fallback,
  className,
  alt = '',
}: {
  /** имя файла в public/ui (без расширения) */
  name: string;
  /** запасной SVG-значок (GameIcons) */
  fallback?: React.ComponentType<GameIconProps>;
  className?: string;
  alt?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return Fallback ? <Fallback className={className} aria-hidden={alt ? undefined : true} /> : null;
  }
  return (
    <img
      src={`/ui/${name}.webp`}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={(className ? `${className} ` : '') + 'ico3d'}
      onError={() => setFailed(true)}
    />
  );
}
