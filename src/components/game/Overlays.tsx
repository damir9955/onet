'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  gravityForLevel,
  isEasyLevel,
  kindImage,
  type BonusKind,
  type GravityDir,
  type LevelTheme,
} from '@/lib/onet/engine';
import type { Lang, UIStrings } from '@/lib/onet/i18n';
import {
  IconAd,
  IconArrowRight,
  IconBack,
  IconCards,
  IconClock,
  IconDoor,
  IconFire,
  IconFlag,
  IconGear,
  IconGlobe,
  IconHint,
  IconHome,
  IconKids,
  IconLink,
  IconPause,
  IconParty,
  IconPlay,
  IconRefresh,
  IconShuffle,
  IconFreeze,
  IconSkip,
  IconSoundOff,
  IconSoundOn,
  IconStar,
  IconTrophy,
  IconX,
  type GameIconProps,
} from './GameIcons';

/* ============ Общие типы ============ */

export interface Bonuses {
  hint: number;
  shuffle: number;
  freeze: number;
}

/** строка турнирной таблицы */
export interface LeaderRow {
  name: string;
  score: number;
  level: number;
  streak: number;
  date: string;
}

function ModalShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative max-h-[90%] w-full max-w-sm overflow-y-auto rounded-3xl bg-white/95 p-6 text-center shadow-2xl ring-1 ring-white/60 animate-in zoom-in-95 duration-200">
        {children}
      </div>
    </div>
  );
}

/* ============ Главное меню ============ */

export interface MenuScreenProps {
  t: UIStrings;
  lang: Lang;
  level: number;
  kidsLevel: number;
  kidsHarder: boolean;
  totalScore: number;
  bonuses: Bonuses;
  soundOn: boolean;
  streak: number;
  maxStreak: number;
  onPlay: () => void;
  onNewGame: () => void;
  onToggleSound: () => void;
  onLangChange: (lang: Lang) => void;
  onShowLeaderboard: () => void;
  onKidsOnet: () => void;
  onKidsMemory: () => void;
  onKidsDifficulty: (harder: boolean) => void;
}

/** Мини-карточка с реалистичной картинкой (превью режима).
 *  Если картинка не загрузилась — аккуратно прячем (без «битых» иконок). */
function MenuThumb({ src, delay }: { src: string; delay: number }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <span className="menu-thumb" style={{ animationDelay: `${delay}s` }}>
      <img src={src} alt="" draggable={false} onError={() => setFailed(true)} />
    </span>
  );
}

function ModeThumbs({ names }: { names: string[] }) {
  return (
    <span className="flex shrink-0 gap-1.5" aria-hidden="true">
      {names.map((n, i) => (
        <MenuThumb key={n} src={kindImage(n)} delay={i * 0.35} />
      ))}
    </span>
  );
}

/** чип статистики меню: тематическая иконка + значение */
function StatChip({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<GameIconProps>;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/75 px-2.5 py-1 text-xs font-black text-teal-900/85 ring-1 ring-white/60">
      <Icon className="h-4 w-4" />
      {children}
    </span>
  );
}

