import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

// Relative key paths are resolved from the backend folder, not from wherever the server was started
const BACKEND_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Initializes the Firebase Admin SDK from the service-account key file named in
 * GOOGLE_APPLICATION_CREDENTIALS. The server still starts if it is missing;
 * push notifications are simply unavailable.
 */
let messaging;

try {
  if (getApps().length === 0) {
    const keyPath = (process.env.GOOGLE_APPLICATION_CREDENTIALS || '').trim();

    if (!keyPath) {
      console.warn('Firebase Admin SDK not initialized: GOOGLE_APPLICATION_CREDENTIALS is not set.');
    } else {
      const fullPath = path.resolve(BACKEND_ROOT, keyPath);
      if (!fs.existsSync(fullPath)) {
        throw new Error(`key file not found at ${fullPath}`);
      }

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
      } catch {
        // Don't log the parser message: it can quote parts of the private key
        throw new Error(`key file at ${fullPath} is empty or not valid JSON`);
      }

      initializeApp({ credential: cert(serviceAccount) });
      console.log(`Firebase Admin SDK initialized for project "${serviceAccount.project_id}".`);
    }
  }

  if (getApps().length > 0) {
    messaging = getMessaging();
  }
} catch (error) {
  console.error('Firebase Admin SDK not initialized:', error.message);
}

export { messaging };
