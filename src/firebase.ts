import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Import the config file. Note: This file is in .gitignore to prevent accidental exposure.
// If you are running this locally and the file is missing, you can use environment variables instead.
import firebaseConfigJson from '../firebase-applet-config.json';

const isCustomProject = !!import.meta.env.VITE_FIREBASE_PROJECT_ID && import.meta.env.VITE_FIREBASE_PROJECT_ID !== '';

// Derive authDomain if using a custom project but it's not explicitly provided
const derivedAuthDomain = isCustomProject 
  ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com` 
  : firebaseConfigJson.authDomain;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfigJson.apiKey,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || derivedAuthDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfigJson.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfigJson.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfigJson.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfigJson.appId,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || firebaseConfigJson.measurementId,
  // Use the database ID from environment or fallback to JSON if the project IDs match
  firestoreDatabaseId: import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || 
    (isCustomProject && import.meta.env.VITE_FIREBASE_PROJECT_ID !== firebaseConfigJson.projectId 
      ? undefined 
      : (firebaseConfigJson as any).firestoreDatabaseId)
};

if (import.meta.env.DEV || window.location.hostname.includes('run.app')) {
  console.log("--- Firebase Config Check ---");
  console.log("Project ID:", firebaseConfig.projectId);
  console.log("Database ID:", firebaseConfig.firestoreDatabaseId || "(default)");
  console.log("Using Custom Project:", isCustomProject);
  console.log("---------------------------");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Test Firestore connection
import { doc, getDocFromServer } from 'firebase/firestore';

async function testFirestoreConnection() {
  try {
    console.log("Testing Firestore connection to database:", firebaseConfig.firestoreDatabaseId || '(default)');
    // Try to get a non-existent document just to check connectivity
    await getDocFromServer(doc(db, '_connection_test_', 'test'));
    console.log("Firestore connection test successful (reached server).");
  } catch (error: any) {
    console.error("Firestore connection test failed:", error.message);
    if (error.message.includes('client is offline')) {
      console.error("CRITICAL: Firestore client is offline. This usually means the project ID or database ID is incorrect, or Firestore is not enabled.");
    }
  }
}

if (typeof window !== 'undefined') {
  testFirestoreConnection();
}