export function MenuScreen({
  t,
  lang,
  level,
  kidsLevel,
  kidsHarder,
  totalScore,
  bonuses,
  soundOn,
  streak,
  maxStreak,
  onPlay,
  onNewGame,
  onToggleSound,
  onLangChange,
  onShowLeaderboard,
  onKidsOnet,
  onKidsMemory,
  onKidsDifficulty,
}: MenuScreenProps) {
  const fresh = level <= 1 && totalScore === 0;
  const kidsFresh = kidsLevel <= 1;
  const [confirmNew, setConfirmNew] = useState(false);
  const [view, setView] = useState<'main' | 'kids'>('main');
  /* настройки живут в отдельном окне — не мешают глазам в меню */
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center overflow-y-auto p-4 text-center">
      {/* Фон меню: сгенерированная картинка + мягкая вуаль для читаемости */}
      <div className="menu-bg" aria-hidden="true">
        <img src="/menu-bg.webp" alt="" draggable={false} />
        <div className="menu-bg-veil" />
      </div>

      <button
        type="button"
        onClick={onToggleSound}
        aria-label={soundOn ? t.soundOn : t.soundOff}
        className="absolute right-4 top-4 z-10 mt-[env(safe-area-inset-top)] flex h-11 w-11 items-center justify-center rounded-full bg-white/85 text-teal-800 shadow-md transition hover:scale-105 active:scale-95"
      >
        {soundOn ? <IconSoundOn className="h-5 w-5" /> : <IconSoundOff className="h-5 w-5" />}
      </button>

      {/* Заголовок: ярлык игры + название */}
      <div className="relative z-[1] flex items-center gap-4">
        <img
          src="/icons/icon-192.png"
          alt=""
          width={84}
          height={84}
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
      <p className="relative z-[1] mt-1 max-w-md text-sm font-semibold text-teal-900/70">
        {t.tagline}
      </p>

      {view === 'main' ? (
        <div className="relative z-[1] mt-4 flex w-full max-w-lg flex-col gap-3">
          {/* ГЛАВНАЯ кнопка — Классика: крупная, сразу понятно, что нажимать */}
          <button type="button" onClick={onPlay} className="menu-cta">
            <span className="menu-cta-icon">
              <IconPlay className="h-7 w-7" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="menu-cta-title">{fresh ? t.play : t.continueLevel(level)}</span>
              <span className="menu-cta-sub">
                {t.classicTitle}: {t.classicDesc}
              </span>
            </span>
            <IconArrowRight className="h-6 w-6 shrink-0 opacity-50" />
          </button>

          {/* Детский режим — вторая большая карточка (открывает подменю) */}
          <button type="button" onClick={() => setView('kids')} className="mode-card mode-card--kids">
            <ModeThumbs names={['lion', 'panda', 'watermelon']} />
            <span className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-1.5 text-lg font-black text-teal-900">
                <IconKids className="h-6 w-6" /> {t.kidsTitle}
              </span>
              <span className="mode-card-desc">{t.kidsDesc}</span>
              <span className="block text-sm font-black text-amber-700">
                {kidsFresh ? t.memoryTitle + ' · ' + t.kidsOnetTitle : t.continueKids(kidsLevel)}
              </span>
            </span>
            <IconArrowRight className="h-6 w-6 shrink-0 text-amber-500/70" />
          </button>

          {/* Вторичные действия: таблица, настройки, новая игра */}
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={onShowLeaderboard} className="menu-pill menu-pill--amber">
              <IconTrophy className="h-4 w-4" /> {t.leaderboard}
            </button>
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              className="menu-pill menu-pill--teal"
            >
              <IconGear className="h-4 w-4" /> {t.settings}
            </button>
            {!fresh && (
              <button
                type="button"
                onClick={() => setConfirmNew(true)}
                className="menu-pill menu-pill--rose"
              >
                <IconRefresh className="h-4 w-4" /> {t.newGame}
              </button>
            )}
          </div>

          {/* Статистика: очки, бонусы, серия — тематическими иконками */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <StatChip icon={IconStar}>{totalScore}</StatChip>
            <StatChip icon={IconHint}>{bonuses.hint}</StatChip>
            <StatChip icon={IconShuffle}>{bonuses.shuffle}</StatChip>
            <StatChip icon={IconFreeze}>{bonuses.freeze}</StatChip>
            {maxStreak > 0 && (
              <StatChip icon={IconFire}>{t.streakLine(streak, maxStreak)}</StatChip>
            )}
          </div>
        </div>
      ) : (
        /* ===== Детское подменю ===== */
        <div className="relative z-[1] mt-4 flex w-full max-w-lg flex-col gap-2.5">
          <button
            type="button"
            onClick={() => setView('main')}
            className="flex items-center gap-1.5 self-start rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-teal-800 shadow-sm transition hover:scale-105 active:scale-95"
          >
            <IconBack className="h-4 w-4" /> {t.back}
          </button>

          <button type="button" onClick={onKidsOnet} className="mode-card mode-card--kids">
            <ModeThumbs names={['fox', 'giraffe', 'cow']} />
            <span className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-1.5 text-lg font-black text-teal-900">
                <IconLink className="h-6 w-6" /> {t.kidsOnetTitle}
              </span>
              <span className="mode-card-desc">{t.kidsOnetDesc}</span>
              <span className="block text-sm font-black text-emerald-700">
                {t.continueKids(kidsLevel)}
              </span>
            </span>
            <IconArrowRight className="h-6 w-6 shrink-0 text-emerald-500/70" />
          </button>

          <button type="button" onClick={onKidsMemory} className="mode-card mode-card--kids">
            <ModeThumbs names={['penguin', 'mango', 'rabbit']} />
            <span className="min-w-0 flex-1 text-left">
              <span className="flex items-center gap-1.5 text-lg font-black text-teal-900">
                <IconCards className="h-6 w-6" /> {t.memoryTitle}
              </span>
              <span className="mode-card-desc">{t.memoryDesc}</span>
              <span className="block text-sm font-black text-sky-700">
                {t.continueKids(kidsLevel)}
              </span>
            </span>
            <IconArrowRight className="h-6 w-6 shrink-0 text-sky-500/70" />
          </button>

          {/* Сложность: Проще / Посложнее */}
          <div className="flex items-center justify-between rounded-2xl bg-white/75 px-4 py-2.5 ring-1 ring-white/60">
            <span className="text-sm font-bold text-teal-900/70">{t.difficulty}</span>
            <div className="flex overflow-hidden rounded-full bg-teal-100 p-0.5">
              <button
                type="button"
                onClick={() => onKidsDifficulty(false)}
                className={
                  'rounded-full px-3 py-1 text-sm font-black transition ' +
                  (!kidsHarder ? 'bg-amber-500 text-white shadow' : 'text-teal-800/70 hover:bg-teal-50')
                }
              >
                {t.easier}
              </button>
              <button
                type="button"
                onClick={() => onKidsDifficulty(true)}
                className={
                  'rounded-full px-3 py-1 text-sm font-black transition ' +
                  (kidsHarder ? 'bg-amber-500 text-white shadow' : 'text-teal-800/70 hover:bg-teal-50')
                }
              >
                {t.harder}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Настройки — отдельное окно (язык и звук не мешают в меню) */}
      {showSettings && (
        <SettingsModal
          t={t}
          lang={lang}
          soundOn={soundOn}
          onLangChange={onLangChange}
          onToggleSound={onToggleSound}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Подтверждение новой игры: всё сбросится */}
      {confirmNew && (
        <ModalShell>
          <div className="flex justify-center" aria-hidden="true">
            <IconRefresh className="h-12 w-12" />
          </div>
          <h2 className="mt-2 text-xl font-black text-teal-900">{t.confirmNewTitle}</h2>
          <p className="mt-2 text-sm font-semibold text-teal-900/60">{t.confirmNewBody}</p>
          <div className="mt-5 flex flex-col gap-2.5">
            <Button
              onClick={onNewGame}
              className="h-11 w-full rounded-full bg-rose-500 text-sm font-bold text-white shadow-lg hover:bg-rose-600 active:scale-95"
            >
              {t.startOver}
            </Button>
            <Button
              onClick={() => setConfirmNew(false)}
              variant="ghost"
              className="h-10 w-full rounded-full text-sm font-bold text-teal-900/60 hover:bg-teal-50 active:scale-95"
            >
              {t.cancel}
            </Button>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

/* ============ Настройки (отдельное окно) ============ */

export interface SettingsModalProps {
  t: UIStrings;
  lang: Lang;
  soundOn: boolean;
  onLangChange: (lang: Lang) => void;
  onToggleSound: () => void;
  onClose: () => void;
}

export function SettingsModal({
  t,
  lang,
  soundOn,
  onLangChange,
  onToggleSound,
  onClose,
}: SettingsModalProps) {
  return (
    <ModalShell>
      <div className="flex justify-center" aria-hidden="true">
        <IconGear className="h-12 w-12" />
      </div>
      <h2 className="mt-2 text-xl font-black text-teal-900">{t.settingsTitle}</h2>

      {/* Язык */}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-teal-50/70 px-4 py-3 ring-1 ring-teal-100">
        <span className="flex items-center gap-1.5 text-sm font-bold text-teal-900/70">
          <IconGlobe className="h-5 w-5" /> {t.language}
        </span>
        <div className="flex overflow-hidden rounded-full bg-teal-100 p-0.5">
          <button
            type="button"
            onClick={() => onLangChange('ru')}
            className={
              'rounded-full px-3 py-1 text-sm font-black transition ' +
              (lang === 'ru' ? 'bg-teal-600 text-white shadow' : 'text-teal-800/70 hover:bg-teal-50')
            }
          >
            Русский
          </button>
          <button
            type="button"
            onClick={() => onLangChange('en')}
            className={
              'rounded-full px-3 py-1 text-sm font-black transition ' +
              (lang === 'en' ? 'bg-teal-600 text-white shadow' : 'text-teal-800/70 hover:bg-teal-50')
            }
          >
            English
          </button>
        </div>
      </div>

      {/* Звук */}
      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-teal-50/70 px-4 py-3 ring-1 ring-teal-100">
        <span className="flex items-center gap-1.5 text-sm font-bold text-teal-900/70">
          {soundOn ? <IconSoundOn className="h-5 w-5" /> : <IconSoundOff className="h-5 w-5" />}{' '}
          {t.sound}
        </span>
        <button
          type="button"
          onClick={onToggleSound}
          className={
            'flex h-8 w-16 items-center rounded-full p-1 transition ' +
            (soundOn ? 'bg-emerald-400' : 'bg-slate-300')
          }
          aria-label={soundOn ? t.soundOn : t.soundOff}
        >
          <span
            className={
              'h-6 w-6 rounded-full bg-white shadow transition-transform ' +
              (soundOn ? 'translate-x-8' : 'translate-x-0')
            }
          />
        </button>
      </div>

      <Button
        onClick={onClose}
        autoFocus
        className="mt-5 h-11 w-full rounded-full bg-teal-600 text-sm font-bold text-white shadow-lg hover:bg-teal-700 active:scale-95"
      >
        {t.lbClose}
      </Button>
    </ModalShell>
  );
}

/* ============ Баннер уровня (не блокирует игру) ============ */

export interface LevelBannerProps {
  level: number;
  t: UIStrings;
  /** детский режим — показываем тему уровня */
  kids?: boolean;
  theme?: LevelTheme;
  /** уровень-чекпоинт: «пройди — и игра сохранится» */
  checkpoint?: boolean;
}

export function LevelBanner({ level, t, kids, theme, checkpoint }: LevelBannerProps) {
  const easy = isEasyLevel(level);
  let sub: string | undefined;
  if (kids) {
    sub = t.themeLabel(theme ?? 'mixed');
  } else if (checkpoint) {
    sub = t.bannerCheckpoint;
  } else {
    sub = easy ? t.bannerEasy : t.gravity[gravityForLevel(level)];
  }
  return (
    <div
      className="level-banner"
      role="status"
      aria-live="polite"
    >
      <span>{t.level(level)}</span>
      {sub && <span className="level-banner-sub">{sub}</span>}
    </div>
  );
}

/* ============ Пауза ============ */

export interface PauseModalProps {
  t: UIStrings;
  level: number;
  onResume: () => void;
  onMenu: () => void;
  /** детский режим: «пропустить уровень за рекламу» */
  onSkipLevel?: () => void;
  adBusy?: boolean;
}

export function PauseModal({ t, level, onResume, onMenu, onSkipLevel, adBusy }: PauseModalProps) {
  return (
    <ModalShell>
      <div className="flex justify-center" aria-hidden="true">
        <IconPause className="h-12 w-12" />
      </div>
      <h2 className="mt-2 text-2xl font-black text-teal-900">{t.pauseTitle}</h2>
      <p className="mt-1 text-sm font-semibold text-teal-900/60">{t.level(level)}</p>
      <div className="mt-5 flex flex-col gap-2.5">
        <Button
          onClick={onResume}
          autoFocus
          className="h-12 w-full rounded-full bg-emerald-500 text-base font-bold text-white shadow-lg hover:bg-emerald-600 active:scale-95"
        >
          {t.resume}
        </Button>
        {onSkipLevel && (
          <Button
            onClick={onSkipLevel}
            disabled={adBusy}
            className="h-11 w-full rounded-full bg-amber-500 text-sm font-black text-white shadow-lg hover:bg-amber-600 active:scale-95 disabled:opacity-50"
          >
            <IconSkip className="mr-2 h-4 w-4" /> {t.skipLevel}
          </Button>
        )}
        <Button
          onClick={onMenu}
          variant="ghost"
          className="h-11 w-full rounded-full text-teal-900/60 hover:bg-teal-50 active:scale-95"
        >
          <IconHome className="mr-2 h-4 w-4" /> {t.exitToMenu}
        </Button>
      </div>
    </ModalShell>
  );
}

/* ============ Подтверждение выхода (сброс до чекпоинта) ============ */

export interface ExitConfirmModalProps {
  t: UIStrings;
  resetLevel: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ExitConfirmModal({ t, resetLevel, onConfirm, onCancel }: ExitConfirmModalProps) {
  return (
    <ModalShell>
      <div className="flex justify-center" aria-hidden="true">
        <IconDoor className="h-12 w-12" />
      </div>
      <h2 className="mt-2 text-xl font-black text-teal-900">{t.exitTitle}</h2>
      <p className="mt-2 text-sm font-semibold text-teal-900/70">{t.exitBody(resetLevel)}</p>
      <div className="mt-5 flex flex-col gap-2.5">
        <Button
          onClick={onConfirm}
          className="h-11 w-full rounded-full bg-rose-500 text-sm font-bold text-white shadow-lg hover:bg-rose-600 active:scale-95"
        >
          {t.exitConfirm}
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="h-11 w-full rounded-full border-teal-200 text-sm font-bold text-teal-800 hover:bg-teal-50 active:scale-95"
        >
          {t.stay}
        </Button>
      </div>
    </ModalShell>
  );
}

/* ============ Победа ============ */

export interface WinInfo {
  level: number;
  levelScore: number;
  timeBonus: number;
  earned: Bonuses;
  /** как продолжить после победы (детский режим) */
  mode?: 'classic' | 'kids';
  kidsGame?: 'onet' | 'memory';
}

export interface WinModalProps {
  t: UIStrings;
  info: WinInfo;
  streak: number;
  /** уровень-чекпоинт пройден — прогресс сохранён */
  saved?: boolean;
  /** детский режим — без серии и чекпоинтов */
  kids?: boolean;
  onNext: () => void;
  onMenu: () => void;
}

export function WinModal({ t, info, streak, saved, kids, onNext, onMenu }: WinModalProps) {
  const gained = info.levelScore + info.timeBonus;
  const earned = [
    info.earned.hint > 0 ? { n: '+1', Icon: IconHint } : null,
    info.earned.shuffle > 0 ? { n: '+1', Icon: IconShuffle } : null,
    info.earned.freeze > 0 ? { n: '+1', Icon: IconFreeze } : null,
  ].filter(Boolean) as { n: string; Icon: React.ComponentType<GameIconProps> }[];
  return (
    <ModalShell>
      <div className="flex justify-center" aria-hidden="true">
        <IconParty className="h-12 w-12" />
      </div>
      <h2 className="mt-2 text-2xl font-black text-teal-900">{t.winTitle(info.level)}</h2>
      <div className="mt-3 flex items-center justify-center gap-1.5 text-3xl font-black tabular-nums text-emerald-600">
        +{gained} <IconStar className="h-7 w-7" />
      </div>
      {saved && (
        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800 ring-1 ring-emerald-200">
          <IconFlag className="h-4 w-4" /> {t.winSaved}
        </p>
      )}
      {!kids && streak > 0 && (
        <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-bold text-orange-600/90">
          <IconFire className="h-4.5 w-4.5" /> {t.winStreak(streak)}
        </p>
      )}
      {earned.length > 0 && (
        <div className="mt-2 flex justify-center gap-3">
          {earned.map(({ n, Icon }) => (
            <span
              key={Icon.name ?? 'bonus'}
              className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-sm font-black text-amber-700 ring-1 ring-amber-200"
            >
              {n} <Icon className="h-4.5 w-4.5" />
            </span>
          ))}
        </div>
      )}
      <div className="mt-5 flex flex-col gap-2.5">
        <Button
          onClick={onNext}
          autoFocus
          className="h-12 w-full rounded-full bg-emerald-500 text-base font-black text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 active:scale-95"
        >
          {t.next}
        </Button>
        <Button
          onClick={onMenu}
          variant="ghost"
          className="h-11 w-full rounded-full text-teal-900/60 hover:bg-teal-50 active:scale-95"
        >
          <IconHome className="mr-2 h-4 w-4" /> {t.toMenu}
        </Button>
      </div>
    </ModalShell>
  );
}

/* ============ Проигрыш: классика — сброс до чекпоинта + реклама;
   детский — без сброса: просто «попробуй ещё раз» ============ */

export interface GameOverModalProps {
  t: UIStrings;
  level: number;
  resetLevel: number;
  nextCp: number;
  totalScore: number;
  /** можно ли повторить уровень за рекламу (1 раз на уровень) */
  canAdRetry: boolean;
  adBusy: boolean;
  /** результат попал в топ-10 — предложить ввести имя */
  qualified: boolean;
  playerName: string;
  /** режим: классика (сброс до чекпоинта) или детский (без сброса) */
  mode?: 'classic' | 'kids';
  onNameChange: (name: string) => void;
  onAdRetry: () => void;
  onFromCheckpoint: () => void;
  /** детский: пропустить уровень за рекламу */
  onSkip?: () => void;
  onMenu: () => void;
}

export function GameOverModal({
  t,
  level,
  resetLevel,
  nextCp,
  totalScore,
  canAdRetry,
  adBusy,
  qualified,
  playerName,
  mode = 'classic',
  onNameChange,
  onAdRetry,
  onFromCheckpoint,
  onSkip,
  onMenu,
}: GameOverModalProps) {
  const kids = mode === 'kids';
  return (
    <ModalShell>
      <div className="flex justify-center" aria-hidden="true">
        {kids ? <IconKids className="h-12 w-12" /> : <IconClock className="h-12 w-12" />}
      </div>
      <h2 className="mt-2 text-2xl font-black text-rose-700">
        {kids ? t.kidsOverTitle : t.gameOverTitle}
      </h2>
      <p className="mt-1 text-sm font-semibold text-teal-900/60">{t.level(level)}</p>
      {kids ? (
        <p className="mt-2 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
          {t.kidsOverBody}
        </p>
      ) : (
        <p className="mt-2 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-800 ring-1 ring-amber-200">
          {t.gameOverReset(resetLevel, nextCp)}
        </p>
      )}
      <p className="mt-2 flex items-center justify-center gap-1.5 text-sm font-bold text-teal-900/70">
        <IconStar className="h-4.5 w-4.5" /> {totalScore}
      </p>

      {qualified && !kids && (
        <div className="mt-3 text-left">
          <p className="flex items-center justify-center gap-1.5 text-xs font-black text-amber-600">
            <IconTrophy className="h-4 w-4" /> {t.inTop10}
          </p>
          <input
            type="text"
            value={playerName}
            maxLength={16}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t.yourName}
            aria-label={t.yourName}
            className="mt-1 w-full rounded-full border-2 border-teal-200 bg-white px-4 py-2 text-center text-sm font-bold text-teal-900 outline-none focus:border-teal-400"
          />
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2.5">
        {kids && onSkip && (
          <Button
            onClick={onSkip}
            disabled={adBusy}
            autoFocus
            className="h-12 w-full rounded-full bg-amber-500 text-sm font-black text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 disabled:opacity-50"
          >
            <IconSkip className="mr-2 h-5 w-5" /> {t.skipLevel}
          </Button>
        )}
        {!kids && canAdRetry && (
          <Button
            onClick={onAdRetry}
            disabled={adBusy}
            autoFocus
            className="h-12 w-full rounded-full bg-amber-500 text-sm font-black text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 disabled:opacity-50"
          >
            <IconAd className="mr-2 h-5 w-5" /> {t.adRetry(level)}
          </Button>
        )}
        <Button
          onClick={() => onFromCheckpoint()}
          className={
            'h-12 w-full rounded-full bg-emerald-500 text-base font-black text-white shadow-lg hover:bg-emerald-600 active:scale-95 ' +
            (canAdRetry && !kids ? 'mt-0' : '')
          }
        >
          {kids ? t.tryAgain : t.fromCheckpoint(resetLevel)}
        </Button>
        <Button
          onClick={onMenu}
          variant="ghost"
          className="h-11 w-full rounded-full text-teal-900/60 hover:bg-teal-50 active:scale-95"
        >
          <IconHome className="mr-2 h-4 w-4" /> {t.toMenu}
        </Button>
      </div>
    </ModalShell>
  );
}

/* ============ Бонус закончился: +1 за рекламу ============ */

export interface AdOfferModalProps {
  t: UIStrings;
  bonus: BonusKind;
  onWatch: () => void;
  onClose: () => void;
}

const BONUS_ICONS: Record<BonusKind, React.ComponentType<GameIconProps>> = {
  hint: IconHint,
  shuffle: IconShuffle,
  freeze: IconFreeze,
};

export function AdOfferModal({ t, bonus, onWatch, onClose }: AdOfferModalProps) {
  const BonusIcon = BONUS_ICONS[bonus];
  const b = t.bonusNames[bonus];
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-white/95 p-6 pt-8 text-center shadow-2xl ring-1 ring-white/60 animate-in zoom-in-95 duration-200">
        {/* крестик в углу */}
        <button
          type="button"
          onClick={onClose}
          aria-label={t.cancel}
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700 transition hover:bg-amber-100 active:scale-90"
        >
          <IconX className="h-5 w-5" />
        </button>

        <div className="flex justify-center" aria-hidden="true">
          <BonusIcon className="h-12 w-12" />
        </div>
        <h2 className="mt-2 text-xl font-black text-teal-900">{t.bonusOver(b)}</h2>
        <p className="mt-2 text-sm font-semibold text-teal-900/70">{t.adOfferBody(b)}</p>

        {/* одна большая кнопка по центру */}
        <button
          type="button"
          onClick={onWatch}
          className="mt-5 flex h-16 w-full items-center justify-center gap-2.5 rounded-full bg-gradient-to-b from-amber-400 to-amber-500 px-6 text-lg font-black text-white shadow-lg shadow-amber-500/40 ring-2 ring-amber-300 transition hover:brightness-105 active:scale-95"
        >
          <IconAd className="h-6 w-6" /> {t.watchAd}
        </button>
      </div>
    </div>
  );
}

/* ============ Заглушка рекламы (когда РСЯ недоступна) ============ */

export interface SimAdOverlayProps {
  t: UIStrings;
  /** длительность «рекламы», сек */
  seconds?: number;
  onDone: () => void;
}

export function SimAdOverlay({ t, seconds = 5, onDone }: SimAdOverlayProps) {
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(false);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const started = Date.now();
    const iv = window.setInterval(() => {
      const l = Math.max(0, seconds - Math.floor((Date.now() - started) / 1000));
      setLeft(l);
      if (l <= 0 && !doneRef.current) {
        doneRef.current = true;
        window.clearInterval(iv);
        onDoneRef.current();
      }
    }, 200);
    return () => window.clearInterval(iv);
  }, [seconds]);

  const progress = seconds > 0 ? ((seconds - left) / seconds) * 100 : 100;

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center gap-6 bg-slate-950/95 p-6 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={t.adLabel}
    >
      <div className="absolute left-3 top-3 rounded bg-yellow-400 px-2 py-0.5 text-xs font-black tracking-widest text-slate-900">
        {t.adLabel}
      </div>
      <div className="absolute right-3 top-3 text-xs font-bold text-white/40">{t.adDemo}</div>

      {/* «рекламный» баннер-заглушка */}
      <div className="flex h-40 w-full max-w-xs flex-col items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 ring-1 ring-white/10">
        <IconAd className="h-14 w-14" />
        <span className="px-6 text-center text-sm font-bold text-white/50">
          {t.gameTitle} · {t.gameSubtitle}
        </span>
      </div>

      <div className="flex w-full max-w-xs flex-col items-center gap-2">
        <div className="text-sm font-bold text-white/80">{t.adRewardIn(left)}</div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ============ Турнирная таблица ============ */

export interface LeaderboardModalProps {
  t: UIStrings;
  rows: LeaderRow[];
  bestStreak: number;
  /** имя игрока — вводится прямо в таблице */
  playerName: string;
  onNameChange: (name: string) => void;
  onClose: () => void;
}

export function LeaderboardModal({
  t,
  rows,
  bestStreak,
  playerName,
  onNameChange,
  onClose,
}: LeaderboardModalProps) {
  return (
    <ModalShell>
      <div className="flex justify-center" aria-hidden="true">
        <IconTrophy className="h-12 w-12" />
      </div>
      <h2 className="mt-2 text-xl font-black text-teal-900">{t.lbTitle}</h2>

      {/* имя игрока: вводится здесь, попадает в таблицу */}
      <div className="mt-4 text-left">
        <label
          htmlFor="lb-name"
          className="flex items-center gap-1.5 text-xs font-black text-teal-900/70"
        >
          <IconKids className="h-4 w-4" /> {t.yourName}
        </label>
        <input
          id="lb-name"
          type="text"
          value={playerName}
          maxLength={16}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={t.nameDefault}
          aria-label={t.yourName}
          className="mt-1 w-full rounded-full border-2 border-teal-200 bg-white px-4 py-2 text-center text-sm font-bold text-teal-900 outline-none focus:border-teal-400"
        />
        <p className="mt-1 text-center text-[0.65rem] font-semibold text-teal-900/50">{t.nameHint}</p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm font-semibold text-teal-900/60">{t.lbEmpty}</p>
      ) : (
        <table className="mt-3 w-full text-left text-xs font-semibold text-teal-900/85">
          <thead>
            <tr className="text-[0.65rem] uppercase tracking-wide text-teal-900/45">
              <th className="py-1 pr-1">{t.lbRank}</th>
              <th className="py-1">{t.lbName}</th>
              <th className="py-1 text-right">{t.lbScore}</th>
              <th className="py-1 text-right">{t.lbLevel}</th>
              <th className="py-1 text-right">{t.lbStreak}</th>
              <th className="py-1 pl-1 text-right">{t.lbDate}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i === 0 ? 'rounded-lg bg-amber-50/80' : ''}>
                <td className="py-1.5 pr-1 font-black text-teal-800">{i + 1}</td>
                <td className="max-w-[6rem] truncate py-1.5">{row.name}</td>
                <td className="py-1.5 text-right tabular-nums">{row.score}</td>
                <td className="py-1.5 text-right tabular-nums">{row.level}</td>
                <td className="py-1.5 text-right tabular-nums">
                  <span className="inline-flex items-center gap-0.5">
                    {row.streak > 0 && <IconFire className="h-3.5 w-3.5" />}
                    {row.streak}
                  </span>
                </td>
                <td className="py-1.5 pl-1 text-right text-teal-900/50">{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {bestStreak > 0 && (
        <p className="mt-3 flex items-center justify-center gap-1 text-xs font-black text-orange-600/90">
          <IconFire className="h-4 w-4" /> {t.lbBestStreak(bestStreak)}
        </p>
      )}
      <Button
        onClick={onClose}
        autoFocus
        className="mt-4 h-11 w-full rounded-full bg-teal-600 text-sm font-bold text-white shadow-lg hover:bg-teal-700 active:scale-95"
      >
        {t.lbClose}
      </Button>
    </ModalShell>
  );
}

/* ============ Тост и комбо ============ */

export function Toast({ message }: { message: string }) {
  return (
    <div
      className="toast-in pointer-events-none absolute left-1/2 top-3 z-30 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/70 px-4 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-sm"
      role="status"
    >
      {message}
    </div>
  );
}

export function ComboChip({ combo }: { combo: number }) {
  return (
    <span
      key={combo}
      className="combo-bounce inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-black text-orange-600 ring-1 ring-orange-200"
    >
      ⚡ ×{combo}
    </span>
  );
}
