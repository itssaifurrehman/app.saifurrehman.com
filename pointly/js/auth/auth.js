// js/auth.js
import { auth } from "../config/config.js";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const provider = new GoogleAuthProvider();

// Initialize Google Login
export function initGoogleLogin() {
  const loginBtn = document.getElementById("google-login");
  const errorDisplay = document.getElementById("login-error");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
        await signInWithPopup(auth, provider);
        // User auto redirected by checkAuth()
      } catch (error) {
        console.error("Google login failed:", error.message);
        errorDisplay.textContent = "Login failed. Try again.";
        errorDisplay.classList.remove("hidden");
      }
    });
  }

  // Redirect if already logged in
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = "dashboard.html";
    }
  });
}

export function checkAuth() {
  onAuthStateChanged(auth, (user) => {
    if (!user) {
      window.location.href = "index.html";
    }
  });
}

export function logoutUser() {
  signOut(auth).then(() => {
    window.location.href = "index.html";
  });
}
