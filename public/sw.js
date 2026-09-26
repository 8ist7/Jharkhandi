const CACHE='jharkhandi-audited-v22-20260916-r1';
const ASSETS=[
  '/',
  '/index.html',
  '/app.js',
  '/language-packs.js',
  '/manifest.webmanifest',
  '/production.css',
  '/jharkhandi-192.png',
  '/jharkhandi-512.png',
  '/media/problem-to-impact.svg',
  '/media/product-screen-citizen.png',
  '/media/product-tour-poster.png'
];
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET') return;
  const url=new URL(event.request.url);
  if(url.pathname.startsWith('/api/')||url.pathname.startsWith('/uploads/')) return;
  event.respondWith(
    fetch(event.request).then(response=>{
      const copy=response.clone();
      caches.open(CACHE).then(cache=>cache.put(event.request,copy));
      return response;
    }).catch(()=>caches.match(event.request).then(cached=>cached||caches.match('/index.html')))
  );
});
