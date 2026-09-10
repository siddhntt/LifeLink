// Firebase Messaging Service Worker — LifeLink
// Receives FCM push notifications in the browser background.
// Gracefully no-ops if Firebase config is unavailable.

importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

try {
  const config = self.FIREBASE_CONFIG || {};
  const projectId = config.projectId;

  // Only initialize if we actually have a projectId — avoids crashing in dev/demo
  if (projectId) {
    firebase.initializeApp({
      apiKey: config.apiKey || '',
      authDomain: config.authDomain || '',
      projectId,
      storageBucket: config.storageBucket || '',
      messagingSenderId: config.messagingSenderId || '',
      appId: config.appId || '',
    });

    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      console.log('[FCM SW] Background message:', payload);
      const { title, body } = payload.notification || {};
      const data = payload.data || {};
      const isEmergency = data.type === 'EMERGENCY_REQUEST';

      self.registration.showNotification(title || 'LifeLink', {
        body: body || 'You have a new notification',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        tag: data.type || 'lifelink',
        data,
        requireInteraction: isEmergency,
        actions: isEmergency
          ? [{ action: 'respond', title: 'Respond Now' }, { action: 'dismiss', title: 'Dismiss' }]
          : [],
        vibrate: isEmergency ? [200, 100, 200, 100, 200] : [100, 50, 100],
      });
    });
  }
} catch (err) {
  console.warn('[FCM SW] Firebase init skipped:', err.message);
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  let url = '/donor/dashboard';

  if (data.type === 'EMERGENCY_REQUEST' && data.emergencyRequestId) {
    url = `/donor/emergency/${data.emergencyRequestId}`;
  } else if (data.type === 'APPOINTMENT_CONFIRMATION' || data.type === 'APPOINTMENT_REMINDER') {
    url = '/donor/appointments';
  } else if (data.type === 'CAMP_REMINDER') {
    url = '/camps';
  } else if (data.type === 'VERIFICATION_UPDATE') {
    url = '/';
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
