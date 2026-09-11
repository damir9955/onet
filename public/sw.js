/**
 * Service Worker «Клик-Клак»: приложение открывается МГНОВЕННО
 * после установки на рабочий стол (и работает без сети).
 *
 * Проблема, которую решает: установленное PWA при каждом запуске
 * качало HTML и JS-бандлы заново — на мобильном интернете это
 * секунды белого/сплэш-экрана. Теперь оболочка игры лежит в кеше:
 *
 *  - при установке SW префишит оболочку: страницу, манифест, иконки,
 *    фон меню, рубашку карточки и картинки стартового экрана;
 *  - HTML-навигация — stale-while-revalidate: мгновенно из кеша,
 *    свежая версия подтягивается в фоне (запустится в следующий раз);
 *  - иммутабельные ассеты Next (_next/static, иконки, картинки видов) —
 *    cache-first: один раз скачали — всегда отдаём с диска;
 *  - новые версии SW активируются сразу (skipWaiting + clients.claim),
 *    старые кеши вычищаются.
 */

const VERSION = 'klik-klak-v1';
const PRECACHE = [
  '/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/maskable-512.png',
  '/icon.svg',
  '/menu-bg.webp',
  '/tiles/card-back.webp',
  /* картинки стартового экрана загрузки — первый кадр без мерцания */
  '/tiles/lion.webp',
  '/tiles/apple.webp',
  '/tiles/dolphin.webp',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(VERSION);
      /* addAll атомарен: любая ошибка — и установка отменится (не кешируем
         мусор); при повторном визите попробуем снова */
      await cache.addAll(PRECACHE);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* 1) Навигация (открытие игры): кеш мгновенно, сеть — обновить кеш */
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(VERSION);
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
        /* сети нет, кеша нет — отдаём оболочку из префиша */
        return fresh || (await cache.match('/', { ignoreSearch: true })) || Response.error();
      })()
    );
    return;
  }

  /* 2) Всё остальное (статика, картинки): cache-first с фоновым наполнением */
  event.respondWith(
    (async () => {
      const cache = await caches.open(VERSION);
      const cached = await cache.match(req, { ignoreSearch: url.pathname.startsWith('/_next/') ? false : true });
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
