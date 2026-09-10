const admin = require('firebase-admin');
const config = require('./index');

let firebaseApp = null;

function initFirebase() {
  if (firebaseApp) return firebaseApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    console.warn('[Firebase] Admin SDK not configured — auth verification will use dev mode');
    return null;
  }

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
    console.log('[Firebase] Admin SDK initialized');
  } catch (err) {
    console.error('[Firebase] Failed to initialize:', err.message);
  }

  return firebaseApp;
}

function getFirebaseAdmin() {
  return firebaseApp || initFirebase();
}

async function verifyFirebaseToken(idToken) {
  const app = getFirebaseAdmin();
  if (!app) {
    if (config.nodeEnv === 'development') {
      return { uid: 'dev-user', phone_number: '+919999999999' };
    }
    throw new Error('Firebase not configured');
  }
  return admin.auth().verifyIdToken(idToken);
}

async function sendPushNotification(tokens, notification, data = {}) {
  const app = getFirebaseAdmin();
  if (!app || !tokens.length) return { successCount: 0, failureCount: 0 };

  const message = {
    notification,
    data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
    tokens,
  };

  try {
    const response = await admin.messaging().sendEachForMulticast(message);
    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (err) {
    console.error('[FCM] Send failed:', err.message);
    return { successCount: 0, failureCount: tokens.length, error: err.message };
  }
}

module.exports = { initFirebase, getFirebaseAdmin, verifyFirebaseToken, sendPushNotification };
