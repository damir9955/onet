/**
 * Полная офлайн-установка игры «Клик-Клак» (v1.6.0).
 *
 * ЧТО ПРОСИЛ ПОЛЬЗОВАТЕЛЬ:
 *  1. При ПЕРВОЙ установке — скачать АБСОЛЮТНО ВСЕ файлы на телефон
 *     (загрузочное окно с полоской прогресса), и только потом запускать игру.
 *     Иначе «потом при заходе много картинок не прогружается».
 *  2. В конце — «специальный файл», подтверждающий, что игра скачана
 *     целиком + версия игры (маркер: localStorage + дублирующая запись
 *     в Cache API — переживает чистку localStorage).
 *  3. При повторном запуске — сначала проверить маркер: есть → открыть игру
 *     мгновенно; нет → скачать; есть, но на сервере новая версия → обновить
 *     В ФОНЕ незаметно и применить со СЛЕДУЮЩЕГО запуска.
 *
 * КАК ЭТО РАБОТАЕТ:
 *  - Маркер — ключ localStorage 'kk-installed' c { v, ts, files } + его копия
 *    в кеше (Response по адресу /-kk-install-marker, туда приложение никогда
 *    не обращается). Если localStorage снесли, а кеш цел — маркер
 *    восстанавливается и игра по-прежнему открывается мгновенно.
 *  - Полная загрузка: список = все 90 картинок видов + рубашка + фон меню +
 *    иконки + манифест + HTML + ВСЕ _next-бандлы, которые страница уже
 *    загрузила (в т.ч. ленивый чанк игры — его нет в HTML!) — берём из
 *    performance.getEntriesByType('resource') и DOM.
 *  - Кеш один и стабильный: 'klik-klak-store' (sw.js его не удаляет при
 *    обновлении — удаляются только легаси-кеши v1/v2). Файлы с постоянными
 *    именами (картинки, иконки) перезаписываются на месте.
 *  - Фоновое обновление: fetch('/') → <meta name="kk-version"> на сервере
 *    новее маркера → молча перекачиваем всё и обновляем маркер. Новая версия
 *    HTML уже лежит в кеше → при СЛЕДУЮЩЕМ запуске SW отдаст её мгновенно.
 *
 * Dev-режим: SW не регистрируется (ломает HMR), но загрузчик и кеш
 * (Cache API доступен на localhost) работают как в проде.
 */
import { ALL_KINDS } from './kinds';
import { APP_VERSION } from './appVersion';

/** стабильное имя кеша (см. public/sw.js — там константа STORE) */
export const STORE = 'klik-klak-store';
const MARKER_KEY = 'kk-installed';
const MARKER_URL = '/-kk-install-marker';

export interface InstallMarker {
  v: string;
  ts: number;
  files: number;
}

export interface DownloadProgress {
  done: number;
  total: number;
  failed: number;
}

/* ============ маркер «игра полностью скачана» ============ */

export function readMarkerLS(): InstallMarker | null {
  try {
    const raw = localStorage.getItem(MARKER_KEY);
    if (!raw) return null;
    const j = JSON.parse(raw) as InstallMarker;
    if (typeof j?.v === 'string' && typeof j?.ts === 'number') return j;
  } catch {
    /* приватный режим / битая строка — считаем, что маркера нет */
  }
  return null;
}

async function readMarkerCache(): Promise<InstallMarker | null> {
  try {
    const cache = await caches.open(STORE);
    const res = await cache.match(MARKER_URL);
    if (!res) return null;
    const j = (await res.json()) as InstallMarker;
    if (typeof j?.v === 'string' && typeof j?.ts === 'number') return j;
  } catch {
    /* кеш недоступен */
  }
  return null;
}

