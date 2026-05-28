/**
 * Firebase Configuration
 * This file initializes Firebase and Firestore.
 * 
 * SETUP: Replace the config values below with your Firebase project config.
 * Go to Firebase Console → Project Settings → Your App → Config
 */

const FIREBASE_CONFIG = {
  apiKey: "PASTE_YOUR_API_KEY_HERE",
  authDomain: "PASTE_YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  storageBucket: "PASTE_YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "PASTE_YOUR_SENDER_ID",
  appId: "PASTE_YOUR_APP_ID"
};

// Gemini API Key for AI-powered exam spec autofill (admin panel only)
const GEMINI_API_KEY = "PASTE_YOUR_GEMINI_API_KEY_HERE";

// Admin password for admin panel access
const ADMIN_PASSWORD = "examresize@admin2026";

let firebaseApp = null;
let db = null;
let firebaseReady = false;

function initFirebase() {
  try {
    if (FIREBASE_CONFIG.apiKey === "PASTE_YOUR_API_KEY_HERE") {
      console.warn('Firebase not configured. Request feature will be disabled.');
      return false;
    }
    firebaseApp = firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.firestore();
    firebaseReady = true;
    console.log('Firebase initialized successfully');
    return true;
  } catch (err) {
    console.error('Firebase init error:', err);
    return false;
  }
}
