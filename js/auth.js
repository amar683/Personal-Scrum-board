/* ============================================
   AUTH — Google Sign-in / Sign-out
   ============================================ */

const Auth = (() => {
  let currentUser = null;
  const listeners = [];

  function onAuthStateChanged(callback) {
    listeners.push(callback);
  }

  function notifyListeners(user) {
    listeners.forEach(cb => cb(user));
  }

  function init() {
    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
      currentUser = user;

      if (user) {
        // User is signed in
        showApp();
        updateUserUI(user);
      } else {
        // User is signed out
        showLogin();
      }

      notifyListeners(user);
    });

    // Sign-in button
    document.getElementById('btn-google-signin').addEventListener('click', signIn);

    // Sign-out button
    document.getElementById('btn-signout').addEventListener('click', signOut);
  }

  async function signIn() {
    const btn = document.getElementById('btn-google-signin');
    btn.disabled = true;
    btn.querySelector('.auth-btn__text').textContent = 'Signing in...';

    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      await auth.signInWithPopup(provider);
    } catch (error) {
      console.error('Sign-in error:', error);
      btn.disabled = false;
      btn.querySelector('.auth-btn__text').textContent = 'Continue with Google';

      if (error.code !== 'auth/popup-closed-by-user') {
        Notifications.showToast('Sign-in failed. Please try again.', 'error');
      }
    }
  }

  async function signOut() {
    try {
      await auth.signOut();
      Notifications.showToast('Signed out', 'info');
    } catch (error) {
      console.error('Sign-out error:', error);
    }
  }

  function showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');
  }

  function showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
  }

  function updateUserUI(user) {
    const avatar = document.getElementById('header-user-avatar');
    const name = document.getElementById('header-user-name');

    if (user.photoURL) {
      avatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" referrerpolicy="no-referrer">`;
    } else {
      const initials = (user.displayName || user.email || '?')
        .split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
      avatar.innerHTML = `<span>${initials}</span>`;
      avatar.style.background = '#4a9eff';
    }

    name.textContent = user.displayName || user.email || 'User';
  }

  function getUser() {
    return currentUser;
  }

  function getUid() {
    return currentUser?.uid || null;
  }

  return {
    init,
    onAuthStateChanged,
    getUser,
    getUid,
    signIn,
    signOut
  };
})();
