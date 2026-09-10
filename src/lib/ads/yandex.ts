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
const SDK_LOAD_TIMEOUT_MS = 8000;
/** если за это время ни один колбэк не пришёл — считаем ошибкой */
const AD_SETTLE_TIMEOUT_MS = 20000;

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
    let settleTimer = 0;

    const finish = (result: RewardedResult) => {
      if (settled) return;
      settled = true;
      if (settleTimer) window.clearTimeout(settleTimer);
      resolve(result);
    };

    settleTimer = window.setTimeout(() => finish('error'), AD_SETTLE_TIMEOUT_MS);

    const options: AdvManagerRenderOptions = {
      blockId: YANDEX_REWARDED_BLOCK_ID,
      type: 'rewarded',
      platform: isMobile() ? 'mobile' : 'desktop',
      onRewarded: (isViewed: boolean) => {
        if (isViewed) {
          rewarded = true;
          finish('rewarded');
        }
      },
      onClose: () => finish(rewarded ? 'rewarded' : 'closed'),
      onError: () => finish('error'),
    };

    try {
      window.yaContextCb = window.yaContextCb ?? [];
      window.yaContextCb.push(() => {
        try {
          manager.render(options);
        } catch {
          finish('error');
        }
      });
    } catch {
      finish('error');
    }
  });
}
