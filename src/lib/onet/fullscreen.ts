'use client';

/**
 * Полноэкранный режим (Fullscreen API).
 *
 * Игра живёт в браузере: сверху видна адресная строка и системная панель —
 * из-за этого кажется, что игра «не на весь экран». Кнопка-стрелки убирает
 * браузерный интерфейс одним тапом (и возвращает обратно).
 *
 * В установленном PWA-приложении режим задаётся манифестом
 * (display: fullscreen) — там этот хук просто не активен.
 */

import { useCallback, useEffect, useState } from 'react';

/** поддерживается ли Fullscreen API (на iOS Safari — нет: прячем кнопку) */
export function fullscreenSupported(): boolean {
  return typeof document !== 'undefined' && !!document.documentElement.requestFullscreen;
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreenSupported()) return;
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    onChange();
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = useCallback(() => {
    if (!fullscreenSupported()) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
  }, []);

  return { isFullscreen, toggle, supported: fullscreenSupported() };
}
