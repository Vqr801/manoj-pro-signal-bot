const CACHE='prox-forex-pwa-v10';
const ASSETS=['./','./index.html','./app.html','./manifest.webmanifest','./icon.svg'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method==='GET'&&new URL(event.request.url).origin===self.location.origin){
  if(new URL(event.request.url).pathname.endsWith('/app.html')){
   event.respondWith(fetch(event.request,{cache:'no-store'}).then(response=>{const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(event.request,copy));return response;}).catch(()=>caches.match(event.request)));
  }else{
   event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));
  }
 }
});