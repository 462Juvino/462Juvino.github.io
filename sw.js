self.addEventListener('install', (e) => {
    console.log('[Service Worker] Instalado');
});

self.addEventListener('fetch', (e) => {
    // Isso fica vazio. Serve apenas para enganar o navegador e provar que o PWA é válido.
});
