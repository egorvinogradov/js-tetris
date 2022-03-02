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

self.addEventListener('message', event => {
  const { eventType, title, body } = event.data;
  if (eventType === 'notification') {
    showNotification(title, body);
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
});

function saveAppToCache(){
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
  const { hostname, pathname } = new URL(request.url);
  const isDevelopment = hostname === 'localhost' || /^[0-9.]+$/.test(hostname);

  let cachedEntry;
  let cacheMatch;

  if (!isDevelopment) {
    cacheMatch = pathname === '/' ? '/index.html' : request;
    cachedEntry = await caches.match(cacheMatch);
  }
  if (cachedEntry) {
    return cachedEntry;
  }
  return fetch(request).then(response => {
    caches.open(VERSION).then(cache => {
      cache.put(request, response);
    });
    return response.clone();
  });
}

function searchCacheByUrl(url) {
  return caches.open(VERSION)
    .then(cache => cache.keys())
    .then(keys => {
      for (let index in keys) {
        if (keys[index].url.includes(url)) {
          return keys[index].url;
        }
      }
      return null;
    });
}

function showNotification(title, body){
  searchCacheByUrl('/icon-android-192').then(icon => {
    self.registration.showNotification(title, {
      body,
      icon,
      tag: 'scores',
      requireInteraction: true,
    });
  });
}
