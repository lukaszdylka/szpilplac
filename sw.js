/* Szpilplac PWA Service Worker */
"use strict";

importScripts("/build-version.js");

const BUILD_ID=self.SZP_BUILD_ID||"2026.08.01.2";
const CACHE_NAME="szpilplac-pwa-"+BUILD_ID;
const CORE_ASSETS=[
  "/",
  "/index.html",
  "/slowko.html",
  "/cuzamen.html",
  "/klodka.html",
  "/raja/",
  "/gierki.html",
  "/konto.html",
  "/ranking.html",
  "/nowosci.html",
  "/offline.html",
  "/manifest.webmanifest",
  "/favicon.svg",
  "/pwa-icon.svg",
  "/pwa-maskable.svg",
  "/build-version.js",
  "/szpilplac-common.css",
  "/games-registry.js",
  "/daily-status.js",
  "/game-played.js",
  "/weekly-status.js",
  "/topbar-common.js",
  "/player-menu-common.js",
  "/footer-normalizer.js",
  "/streak-progress-v2.js",
  "/support-coffee.js"
];

self.addEventListener("install",function(event){
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return Promise.all(CORE_ASSETS.map(function(url){
        return cache.add(url).catch(function(){return null;});
      }));
    })
  );
});

self.addEventListener("activate",function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(key){
        return key.indexOf("szpilplac-pwa-")===0&&key!==CACHE_NAME;
      }).map(function(key){return caches.delete(key);}));
    }).then(function(){return self.clients.claim();})
  );
});

function shouldCache(request,url,response){
  if(!response||!response.ok||url.origin!==self.location.origin)return false;
  if(url.pathname.indexOf("/rest/v1/")!==-1||url.pathname.indexOf("/auth/v1/")!==-1)return false;
  return request.destination==="document"||
    request.destination==="script"||
    request.destination==="style"||
    request.destination==="image"||
    url.pathname.endsWith(".webmanifest");
}

function networkFirst(request){
  return fetch(request).then(function(response){
    var url=new URL(request.url);
    if(shouldCache(request,url,response)){
      caches.open(CACHE_NAME).then(function(cache){
        cache.put(request,response.clone()).catch(function(){});
      });
    }
    return response;
  }).catch(function(){
    return caches.match(request).then(function(hit){
      if(hit)return hit;
      if(request.mode==="navigate")return caches.match("/offline.html");
      return Response.error();
    });
  });
}

function staleWhileRevalidate(request){
  return caches.match(request).then(function(hit){
    var update=fetch(request).then(function(response){
      var url=new URL(request.url);
      if(shouldCache(request,url,response)){
        caches.open(CACHE_NAME).then(function(cache){
          cache.put(request,response.clone()).catch(function(){});
        });
      }
      return response;
    }).catch(function(){return null;});
    return hit||update.then(function(response){return response||Response.error();});
  });
}

self.addEventListener("fetch",function(event){
  var request=event.request;
  if(request.method!=="GET")return;
  var url=new URL(request.url);
  if(url.origin!==self.location.origin)return;

  if(request.mode==="navigate"||request.destination==="document"){
    event.respondWith(networkFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

self.addEventListener("message",function(event){
  if(event.data&&event.data.type==="SKIP_WAITING")self.skipWaiting();
});

self.addEventListener("push",function(event){
  var data={};
  try{data=event.data?event.data.json():{};}
  catch(e){data={title:"Szpilplac",body:event.data?event.data.text():"Masz nowe powiadomienie."};}

  var title=data.title||"Szpilplac";
  var options={
    body:data.body||"Nowe rzeczy czekają na Szpilplacu.",
    icon:data.icon||"/pwa-icon.svg",
    badge:data.badge||"/pwa-maskable.svg",
    tag:data.tag||"szpilplac",
    data:{url:data.url||"/",type:data.type||"general"},
    renotify:false
  };
  event.waitUntil(self.registration.showNotification(title,options));
});

self.addEventListener("notificationclick",function(event){
  event.notification.close();
  var url=(event.notification&&event.notification.data&&event.notification.data.url)||"/";
  event.waitUntil(
    clients.matchAll({type:"window",includeUncontrolled:true}).then(function(clientList){
      for(var i=0;i<clientList.length;i++){
        var client=clientList[i];
        if(client.url&&"focus" in client){
          var clientUrl=new URL(client.url);
          var targetUrl=new URL(url,self.location.origin);
          if(clientUrl.origin===targetUrl.origin&&clientUrl.pathname===targetUrl.pathname)return client.focus();
        }
      }
      if(clients.openWindow)return clients.openWindow(url);
    })
  );
});
