'use client';

import React from 'react';
import { Clock, Snowflake } from 'lucide-react';
import { cn } from '@/lib/utils';

export function formatTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

interface TimeBarProps {
  timeLeft: number;
  total: number;
  /** время заморожено (бонус ❄️) — полоса синяя и стоит на месте */
  frozen?: boolean;
}

/**
 * Полоса времени в стиле Pao Pao: непрерывно убывает, без возврата за пары.
 * Ошибка отнимает пару секунд, а бонус ❄️ из копилки замораживает полосу.
 */
export default function TimeBar({ timeLeft, total, frozen = false }: TimeBarProps) {
  const frac = total > 0 ? Math.max(0, Math.min(1, timeLeft / total)) : 0;
  const danger = !frozen && timeLeft <= 10;
  const warning = !frozen && !danger && frac <= 0.25;

  return (
    <div
      className="flex items-center gap-2"
      role="timer"
      aria-label={
        frozen ? 'Время заморожено' : `Осталось времени: ${formatTime(timeLeft)}`
      }
    >
      {frozen ? (
        <Snowflake className="h-4 w-4 shrink-0 animate-pulse text-sky-500" aria-hidden="true" />
      ) : (
        <Clock
          className={cn('h-4 w-4 shrink-0', danger ? 'text-rose-500' : 'text-teal-700/70')}
          aria-hidden="true"
        />
      )}
      <div
        className={cn(
          'h-3 flex-1 overflow-hidden rounded-full bg-white/70 shadow-inner ring-1 ring-white/80',
          danger && 'animate-pulse'
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-100 ease-linear',
            frozen && 'bg-gradient-to-r from-sky-300 to-blue-500',
            !frozen && !warning && !danger && 'bg-gradient-to-r from-emerald-400 to-teal-500',
            !frozen && warning && 'bg-gradient-to-r from-amber-400 to-orange-500',
            !frozen && danger && 'bg-gradient-to-r from-rose-500 to-red-600'
          )}
          style={{ width: `${frac * 100}%` }}
        />
      </div>
      <span
        className={cn(
          'w-12 shrink-0 text-right text-sm font-bold tabular-nums',
          frozen ? 'text-sky-600' : danger ? 'text-rose-600' : 'text-teal-900/80'
        )}
      >
        {formatTime(timeLeft)}
      </span>
    </div>
  );
}
