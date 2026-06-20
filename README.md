# 📋 Personal Project Scrum Board

> Helping your personal projects align with timelines so you feel the responsibility of completing them — not just starting and leaving for days and never completing them.

A personal Kanban-style project management board inspired by Azure DevOps. Track your features, bugs, and tasks across multiple projects with a beautiful dark-mode UI.

![Personal Project Scrum Board](https://img.shields.io/badge/Status-Active-22c55e?style=flat-square) ![License](https://img.shields.io/badge/License-MIT-4a9eff?style=flat-square) ![Firebase](https://img.shields.io/badge/Firebase-Firestore-f59e0b?style=flat-square)

## ✨ Features

- **🏗️ Multi-Project Support** — Create unlimited projects, each with its own board
- **📋 Work Item Types** — Track Features (💎), Bugs (🐛), and Tasks (📋)
- **🔄 Drag & Drop** — Move cards between columns: New → Active → Resolved → Closed
- **🎯 Priority Levels** — Critical, High, Medium, Low with visual indicators
- **👤 Assignees** — Add name + email to work items
- **📧 Email Notifications** — Opens your email client with a pre-filled message on assignment
- **🔍 Search & Filter** — Filter board by type, search by title/description
- **🌙 Dark Mode** — Premium dark theme inspired by Azure DevOps
- **🔐 Google Sign-in** — Your data is private, only you can see your boards
- **☁️ Cloud Sync** — Data syncs across devices via Firebase
- **📴 Offline Support** — Works offline, syncs when back online

## 🚀 Live Demo

👉 **[Open Scrum Board](https://amar683.github.io/personal-project-scrum-board/)**

## 🛠️ Setup (Self-Hosting)

This app requires a Firebase project for authentication and data storage.

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (disable Google Analytics)
3. **Enable Authentication** → Sign-in method → Google
4. **Create Firestore Database** → Start in test mode
5. **Register a Web App** → Copy the config object

### 2. Add Your Config

Edit `js/firebase-config.js` and replace the placeholder values:

```js
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Set Firestore Security Rules

In Firebase Console → Firestore → Rules, paste the contents of `firestore.rules`:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 4. Deploy

Push to GitHub and enable GitHub Pages:

1. Go to your repo → Settings → Pages
2. Source: **Deploy from a branch**
3. Branch: `main`, folder: `/ (root)`
4. Your board will be live at `https://yourusername.github.io/repo-name/`

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `N` | New work item (on board) / New project (on home) |
| `H` | Navigate home |
| `Esc` | Close modal / Clear search |

## 🏗️ Tech Stack

- **HTML/CSS/JS** — No frameworks, no build step
- **Firebase Auth** — Google sign-in
- **Cloud Firestore** — Real-time NoSQL database
- **GitHub Pages** — Free hosting

## 📁 Project Structure

```
├── index.html              # App shell
├── css/
│   ├── index.css           # Design system
│   ├── layout.css          # App layout
│   ├── board.css           # Board & cards
│   ├── modals.css          # Modal forms
│   ├── components.css      # UI components
│   └── auth.css            # Login page
├── js/
│   ├── firebase-config.js  # Firebase setup
│   ├── auth.js             # Google sign-in
│   ├── store.js            # Firestore CRUD
│   ├── app.js              # Main controller
│   ├── projects.js         # Project views
│   ├── board.js            # Board & drag-drop
│   ├── modals.js           # Modal system
│   └── notifications.js    # Toasts & email
├── assets/
│   └── favicon.svg         # App icon
└── firestore.rules         # Security rules
```

## 📄 License

MIT — Use it, modify it, make it yours.

---

Made with ❤️ for personal productivity.
