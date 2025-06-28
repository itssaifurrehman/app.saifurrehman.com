import { auth, provider, db } from "../config/config.js";
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";

export function setupAuthHandlers() {
  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);

        let role = "user";

        if (!userDocSnap.exists()) {
          await setDoc(userDocRef, {
            email: user.email,
            name: user.displayName,
            role: "user",
            createdAt: new Date().toISOString()
          });
        } else {
          const data = userDocSnap.data();
          role = data.role || "user";
        }

        localStorage.setItem("userRole", role);
        localStorage.setItem("userId", user.uid);

        window.location.href = "dashboard.html";
      } catch (error) {
        console.error("❌ Login Error:", error);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      signOut(auth).then(() => {
        localStorage.clear();
        window.location.href = "index.html";
      });
    });
  }
}

export function onUserLoggedIn(callback) {
  onAuthStateChanged(auth, user => {
    if (user) {
      callback(user);
    } else {
      window.location.href = "index.html";
    }
  });
}
