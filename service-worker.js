// ============================================================
// SERVICE WORKER - Smart TD Monitor
// Funciona en segundo plano y con el móvil bloqueado
// ============================================================

const CACHE_NAME = 'smarttd-monitor';
const WEBHOOK_URL = 'https://trigger.macrodroid.com/7b060a53-60fe-4b1b-b375-27756941187a/smarttd-remote'; // ¡UNIFICA esta URL con la del HTML!

// ============================================================
// INSTALACIÓN Y ACTIVACIÓN
// ============================================================

self.addEventListener('install', (event) => {
    console.log('[SW] Instalando...');
    self.skipWaiting(); // Activa el SW inmediatamente
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activando...');
    event.waitUntil(
        clients.claim() // Toma control de todas las pestañas sin recargar
    );
});

// ============================================================
// MENSAJES DESDE EL CLIENTE (opcional)
// ============================================================

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// ============================================================
// PUSH - RECIBIR NOTIFICACIONES EN SEGUNDO PLANO
// ============================================================

self.addEventListener('push', async (event) => {
    console.log('[SW] Push recibido:', event);

    // 1. Verificar si la app está en primer plano
    const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    });
    const focusedClient = clientList.find(client => client.focused);

    // 2. Extraer datos del mensaje
    let title = '📨 NUEVO DESPACHO';
    let body = 'Tienes un nuevo despacho de taxi pendiente.';
    let data = {};
    let rawPayload = null;

    if (event.data) {
        try {
            const json = event.data.json();
            rawPayload = json;
            title = json.title || title;
            body = json.message || json.body || (typeof json === 'string' ? json : JSON.stringify(json));
            data = json.data || {};
        } catch (e) {
            rawPayload = event.data.text();
            body = rawPayload;
        }
    }

    // 3. Si la app está enfocada, NO mostrar notificación nativa
    //    En su lugar, enviamos el mensaje al cliente para que lo procese
    if (focusedClient) {
        console.log('[SW] App en primer plano, enviando mensaje al cliente...');
        focusedClient.postMessage({
            type: 'PUSH_RECEIVED',
            payload: rawPayload
        });
        return; // No mostramos notificación
    }

    // 4. Mostrar notificación nativa (con acciones)
    const options = {
        body: body,
        icon: 'icon-192.png',
        badge: 'icon-192.png',
        vibrate: [500, 200, 500, 200, 500, 200, 500],
        tag: 'despacho-notification',
        renotify: true,
        requireInteraction: true,
        data: data, // Guardamos datos para el click
        actions: [
            { action: 'aceptar', title: '✅ ACEPTAR' },
            { action: 'rechazar', title: '❌ RECHAZAR' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// ============================================================
// NOTIFICATIONCLICK - CUANDO EL USUARIO INTERACTÚA CON LA NOTIFICACIÓN
// ============================================================

self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click:', event.action);
    event.notification.close();

    // 1. Determinar comando según la acción
    let cmd = null;
    if (event.action === 'aceptar') {
        cmd = 'despacho_aceptar';
    } else if (event.action === 'rechazar') {
        cmd = 'despacho_rechazar';
    }

    // 2. Si hay comando, enviar al webhook
    if (cmd) {
        const extra = event.notification.data?.id ? `&id=${event.notification.data.id}` : '';
        fetch(`${WEBHOOK_URL}?cmd=${encodeURIComponent(cmd)}${extra}`, { mode: 'no-cors' })
            .catch(() => console.warn('[SW] Webhook falló, pero se ignoró'));
    }

    // 3. Abrir o enfocar la aplicación web
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            // Buscar una pestaña existente con index.html
            for (const client of clientList) {
                if (client.url.includes('index.html') && 'focus' in client) {
                    return client.focus();
                }
            }
            // Si no hay, abrir una nueva
            if (clients.openWindow) {
                return clients.openWindow('./index.html');
            }
        })
    );
});

// ============================================================
// NOTIFICATIONCLOSE - CUANDO EL USUARIO DESCARTA LA NOTIFICACIÓN
// (Opcional: enviar rechazo por timeout o descarte)
// ============================================================

self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Notificación descartada:', event.notification.data);
    // Puedes enviar un comando de "rechazo" si el usuario la cierra sin interactuar
    // fetch(`${WEBHOOK_URL}?cmd=despacho_rechazar_timeout`, { mode: 'no-cors' })
    //   .catch(() => {});
});

// ============================================================
// SINCRONIZACIÓN EN SEGUNDO PLANO (opcional)
// ============================================================

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-despachos') {
        console.log('[SW] Sincronización en segundo plano');
        // Aquí podrías hacer una petición al servidor para recuperar despachos pendientes
    }
});

// ============================================================
// PERIODIC SYNC (opcional, solo en Android con Chrome)
// ============================================================

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'update-monitor') {
        console.log('[SW] Actualización periódica en segundo plano');
        // Notificar al cliente o actualizar caché
    }
});

console.log('[SW] Service Worker cargado correctamente');
