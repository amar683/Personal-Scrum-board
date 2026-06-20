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
  apiKey: "AIzaSyCUhVaQyY2JSnceJj0gRGZ2RkuXUcXF4jY",
  authDomain: "scrum-board-101e3.firebaseapp.com",
  projectId: "scrum-board-101e3",
  storageBucket: "scrum-board-101e3.firebasestorage.app",
  messagingSenderId: "555351123743",
  appId: "1:555351123743:web:1263aa30f6146b99f9322a"
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
