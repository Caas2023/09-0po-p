self.addEventListener('install', (e) => {
  console.log('[Service Worker] Instalado');
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  console.log('[Service Worker] Ativo');
});

self.addEventListener('fetch', (e) => {
  // Necessário para o PWA ser detectado
});
