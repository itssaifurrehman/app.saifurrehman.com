// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.9.1/firebase-firestore.js";
import {
  signInWithPopup,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.9.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1lnF0yjQUrY5P4ofQSW_NMSaG1RP7mVQ",
  authDomain: "broodl-96.firebaseapp.com",
  projectId: "broodl-96",
  storageBucket: "broodl-96.firebasestorage.app",
  messagingSenderId: "111850950666",
  appId: "1:111850950666:web:fce0158eb7709015c58ff3",
  measurementId: "G-TQSGFCWB96",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

let authButtons=null

// --- DOMContentLoaded ensures elements exist ---
document.addEventListener("DOMContentLoaded", () => {
  const loginBtn = document.getElementById("loginBtn");
  const logoutBtn = document.getElementById("logoutBtn"); // optional
  const userInfo = document.getElementById("userInfo"); // optional for displaying name/email
   authButtons = document.querySelectorAll("[data-auth-required]");
authButtons.forEach((btn) => {
      btn.disabled = true;
      btn.classList.add("opacity-50", "cursor-not-allowed");
    });

  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
     
      } catch (err) {
        console.error("Login failed:", err.message);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await signOut(auth);
        location.reload(); // Or show a login screen
      } catch (err) {
        console.error("Logout failed:", err.message);
      }
    });
  }

  // Check login state
  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (userInfo) userInfo.textContent = `Welcome, ${user.displayName}`;
      loadPage("add-medicine.html");
    } else {
    }
  });
});

// --- Load page into #mainContent ---
export async function loadPage(page) {
  try {
    const res = await fetch(page);
    const html = await res.text();
    document.getElementById("mainContent").innerHTML = html;
    if (page !== "main.html") {
      const app = await import("./app.js");
         authButtons.forEach((btn) => {
      btn.disabled = false;
      btn.classList.remove("opacity-50", "cursor-not-allowed");
    });

      // Wait a bit for DOM to actually paint
      requestAnimationFrame(() => {
        if (page === "add-medicine.html") {
          app.initDOM(); // Run only when needed
        }
        //  else if (page === "view-medicine.html") {
        //   app.getTableData();
        // }
      });
    }
  } catch (err) {
    document.getElementById("mainContent").innerHTML =
      "<p class='text-red-500'>Failed to load page.</p>";
  }
}

export { auth, provider, db, onAuthStateChanged };
