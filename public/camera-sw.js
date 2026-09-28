const CACHE = 'digitarot-camera-v2'
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    self.clients.claim(),
    caches.keys().then((nomes) => Promise.all(nomes.filter((nome) => nome.startsWith('digitarot-camera-') && nome !== CACHE).map((nome) => caches.delete(nome)))),
  ]))
})
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return
  const asset = url.pathname.includes('/assets/') && /\.(js|css)$/.test(url.pathname)
  const pagina = url.pathname.endsWith('/camera-app.html')
  if (!asset && !pagina) return
  event.respondWith((async () => {
    const cache = await caches.open(CACHE)
    if (asset) {
      const salvo = await cache.match(event.request)
      if (salvo) return salvo
    }
    try {
      const resposta = await fetch(event.request)
      if (resposta.ok) await cache.put(event.request, resposta.clone())
      return resposta
    } catch {
      return (await cache.match(event.request)) || Response.error()
    }
  })())
})
