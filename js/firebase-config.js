/* ============================================
   FIREBASE CONFIG — Replace with your project credentials
   ============================================ */

// ⚠️ SETUP INSTRUCTIONS:
// 1. Go to https://console.firebase.google.com/
// 2. Create a project named "scrum-board"
// 3. Enable Authentication → Google sign-in
// 4. Create Firestore Database → test mode
// 5. Register a Web App → copy config below
// 6. Replace the placeholder values with your actual config

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Enable offline persistence
db.enablePersistence({ synchronizeTabs: true }).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence: Multiple tabs open, only works in one tab.');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence: Browser does not support it.');
  }
});