/** Маркер с учётом резервной копии в Cache API (localStorage могли снести). */
export async function readInstallMarker(): Promise<InstallMarker | null> {
  const ls = readMarkerLS();
  if (ls) return ls;
  const cached = await readMarkerCache();
  if (cached) {
    /* localStorage снесли, а кеш цел — восстанавливаем «файл» */
    try {
      localStorage.setItem(MARKER_KEY, JSON.stringify(cached));
    } catch {
      /* ничего страшного: копия в кеше остаётся */
    }
    return cached;
  }
  return null;
}

/** Записать маркер: localStorage + зеркало в Cache API. */
export async function writeInstallMarker(files: number): Promise<InstallMarker> {
  const marker: InstallMarker = { v: APP_VERSION, ts: Date.now(), files };
  try {
    localStorage.setItem(MARKER_KEY, JSON.stringify(marker));
  } catch {
    /* localStorage может быть недоступен — зеркало в кеше выручит */
  }
  try {
    const cache = await caches.open(STORE);
    await cache.put(
      MARKER_URL,
      new Response(JSON.stringify(marker), {
        headers: { 'Content-Type': 'application/json' },
      })
    );
  } catch {
    /* без кеша маркер останется хотя бы в localStorage */
  }
  return marker;
}

/* ============ список файлов для полной загрузки ============ */

/** стабильные файлы: картинки видов + рубашка + фон меню + иконки +
 *  3D-значки бонусов/управления (/ui) + манифест */
const UI_ICONS = [
  'hint',
  'shuffle',
  'freeze',
  'pause',
  'play',
  'star',
  'ad',
  'trophy',
  'gear',
  'home',
  'skip',
  'clock',
  'refresh',
  'link',
  'cards',
  'tap',
  'kids',
  'door',
  'sound',
  'sound-off',
  'fire',
  'party',
] as const;

function staticAssets(): string[] {
  const tiles = ALL_KINDS.map((k) => `/tiles/${k.name}.webp`);
  return [
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/maskable-512.png',
    '/menu-bg.webp',
    '/tiles/card-back.webp',
    ...UI_ICONS.map((n) => `/ui/${n}.webp`),
    ...tiles,
  ];
}

/** URL → путь этого origin (для _next-бандлов) */
function sameOriginPath(u: string): string | null {
  try {
    const url = new URL(u, location.href);
    if (url.origin !== location.origin) return null;
    return url.pathname + url.search;
  } catch {
    return null;
  }
}

/**
 * Все _next-ресурсы, которые СТРАНИЦА УЖЕ загрузила (скрипты, стили) —
 * включая ленивый чанк игры (next/dynamic): его адреса нет в HTML,
 * но есть в performance-журнале. Без этого офлайн-запуск падал бы
 * на полпути к меню.
 */
function loadedBundles(): string[] {
  const urls = new Set<string>();
  const add = (u: string | null | undefined) => {
    if (!u) return;
    const p = sameOriginPath(u);
    if (p && (p.startsWith('/_next/') || p === '/sw.js')) urls.add(p);
  };
  document
    .querySelectorAll<HTMLScriptElement>('script[src]')
    .forEach((s) => add(s.src));
  document
    .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')
    .forEach((l) => add(l.href));
  performance.getEntriesByType('resource').forEach((e) => add(e.name));
  return [...urls];
}

/** _next-скрипты/стили из СВЕЖЕГО HTML (для фонового обновления версии) */
function bundlesFromHtml(html: string): string[] {
  const urls = new Set<string>();
  const add = (u: string | null) => {
    if (!u) return;
    const p = sameOriginPath(u);
    if (p && p.startsWith('/_next/')) urls.add(p);
  };
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc
      .querySelectorAll<HTMLScriptElement>('script[src]')
      .forEach((s) => add(s.getAttribute('src')));
    doc
      .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]')
      .forEach((l) => add(l.getAttribute('href')));
  } catch {
    /* HTML не распарсился — ну и ладно, главный код всегда в кеше */
  }
  return [...urls];
}

/* ============ загрузка с прогрессом и повторами ============ */

/** файлы, скачанные в ЭТОЙ сессии — ретрай пропускает их мгновенно */
const doneThisSession = new Set<string>();

