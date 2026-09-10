import { useEffect } from 'react';
import { getToken, onMessage } from 'firebase/messaging';
import { getMessagingInstance } from '../services/firebase';
import { notificationAPI } from '../services/endpoints';
import { useAuth } from '../context/AuthContext';

export function useFCM() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    let unsubscribe;

    async function setup() {
      try {
        if (!('serviceWorker' in navigator)) return;

        const messaging = await getMessagingInstance();
        if (!messaging) return;

        await navigator.serviceWorker.register('/firebase-messaging-sw.js');

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const token = await getToken(messaging, {
          vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.ready,
        });

        if (token) {
          localStorage.setItem('lifelink_fcm_token', token);
          await notificationAPI.registerToken({
            token,
            deviceInfo: navigator.userAgent.slice(0, 200),
          });
        }

        unsubscribe = onMessage(messaging, (payload) => {
          const { title, body } = payload.notification || {};
          const emergencyId = payload.data?.emergencyRequestId;
          if (title && Notification.permission === 'granted') {
            const n = new Notification(title, {
              body,
              data: payload.data,
              icon: '/favicon.svg',
            });
            n.onclick = () => {
              window.focus();
              if (emergencyId) window.location.href = `/donor/emergency/${emergencyId}`;
            };
          }
        });
      } catch {
        /* FCM optional without Firebase config */
      }
    }

    setup();
    return () => unsubscribe?.();
  }, [user]);
}
