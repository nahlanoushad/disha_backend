import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Initializes the Firebase Admin SDK securely.
 * It uses applicationDefault() to auto-detect GOOGLE_APPLICATION_CREDENTIALS.
 */
let messaging;

try {
  if (getApps().length === 0) {
    // We only want to initialize if GOOGLE_APPLICATION_CREDENTIALS is set
    // to avoid crashing the server on boot if the file is missing in dev.
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({
        credential: applicationDefault(),
      });
      console.log('Firebase Admin SDK initialized successfully.');
    } else {
      console.warn('Firebase Admin SDK not initialized: GOOGLE_APPLICATION_CREDENTIALS not found in environment.');
    }
  }
  
  if (getApps().length > 0) {
    messaging = getMessaging();
  }
} catch (error) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
}

export { messaging };
