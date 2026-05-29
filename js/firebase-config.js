/**
 * Firebase Configuration
 * This file initializes Firebase and Firestore.
 * 
 * SETUP: Replace the config values below with your Firebase project config.
 * Go to Firebase Console → Project Settings → Your App → Config
 */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAFyjOcH_1OhikiEGPXnzJDTdnQ0CdeDR0",
  authDomain: "examresize.firebaseapp.com",
  projectId: "examresize",
  storageBucket: "examresize.firebasestorage.app",
  messagingSenderId: "102110974636",
  appId: "1:102110974636:web:f4922b67d6a441aaaac509"
  measurementId: "G-38G0VEEYGS"
};

// Gemini API Key for AI-powered exam spec autofill (admin panel only)
const GEMINI_API_KEY = "PASTE_YOUR_GEMINI_API_KEY_HERE";

// Admin password for admin panel access
const ADMIN_PASSWORD = "examresize@admin2026";

// ── Job Portal API Keys ──
// JSearch (RapidAPI) — aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter
// Get free key at: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
const JSEARCH_API_KEY = "PASTE_YOUR_RAPIDAPI_KEY_HERE";

// ── Firebase Instances ──
let firebaseApp = null;
let db = null;
let firebaseReady = false;

function initFirebase() {
  try {
    if (firebaseApp) return true;
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
