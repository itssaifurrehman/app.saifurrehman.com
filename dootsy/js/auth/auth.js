import { auth } from "../config/config.js";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const provider = new GoogleAuthProvider();
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

async function login() {
  try {
    if (isMobile) {
      await signInWithRedirect(auth, provider);
    } else {
      await signInWithPopup(auth, provider);
    }
  } catch (err) {
    console.error("Login failed:", err);
  }
}

async function handleRedirectLogin(callback) {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      callback(result.user);
    }
  } catch (error) {
    console.error("Redirect login error:", error);
  }
}

function logout() {
  return signOut(auth);
}

function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export { login, logout, onAuthChange, handleRedirectLogin };
