/**
 * Service Worker «Клик-Клак» v1.7.1: полная офлайн-установка.
 *
 * Ключевое отличие от прошлых версий: кеш ОДИН и СТАБИЛЬНЫЙ —
 * 'klik-klak-store'. При выходе новой версии SW его НЕ удаляет
 * (раньше activate вычищал чужие кеши — и полная офлайн-загрузка
 * терялась бы при каждом обновлении игры). Вычищаются только
 * легаси-кеши (klik-klak-v1/v2).
 *
 * Разделение труда:
 *  - SW при установке кладёт в кеш только ЛЁГКУЮ оболочку (страница,
 *    манифест, иконки, фон меню, рубашка) — установка не падает на
 *    слабой сети (ошибка addAll проглатывается);
 *  - ТЯЖЁЛУЮ часть (все 90 картинок видов + все _next-бандлы) качает
 *    загрузчик ПЕРВОЙ установки из интерфейса (lib/onet/offline.ts,
 *    BootLoader.tsx) — с полоской прогресса и повторами;
 *  - маркер «игра скачана целиком + версия» лежит в localStorage
 *    (kk-installed) и зеркалится в этот же кеш (/-kk-install-marker).
 *
 * Стратегии fetch:
 *  - НАВИГАЦИЯ (открытие игры) — мгновенно из кеша, свежая версия HTML
 *    подтягивается в фоне: обновление применяется при СЛЕДУЮЩЕМ запуске —
 *    пользователь ничего не замечает;
 *  - остальная статика — cache-first: один раз скачали, всегда с диска
 *    (игра полностью работает без интернета).
 */

const STORE = 'klik-klak-store';

const UI_ICONS = [
  'hint', 'shuffle', 'freeze', 'pause', 'play', 'star', 'ad', 'trophy',
  'gear', 'home', 'skip', 'clock', 'refresh', 'link', 'cards', 'tap',
  'kids', 'door', 'sound', 'sound-off', 'fire', 'party',
];

const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/menu-bg.webp',
  '/tiles/card-back.webp',
  ...UI_ICONS.map((n) => `/ui/${n}.webp`),
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(STORE);
        /* addAll атомарен; на слабой сети он может сорваться — не беда:
           тяжёлую часть всё равно скачает загрузчик первой установки */
        await cache.addAll(PRECACHE);
      } catch (e) {
        /* оболочка доедет при первом же fetch (cache-first подложит) */
      }
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      /* вычищаем ТОЛЬКО чужие/легаси-кеши; стабильный STORE не трогаем */
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STORE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* 1) Навигация (открытие игры): кеш мгновенно, сеть — обновить кеш
        в фоне. Если сети нет и кеша нет — отдаём оболочку из префиша */
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(STORE);
        const cached = await cache.match(req, { ignoreSearch: true });
        const network = fetch(req)
          .then((res) => {
            if (res && res.ok) cache.put(req, res.clone());
            return res;
          })
          .catch(() => null);
        if (cached) {
          event.waitUntil(network);
          return cached;
        }
        const fresh = await network;
        return fresh || (await cache.match('/', { ignoreSearch: true })) || Response.error();
      })()
    );
    return;
  }

  /* 2) Статика (бандлы, картинки, иконки): cache-first с фоновым
        наполнением — после первой установки всё летает с диска */
  event.respondWith(
    (async () => {
      const cache = await caches.open(STORE);
      const cached = await cache.match(req, {
        ignoreSearch: url.pathname.startsWith('/_next/') ? false : true,
      });
      if (cached) return cached;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch {
        return cached || Response.error();
      }
    })()
  );
});
