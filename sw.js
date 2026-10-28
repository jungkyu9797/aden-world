// 아덴 월드 웹 앱 (홈 화면 설치용) — 항상 최신 파일을 먼저 받고, 인터넷이 끊겼을 때만 저장해 둔 화면을 보여 줌
const C = 'aden-web-1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const r = e.request; if (r.method !== 'GET') return; const u = new URL(r.url); if (u.origin !== location.origin) return;
  const keep = r.mode === 'navigate' || /\.(js|html|webmanifest)$/.test(u.pathname) || u.pathname.endsWith('/');
  e.respondWith(fetch(r).then(res => { if (keep && res.ok && res.type === 'basic') { const cp = res.clone(); caches.open(C).then(c => c.put(r, cp)).catch(() => {}); } return res; })
    .catch(() => caches.match(r, { ignoreSearch: r.mode === 'navigate' }).then(m => m || Response.error())));
});
