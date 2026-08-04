const CACHE_NAME = 'smarttd-v2';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

// Capturar peticiones PUSH en segundo plano
self.addEventListener('push', (event) => {
    let title = '📨 NUEVO DESPACHO';
    let body = 'Tienes un nuevo despacho de taxi pendiente.';

    if (event.data) {
        try {
            const json = event.data.json();
            title = json.title || title;
            body = json.message || json.body || (typeof json === 'string' ? json : JSON.stringify(json));
        } catch (e) {
            body = event.data.text();
        }
    }

    const options = {
        body: body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        vibrate: [500, 200, 500, 200, 500, 200, 500],
        tag: 'despacho-notification',
        renotify: true,
        requireInteraction: true,
        actions: [
            { action: 'aceptar', title: '✅ ACEPTAR' },
            { action: 'rechazar', title: '❌ RECHAZAR' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Manejo de clics en las acciones del aviso nativo
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    const WEBHOOK_URL = 'https://trigger.macrodroid.com/30c83d0a-a2d0-404b-9f16-48ed24896d46/smarttd-remote';
    let cmd = '';

    if (event.action === 'aceptar') {
        cmd = 'despacho_aceptar';
    } else if (event.action === 'rechazar') {
        cmd = 'despacho_rechazar';
    }

    if (cmd) {
        fetch(`${WEBHOOK_URL}?cmd=${encodeURIComponent(cmd)}`, { mode: 'no-cors' });
    }

    // Abrir o enfocar la aplicación web
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});
