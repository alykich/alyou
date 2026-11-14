/* Service worker: сохраняет файлы приложения на устройстве, чтобы оно работало без интернета.
   Логика: если интернет есть — берём свежую версию с сайта и обновляем копию;
   если интернета нет — показываем сохранённую копию.
   При крупных изменениях можно поменять номер версии ниже — старая копия удалится. */
const CACHE = "dictant-v1";
const FILES = [
  "./",
  "./index.html",
  "./sounds.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      // каждый файл по отдельности: если какого-то нет (например, sounds.js), остальные всё равно сохранятся
      Promise.all(FILES.map((f) => c.add(f).catch(() => {})))
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !isFont) return;

  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res && (res.ok || res.type === "opaque")) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(
          (r) => r || (req.mode === "navigate" ? caches.match("./index.html") : undefined)
        )
      )
  );
});
