const VERSION = '1.0.0';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
  saveAppToCache();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', async (event) => {
  event.respondWith(handleRequest(event.request));
});

async function saveAppToCache(){
  return fetch('/service_worker_assets.txt').then(response => {
    return response.text().then(filelist => {
      const assetURLs = filelist
        .split('\n')
        .filter(Boolean)
        .map(filename => '/' + filename);

      return self.caches.open(VERSION).then(cache => {
        return cache.addAll(assetURLs);
      });
    });
  });
}

async function handleRequest(request){
  const { pathname } = new URL(request.url);
  const cacheMatch = pathname === '/' ? '/index.html' : request;
  const cachedEntry = await caches.match(cacheMatch);
  if (cachedEntry) {
    return cachedEntry;
  }
  else {
    return fetch(request).then(response => {
      caches.open(VERSION).then(cache => {
        cache.put(request, response);
      });
      return response.clone();
    });
  }
}