async function fetchIntoCache(url: string, cache: Cache): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      /* no-cache: файлы со стабильными именами обновляем до свежих */
      const res = await fetch(url, { cache: 'no-cache' });
      if (res.ok) {
        await cache.put(url, res);
        return true;
      }
    } catch {
      /* сеть моргнула — повторим */
    }
    await new Promise((r) => setTimeout(r, 350 * attempt));
  }
  return false;
}

/**
 * Скачать АБСОЛЮТНО ВСЁ для офлайна. Прогресс — колбэком (полоска).
 * Ошибки не бросаем: возвращаем { ok, files, failed } — интерфейс решает,
 * показать «повторить» или продолжить (частичный кеш лучше никакого).
 */
export async function downloadEverything(
  onProgress?: (p: DownloadProgress) => void
): Promise<{ ok: boolean; files: number; failed: number }> {
  if (typeof caches === 'undefined') {
    /* кеш недоступен (старый браузер?) — играем просто без офлайна */
    return { ok: true, files: 0, failed: 0 };
  }
  const cache = await caches.open(STORE);
  const list = [...new Set([...staticAssets(), ...loadedBundles()])];
  let done = 0;
  let failed = 0;
  let idx = 0;
  const CONCURRENCY = 6;
  const worker = async () => {
    while (idx < list.length) {
      const url = list[idx++];
      if (doneThisSession.has(url)) {
        done++;
        onProgress?.({ done, total: list.length, failed });
        continue;
      }
      const ok = await fetchIntoCache(url, cache);
      if (ok) doneThisSession.add(url);
      else failed++;
      done++;
      onProgress?.({ done, total: list.length, failed });
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return { ok: failed === 0, files: list.length, failed };
}

/* ============ Service Worker и фоновое обновление ============ */

/** Зарегистрировать SW и попросить его провериться (только продакшн). */
export async function ensureServiceWorker(): Promise<void> {
  if (process.env.NODE_ENV !== 'production') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    reg.update().catch(() => {
      /* проверка обновления не критична */
    });
  } catch {
    /* нет HTTPS / приватный режим — просто играем без кеша */
  }
}

function htmlVersion(html: string): string | null {
  const m = html.match(/<meta\s+name="kk-version"\s+content="([^"]+)"/i);
  return m ? m[1] : null;
}

function isNewer(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da > db;
  }
  return false;
}

/**
 * Фоновое обновление — «незаметно для пользователя, применится в другой
 * запуск»: подтягиваем свежий HTML, сравниваем <meta kk-version> с маркером;
 * если сервер новее — молча перекачиваем все файлы (включая новые бандлы)
 * и обновляем маркер. Пользователь продолжает играть старой версией;
 * при СЛЕДУЮЩЕМ запуске SW мгновенно отдаст уже скачанный новый HTML.
 */
export async function silentUpdate(): Promise<void> {
  if (typeof caches === 'undefined') return;
  try {
    const marker = readMarkerLS() ?? (await readMarkerCache());
    if (!marker) return; /* ещё не установлено — загрузчик сам всё сделает */
    const res = await fetch('/', { cache: 'no-cache' });
    if (!res.ok) return;
    const html = await res.text();
    const serverV = htmlVersion(html);
    if (!serverV || serverV === marker.v || !isNewer(serverV, marker.v)) {
      return; /* обновлений нет */
    }
    /* новая версия: HTML в кеш + все её бандлы + все стабильные файлы */
    const cache = await caches.open(STORE);
    await cache.put('/', new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
    const bundles = bundlesFromHtml(html);
    let failed = 0;
    for (const url of [...bundles, ...staticAssets()]) {
      if (!(await fetchIntoCache(url, cache))) failed++;
    }
    /* перекачали (даже с несколькими ошибками — картинок в кеше полно):
       маркер под новой версией, следующий запуск — уже новая игра */
    await writeInstallMarker(0);
  } catch {
    /* сети нет — попробуем в следующий раз */
  }
}
