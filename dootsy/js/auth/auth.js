import { auth } from '../config/config.js';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const provider = new GoogleAuthProvider();

function login() {
  return signInWithPopup(auth, provider);
}

function logout() {
  return signOut(auth);
}

function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export { login, logout, onAuthChange };
