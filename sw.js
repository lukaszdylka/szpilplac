/* Szpilplac PWA Service Worker v7 */
"use strict";

const CACHE_NAME = "szpilplac-pwa-v7";
const CORE_ASSETS = [
  "/",
  "/index.html",
  "/konto.html",
  "/ranking.html",
  "/nowosci.html",
  "/manifest.webmanifest",
  "/pwa-icon.svg",
  "/pwa-maskable.svg"
];

self.addEventListener("install", function(event){
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache){ return cache.addAll(CORE_ASSETS).catch(function(){ return null; }); })
      .then(function(){ return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k !== CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function(event){
  const req = event.request;
  if(req.method !== "GET") return;

  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req).then(function(res){
      const copy = res.clone();
      caches.open(CACHE_NAME).then(function(cache){
        if(res.ok && (req.destination === "document" || req.destination === "script" || req.destination === "style" || req.destination === "image" || url.pathname.endsWith(".webmanifest"))){
          cache.put(req, copy).catch(function(){});
        }
      });
      return res;
    }).catch(function(){
      return caches.match(req).then(function(hit){
        if(hit) return hit;
        if(req.mode === "navigate") return caches.match("/index.html");
        return Response.error();
      });
    })
  );
});

self.addEventListener("push", function(event){
  let data = {};
  try{
    data = event.data ? event.data.json() : {};
  }catch(e){
    data = { title:"Szpilplac", body:event.data ? event.data.text() : "Masz nowe powiadomienie." };
  }

  const title = data.title || "Szpilplac";
  const options = {
    body: data.body || "Nowe rzeczy czekają na Szpilplacu.",
    icon: data.icon || "/pwa-icon.svg",
    badge: data.badge || "/pwa-maskable.svg",
    tag: data.tag || "szpilplac",
    data: { url: data.url || "/", type: data.type || "general" },
    renotify: false
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function(event){
  event.notification.close();
  const url = (event.notification && event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    clients.matchAll({type:"window", includeUncontrolled:true}).then(function(clientList){
      for(const client of clientList){
        if(client.url && "focus" in client){
          const clientUrl = new URL(client.url);
          const targetUrl = new URL(url, self.location.origin);
          if(clientUrl.origin === targetUrl.origin && clientUrl.pathname === targetUrl.pathname){
            return client.focus();
          }
        }
      }
      if(clients.openWindow) return clients.openWindow(url);
    })
  );
});
