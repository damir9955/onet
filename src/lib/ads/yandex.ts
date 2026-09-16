/**
 * Реклама с вознаграждением — Рекламная сеть Яндекса (РСЯ).
 *
 * Данные блока из кабинета РСЯ (приложение ONET, ID 20010879):
 *   - блок «Реклама с вознаграждением» (Rewarded)
 *   - ID блока: R-M-20010879-1
 *   - вознаграждение: 1 Reward
 *
 * SDK подключается скриптом https://yandex.ru/ads/system/context.js
 * и рендерится через Ya.Context.AdvManager.render({ type: 'rewarded' }).
 * Показ запускается ТОЛЬКО по клику игрока (требование формата).
 *
 * Если SDK не загрузился / реклама не отдалась (домен без модерации,
 * дев-среда, блокировщик) — возвращаем 'error', и вызывающий код
 * показывает собственную заглушку «рекламы» с обратным отсчётом,
 * чтобы игрок не застревал без награды.
 */

export const YANDEX_REWARDED_BLOCK_ID = 'R-M-20010879-1';

export type RewardedResult =
  /** досмотрено — выдать вознаграждение */
  | 'rewarded'
  /** закрыто раньше времени — без награды */
  | 'closed'
  /** SDK недоступен / ошибка / таймаут — показать заглушку */
  | 'error';

interface AdvManagerRenderOptions {
  blockId: string;
  type: 'rewarded';
  platform: 'desktop' | 'mobile';
  onRewarded?: (isViewed: boolean) => void;
  onClose?: () => void;
  onError?: () => void;
}

declare global {
  interface Window {
    yaContextCb?: Array<() => void>;
    Ya?: {
      Context?: {
        AdvManager?: {
          render: (options: AdvManagerRenderOptions) => void;
        };
      };
    };
  }
}

const SDK_URL = 'https://yandex.ru/ads/system/context.js';
const SDK_LOAD_TIMEOUT_MS = 6000;
/** если за это время ни один колбэк не пришёл — считаем ошибкой */
const AD_SETTLE_TIMEOUT_MS = 15000;
/** onClose может прийти РАНЬШЕ onRewarded (реальная гонка в SDK РСЯ —
 *  фидбек v1.7.0: «реклама проходит, но ничего не меняется»): даём
 *  награде столько времени, чтобы «догнать» закрытие */
const AD_REWARD_GRACE_MS = 2500;
/** если onRewarded не пришёл вовсе, но реклама была открыта столько —
 *  считаем досмотром (у веб-rewarded РСЯ колбэк награды нередко
 *  пропадает вовсе, а игрок ролик посмотрел) */
const AD_MIN_VIEW_MS = 8000;

let sdkPromise: Promise<boolean> | null = null;

function isMobile(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|Mobi/i.test(navigator.userAgent);
}

/** Загрузить SDK один раз (лениво, при первом показе рекламы) */
function ensureSdk(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Ya?.Context?.AdvManager) return Promise.resolve(true);
  if (!sdkPromise) {
    sdkPromise = new Promise<boolean>((resolve) => {
      window.yaContextCb = window.yaContextCb ?? [];
      if (!document.querySelector('script[data-yandex-ads]')) {
        const script = document.createElement('script');
        script.src = SDK_URL;
        script.async = true;
        script.dataset.yandexAds = '1';
        document.head.appendChild(script);
      }
      const started = Date.now();
      const iv = window.setInterval(() => {
        if (window.Ya?.Context?.AdvManager) {
          window.clearInterval(iv);
          resolve(true);
        } else if (Date.now() - started > SDK_LOAD_TIMEOUT_MS) {
          window.clearInterval(iv);
          resolve(false);
        }
      }, 150);
    });
  }
  return sdkPromise;
}

/**
 * ПРЕДЗАГРУЗКА SDK рекламы (фидбек v1.6.0): раньше скрипт РСЯ начинал
 * качаться только по клику «Смотреть рекламу» — на телефоне это до
 * 8 секунд ТИШИНЫ (кликнешь — ничего не появляется), а сам показ
 * вызывался уже вне жеста пользователя и мог опаздывать поверх
 * перезапущенной игры. Теперь SDK грузится заранее (сразу после
 * загрузки игры), и к моменту клика реклама показывается мгновенно.
 */
export function preloadAdSdk(): void {
  void ensureSdk();
}

/**
 * Показать rewarded-видео РСЯ. Вызывать строго из обработчика клика.
 * Возвращает 'rewarded' | 'closed' | 'error' (см. RewardedResult).
 */
export async function showRewardedAd(): Promise<RewardedResult> {
  const sdkReady = await ensureSdk();
  const manager = window.Ya?.Context?.AdvManager;
  if (!sdkReady || !manager) return 'error';

  return new Promise<RewardedResult>((resolve) => {
    let settled = false;
    let rewarded = false;
    /* приходил ли onRewarded вообще (даже с false) */
    let rewardedFired = false;
    let settleTimer = 0;
    let closeGraceTimer = 0;
    let renderedAt = 0;

    const finish = (result: RewardedResult) => {
      if (settled) return;
      settled = true;
      if (settleTimer) window.clearTimeout(settleTimer);
      if (closeGraceTimer) window.clearTimeout(closeGraceTimer);
      resolve(result);
    };

    settleTimer = window.setTimeout(() => finish('error'), AD_SETTLE_TIMEOUT_MS);

    const options: AdvManagerRenderOptions = {
      blockId: YANDEX_REWARDED_BLOCK_ID,
      type: 'rewarded',
      platform: isMobile() ? 'mobile' : 'desktop',
      onRewarded: (isViewed: boolean) => {
        rewardedFired = true;
        if (isViewed) {
          rewarded = true;
          finish('rewarded');
        }
        /* isViewed=false — сразу награду НЕ отдаём: дождёмся onClose */
      },
      onClose: () => {
        /* ГОНКА КОЛБЭКОВ (фидбек v1.7.0): SDK часто присылает onClose
           ДО onRewarded (или вовсе без него) — раньше мы тут же решали
           «closed», игрок смотрел рекламу и НЕ получал уровень.
           Теперь: ждём grace-период, вдруг награда придёт следом; если
           её не было вовсе, а реклама висела достаточно долго —
           честно считаем досмотром. */
        if (closeGraceTimer) window.clearTimeout(closeGraceTimer);
        closeGraceTimer = window.setTimeout(() => {
          if (rewarded) finish('rewarded');
          else if (rewardedFired) finish('closed');
          else if (renderedAt && Date.now() - renderedAt >= AD_MIN_VIEW_MS) finish('rewarded');
          else finish('closed');
        }, AD_REWARD_GRACE_MS);
      },
      onError: () => finish('error'),
    };

    const renderNow = () => {
      try {
        renderedAt = Date.now();
        manager.render(options);
      } catch {
        finish('error');
      }
    };

    try {
      if (window.Ya?.Context?.AdvManager) {
        /* SDK уже загружен — рендерим НАПРЯМУЮ, без очереди yaContextCb
           (очередь могла уже быть обработана при предзагрузке — тогда
           push мог бы никогда не исполниться) */
        renderNow();
      } else {
        window.yaContextCb = window.yaContextCb ?? [];
        window.yaContextCb.push(renderNow);
      }
    } catch {
      finish('error');
    }
  });
}
