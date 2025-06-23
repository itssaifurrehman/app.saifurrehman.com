import { auth } from "./firebase-config.js";
import { GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const provider = new GoogleAuthProvider();

document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      alert("Please sign in with your Google account to manage your medicines.");
      try {
        console.log("Attempting to sign in...");
        const result = await signInWithPopup(auth, provider);
        const currentUser = result.user;
        console.log("Signed in as:", currentUser.displayName);
      } catch (err) {
        console.error("Login error", err);
      }
    });
  }
});
